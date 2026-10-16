// Teste das regras do banco (RLS) rodando num Postgres de verdade em memória (PGlite),
// com os mesmos arquivos SQL que vão para o Supabase.
//   cd tests && npm i && npm test
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const sql = (f) => readFileSync(join(raiz, f), 'utf8');

const db = new PGlite();
let falhas = 0, total = 0;
const ok = (cond, msg) => { total++; if (!cond) { falhas++; console.log('  ✗ FALHOU:', msg); } };

// ---- Simula o ambiente do Supabase (schemas auth/storage, papéis e privilégios padrão)
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'),1)-1,0)] $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  grant all on all tables in schema storage to authenticated;
`);
for (const f of ['01_base.sql', '02_permissoes.sql', '03_modulos.sql', '04_storage.sql']) {
  try { await db.exec(sql(f)); } catch (e) { console.log('ERRO ao rodar', f, '→', e.message); process.exit(1); }
}
// rodar duas vezes tem que funcionar (idempotente)
for (const f of ['01_base.sql', '02_permissoes.sql', '03_modulos.sql', '04_storage.sql']) {
  try { await db.exec(sql(f)); } catch (e) { console.log('ERRO ao rodar de novo', f, '→', e.message); process.exit(1); }
}

// ---- Usuários de teste: um por função
const funcoes = (await db.query(`select nome, grupo from public.funcoes order by nome`)).rows;
const uid = {};
let n = 1000;
for (const { nome } of funcoes) {
  const r = await db.query(`insert into auth.users (email) values ($1) returning id`, [`${nome}@t`]);
  uid[nome] = r.rows[0].id;
  await db.query(`insert into public.profiles (id, matricula, nome, funcao) values ($1,$2,$3,$4)`,
                 [uid[nome], String(n++), `Teste ${nome}`, nome]);
}
// segundo Enfermeiro e um usuário inativo
const r2 = await db.query(`insert into auth.users (email) values ('enf2@t') returning id`);
uid['Enfermeiro2'] = r2.rows[0].id;
await db.query(`insert into public.profiles (id, matricula, nome, funcao) values ($1,'2001','Teste Enfermeiro 2','Enfermeiro')`, [uid['Enfermeiro2']]);
const r3 = await db.query(`insert into auth.users (email) values ('inativo@t') returning id`);
uid['Inativo'] = r3.rows[0].id;
await db.query(`insert into public.profiles (id, matricula, nome, funcao, ativo) values ($1,'2002','Inativo','Médico', false)`, [uid['Inativo']]);

async function como(quem, fn) {
  await db.exec(`set role authenticated`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid[quem]]);
  try { return await fn(); }
  finally { await db.exec(`reset role`); await db.query(`select set_config('request.jwt.claim.sub','',false)`); }
}
async function tenta(quem, q, p = []) {
  return como(quem, async () => {
    try { const r = await db.query(q, p); return { ok: true, rows: r.rows, n: r.affectedRows ?? r.rows.length }; }
    catch (e) { return { ok: false, erro: e.message }; }
  });
}
const pode = async (quem, mod, acao) => (await tenta(quem, `select public.pode($1,$2) as v`, [mod, acao])).rows?.[0]?.v === true;

// ---- Grupos, escritos de forma independente do arquivo de permissões
const G = ['Gestor Assistencial', 'Gestor Administrativo', 'RH Focal'];
const A = ['Recepcionista', 'Assistente Administrativo', 'Almoxarife', 'NIR', 'TI'];
const S = ['Médico', 'Pediatra', 'Enfermeiro', 'Técnico de Enfermagem', 'Farmacêutico', 'Técnico de Farmácia',
           'Radiologista', 'Técnico de Radiologia', 'Técnico em Laboratório', 'Assistente Social'];
const P = ['ASG', 'Vigilante', 'Maqueiro'];
const T = ['Manutenção', 'Refrigeração'];
const TODOS = [...G, ...A, ...S, ...P];
const NOMES = funcoes.map(f => f.nome);

// ---- 1) A MATRIZ contra as 16 regras do pedido
const regras = [
  // [descrição, módulo, ação, quem PODE]
  ['1. Estoque: todos veem',                         'estoque', 'ver',    TODOS],
  ['1. Estoque: gestor/farmacêutico/almoxarife editam','estoque','editar', [...G, 'Farmacêutico', 'Almoxarife']],
  ['1. Estoque: inserem',                            'estoque', 'criar',  [...G, 'Farmacêutico', 'Almoxarife']],
  ['1. Estoque: excluem',                            'estoque', 'excluir',[...G, 'Farmacêutico', 'Almoxarife']],
  ['2. Calculadoras: enf, téc enf, médico, farm, gestor','calculadoras','ver',[...G, 'Enfermeiro', 'Técnico de Enfermagem', 'Médico', 'Pediatra', 'Farmacêutico']],
  ['3. Dieta: ver = enf, téc enf, médico, gestor',   'dieta', 'ver',      [...G, 'Enfermeiro', 'Técnico de Enfermagem', 'Médico', 'Pediatra']],
  ['3. Dieta: solicitar = enf, médico, gestor',      'dieta', 'criar',    [...G, 'Enfermeiro', 'Médico', 'Pediatra']],
  ['4. Documentos: todos veem',                      'documentos', 'ver', TODOS],
  ['4. Documentos: só gestor insere',                'documentos', 'criar', G],
  ['4. Documentos: só gestor edita',                 'documentos', 'editar', G],
  ['4. Documentos: só gestor exclui',                'documentos', 'excluir', G],
  ['5. Escala: todos veem',                          'escala', 'ver',     TODOS],
  ['5. Escala: só adm e gestor inserem',             'escala', 'criar',   [...A, ...G]],
  ['5. Escala: só adm e gestor editam',              'escala', 'editar',  [...A, ...G]],
  ['5. Escala: só adm e gestor excluem',             'escala', 'excluir', [...A, ...G]],
  ['6. Evento adverso: todos veem a tela',           'evento', 'ver',     TODOS],
  ['6. Evento adverso: todos notificam',             'evento', 'criar',   TODOS],
  ['6. Evento adverso: só gestor acessa o relatório','evento_relatorio', 'ver', G],
  ['7. Passagem: ver = assistenciais, gestores, adm','passagem', 'ver',   [...S, ...G, ...A]],
  ['7. Passagem: adm e gestor inserem',              'passagem', 'criar', [...A, ...G]],
  ['7. Passagem: adm e gestor editam',               'passagem', 'editar', [...A, ...G]],
  ['7. Passagem: adm e gestor recebem',              'passagem', 'receber', [...A, ...G]],
  ['7. Passagem: adm e gestor excluem',              'passagem', 'excluir', [...A, ...G]],
  ['8. Protocolos: assistenciais e gestores',        'protocolos', 'ver', [...S, ...G]],
  ['9. Relatório gerencial: todos veem',             'relatorio', 'ver',  TODOS],
  ['9. Relatório gerencial: só gestor inclui',       'relatorio', 'criar', G],
  ['9. Relatório gerencial: só gestor edita',        'relatorio', 'editar', G],
  ['9. Relatório gerencial: só gestor exclui',       'relatorio', 'excluir', G],
  ['10. RH: todos',                                  'rh', 'ver',         TODOS],
  ['11. Treinamento: todos',                         'treinamento', 'ver', TODOS],
  ['12. Safety Huddle: todos',                       'safety', 'ver',     TODOS],
  ['13. Manutenção: todos + terceiros abrem chamado','manutencao', 'criar', [...TODOS, ...T]],
  ['14. Sistemas: todos menos vig, maq e higienização','sistemas', 'ver', [...G, ...A, ...S]],
  ['16. Chat: todos',                                'chat', 'ver',       TODOS],
];
for (const [desc, mod, acao, quem] of regras) {
  for (const f of NOMES) {
    const esperado = quem.includes(f);
    const real = await pode(f, mod, acao);
    ok(real === esperado, `${desc} → ${f}: esperado ${esperado ? 'PODE' : 'NÃO pode'}, banco diz ${real ? 'PODE' : 'NÃO pode'}`);
  }
}
// Terceiros e Agente Regulador: nada além de manutenção
for (const f of [...T, 'Agente Regulador']) {
  const c = (await tenta(f, `select public.meu_contexto() as c`)).rows[0].c;
  const perms = c.permissoes.filter(p => !p.startsWith('manutencao:'));
  ok(perms.length === 0, `${f} só pode ter manutenção, mas tem: ${perms.join(', ')}`);
}
ok((await tenta('Agente Regulador', `select public.meu_contexto() as c`)).rows[0].c.permissoes.length === 0, 'Agente Regulador deve ficar sem nenhuma permissão');
ok((await tenta('Inativo', `select public.meu_contexto() as c`)).rows[0].c === null, 'usuário inativo não pode ter contexto');
console.log('Matriz verificada:', total, 'checagens');

// ---- 2) PORTAS FECHADAS: anônimo e inativo
await db.exec(`set role anon`);
for (const t of ['estoque_itens', 'passagem_cards', 'dieta_pedidos', 'profiles', 'permissoes', 'eventos_adversos', 'rh_solicitacoes']) {
  let negado = false; try { await db.query(`select * from public.${t}`); } catch { negado = true; }
  ok(negado, `anônimo não pode ler ${t}`);
}
await db.exec(`reset role`);
ok((await tenta('Inativo', `select * from public.estoque_itens`)).rows.length === 0, 'inativo não lê estoque');
ok(!(await tenta('Inativo', `insert into public.avisos (assunto) values ('x')`)).ok, 'inativo não grava');

// ---- 3) DML REAL (as políticas de verdade)
const lerN = async (q, quem, p = []) => (await tenta(quem, q, p)).rows?.length ?? -1;

// Estoque
ok((await tenta('Farmacêutico', `insert into public.estoque_itens (setor, insumo, quantidade) values ('farmacia','Dipirona 500mg', 40)`)).ok, 'farmacêutico insere estoque');
ok((await tenta('Almoxarife', `insert into public.estoque_itens (setor, insumo, quantidade) values ('almoxarifado','Luva M', 100)`)).ok, 'almoxarife insere estoque');
ok(!(await tenta('Enfermeiro', `insert into public.estoque_itens (setor, insumo, quantidade) values ('farmacia','X', 1)`)).ok, 'enfermeiro NÃO insere estoque');
ok(!(await tenta('Técnico de Farmácia', `insert into public.estoque_itens (setor, insumo, quantidade) values ('farmacia','Y', 1)`)).ok, 'téc. farmácia NÃO insere estoque');
ok(await lerN(`select * from public.estoque_itens`, 'Vigilante') === 2, 'vigilante vê estoque');
ok(await lerN(`select * from public.estoque_itens`, 'Manutenção') === 0, 'terceiro não vê estoque');
ok((await tenta('Enfermeiro', `update public.estoque_itens set quantidade = 0`)).n === 0, 'enfermeiro não altera estoque');
ok((await tenta('Enfermeiro', `delete from public.estoque_itens`)).n === 0, 'enfermeiro não apaga estoque');
ok((await tenta('Farmacêutico', `update public.estoque_itens set quantidade = 35 where insumo = 'Dipirona 500mg'`)).n === 1, 'farmacêutico altera estoque');
ok(!(await tenta('Farmacêutico', `update public.estoque_itens set quantidade = -5 where insumo = 'Dipirona 500mg'`)).ok, 'quantidade negativa é recusada');
ok(await lerN(`select * from public.estoque_log`, 'Gestor Administrativo') >= 3, 'gestor lê o histórico do estoque');
ok(await lerN(`select * from public.estoque_log`, 'Enfermeiro') === 0, 'enfermeiro não lê histórico do estoque');
const autoria = (await tenta('Almoxarife', `select criado_por_nome from public.estoque_itens where insumo='Luva M'`)).rows[0];
ok(autoria?.criado_por_nome === 'Teste Almoxarife', 'autoria carimbada no servidor');
// tentativa de falsificar a autoria
await tenta('Almoxarife', `insert into public.estoque_itens (setor, insumo, quantidade, criado_por_nome) values ('almoxarifado','Falso',1,'Outra Pessoa')`);
ok((await tenta('Almoxarife', `select criado_por_nome from public.estoque_itens where insumo='Falso'`)).rows[0]?.criado_por_nome === 'Teste Almoxarife', 'não dá para falsificar o nome do autor');

// Documentos
ok((await tenta('Gestor Administrativo', `insert into public.documentos (assunto, link) values ('POP Higienização','https://x')`)).ok, 'gestor insere documento');
ok(!(await tenta('Enfermeiro', `insert into public.documentos (assunto) values ('x')`)).ok, 'enfermeiro NÃO insere documento');
ok(!(await tenta('RH Focal', `insert into public.documentos (assunto) values ('y')`)).ok === false, 'RH focal (gestor) insere documento');
ok(await lerN(`select * from public.documentos`, 'Maqueiro') === 2, 'maqueiro vê documentos');
ok((await tenta('NIR', `update public.documentos set status='Inativo'`)).n === 0, 'adm não edita documento');
ok((await tenta('NIR', `delete from public.documentos`)).n === 0, 'adm não exclui documento');
ok((await tenta('Gestor Assistencial', `update public.documentos set status='Inativo' where assunto='POP Higienização'`)).n === 1, 'gestor edita documento');

// Escala
ok((await tenta('NIR', `insert into public.escala_plantao (data, turno, setor, nome) values (current_date,'manha','ENF','Ana')`)).ok, 'adm (NIR) insere na escala');
ok((await tenta('Gestor Assistencial', `insert into public.escala_plantao (data, turno, setor, nome) values (current_date,'manha','MED','Bia')`)).ok, 'gestor insere na escala');
ok(!(await tenta('Enfermeiro', `insert into public.escala_plantao (data, turno, setor, nome) values (current_date,'manha','ENF','Z')`)).ok, 'enfermeiro NÃO insere na escala');
ok(await lerN(`select * from public.escala_plantao`, 'Vigilante') === 2, 'vigilante vê escala');
ok((await tenta('Médico', `delete from public.escala_plantao`)).n === 0, 'médico não exclui da escala');
ok((await tenta('Recepcionista', `delete from public.escala_plantao where setor='MED'`)).n === 1, 'adm exclui da escala');

// Evento adverso
const ev = { data_evento: '2026-10-10', setor: 'Sala Amarela', tipo: 'Queda', grau: 'leve', descricao: 'Paciente caiu ao levantar do leito.' };
const notif = (quem, extra = {}) => tenta(quem, `select public.evento_notificar($1::jsonb) as protocolo`, [JSON.stringify({ ...ev, ...extra })]);
ok((await notif('Vigilante')).ok, 'vigilante notifica evento adverso');
ok((await notif('Enfermeiro', { anonimo: true })).ok, 'enfermeiro notifica anonimamente');
ok(!(await notif('Agente Regulador')).ok, 'agente regulador NÃO notifica');
ok(!(await notif('Manutenção')).ok, 'terceiro NÃO notifica');
ok(!(await tenta('Vigilante', `insert into public.eventos_adversos (data_evento,setor,tipo,grau,descricao) values ('2026-10-10','x','y','leve','abcdefghijkl')`)).ok, 'não dá para inserir evento direto');
ok(await lerN(`select * from public.eventos_adversos`, 'Vigilante') === 0, 'vigilante NÃO acessa o relatório de eventos');
ok(await lerN(`select * from public.eventos_adversos`, 'Médico') === 0, 'médico NÃO acessa o relatório de eventos');
ok(await lerN(`select * from public.eventos_adversos`, 'Gestor Assistencial') === 2, 'gestor acessa o relatório de eventos');
const anon = (await tenta('Gestor Assistencial', `select criado_por, criado_por_nome from public.eventos_adversos where anonimo`)).rows[0];
ok(anon && anon.criado_por === null && anon.criado_por_nome === null, 'notificação anônima não guarda o autor');
ok((await tenta('Enfermeiro', `update public.eventos_adversos set status='concluida'`)).n === 0, 'enfermeiro não altera evento');
ok((await tenta('Gestor Assistencial', `update public.eventos_adversos set status='em_analise', analise='Em apuração', descricao='ADULTERADO' where not anonimo`)).n === 1, 'gestor analisa evento');
ok((await tenta('Gestor Assistencial', `select descricao from public.eventos_adversos where not anonimo`)).rows[0].descricao !== 'ADULTERADO', 'relato original do evento é imutável');
ok((await tenta('Gestor Assistencial', `delete from public.eventos_adversos`)).n === 0, 'evento adverso não pode ser excluído');

// Passagem de plantão
const card = { turno: 'manha', paciente: 'Fulano', leito: '03', diagnostico: 'IAM', prioridade: 'critico' };
const insCard = (quem) => tenta(quem, `insert into public.passagem_cards (turno,paciente,leito,diagnostico,prioridade) values ($1,$2,$3,$4,$5) returning id`,
  [card.turno, card.paciente, card.leito, card.diagnostico, card.prioridade]);
const rNIR = await insCard('NIR');
ok(rNIR.ok, 'adm (NIR) insere passagem');
const cardId = rNIR.rows?.[0]?.id;
ok(!(await insCard('Médico')).ok, 'médico NÃO insere passagem');
const rGest = await insCard('Gestor Assistencial');
ok(rGest.ok, 'gestor insere passagem');
if (rGest.ok) ok((await tenta('Gestor Assistencial', `select public.passagem_excluir($1::uuid, 'Teste de inclusão pelo gestor')`, [rGest.rows[0].id])).ok, 'gestor exclui (com motivo) o que incluiu');
ok(await lerN(`select * from public.passagem_cards`, 'Médico') === 1, 'assistencial vê passagem');
ok(await lerN(`select * from public.passagem_cards`, 'Gestor Administrativo') === 1, 'gestor vê passagem');
ok(await lerN(`select * from public.passagem_cards`, 'Recepcionista') === 1, 'adm vê passagem');
ok(await lerN(`select * from public.passagem_cards`, 'Vigilante') === 0, 'vigilante NÃO vê passagem');
ok(await lerN(`select * from public.passagem_cards`, 'ASG') === 0, 'ASG (higienização) NÃO vê passagem');
ok(await lerN(`select * from public.passagem_cards`, 'Maqueiro') === 0, 'maqueiro NÃO vê passagem');
ok((await tenta('NIR', `update public.passagem_cards set paciente='X'`)).n === 0, 'edição direta da passagem é bloqueada (até para adm)');
ok((await tenta('NIR', `delete from public.passagem_cards`)).n === 0, 'exclusão direta da passagem é bloqueada (até para adm)');
const edit = (quem, motivo) => tenta(quem, `select public.passagem_editar($1::uuid, $2::jsonb, $3) as r`, [cardId, JSON.stringify({ leito: '07', prioridade: 'atencao' }), motivo]);
ok(!(await edit('NIR', '')).ok, 'editar sem motivo é recusado');
ok(!(await edit('NIR', 'abc')).ok, 'editar com motivo curto é recusado');
ok(!(await edit('NIR', null)).ok, 'editar com motivo nulo é recusado');
ok(!(await edit('Gestor Assistencial', 'abc')).ok, 'gestor também precisa informar o motivo ao editar');
ok(!(await edit('Médico', 'Correção de leito informado errado')).ok, 'médico NÃO edita passagem');
ok((await edit('NIR', 'Leito informado errado na passagem')).ok, 'adm edita passagem com motivo');
ok((await tenta('NIR', `select leito, prioridade from public.passagem_cards`)).rows[0].leito === '07', 'edição aplicada');
ok(await lerN(`select * from public.passagem_auditoria where acao='editar'`, 'Gestor Assistencial') === 1, 'gestor vê auditoria da edição');
ok(await lerN(`select * from public.passagem_auditoria`, 'NIR') === 0, 'adm NÃO vê a auditoria');
const aud = (await tenta('Gestor Assistencial', `select motivo, usuario_nome, dados_antes->>'leito' as antes, dados_depois->>'leito' as depois from public.passagem_auditoria where acao='editar'`)).rows[0];
ok(aud.motivo === 'Leito informado errado na passagem' && aud.usuario_nome === 'Teste NIR' && aud.antes === '03' && aud.depois === '07', 'auditoria guarda motivo, autor, antes e depois');
ok(!(await tenta('Médico', `select public.passagem_receber($1::uuid)`, [cardId])).ok, 'médico NÃO recebe passagem');
ok((await tenta('Recepcionista', `select public.passagem_receber($1::uuid)`, [cardId])).ok, 'adm recebe passagem');
ok(!(await tenta('Recepcionista', `select public.passagem_receber($1::uuid)`, [cardId])).ok, 'não recebe duas vezes');
ok((await tenta('Gestor Assistencial', `select recebido_por_nome from public.passagem_cards`)).rows[0].recebido_por_nome === 'Teste Recepcionista', 'recebimento registra quem recebeu');
ok(!(await tenta('NIR', `select public.passagem_excluir($1::uuid, '')`, [cardId])).ok, 'excluir sem motivo é recusado');
ok(!(await tenta('Gestor Assistencial', `select public.passagem_excluir($1::uuid, '')`, [cardId])).ok, 'gestor também precisa informar o motivo ao excluir');
ok((await tenta('NIR', `select public.passagem_excluir($1::uuid, 'Registro duplicado no turno')`, [cardId])).ok, 'adm exclui com motivo');
ok(await lerN(`select * from public.passagem_cards`, 'NIR') === 0, 'card excluído');
ok(await lerN(`select * from public.passagem_auditoria where acao='excluir'`, 'Gestor Assistencial') === 2, 'exclusões (do gestor e do adm) ficaram na auditoria');
ok(!(await tenta('NIR', `delete from public.passagem_auditoria`)).ok || (await tenta('NIR', `delete from public.passagem_auditoria`)).n === 0, 'ninguém apaga a auditoria');

// Dieta
const dieta = (quem, extra = {}) => tenta(quem,
  `insert into public.dieta_pedidos (paciente, leito, tipo_dieta, restricoes, enteral, enteral_via) values ($1,$2,$3,$4,$5,$6) returning id`,
  [extra.paciente ?? 'Maria', '05', extra.tipo ?? 'Branda', ['Sem sal'], extra.enteral ?? false, extra.via ?? null]);
const dEnf = await dieta('Enfermeiro');
ok(dEnf.ok, 'enfermeiro solicita dieta');
ok((await dieta('Médico')).ok, 'médico solicita dieta');
ok((await dieta('Gestor Assistencial')).ok, 'gestor solicita dieta');
ok(!(await dieta('Técnico de Enfermagem')).ok, 'téc. enfermagem NÃO solicita dieta');
ok(!(await dieta('Farmacêutico')).ok, 'farmacêutico NÃO solicita dieta');
ok(!(await dieta('Vigilante')).ok, 'vigilante NÃO solicita dieta');
ok(!(await dieta('Enfermeiro', { tipo: 'Invalida' })).ok, 'tipo de dieta inválido é recusado');
ok(await lerN(`select * from public.dieta_pedidos`, 'Técnico de Enfermagem') === 3, 'téc. enfermagem VÊ dietas');
ok(await lerN(`select * from public.dieta_pedidos`, 'Enfermeiro') === 3, 'enfermeiro vê dietas');
ok(await lerN(`select * from public.dieta_pedidos`, 'Médico') === 3, 'médico vê dietas');
ok(await lerN(`select * from public.dieta_pedidos`, 'Gestor Administrativo') === 3, 'gestor vê dietas');
for (const f of ['Farmacêutico', 'Técnico de Farmácia', 'Recepcionista', 'NIR', 'Vigilante', 'Maqueiro', 'ASG', 'Radiologista', 'Manutenção'])
  ok(await lerN(`select * from public.dieta_pedidos`, f) === 0, `${f} NÃO vê dietas`);
const dd = (await tenta('Médico', `select solicitante_categoria, status, criado_por_nome, criado_em from public.dieta_pedidos where id=$1`, [dEnf.rows[0].id])).rows[0];
ok(dd.solicitante_categoria === 'Enfermeiro' && dd.criado_por_nome === 'Teste Enfermeiro' && dd.criado_em, 'dieta guarda quem solicitou, a categoria e a data/hora');
ok((await tenta('Enfermeiro', `update public.dieta_pedidos set status='cancelada'`)).n === 0, 'dieta não é editada direto');
ok(!(await tenta('Enfermeiro', `select public.dieta_cancelar($1::uuid,'Lançada no paciente errado')`, [dEnf.rows[0].id])).ok, 'enfermeiro NÃO cancela dieta (só gestor)');
ok((await tenta('Gestor Assistencial', `select public.dieta_cancelar($1::uuid,'Lançada no paciente errado')`, [dEnf.rows[0].id])).ok, 'gestor cancela dieta com motivo');
const enteral = await dieta('Enfermeiro', { enteral: false, via: 'SNG' });
ok((await tenta('Enfermeiro', `select 1`)).ok && (await tenta('Médico', `select enteral_via from public.dieta_pedidos where id=$1`, [enteral.rows[0].id])).rows[0].enteral_via === null, 'parâmetros enterais são limpos quando enteral = não');

// Relatório gerencial
ok((await tenta('Gestor Assistencial', `insert into public.indicadores_mensais (ano, mes, cadastros, atendidos, obitos_menos_24h, internacoes) values (2026, 9, 5000, 4700, 3, 40)`)).ok, 'gestor lança indicadores');
ok(!(await tenta('Enfermeiro', `insert into public.indicadores_mensais (ano, mes) values (2026, 8)`)).ok, 'enfermeiro NÃO lança indicadores');
ok(!(await tenta('Gestor Assistencial', `insert into public.indicadores_mensais (ano, mes) values (2026, 9)`)).ok, 'mês duplicado é recusado');
ok(!(await tenta('Gestor Assistencial', `insert into public.indicadores_mensais (ano, mes) values (2026, 13)`)).ok, 'mês inválido é recusado');
ok(await lerN(`select * from public.indicadores_mensais`, 'Vigilante') === 1, 'vigilante vê o relatório gerencial');
ok(await lerN(`select * from public.indicadores_mensais`, 'Manutenção') === 0, 'terceiro NÃO vê o relatório');
ok((await tenta('Médico', `update public.indicadores_mensais set cadastros = 1`)).n === 0, 'médico não edita indicadores');
ok((await tenta('Médico', `delete from public.indicadores_mensais`)).n === 0, 'médico não exclui indicadores');

// Avisos
ok((await tenta('Gestor Assistencial', `insert into public.avisos (tipo, assunto) values ('Especial','Reunião às 14h')`)).ok, 'gestor publica aviso');
ok(!(await tenta('NIR', `insert into public.avisos (assunto) values ('x')`)).ok, 'adm NÃO publica aviso');
ok(await lerN(`select * from public.avisos`, 'Vigilante') === 1, 'vigilante vê avisos');

// RH
const rh = (quem, tipo, extra = {}) => tenta(quem,
  `insert into public.rh_solicitacoes (tipo, profissao, setor, dados, assinatura, segundo_nome, segundo_matricula) values ($1,'x','y','{}'::jsonb,'sig',$2,$3) returning id, status, matricula`,
  [tipo, extra.sn ?? null, extra.sm ?? null]);
const rExtra = await rh('Vigilante', 'extra');
ok(rExtra.ok && rExtra.rows[0].status === 'pendente', 'vigilante abre solicitação de RH');
ok(!(await rh('Manutenção', 'extra')).ok, 'terceiro NÃO abre solicitação de RH');
ok(!(await rh('Enfermeiro', 'troca')).ok, 'troca sem segundo membro é recusada');
const rTroca = await rh('Enfermeiro', 'troca', { sn: 'Teste Enfermeiro 2', sm: '2001' });
ok(rTroca.ok && rTroca.rows[0].status === 'aguardando_colega', 'troca aguarda o colega');
ok(await lerN(`select * from public.rh_solicitacoes`, 'Médico') === 0, 'colega aleatório não vê solicitações dos outros');
ok(await lerN(`select * from public.rh_solicitacoes`, 'Vigilante') === 1, 'solicitante vê a própria');
ok(await lerN(`select * from public.rh_solicitacoes`, 'Enfermeiro2') === 1, 'segundo membro vê a troca');
ok(await lerN(`select * from public.rh_solicitacoes`, 'RH Focal') === 2, 'gestor vê todas');
ok(!(await tenta('Gestor Assistencial', `select public.rh_decidir($1::uuid, true, null, 'assin')`, [rTroca.rows[0].id])).ok, 'não autoriza troca sem a assinatura do colega');
ok(!(await tenta('Enfermeiro', `select public.rh_colega_assinar($1::uuid, $2)`, [rTroca.rows[0].id, 'x'.repeat(60)])).ok, 'o próprio solicitante não assina como colega');
ok((await tenta('Enfermeiro2', `select public.rh_colega_assinar($1::uuid, $2)`, [rTroca.rows[0].id, 'x'.repeat(60)])).ok, 'colega assina a troca');
ok((await tenta('Gestor Assistencial', `select status from public.rh_solicitacoes where id=$1`, [rTroca.rows[0].id])).rows[0].status === 'pendente', 'troca vai para autorização');
ok(!(await tenta('Médico', `select public.rh_decidir($1::uuid, true, null, 'assin')`, [rExtra.rows[0].id])).ok, 'médico NÃO autoriza');
ok(!(await tenta('Vigilante', `select public.rh_decidir($1::uuid, true, null, 'assin')`, [rExtra.rows[0].id])).ok, 'solicitante NÃO autoriza a própria');
ok(!(await tenta('Gestor Assistencial', `select public.rh_decidir($1::uuid, false, '', null)`, [rExtra.rows[0].id])).ok, 'recusa exige motivo');
ok((await tenta('Gestor Assistencial', `select public.rh_decidir($1::uuid, true, null, 'assin')`, [rExtra.rows[0].id])).ok, 'gestor autoriza');
ok((await tenta('Vigilante', `select status, decidido_por_nome from public.rh_solicitacoes`)).rows[0].decidido_por_nome === 'Teste Gestor Assistencial', 'autorização registra o gestor');
ok(!(await tenta('Gestor Assistencial', `select public.rh_decidir($1::uuid, false, 'motivo', null)`, [rExtra.rows[0].id])).ok, 'não decide duas vezes');
ok(!(await tenta('Vigilante', `select public.rh_cancelar($1::uuid)`, [rExtra.rows[0].id])).ok, 'não cancela solicitação já decidida');
ok((await tenta('Enfermeiro', `select public.rh_cancelar($1::uuid)`, [rTroca.rows[0].id])).ok, 'solicitante cancela a própria pendente');

// Treinamento
const rc = await tenta('Gestor Assistencial', `insert into public.treinamentos (titulo, nota_minima) values ('Higiene das mãos', 70) returning id`);
ok(rc.ok, 'gestor cria treinamento');
const cid = rc.rows[0].id;
ok(!(await tenta('Enfermeiro', `insert into public.treinamentos (titulo) values ('x')`)).ok, 'enfermeiro NÃO cria treinamento');
await tenta('Gestor Assistencial', `insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values ($1,1,'Quando higienizar?','["Nunca","Antes e depois"]'::jsonb,1),($1,2,'Quanto tempo?','["10s","40-60s"]'::jsonb,1)`, [cid]);
ok(await lerN(`select * from public.treinamento_questoes`, 'Enfermeiro') === 0, 'enfermeiro NÃO enxerga o gabarito');
ok(await lerN(`select * from public.treinamento_questoes`, 'Gestor Assistencial') === 2, 'gestor vê as questões');
const prova = (await tenta('Vigilante', `select public.treinamento_prova($1) as p`, [cid])).rows[0].p;
ok(prova.length === 2 && !JSON.stringify(prova).includes('correta'), 'a prova entregue ao colaborador não traz o gabarito');
const reprov = (await tenta('Vigilante', `select public.treinamento_responder($1, '{"1":0,"2":1}'::jsonb) as r`, [cid])).rows[0].r;
ok(reprov.nota === 50 && reprov.aprovado === false && reprov.tentativa === 1, 'nota 50% = reprovado na tentativa 1');
const aprov = (await tenta('Vigilante', `select public.treinamento_responder($1, '{"1":1,"2":1}'::jsonb) as r`, [cid])).rows[0].r;
ok(aprov.nota === 100 && aprov.aprovado === true && aprov.tentativa === 2, 'nota 100% = aprovado na tentativa 2');
ok(!(await tenta('Manutenção', `select public.treinamento_responder($1, '{}'::jsonb)`, [cid])).ok, 'terceiro NÃO faz treinamento');
ok(await lerN(`select * from public.treinamento_registros`, 'Vigilante') === 2, 'colaborador vê os próprios registros');
ok(await lerN(`select * from public.treinamento_registros`, 'Enfermeiro') === 0, 'colaborador NÃO vê registros alheios');
ok(await lerN(`select * from public.treinamento_registros`, 'Gestor Assistencial') === 2, 'gestor vê todos os registros');
ok(!(await tenta('Vigilante', `select public.treinamento_validar($1)`, [aprov.registro_id])).ok, 'colaborador NÃO valida o próprio certificado');
ok((await tenta('Gestor Assistencial', `select public.treinamento_validar($1)`, [aprov.registro_id])).ok, 'gestor valida certificado');
ok(!(await tenta('Gestor Assistencial', `select public.treinamento_validar($1)`, [reprov.registro_id])).ok, 'reprovado não valida');

// Safety huddle
ok((await tenta('Maqueiro', `insert into public.safety_huddles (turno, checklist) values ('manha','{"a":true}'::jsonb)`)).ok, 'qualquer um registra huddle');
ok(!(await tenta('Manutenção', `insert into public.safety_huddles (turno) values ('manha')`)).ok, 'terceiro NÃO registra huddle');
ok((await tenta('Maqueiro', `delete from public.safety_huddles`)).n === 0, 'maqueiro não apaga huddle');
ok((await tenta('Gestor Assistencial', `delete from public.safety_huddles`)).n === 1, 'gestor apaga huddle');

// Manutenção
const man = (quem) => tenta(quem, `insert into public.manutencao_chamados (setor, categoria, descricao, status, responsavel) values ('Sala Amarela','Elétrica','Tomada solta no leito 2','concluido','eu') returning id, status, responsavel`);
const m1 = await man('Vigilante');
ok(m1.ok && m1.rows[0].status === 'aberto' && m1.rows[0].responsavel === null, 'vigilante abre chamado (status forçado para aberto)');
ok((await man('Manutenção')).ok, 'terceiro (Manutenção) abre chamado');
ok(!(await man('Agente Regulador')).ok, 'agente regulador NÃO abre chamado');
ok(await lerN(`select * from public.manutencao_chamados`, 'Refrigeração') === 2, 'terceiro (Refrigeração) vê chamados');
ok(await lerN(`select * from public.manutencao_chamados`, 'Enfermeiro') === 2, 'enfermeiro vê chamados');
ok((await tenta('Enfermeiro', `update public.manutencao_chamados set status='concluido'`)).n === 0, 'enfermeiro não altera chamado');
ok((await tenta('Manutenção', `update public.manutencao_chamados set status='em_atendimento', responsavel='Zé' where id=$1`, [m1.rows[0].id])).n === 1, 'terceiro atende chamado');
ok((await tenta('Gestor Assistencial', `update public.manutencao_chamados set status='concluido', parecer='Trocada' where id=$1`, [m1.rows[0].id])).n === 1, 'gestor conclui chamado');
ok((await tenta('Gestor Assistencial', `select concluido_em from public.manutencao_chamados where id=$1`, [m1.rows[0].id])).rows[0].concluido_em, 'conclusão carimba a data');
const m2 = await tenta('Maqueiro', `insert into public.manutencao_chamados (setor, categoria, descricao) values ('Recepção','Hidráulica','Torneira pingando') returning id`);
ok(!(await tenta('Vigilante', `select public.manutencao_cancelar($1)`, [m2.rows[0].id])).ok, 'outro usuário NÃO cancela o chamado');
ok((await tenta('Maqueiro', `select public.manutencao_cancelar($1)`, [m2.rows[0].id])).ok, 'autor cancela o próprio chamado aberto');
// terceiro só enxerga manutenção
for (const t of ['avisos', 'estoque_itens', 'documentos', 'escala_plantao', 'passagem_cards', 'dieta_pedidos', 'indicadores_mensais', 'treinamentos', 'safety_huddles'])
  ok(await lerN(`select * from public.${t}`, 'Manutenção') === 0, `terceiro NÃO lê ${t}`);
for (const t of ['avisos', 'estoque_itens', 'documentos', 'passagem_cards', 'dieta_pedidos', 'manutencao_chamados'])
  ok(await lerN(`select * from public.${t}`, 'Agente Regulador') === 0, `agente regulador NÃO lê ${t}`);

// Perfis e matriz não são graváveis pelo site
ok((await tenta('Gestor Administrativo', `update public.profiles set funcao='Gestor Assistencial'`)).n === 0, 'ninguém altera perfis pelo site (nem gestor)');
ok((await tenta('Gestor Administrativo', `delete from public.permissoes`)).n === 0, 'ninguém altera a matriz pelo site');
ok(!(await tenta('Enfermeiro', `insert into public.profiles (id, matricula, nome, funcao) values (gen_random_uuid(),'9','x','Médico')`)).ok, 'ninguém cria perfil pelo site');
ok((await tenta('Enfermeiro', `select public.marcar_senha_trocada()`)).ok && (await tenta('Enfermeiro', `select trocar_senha from public.profiles where matricula='1010'`)).rows.length >= 0, 'marcar senha trocada funciona');

console.log(`\n${total - falhas}/${total} verificações passaram.`);
process.exit(falhas ? 1 : 0);
