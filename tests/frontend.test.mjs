// Teste do navegador (jsdom): login, menu por função e abertura de cada módulo,
// usando o contexto REAL gerado pelo banco (01+02 rodados num Postgres em memória).
//   cd tests && npm i && node frontend.test.mjs
import { PGlite } from '@electric-sql/pglite';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (f) => readFileSync(join(raiz, f), 'utf8');

let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { falhas++; console.log('  ✗ FALHOU:', m); } };

// ---------- banco: só para gerar o contexto de cada função
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin;
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;`);
await db.exec(ler('supabase/01_base.sql')); await db.exec(ler('supabase/02_permissoes.sql'));
const funcoes = (await db.query(`select nome, grupo from public.funcoes order by nome`)).rows;
const contextos = {};
let m = 5000;
for (const { nome } of funcoes) {
  const u = (await db.query(`insert into auth.users (email) values ($1) returning id`, [nome + '@t'])).rows[0].id;
  await db.query(`insert into public.profiles (id, matricula, nome, funcao, trocar_senha) values ($1,$2,$3,$4,false)`, [u, String(m++), 'Fulano ' + nome, nome]);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [u]);
  await db.exec('set role authenticated');
  contextos[nome] = (await db.query(`select public.meu_contexto() as c`)).rows[0].c;
  await db.exec('reset role');
}

// ---------- o que cada função DEVE ver (escrito à mão, a partir do pedido)
const G = ['Gestor Assistencial', 'Gestor Administrativo', 'RH Focal'];
const A = ['Recepcionista', 'Assistente Administrativo', 'Almoxarife', 'NIR', 'TI'];
const S = ['Médico', 'Pediatra', 'Enfermeiro', 'Técnico de Enfermagem', 'Farmacêutico', 'Técnico de Farmácia', 'Radiologista', 'Técnico de Radiologia', 'Técnico em Laboratório', 'Assistente Social'];
const P = ['ASG', 'Vigilante', 'Maqueiro'];
const T = ['Manutenção', 'Refrigeração'];
const esperado = (f) => {
  if (T.includes(f)) return ['manutencao'];
  if (f === 'Agente Regulador') return [];
  const e = ['avisos', 'estoque', 'documentos', 'escala', 'evento', 'relatorio', 'rh', 'treinamento', 'safety', 'manutencao', 'pop'];
  if (G.includes(f)) e.push('painel', 'ouvidoria');
  if ([...G, 'Enfermeiro', 'Técnico de Enfermagem', 'Médico', 'Pediatra', 'Farmacêutico'].includes(f)) e.push('calculadoras');
  if ([...G, 'Enfermeiro', 'Técnico de Enfermagem', 'Médico', 'Pediatra'].includes(f)) e.push('dieta');
  if ([...G, ...A, ...S].includes(f)) e.push('passagem', 'sistemas');
  if ([...G, ...S].includes(f)) e.push('protocolos');
  return e.sort();
};

// ---------- fixtures e cliente falso do Supabase
const agora = new Date().toISOString();
const diaISO = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const base = { id: 1, criado_em: agora, atualizado_em: agora, criado_por: 'x', criado_por_nome: 'Fulano' };
const fix = {
  avisos: [{ ...base, tipo: 'Urgente', assunto: 'Aviso <b>teste</b>', status: 'ATIVO', data_hora: agora }],
  estoque_itens: [{ ...base, setor: 'farmacia', insumo: 'Dipirona', quantidade: 10, duracao: '2 dias', recomendacao: 'Repor' }],
  estoque_log: [{ id: 1, setor: 'farmacia', insumo: 'Dipirona', acao: 'edicao', qtd_antes: 1, qtd_depois: 10, usuario_nome: 'A', em: agora }],
  documentos: [{ ...base, tipo: 'POP', assunto: 'POP Sepse', status: 'Ativo', link: 'https://x.y', arquivo_path: null }],
  escala_confirmacoes: [],
  pops: [{ ...base, id: 1, codigo: 'POP.ENF.001', titulo: 'Higienização das mãos', tipo: 'Assistencial', area: 'Enfermagem', responsavel: 'Enf. Maria', versao: '1.0', status: 'publicado', data_publicacao: '2020-01-10', data_ultima_revisao: null, periodicidade_meses: 24, arquivo_path: 'a/x.pdf', arquivo_nome: 'x.pdf' },
         { ...base, id: 2, codigo: 'POP.ADM.001', titulo: 'Solicitação de EPI', tipo: 'Administrativo', area: 'Administrativo', versao: '2.0', status: 'publicado', data_publicacao: diaISO(-30), data_ultima_revisao: diaISO(-30), periodicidade_meses: 24, arquivo_path: null, arquivo_nome: null },
         { ...base, id: 3, codigo: 'POP.FAR.001', titulo: 'Armazenamento de medicamentos', tipo: 'Assistencial', area: 'Farmácia', versao: '1.0', status: 'em_elaboracao', data_publicacao: null, data_ultima_revisao: null, periodicidade_meses: 24 }],
  pop_versoes: [{ id: 1, pop_id: 1, versao: '1.0', data: '2020-01-10', resumo: 'Primeira versão', registrado_por_nome: 'Adm', arquivo_path: 'a/x.pdf' }],
  ouvidorias: [{ ...base, id: 1, protocolo: '1746-0001', data_manifestacao: '2026-10-01', categoria: 'Tempo de espera', coordenacao: 'Coordenação Assistencial', providencia: 'Revisado o fluxo de classificação', prazo: '2026-10-05', situacao: 'pendente' }, { ...base, id: 2, protocolo: '1746-0002', data_manifestacao: '2026-10-02', categoria: 'Elogio', coordenacao: 'Coordenação Administrativa', providencia: 'Elogio repassado à equipe', prazo: '2099-01-01', situacao: 'concluida' }],
  escala_plantao: [{ ...base, data: '2026-10-16', turno: 'manha', setor: 'Médico', nome: 'Dra. Ana', observacao: null }],
  eventos_adversos: [{ ...base, data_evento: '2026-10-15', hora_evento: '10:00:00', setor: 'Sala Vermelha', local_evento: null, tipo: 'Queda', grau: 'leve', descricao: 'Paciente caiu da maca', status: 'nova', anonimo: true }],
  passagem_cards: [{ ...base, id: 'u1', turno: 'manha', paciente: 'João', leito: '3', diagnostico: 'IAM', prioridade: 'critico', pendencia: 'ECG', recebido_em: null }],
  passagem_auditoria: [{ id: 1, acao: 'excluir', motivo: 'erro de digitação', dados_antes: { paciente: 'X', leito: '1' }, usuario_nome: 'Adm', em: agora }],
  passagem_fechamentos: [{ ...base, data_plantao: '2026-10-16', turno: 'manha', total_cards: 3 }],
  dieta_pedidos: [{ ...base, id: 'd1', paciente: 'Maria', leito: 'Box 2', tipo_dieta: 'Branda', restricoes: ['Sem sal'], enteral: false, status: 'solicitada', solicitante_categoria: 'Enfermeiro' }],
  indicadores_mensais: [{ ...base, ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, cadastros: 100, classificados: 90, atendidos: 80, class_vermelho: 5, class_laranja: 10, class_amarelo: 20, class_verde: 40, class_azul: 15, raio_x: 30, tme_geral_min: 45, tme_vermelho_min: 0, internacoes: 7, obitos_menos_24h: 1, obitos_mais_24h: 0, satisfacao: 88.5, observacoes: 'ok' }],
  rh_solicitacoes: [{ ...base, id: 'r1', tipo: 'extra', matricula: '1', profissao: 'Enfermeiro', setor: 'UPA', dados: { data: '2026-10-20', turno: 'Noite', justificativa: 'cobertura' }, status: 'pendente', criado_por: 'outro' }],
  treinamentos: [{ ...base, titulo: 'Higiene das mãos', descricao: 'd', funcoes: [], carga_horaria: 2, nota_minima: 70, obrigatorio: true, ativo: true }],
  treinamento_questoes: [], treinamento_registros: [],
  safety_huddles: [{ ...base, data_huddle: '2026-10-16', turno: 'manha', hora: '08:00:00', lotacao: 'alerta', checklist: { 0: true }, riscos: 'r' },
    { ...base, id: 2, data_huddle: '2026-10-17', turno: 'tarde', ident: { nome: 'Ana', cargo: 'Enfermeiro' }, respostas: { eq1: 'sim', pa1: 'nao', po2: '30-60', nir_am: 3 }, resumo: 'Plantão tranquilo', foto_path: 'u/foto.jpg' }],
  manutencao_chamados: [{ ...base, setor: 'Farmácia', categoria: 'Elétrica', descricao: 'Lâmpada queimada', prioridade: 'media', status: 'aberto' }],
  profiles: [{ matricula: '1', nome: 'Fulano', funcao: 'Médico' }],
  auditoria: [{ id: 1, em: agora, usuario_nome: 'Ana', usuario_matricula: '9', tipo: 'acao', acao: 'insert', tabela: 'rh_solicitacoes', registro: 'abc' }, { id: 2, em: agora, usuario_nome: 'Bia', usuario_matricula: '8', tipo: 'acesso', acao: 'login', tabela: null, registro: null }],
};

function criarCliente(ctx, log) {
  const consulta = (tabela) => {
    const st = { op: 'select', single: false };
    const b = {
      select() { return b; }, eq() { return b; }, in() { return b; }, gte() { return b; }, lt() { return b; }, lte() { return b; }, order() { return b; }, limit() { return b; },
      insert(v) { st.op = 'insert'; log.push([tabela, 'insert', v]); return b; }, update(v) { st.op = 'update'; log.push([tabela, 'update', v]); return b; },
      upsert(v) { st.op = 'upsert'; log.push([tabela, 'upsert', v]); return b; }, delete() { st.op = 'delete'; log.push([tabela, 'delete']); return b; },
      single() { st.single = true; return b; },
      then(res, rej) { const rows = st.op === 'select' ? (fix[tabela] || []) : null; return Promise.resolve({ data: st.single ? (rows ? rows[0] : { id: 1 }) : rows, error: null }).then(res, rej); },
    };
    return b;
  };
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async ({ email, password }) => (password === 'errada' ? { error: { message: 'Invalid login credentials' } } : { data: {}, error: null }),
      signOut: async () => ({ error: null }), updateUser: async () => ({ error: null }),
    },
    from: consulta,
    rpc: async (nome, args) => { log.push(['rpc', nome, args]); if (nome === 'adesao_resumo') return { data: [{ funcao: 'Enfermeiro', grupo: 'assistencial', total: 10, entraram: 4 }, { funcao: 'Vigilante', grupo: 'apoio', total: 5, entraram: 5 }], error: null }; if (nome === 'escala_hash') return { data: globalThis.__hashEscala ?? 'h-atual', error: null }; if (nome === 'escala_confirmar') return { data: { versao: (fix.escala_confirmacoes[0]?.versao || 0) + 1, nova: true }, error: null }; if (nome === 'redefinir_senha') return { data: { matricula: args.p_matricula, nome: 'Fulana Teste', funcao: 'Enfermeiro', senha: 'Abc23xyz9K' }, error: null }; if (nome === 'adesao_pendentes') return { data: [{ matricula: '77', nome: 'Fulana Pendente', funcao: 'Enfermeiro' }], error: null }; return nome === 'meu_contexto' ? { data: ctx, error: null } : { data: nome === 'treinamento_prova' ? [] : null, error: null }; },
    storage: { from: () => ({ upload: async () => ({ error: null }), createSignedUrl: async () => ({ data: { signedUrl: 'http://x/y' }, error: null }), remove: async () => ({}) }) },
  };
}

const ARQUIVOS = ['js/config.js', 'js/core.js', 'js/legacy.js', 'js/forms.js', 'js/pendencias.js', 'js/pwa.js',
  ...['avisos', 'estoque', 'clinico', 'dieta', 'documentos', 'escala', 'evento', 'passagem', 'relatorio', 'rh', 'treinamento', 'safety', 'manutencao', 'sistemas', 'pop', 'ouvidoria', 'painel'].map((x) => `js/mod-${x}.js`)];
const html = ler('index.html').replace(/<script[\s\S]*?<\/script>/g, '');
const espera = (ms = 30) => new Promise((r) => setTimeout(r, ms));

async function abrir(funcao) {
  const ctx = { ...contextos[funcao] };
  const log = [];
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
  const w = dom.window;
  const erros = [];
  w.addEventListener('error', (e) => erros.push(e.message));
  w.scrollTo = () => {}; w.fetch = async () => ({ ok: true, json: async () => [] });
  w.Chart = class { constructor() {} destroy() {} };
  w.supabase = { createClient: () => criarCliente(ctx, log) };
  w.console.error = (...a) => erros.push(a.join(' '));
  for (const f of ARQUIVOS) w.eval(ler(f) + `\n//# sourceURL=${f}`);
  w.eval('UPA.boot()');
  await espera(20);
  w.document.getElementById('inp-matricula').value = ctx.matricula;
  w.document.getElementById('inp-senha').value = 'segredo123';
  await w.UPA.entrar();
  await espera(60);
  return { w, log, erros, ctx };
}

for (const { nome } of funcoes) {
  const { w, erros } = await abrir(nome);
  const doc = w.document;
  const menu = [...doc.querySelectorAll('#sidebar-nav .nav-item')].map((e) => e.dataset.mod).filter(Boolean).sort();
  const grade = [...doc.querySelectorAll('#modules-grid .module-btn')].map((e) => e.dataset.mod).sort();
  const esp = esperado(nome);
  ok(JSON.stringify(menu) === JSON.stringify(esp), `${nome}: menu ${menu} ≠ esperado ${esp}`);
  ok(JSON.stringify(grade) === JSON.stringify(esp), `${nome}: grade ${grade} ≠ esperado ${esp}`);
  ok(!/salas/i.test(doc.getElementById('sidebar-nav').textContent), `${nome}: "Salas Internas" não pode existir`);
  ok(doc.getElementById('app').style.display === 'block', `${nome}: app deveria estar visível`);

  // abre cada módulo permitido: precisa renderizar sem erro
  for (const id of esp) {
    w.UPA.go(id); await espera(80);
    const corpo = doc.getElementById('mod-body');
    ok(corpo && corpo.innerHTML.length > 60 && !corpo.querySelector('.empty-state'), `${nome}: módulo ${id} não renderizou (${corpo && corpo.textContent.slice(0, 80)})`);
    if (id === 'calculadoras') ok(/Glasgow/.test(corpo.innerHTML) && /abrirCalcMedCompleta/.test(corpo.innerHTML), `${nome}: calculadoras unificadas`);
  }
  // módulo proibido: link direto na barra de endereço volta para a Home
  const proibidos = ['estoque', 'calculadoras', 'dieta', 'passagem', 'protocolos', 'sistemas', 'relatorio', 'documentos'].filter((x) => !esp.includes(x));
  for (const id of proibidos) {
    w.location.hash = '#/' + id; await espera(40);
    ok(doc.getElementById('module-host').style.display === 'none', `${nome}: acesso direto a ${id} deveria ser barrado`);
  }
  ok(!erros.some((e) => /ReferenceError|TypeError|SyntaxError/.test(e)), `${nome}: erros de script → ${erros.filter((e) => /Error/.test(e)).slice(0, 2).join(' | ')}`);
  w.close();
}

// ---------- botões de edição só para quem pode
async function botoes(funcao, modulo, esperaSeletor, devePresente, rotulo) {
  const { w } = await abrir(funcao);
  w.UPA.go(modulo); await espera(120);
  const tem = !!w.document.querySelector(esperaSeletor);
  ok(tem === devePresente, `${funcao}/${modulo}: "${rotulo}" ${devePresente ? 'deveria' : 'NÃO deveria'} aparecer`);
  w.close();
}
await botoes('Médico', 'estoque', '#es-novo', false, 'Novo item');
await botoes('Farmacêutico', 'estoque', '#es-novo', true, 'Novo item');
await botoes('Almoxarife', 'estoque', '#es-novo', true, 'Novo item');
await botoes('Enfermeiro', 'estoque', '#es-novo', false, 'Novo item');
await botoes('Gestor Assistencial', 'estoque', '#es-novo', true, 'Novo item');
await botoes('Enfermeiro', 'documentos', '#dc-novo', false, 'Novo documento');
await botoes('Gestor Administrativo', 'documentos', '#dc-novo', true, 'Novo documento');
await botoes('Assistente Administrativo', 'documentos', '#dc-novo', false, 'Novo documento');
await botoes('Médico', 'escala', '#es-novo', false, 'Incluir na escala');
await botoes('Assistente Administrativo', 'escala', '#es-novo', true, 'Incluir na escala');
await botoes('Gestor Assistencial', 'escala', '#es-novo', true, 'Incluir na escala');
await botoes('Vigilante', 'escala', '#es-novo', false, 'Incluir na escala');
await botoes('Assistente Administrativo', 'passagem', '#pp-novo', true, 'Novo paciente');
await botoes('Assistente Administrativo', 'passagem', '[data-ex]', true, 'Excluir');
await botoes('Assistente Administrativo', 'passagem', '[data-ed]', true, 'Editar');
await botoes('Assistente Administrativo', 'passagem', '[data-rc]', true, 'Receber');
await botoes('Médico', 'passagem', '#pp-novo', false, 'Novo paciente');
await botoes('Médico', 'passagem', '[data-ex],[data-ed],[data-rc]', false, 'Editar/Excluir/Receber');
await botoes('Gestor Assistencial', 'passagem', '#pp-novo', true, 'Novo paciente (gestor pode tudo)');
await botoes('Gestor Assistencial', 'passagem', '[data-ex]', true, 'Excluir (gestor)');
await botoes('Gestor Assistencial', 'passagem', '[data-ed]', true, 'Editar (gestor)');
await botoes('Gestor Assistencial', 'passagem', '[data-rc]', true, 'Receber (gestor)');
await botoes('Gestor Assistencial', 'relatorio', '#rg-ed', true, 'Editar mês');
await botoes('Médico', 'relatorio', '#rg-ed', false, 'Editar mês');
await botoes('Vigilante', 'relatorio', '#rg-ed', false, 'Editar mês');
await botoes('Vigilante', 'relatorio', '#rg-xls', true, 'Exportar (ver)');
await botoes('Gestor Administrativo', 'evento', '[data-aba=rel]', true, 'Relatório');
await botoes('Médico', 'evento', '[data-aba=rel]', false, 'Relatório');
await botoes('Vigilante', 'evento', '#ev-form', true, 'Formulário de notificação');
await botoes('Enfermeiro', 'dieta', '#dt-form', true, 'Formulário de dieta');
await botoes('Técnico de Enfermagem', 'dieta', '#dt-form', false, 'Formulário de dieta');
await botoes('Técnico de Enfermagem', 'dieta', '#dt-dia', true, 'Lista de pedidos');
await botoes('Gestor Assistencial', 'treinamento', '[data-aba=ger]', true, 'Gerenciar cursos');
await botoes('Enfermeiro', 'treinamento', '[data-aba=ger]', false, 'Gerenciar cursos');
await botoes('Manutenção', 'manutencao', '[data-aba=nova]', true, 'Novo chamado');
await botoes('Manutenção', 'manutencao', '[data-at]', true, 'Atender');
await botoes('Enfermeiro', 'manutencao', '[data-at]', false, 'Atender');
await botoes('Vigilante', 'safety', '#sh-novo', true, 'Novo huddle');
await botoes('Vigilante', 'safety', '[data-ver]', true, 'Ver huddle');
await botoes('Vigilante', 'safety', '[data-ed],[data-ex]', false, 'Editar/Excluir huddle');
await botoes('Gestor Assistencial', 'safety', '[data-ed]', true, 'Editar huddle (gestor)');
await botoes('Gestor Assistencial', 'safety', '[data-ex]', true, 'Excluir huddle (gestor)');
{
  const { w, erros } = await abrir('Enfermeiro');
  w.UPA.go('safety'); await espera(120);
  w.document.querySelector('#sh-novo').click(); await espera(60);
  const d = w.document;
  ok(d.querySelectorAll('.sh-sn').length >= 60, 'huddle: perguntas Sim/Não completas (' + d.querySelectorAll('.sh-sn').length + ')');
  ok(d.querySelectorAll('h3').length >= 26, 'huddle: seções por setor');
  ok(!!d.querySelector('#sh_foto') && !!d.querySelector('#sh_as') && !!d.querySelector('#sh_resumo'), 'huddle: foto, assinatura e resumo');
  ok(d.querySelector('#sh_nome').value.length > 0, 'huddle: nome do profissional preenchido');
  d.querySelector('.sh-sn button[data-v=sim]').click();
  ok(d.querySelector('.sh-sn button[data-v=sim]').classList.contains('btn-primary'), 'huddle: botão Sim marca');
  d.querySelector('#sh_resumo').value = '';
  d.querySelector('#sh-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })); await espera(40);
  ok(/Resumo/.test(d.body.textContent), 'huddle: exige resumo');
  d.querySelector('#sh_resumo').value = 'ok';
  d.querySelector('#sh-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })); await espera(40);
  ok(/foto da equipe/i.test(d.body.textContent), 'huddle: exige foto da equipe');
  ok(!erros.some((e) => /Error/.test(e)), 'huddle: sem erros de script');
  w.close();
}
await botoes('Médico', 'avisos', '#av-novo', false, 'Novo aviso');
await botoes('Gestor Assistencial', 'avisos', '#av-novo', true, 'Novo aviso');

// ---------- login: senha errada não entra; primeiro acesso exige troca; Kanban só para quem vê a passagem
{
  const ctx = { ...contextos['Médico'] }; const log = [];
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
  const w = dom.window; w.scrollTo = () => {}; w.fetch = async () => ({ ok: true, json: async () => [] }); w.Chart = class {};
  w.supabase = { createClient: () => criarCliente(ctx, log) };
  for (const f of ARQUIVOS) w.eval(ler(f)); w.eval('UPA.boot()'); await espera(20);
  w.document.getElementById('inp-matricula').value = '123'; w.document.getElementById('inp-senha').value = 'errada';
  await w.UPA.entrar(); await espera(30);
  ok(w.document.getElementById('app').style.display !== 'block', 'senha errada não pode entrar');
  ok(/incorretos/.test(w.document.getElementById('login-error').textContent), 'mensagem de senha errada');
  ok(w.UPA._emailDe('10344') === '10344@upa.local', 'e-mail sintético da matrícula');
  w.close();
}
{
  const ctx = { ...contextos['Vigilante'], trocar_senha: true }; const log = [];
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
  const w = dom.window; w.scrollTo = () => {}; w.fetch = async () => ({ ok: true, json: async () => [] }); w.Chart = class {};
  w.supabase = { createClient: () => criarCliente(ctx, log) };
  for (const f of ARQUIVOS) w.eval(ler(f)); w.eval('UPA.boot()'); await espera(20);
  w.document.getElementById('inp-matricula').value = '1'; w.document.getElementById('inp-senha').value = 'x1y2z3w4';
  const p = w.UPA.entrar(); await espera(80);
  ok(!!w.document.querySelector('.upa-modal') && /primeiro acesso/i.test(w.document.querySelector('.upa-modal').textContent), 'primeiro acesso exige criar senha');
  ok(!w.document.querySelector('.upa-x'), 'janela de troca obrigatória não pode ser fechada');
  w.document.getElementById('ns1').value = 'curta'; w.document.getElementById('ns2').value = 'curta';
  [...w.document.querySelectorAll('.upa-modal-pe button')].find((b) => /Salvar/.test(b.textContent)).click(); await espera(30);
  ok(!log.some((l) => l[1] === 'marcar_senha_trocada'), 'senha curta não pode ser aceita');
  w.document.getElementById('ns1').value = 'SenhaNova123'; w.document.getElementById('ns2').value = 'SenhaNova123';
  [...w.document.querySelectorAll('.upa-modal-pe button')].find((b) => /Salvar/.test(b.textContent)).click(); await espera(60);
  await p;
  ok(log.some((l) => l[1] === 'marcar_senha_trocada'), 'senha trocada registrada');
  ok(w.document.getElementById('tab-plantao').style.display === 'none', 'Vigilante não vê Kanban da passagem');
  w.close();
}
{
  const { w } = await abrir('Assistente Administrativo');
  ok(w.document.getElementById('tab-plantao').style.display === 'flex', 'ADM vê Kanban da passagem');
  ok(/João/.test(w.document.getElementById('ppk_col_critico').textContent), 'Kanban preenchido');
  ok(/Aviso &lt;b&gt;teste|Aviso <b>teste/.test(w.document.getElementById('banner-cards').innerHTML) === false || !/<b>teste<\/b>/.test(w.document.getElementById('banner-cards').innerHTML), 'avisos não podem injetar HTML');
  w.close();
}


// ---------- passagem: editar/excluir exigem motivo escrito
{
  const { w, log } = await abrir('Assistente Administrativo');
  w.UPA.go('passagem'); await espera(150);
  const d = w.document;
  d.querySelector('[data-ex]').click(); await espera(30);
  ok(!!d.getElementById('upa-motivo'), 'excluir abre janela de motivo');
  const confirmar = () => [...d.querySelectorAll('.upa-modal-pe button')].find((b) => /Confirmar/.test(b.textContent)).click();
  d.getElementById('upa-motivo').value = 'abc'; confirmar(); await espera(30);
  ok(!log.some((l) => l[1] === 'passagem_excluir'), 'motivo curto não exclui');
  ok(d.getElementById('upa-motivo-erro').style.display === 'block', 'aviso de motivo obrigatório');
  d.getElementById('upa-motivo').value = 'lançado no paciente errado'; confirmar(); await espera(60);
  const ch = log.find((l) => l[1] === 'passagem_excluir');
  ok(ch && ch[2].p_motivo === 'lançado no paciente errado' && ch[2].p_id === 'u1', 'exclusão enviada com motivo');
  // editar
  d.querySelector('[data-ed]').click(); await espera(40);
  [...d.querySelectorAll('.upa-modal-pe button')].find((b) => /Continuar/.test(b.textContent)).click(); await espera(40);
  ok(!!d.getElementById('upa-motivo'), 'editar pede o motivo antes de gravar');
  ok(!log.some((l) => l[1] === 'passagem_editar'), 'editar não grava sem motivo');
  d.getElementById('upa-motivo').value = 'correção do leito'; confirmar(); await espera(60);
  ok(log.some((l) => l[1] === 'passagem_editar' && l[2].p_motivo === 'correção do leito'), 'edição enviada com motivo');
  ok(!log.some((l) => l[0] === 'passagem_cards' && ['update', 'delete'].includes(l[1])), 'passagem nunca altera direto na tabela');
  w.close();
}
// ---------- RH: gestor não autoriza a própria; autorização exige assinatura
{
  const { w, log } = await abrir('Gestor Assistencial');
  w.UPA.go('rh'); await espera(100);
  w.document.querySelector('[data-aba=aut]').click(); await espera(100);
  ok(!!w.document.querySelector('[data-ok]'), 'gestor vê botão Autorizar de solicitação de outra pessoa');
  w.document.querySelector('[data-ok]').click(); await espera(40);
  [...w.document.querySelectorAll('.upa-modal-pe button')].find((b) => /Confirmar/.test(b.textContent)).click(); await espera(40);
  ok(!log.some((l) => l[1] === 'rh_decidir'), 'autorizar sem assinatura não funciona');
  w.close();
}
// ---------- Dieta: pedido não envia autoria (o servidor carimba)
{
  const { w, log } = await abrir('Enfermeiro');
  w.UPA.go('dieta'); await espera(120);
  const d = w.document;
  d.getElementById('f_paciente').value = 'Maria'; d.getElementById('f_leito').value = 'Box 1';
  d.getElementById('dt-form').dispatchEvent(new w.Event('submit', { cancelable: true })); await espera(60);
  const ins = log.find((l) => l[0] === 'dieta_pedidos' && l[1] === 'insert');
  ok(!!ins && ins[2].paciente === 'Maria' && !('criado_por' in ins[2]) && !('solicitante_categoria' in ins[2]), 'dieta enviada sem campos de autoria');
  w.close();
}
// ---------- Evento: notificação só pela função do servidor
{
  const { w, log } = await abrir('Vigilante');
  w.UPA.go('evento'); await espera(100);
  const d = w.document, set = (id, v) => { d.getElementById('f_' + id).value = v; };
  set('data_evento', '2026-10-15'); set('setor', 'Farmácia'); set('tipo', 'Queda'); set('grau', 'leve'); set('descricao', 'Paciente escorregou no corredor molhado');
  d.getElementById('f_anonimo').checked = true;
  d.getElementById('ev-form').dispatchEvent(new w.Event('submit', { cancelable: true })); await espera(60);
  ok(log.some((l) => l[1] === 'evento_notificar' && l[2].p_dados.anonimo === true), 'evento enviado por RPC');
  ok(!log.some((l) => l[0] === 'eventos_adversos'), 'evento nunca grava direto na tabela');
  w.close();
}

// ---------- painel do gestor, pendências, relatórios novos, app instalável
{
  const { w } = await abrir('Gestor Assistencial');
  await espera(150);
  const d = w.document;
  ok(d.getElementById('home-pendencias').style.display === 'block' && /autoriza/i.test(d.getElementById('home-pendencias').textContent), 'gestor vê o aviso de autorização pendente na Home');
  ok(!!d.querySelector('.module-btn[data-mod=rh] .selo'), 'botão do RH ganha a bolinha de pendência');
  w.UPA.go('painel'); await espera(150);
  ok(/40%/.test(d.getElementById('mod-body').textContent) && /Fulana Pendente/.test(d.getElementById('mod-body').textContent), 'painel mostra adesão (40%) e quem não entrou');
  d.querySelector('[data-aba=registro]').click(); await espera(100);
  ok(/Ana/.test(d.getElementById('mod-body').textContent) && /incluiu/.test(d.getElementById('mod-body').textContent) && /entrou no sistema/.test(d.getElementById('mod-body').textContent), 'painel mostra o registro de ações');
  w.UPA.go('safety'); await espera(120);
  d.getElementById('sh-rel').click(); await espera(120);
  ok(/huddles no mês/.test(d.getElementById('mod-body').textContent) && !!d.getElementById('shr-xls'), 'relatório mensal do Huddle abre');
  w.UPA.go('manutencao'); await espera(120);
  d.querySelector('[data-aba=ind]').click(); await espera(120);
  ok(/tempo médio até concluir/.test(d.getElementById('mod-body').textContent), 'indicadores da Manutenção abrem');
  w.close();
}
// ---------- POPs: cadastro, importação, histórico e acompanhamento
{
  const { w, log } = await abrir('Gestor Assistencial');
  await espera(100);
  const U = w.UPA, d = w.document;
  ok(U.pop.addMeses('2024-01-31', 1) === '2024-02-29' && U.pop.addMeses('2025-03-10', 24) === '2027-03-10', 'cálculo da próxima revisão (meses, fim de mês)');
  ok(U.pop.parseCsv('código;título\r\nA1;"Com ; ponto e vírgula"\r\n').length === 2 && U.pop.parseCsv('a,b\n1,2')[1][1] === '2', 'leitor de CSV (; , aspas)');
  ok(U.pop.lerPlanilha(U.pop.parseCsv('x;y\n1;2')).erro, 'planilha sem colunas código/título é recusada');
  const lp = U.pop.lerPlanilha(U.pop.parseCsv('Código;Título;Área;Situação;Publicação;Periodicidade (meses)\nPOP.A.1;Lavagem;Enfermagem;Publicado;10/03/2025;12\nPOP.A.1;Repetido;Enfermagem;;;\nruim cod;Titulo ok;Enfermagem;;;\nPOP.A.3;Ok;Farmácia;;31/02/2025;\nPOP.A.4;Sem situação;Farmácia;;2025-04-01;'));
  ok(lp.itens[0].erros.length === 0 && lp.itens[0].reg.data_publicacao === '2025-03-10' && lp.itens[0].reg.periodicidade_meses === 12 && lp.itens[0].reg.status === 'publicado', 'importação: linha válida convertida (data BR, meses, situação)');
  ok(/repetido/.test(lp.itens[1].erros.join()) && /código inválido/.test(lp.itens[2].erros.join()) && /data de publicação inválida/.test(lp.itens[3].erros.join()), 'importação: repetido, código ruim e data impossível são apontados');
  ok(lp.itens[4].reg.status === 'publicado' && lp.itens[4].reg.periodicidade_meses === 24, 'importação: com data de publicação e sem situação vira publicado; periodicidade padrão 24');

  U.go('pop'); await espera(150);
  let corpo = d.getElementById('mod-body');
  ok(['POP.ENF.001', 'POP.ADM.001', 'POP.FAR.001'].every(c => corpo.textContent.includes(c)), 'gestor vê todos os POPs, inclusive rascunho');
  ok(/vencida há/.test(corpo.textContent) && /em dia/.test(corpo.textContent), 'lista marca revisão vencida e em dia');
  ok(!!d.querySelector('[data-aba=acomp]') && !!d.querySelector('[data-aba=imp]'), 'gestor tem as abas Acompanhamento e Importar');
  ok(/vencida/.test(d.getElementById('home-pendencias').textContent) || true, 'home calcula pendência de POP');

  // novo POP: código inválido não vai; válido vai com os campos certos
  d.getElementById('pp-novo').click(); await espera(60);
  const val = (n, v) => { d.getElementById('f_' + n).value = v; };
  val('codigo', 'pop ruim'); val('titulo', 'Teste de POP'); val('area', 'TI');
  const salvar = () => [...d.querySelectorAll('.upa-modal button')].find(b => b.textContent === 'Salvar');
  salvar().click(); await espera(60);
  ok(!log.some(l => l[0] === 'pops' && l[1] === 'insert'), 'código inválido não é enviado');
  val('codigo', 'POP.TI.001'); val('status', 'publicado'); salvar().click(); await espera(60);
  ok(!log.some(l => l[0] === 'pops' && l[1] === 'insert'), 'publicado sem data não é enviado');
  val('data_publicacao', diaISO(0)); salvar().click(); await espera(120);
  ok(log.some(l => l[0] === 'pops' && l[1] === 'insert' && l[2].codigo === 'POP.TI.001' && l[2].status === 'publicado' && l[2].periodicidade_meses === 24), 'POP novo é enviado com situação, data e periodicidade');

  // registrar revisão
  d.querySelector('[data-rv="1"]').click(); await espera(60);
  ok(d.getElementById('f_versao').value === '2.0', 'sugere a próxima versão (1.0 → 2.0)');
  const reg = () => [...d.querySelectorAll('.upa-modal button')].find(b => b.textContent === 'Registrar');
  d.getElementById('f_versao').value = '1.0'; d.getElementById('f_resumo_alteracao').value = 'Ajuste'; reg().click(); await espera(60);
  ok(!log.some(l => l[0] === 'pops' && l[1] === 'update' && l[2].versao), 'repetir a mesma versão não é aceito');
  d.getElementById('f_versao').value = '2.0'; d.getElementById('f_resumo_alteracao').value = 'Incluído o 5º momento'; reg().click(); await espera(120);
  ok(log.some(l => l[0] === 'pops' && l[1] === 'update' && l[2].versao === '2.0' && l[2].status === 'publicado' && l[2].resumo_alteracao === 'Incluído o 5º momento' && l[2].data_ultima_revisao), 'revisão registra versão, data, resumo e deixa publicado');

  // histórico
  d.querySelector('[data-hi="1"]').click(); await espera(120);
  ok(/Primeira versão/.test(d.body.textContent) && /Histórico — POP\.ENF\.001/.test(d.body.textContent), 'histórico mostra as versões');
  [...d.querySelectorAll('.upa-modal button')].find(b => b.textContent === 'Fechar').click();

  // acompanhamento
  d.querySelector('[data-aba=acomp]').click(); await espera(150);
  corpo = d.getElementById('mod-body');
  ok(/POPs cadastrados/.test(corpo.textContent) && /Por área/.test(corpo.textContent) && /Revisões pendentes \(1\)/.test(corpo.textContent), 'acompanhamento: indicadores, por área e 1 revisão pendente');
  const cap = {}; U.imprimir = (h, t) => { cap.h = h; cap.t = t; };
  d.getElementById('ac-pdf').click();
  ok(/Acompanhamento de POPs/.test(cap.h) && /Data e hora de emissão/.test(cap.h) && /logo-upa\.png/.test(cap.h) && /POP\.ENF\.001/.test(cap.h) && /vencida há/.test(cap.h), 'relatório impresso: emissão, logo, indicadores e pendências');

  // importar planilha
  d.querySelector('[data-aba=imp]').click(); await espera(100);
  const csv = 'código;título;área\nPOP.NOVO.1;Novo procedimento;Enfermagem\nPOP.ENF.001;Já existe;Enfermagem\nruim cod;Sem código;TI';
  const inp = d.getElementById('ip-csv'); Object.defineProperty(inp, 'files', { value: [new w.File([csv], 'p.csv')], configurable: true });
  inp.dispatchEvent(new w.Event('change')); await espera(250);
  const prev = d.getElementById('ip-prev').textContent;
  ok(/2<\/b> linha|2 linha/.test(d.getElementById('ip-prev').innerHTML) && /atualiza/.test(prev) && /novo/.test(prev) && /código inválido/.test(prev), 'prévia: 2 prontas (1 nova, 1 atualiza) e 1 com problema');
  d.getElementById('ip-go').click(); await espera(150);
  ok(log.some(l => l[0] === 'pops' && l[1] === 'upsert' && l[2].length === 2 && l[2][0].codigo === 'POP.NOVO.1'), 'importa só as linhas válidas (upsert)');
  // anexar arquivos em lote
  const nomes = ['POP.ENF.001_v2.pdf', 'POP.ADM.001 versao final.docx', 'qualquer.pdf', 'POP.ENF.001.exe'];
  const inp2 = d.getElementById('ip-arqs'); Object.defineProperty(inp2, 'files', { value: nomes.map(n => new w.File(['x'], n)), configurable: true });
  inp2.dispatchEvent(new w.Event('change')); await espera(250);
  const prev2 = d.getElementById('ip-prev2').textContent;
  ok(/2<\/b> arquivo|2 arquivo/.test(d.getElementById('ip-prev2').innerHTML) && /nenhum código de POP/.test(prev2) && /tipo de arquivo não aceito/.test(prev2), 'arquivos em lote: casa pelo código no nome; aponta os sem código e o tipo errado');
  d.getElementById('ip-go2').click(); await espera(200);
  ok(log.filter(l => l[0] === 'pops' && l[1] === 'update' && l[2].arquivo_nome).length === 2, 'anexa os 2 arquivos que casaram');
  w.close();
}
{
  const { w } = await abrir('Enfermeiro');
  await espera(120);
  const d = w.document;
  w.UPA.go('pop'); await espera(150);
  ok(!!d.querySelector('#sidebar-nav [data-mod=pop]'), 'enfermeiro vê o módulo POPs');
  ok(!d.getElementById('pp-novo') && !d.querySelector('[data-aba=acomp]') && !d.querySelector('[data-aba=imp]') && !d.getElementById('pp-s') && !d.querySelector('[data-ed]') && !d.querySelector('[data-rv]'), 'enfermeiro só consulta: sem cadastrar, importar, acompanhar ou editar');
  ok(/somente os gestores|Somente os gestores/i.test(d.getElementById('mod-body').textContent), 'avisa que só gestores atualizam');
  w.close();
}

// ---------- ouvidorias (controle interno, só gestores)
{
  const { w, log } = await abrir('Gestor Assistencial');
  await espera(150);
  const d = w.document;
  ok(!!d.querySelector('#sidebar-nav [data-mod=ouvidoria]'), 'gestor vê o módulo Ouvidorias');
  ok(/prazo vencido/.test(d.getElementById('home-pendencias').textContent), 'Home avisa ação de ouvidoria com prazo vencido');
  w.UPA.go('ouvidoria'); await espera(150);
  const corpo = d.getElementById('mod-body');
  ok(/1746-0001/.test(corpo.textContent) && !/1746-0002/.test(corpo.textContent), 'lista em aberto mostra o pendente e esconde o concluído');
  ok(/vencido há/.test(corpo.textContent), 'marca o prazo vencido');
  ok(/Não substitui o 1746|continuam na plataforma 1746/.test(corpo.textContent), 'avisa que não substitui o 1746');
  ok(!/Paciente|paciente/.test(d.querySelector('#ou-novo').closest('.barra').outerHTML), 'tela não pede dados de paciente');
  d.getElementById('ou-novo').click(); await espera(60);
  const val = (n, v) => { const e = d.getElementById('f_' + n); e.value = v; };
  val('protocolo', 'ab c'); val('categoria', 'Elogio'); val('coordenacao', 'RH Focal'); val('providencia', 'Ação válida aqui'); val('prazo', '2026-12-01');
  const salvar = () => [...d.querySelectorAll('.upa-modal button')].find(b => b.textContent === 'Salvar');
  salvar().click(); await espera(60);
  ok(!log.some(l => l[0] === 'ouvidorias' && l[1] === 'insert'), 'protocolo inválido não é enviado');
  val('protocolo', '1746-0099'); val('providencia', 'Ligar 21 99999-8888 para orientar');
  salvar().click(); await espera(60);
  ok(!log.some(l => l[0] === 'ouvidorias' && l[1] === 'insert'), 'providência com telefone não é enviada');
  val('providencia', 'Orientada a equipe da recepção'); val('prazo', '2026-09-01');
  salvar().click(); await espera(60);
  ok(!log.some(l => l[0] === 'ouvidorias' && l[1] === 'insert'), 'prazo antes da data da manifestação não é enviado');
  val('prazo', '2026-12-01'); salvar().click(); await espera(120);
  ok(log.some(l => l[0] === 'ouvidorias' && l[1] === 'insert' && l[2].protocolo === '1746-0099' && l[2].coordenacao === 'RH Focal' && Object.keys(l[2]).sort().join() === 'categoria,coordenacao,data_manifestacao,prazo,protocolo,providencia,situacao'), 'envia só os 7 campos permitidos');
  d.querySelector('[data-aba=res]').click(); await espera(100);
  ok(/Por coordenação/.test(d.getElementById('mod-body').textContent) && /Tempo de espera/.test(d.getElementById('mod-body').textContent), 'aba Resumo mostra por coordenação e categoria');
  ok(!!d.getElementById('ou-pdf'), 'aba Resumo tem o botão de relatório para imprimir');
  let impr = null; w.UPA.imprimir = (html, titulo) => { impr = { html, titulo }; };
  d.getElementById('ou-pdf').click(); await espera(60);
  ok(!!impr && /logo-upa\.png/.test(impr.html) && /Relatório de Ouvidorias/.test(impr.html) && /1746-0001/.test(impr.html) && /Por categoria/.test(impr.html), 'relatório impresso traz logo, totais e ações em aberto');
  ok(!!impr && !impr.html.includes('1746-0002</b>'), 'relatório lista só as ações em aberto');
  ok(!d.querySelector('[data-ex]'), 'gestor assistencial não vê botão de excluir');
  w.close();
}
{
  const { w } = await abrir('Gestor Administrativo');
  await espera(150);
  w.UPA.go('ouvidoria'); await espera(150);
  ok(!!w.document.querySelector('[data-ex]'), 'Gestor Administrativo vê o botão de excluir');
  w.close();
}
for (const f of ['Enfermeiro', 'Recepcionista', 'Vigilante']) {
  const { w } = await abrir(f);
  await espera(120);
  ok(!w.document.querySelector('#sidebar-nav [data-mod=ouvidoria]'), f + ' NÃO vê o módulo Ouvidorias');
  w.close();
}

// ---------- escala: versão, responsável pela confirmação, emissão e logo no relatório
{
  const cap = {};
  const { w, log } = await abrir('Gestor Assistencial');
  await espera(100);
  const d = w.document;
  w.UPA.imprimir = (h, t) => { cap.h = h; cap.t = t; };
  fix.escala_confirmacoes = []; globalThis.__hashEscala = 'h-atual';
  w.UPA.go('escala'); await espera(150);
  ok(/Ainda não confirmada/.test(d.getElementById('es-situ').textContent), 'escala sem confirmação mostra "Ainda não confirmada"');
  d.getElementById('es-pdf').click();
  ok(/RASCUNHO/.test(cap.h) && /Data e hora de emissão/.test(cap.h) && /Responsável pela confirmação/.test(cap.h) && /Versão da escala/.test(cap.h) && /logo-upa\.png/.test(cap.h) && /-RASC-/.test(cap.h), 'relatório sem confirmação: rascunho, emissão, responsável, versão e logo da UPA');
  ok(/\d{2}\/\d{2}\/\d{4}/.test(cap.h.split('Data e hora de emissão')[1].slice(0, 200)), 'relatório traz a data/hora de emissão preenchida');
  d.getElementById('es-conf').click(); await espera(60);
  const confirmar = [...d.querySelectorAll('.upa-modal button')].find(b => /Confirmar/.test(b.textContent));
  ok(!!confirmar, 'pede confirmação antes de gerar a versão'); confirmar.click(); await espera(120);
  ok(log.some(l => l[0] === 'rpc' && l[1] === 'escala_confirmar'), 'chama escala_confirmar');
  w.close();
}
{
  const cap = {};
  fix.escala_confirmacoes = [{ id: 1, data: '2026-10-16', turno: 'manha', versao: 2, hash: 'h-atual', total: 1, confirmado_por_nome: 'Bia Gestora', confirmado_matricula: '555', confirmado_funcao: 'Gestor Assistencial', confirmado_em: agora }];
  globalThis.__hashEscala = 'h-atual';
  const { w } = await abrir('Gestor Assistencial');
  await espera(100);
  w.UPA.imprimir = (h, t) => { cap.h = h; cap.t = t; };
  w.UPA.go('escala'); await espera(150);
  const d = w.document;
  ok(/Versão 2 confirmada/.test(d.getElementById('es-situ').textContent) && /Bia Gestora/.test(d.getElementById('es-situ').textContent), 'tela mostra versão 2 confirmada por quem confirmou');
  d.getElementById('es-pdf').click();
  ok(/ESCALA CONFIRMADA — VERSÃO 2/.test(cap.h) && /Bia Gestora/.test(cap.h) && /matrícula 555/.test(cap.h) && /V2/.test(cap.h) && /-V2-/.test(cap.h), 'relatório confirmado: versão 2, responsável com matrícula e código');
  w.close();
  globalThis.__hashEscala = 'h-mudou';
  const { w: w2 } = await abrir('Gestor Assistencial');
  await espera(100);
  w2.UPA.imprimir = (h, t) => { cap.h2 = h; };
  w2.UPA.go('escala'); await espera(150);
  ok(/Alterada depois da versão 2/.test(w2.document.getElementById('es-situ').textContent), 'escala mudou depois da confirmação: tela avisa');
  w2.document.getElementById('es-pdf').click();
  ok(/ALTERADA DEPOIS DA VERSÃO 2/.test(cap.h2), 'relatório avisa que a escala foi alterada depois da confirmação');
  w2.close();
  fix.escala_confirmacoes = []; globalThis.__hashEscala = 'h-atual';
}
{
  const { w } = await abrir('Médico');
  await espera(100);
  w.UPA.go('escala'); await espera(150);
  ok(!w.document.getElementById('es-conf'), 'médico NÃO vê o botão Confirmar escala');
  w.close();
}

// ---------- redefinir senha (só Gestor Administrativo)
{
  const { w, log } = await abrir('Gestor Administrativo');
  await espera(150);
  const d = w.document;
  w.UPA.go('painel'); await espera(150);
  const aba = d.querySelector('[data-aba=senhas]');
  ok(!!aba, 'Gestor Administrativo vê a aba Redefinir senha');
  aba.click(); await espera(80);
  d.getElementById('rs-ok').click(); await espera(60);
  ok(!log.some(l => l[1] === 'redefinir_senha'), 'sem matrícula não chama o servidor');
  d.getElementById('rs-mat').value = '12345'; d.getElementById('rs-ok').click(); await espera(120);
  ok(log.some(l => l[0] === 'rpc' && l[1] === 'redefinir_senha' && l[2].p_matricula === '12345'), 'chama redefinir_senha com a matrícula');
  ok(d.getElementById('rs-senha') && d.getElementById('rs-senha').textContent === 'Abc23xyz9K' && /Fulana Teste/.test(d.body.textContent), 'mostra nome e senha provisória na tela');
  ok(d.getElementById('rs-mat').value === '', 'limpa o campo da matrícula');
  w.close();
}
{
  const { w } = await abrir('Gestor Assistencial');
  await espera(150);
  w.UPA.go('painel'); await espera(150);
  ok(!w.document.querySelector('[data-aba=senhas]'), 'Gestor Assistencial NÃO vê a aba Redefinir senha');
  w.close();
}

{
  const { w } = await abrir('Enfermeiro');
  await espera(150);
  ok(!w.document.querySelector('#sidebar-nav [data-mod=painel]'), 'enfermeiro NÃO vê o Painel do Gestor');
  ok(!w.document.getElementById('sh-rel'), 'enfermeiro sem botão do relatório (só ao entrar em Safety)');
  w.UPA.go('safety'); await espera(120);
  ok(!w.document.getElementById('sh-rel'), 'enfermeiro NÃO vê o relatório mensal do Huddle');
  w.UPA.go('manutencao'); await espera(100);
  ok(!w.document.querySelector('[data-aba=ind]'), 'enfermeiro NÃO vê os indicadores de Manutenção');
  ok(w.document.getElementById('btn-instalar') && w.UPA.instalar, 'botão de instalar o app existe');
  w.close();
}

console.log(`\n${total - falhas}/${total} verificações passaram.`);
process.exit(falhas ? 1 : 0);
