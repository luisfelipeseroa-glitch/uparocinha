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
  const e = ['avisos', 'estoque', 'documentos', 'escala', 'evento', 'relatorio', 'rh', 'treinamento', 'safety', 'manutencao'];
  if ([...G, 'Enfermeiro', 'Técnico de Enfermagem', 'Médico', 'Pediatra', 'Farmacêutico'].includes(f)) e.push('calculadoras');
  if ([...G, 'Enfermeiro', 'Técnico de Enfermagem', 'Médico', 'Pediatra'].includes(f)) e.push('dieta');
  if ([...G, ...A, ...S].includes(f)) e.push('passagem', 'sistemas');
  if ([...G, ...S].includes(f)) e.push('protocolos');
  return e.sort();
};

// ---------- fixtures e cliente falso do Supabase
const agora = new Date().toISOString();
const base = { id: 1, criado_em: agora, atualizado_em: agora, criado_por: 'x', criado_por_nome: 'Fulano' };
const fix = {
  avisos: [{ ...base, tipo: 'Urgente', assunto: 'Aviso <b>teste</b>', status: 'ATIVO', data_hora: agora }],
  estoque_itens: [{ ...base, setor: 'farmacia', insumo: 'Dipirona', quantidade: 10, duracao: '2 dias', recomendacao: 'Repor' }],
  estoque_log: [{ id: 1, setor: 'farmacia', insumo: 'Dipirona', acao: 'edicao', qtd_antes: 1, qtd_depois: 10, usuario_nome: 'A', em: agora }],
  documentos: [{ ...base, tipo: 'POP', assunto: 'POP Sepse', status: 'Ativo', link: 'https://x.y', arquivo_path: null }],
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
  safety_huddles: [{ ...base, data_huddle: '2026-10-16', turno: 'manha', hora: '08:00:00', lotacao: 'alerta', checklist: { 0: true }, riscos: 'r' }],
  manutencao_chamados: [{ ...base, setor: 'Farmácia', categoria: 'Elétrica', descricao: 'Lâmpada queimada', prioridade: 'media', status: 'aberto' }],
  profiles: [{ matricula: '1', nome: 'Fulano', funcao: 'Médico' }],
};

function criarCliente(ctx, log) {
  const consulta = (tabela) => {
    const st = { op: 'select', single: false };
    const b = {
      select() { return b; }, eq() { return b; }, gte() { return b; }, lt() { return b; }, lte() { return b; }, order() { return b; }, limit() { return b; },
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
    rpc: async (nome, args) => { log.push(['rpc', nome, args]); return nome === 'meu_contexto' ? { data: ctx, error: null } : { data: nome === 'treinamento_prova' ? [] : null, error: null }; },
    storage: { from: () => ({ upload: async () => ({ error: null }), createSignedUrl: async () => ({ data: { signedUrl: 'http://x/y' }, error: null }), remove: async () => ({}) }) },
  };
}

const ARQUIVOS = ['js/config.js', 'js/core.js', 'js/legacy.js', 'js/forms.js',
  ...['avisos', 'estoque', 'clinico', 'dieta', 'documentos', 'escala', 'evento', 'passagem', 'relatorio', 'rh', 'treinamento', 'safety', 'manutencao', 'sistemas'].map((x) => `js/mod-${x}.js`)];
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
await botoes('Gestor Assistencial', 'passagem', '[data-ex],[data-ed],[data-rc],#pp-novo', false, 'Editar/Excluir/Receber/Novo');
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

console.log(`\n${total - falhas}/${total} verificações passaram.`);
process.exit(falhas ? 1 : 0);
