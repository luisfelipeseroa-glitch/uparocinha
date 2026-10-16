#!/usr/bin/env node
/**
 * IMPORTADOR DE USUÁRIOS — Gestão Inteligente UPA Rocinha
 *
 * Lê a lista de funcionários (CSV), cria o login de cada um no Supabase
 * (matrícula + senha) e grava o perfil (nome + função) que decide o que cada
 * pessoa pode ver e fazer no sistema.
 *
 * NÃO precisa instalar nada além do Node 18+.
 *
 * USO (no seu computador — NUNCA suba a chave de serviço para o GitHub):
 *
 *   1) Teste sem gravar nada:
 *        node scripts/importar_usuarios.mjs funcionarios.csv --dry-run
 *
 *   2) Importar de verdade:
 *        export SUPABASE_URL="https://xxxx.supabase.co"
 *        export SUPABASE_SERVICE_ROLE_KEY="(chave service_role — Project Settings → API)"
 *        node scripts/importar_usuarios.mjs funcionarios.csv
 *
 *      Gera o arquivo  senhas_iniciais.csv  com a senha provisória de cada pessoa
 *      (cada uma troca a senha no primeiro acesso). Entregue em mãos / envelope
 *      individual e apague o arquivo depois. Ele não vai para o GitHub (.gitignore).
 *
 *   Outras opções:
 *        --resetar 10344,9930      gera nova senha provisória só para essas matrículas
 *        --desativar-ausentes      desativa quem NÃO está mais no CSV (desligados)
 *        --contatos contatos.json  {"10344":"coord.adm@...", ...} guarda o e-mail de contato
 *        --ajustes ajustes.json    {"15357":"Almoxarife","19205":"NIR"} corrige a função de quem
 *                                  o CSV classificou diferente (ex.: auxiliar administrativo que
 *                                  trabalha como Almoxarife, NIR ou Recepcionista)
 *
 * Pode rodar várias vezes: quem já existe é atualizado (nome/função), sem trocar a senha.
 */
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomInt } from 'node:crypto';

// Tem que ser IGUAL ao EMAIL_DOMINIO de js/config.js (o login "10344" vira 10344@upa.local)
const EMAIL_DOMINIO = 'upa.local';

// ------------------------------------------------------------------ argumentos
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valor = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const arquivo = args.find((a, i) => !a.startsWith('--') && (i === 0 || !['--resetar', '--contatos', '--ajustes'].includes(args[i - 1])));
if (!arquivo) { console.error('Informe o CSV: node scripts/importar_usuarios.mjs funcionarios.csv [--dry-run]'); process.exit(1); }
const DRY = flag('--dry-run');

// ------------------------------------------------------------------ leitura do CSV
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// [expressão do cargo (sem acento), função no sistema, grupo]
const CARGOS = [
  [/COORDENADOR(A)? ADMINISTRATIV[OA]/, 'Gestor Administrativo', 'gestor'],
  [/COORDENADOR(A)? DE ENFERMEAGEM|COORDENADOR(A)? DE ENFERMAGEM/, 'Gestor Assistencial', 'gestor'],
  [/COORDENADOR(A)? MEDIC[OA]/, 'Gestor Assistencial', 'gestor'],
  [/RH FOCAL/, 'RH Focal', 'gestor'],
  [/ASSISTENTE ADMINISTRATIVO( PLENO)?/, 'Assistente Administrativo', 'adm'],
  [/AUXILIAR ADMINISTRATIVO/, 'Assistente Administrativo', 'adm'],
  [/ASSISTENTE DE TI/, 'TI', 'adm'],
  [/ALMOXARIFE/, 'Almoxarife', 'adm'],
  [/RECEPCIONISTA/, 'Recepcionista', 'adm'],
  [/NIR/, 'NIR', 'adm'],
  [/MEDICO/, 'Médico', 'assistencial'],
  [/PEDIATRA/, 'Pediatra', 'assistencial'],
  [/ENFERMEIRO( ROTINA)?/, 'Enfermeiro', 'assistencial'],
  [/TECNICO DE ENFERMAGEM/, 'Técnico de Enfermagem', 'assistencial'],
  [/FARMACEUTICO/, 'Farmacêutico', 'assistencial'],
  [/TECNICO EM FARMACIA/, 'Técnico de Farmácia', 'assistencial'],
  [/RADIOLOGISTA/, 'Radiologista', 'assistencial'],
  [/TECNICO RADIOLOGIA/, 'Técnico de Radiologia', 'assistencial'],
  [/TECNICO EM LABORATORIO/, 'Técnico em Laboratório', 'assistencial'],
  [/ASSISTENTE SOCIAL/, 'Assistente Social', 'assistencial'],
  [/AUXILIAR DE SERVICOS GERAIS/, 'ASG', 'apoio'],
  [/VIGILANTE/, 'Vigilante', 'apoio'],
  [/MAQUEIRO/, 'Maqueiro', 'apoio'],
];
const ROTULO_GRUPO = { assistencial: 'ASSISTENCIAL', apoio: 'APOIO', adm: 'ADM', gestor: 'GESTOR' };

function lerFuncionarios(caminho) {
  const linhas = readFileSync(caminho, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const ok = [], problemas = [], avisos = [];
  linhas.forEach((bruta, i) => {
    if (!bruta.trim()) return;
    const s = semAcento(bruta).replace(/\t/g, '  ');
    const m = s.match(/^\s*(\d{3,6})\s+(.*)$/);
    if (!m) { problemas.push(`linha ${i + 1}: sem matrícula → ${bruta.trim()}`); return; }
    const [, matricula, resto] = m;
    let achado = null;
    for (const [rx, funcao, grupo] of CARGOS) {
      const mm = new RegExp('(?:(?<=\\s)|^)(' + rx.source + ')(?=\\s|$)').exec(resto);
      if (mm && (!achado || mm.index < achado.mm.index)) achado = { mm, funcao, grupo };
    }
    if (!achado) { problemas.push(`linha ${i + 1}: cargo não reconhecido → ${bruta.trim()}`); return; }
    const nome = resto.slice(0, achado.mm.index).trim().replace(/\s+/g, ' ');
    const cauda = resto.slice(achado.mm.index + achado.mm[0].length).trim();
    if (!nome) { problemas.push(`linha ${i + 1}: nome vazio → ${bruta.trim()}`); return; }
    if (cauda && !cauda.includes(ROTULO_GRUPO[achado.grupo]))
      avisos.push(`${matricula} ${nome}: cargo "${achado.funcao}" mas a planilha diz "${cauda}"`);
    ok.push({ matricula, nome: tituloNome(nome), funcao: achado.funcao, grupo: achado.grupo });
  });
  const vistos = new Map();
  for (const f of ok) {
    if (vistos.has(f.matricula)) problemas.push(`matrícula repetida ${f.matricula}: ${vistos.get(f.matricula)} / ${f.nome}`);
    vistos.set(f.matricula, f.nome);
  }
  return { ok, problemas, avisos };
}

// "ADRIANA CHAVES MARQUES" → "Adriana Chaves Marques" (mantém de/da/dos...)
function tituloNome(n) {
  const peq = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E']);
  return n.toLowerCase().split(' ').map((p, i) => (i > 0 && peq.has(p.toUpperCase())) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

const { ok: funcionarios, problemas, avisos } = lerFuncionarios(arquivo);

// Funções que existem no sistema (tabela public.funcoes) e o grupo de cada uma
const FUNCOES_VALIDAS = {
  'Gestor Assistencial': 'gestor', 'Gestor Administrativo': 'gestor', 'RH Focal': 'gestor',
  'Recepcionista': 'adm', 'Assistente Administrativo': 'adm', 'Almoxarife': 'adm', 'NIR': 'adm', 'TI': 'adm',
  'Médico': 'assistencial', 'Pediatra': 'assistencial', 'Enfermeiro': 'assistencial', 'Técnico de Enfermagem': 'assistencial',
  'Farmacêutico': 'assistencial', 'Técnico de Farmácia': 'assistencial', 'Radiologista': 'assistencial',
  'Técnico de Radiologia': 'assistencial', 'Técnico em Laboratório': 'assistencial', 'Assistente Social': 'assistencial',
  'ASG': 'apoio', 'Vigilante': 'apoio', 'Maqueiro': 'apoio', 'Manutenção': 'terceiro', 'Refrigeração': 'terceiro',
  'Agente Regulador': 'sem_acesso',
};
if (valor('--ajustes')) {
  const ajustes = JSON.parse(readFileSync(valor('--ajustes'), 'utf8'));
  for (const [mat, funcao] of Object.entries(ajustes)) {
    if (!FUNCOES_VALIDAS[funcao]) { problemas.push(`ajuste ${mat}: função "${funcao}" não existe. Use uma de: ${Object.keys(FUNCOES_VALIDAS).join(', ')}`); continue; }
    const f = funcionarios.find(x => x.matricula === String(mat));
    if (!f) { problemas.push(`ajuste ${mat}: matrícula não está no CSV`); continue; }
    f.funcao = funcao; f.grupo = FUNCOES_VALIDAS[funcao];
  }
}
const porFuncao = {};
funcionarios.forEach(f => { porFuncao[f.funcao] = (porFuncao[f.funcao] || 0) + 1; });
console.log(`\nLidos ${funcionarios.length} funcionários de ${arquivo}`);
console.table(porFuncao);
if (avisos.length) console.log('Atenção (conferir):\n  ' + avisos.join('\n  '));
if (problemas.length) { console.error('\nPROBLEMAS — corrija o CSV e rode de novo:\n  ' + problemas.join('\n  ')); process.exit(1); }
if (DRY) { console.log('\n--dry-run: nada foi gravado.'); process.exit(0); }

// ------------------------------------------------------------------ Supabase (REST puro, sem dependências)
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!URL_ || !KEY) { console.error('\nDefina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja o topo deste arquivo).'); process.exit(1); }
if (KEY.split('.').length === 3) {
  try {
    const papel = JSON.parse(Buffer.from(KEY.split('.')[1], 'base64url').toString()).role;
    if (papel !== 'service_role') { console.error(`\nA chave informada é "${papel}". Use a chave service_role (Project Settings → API).`); process.exit(1); }
  } catch { /* chave no formato novo (sb_secret_...) — segue */ }
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(metodo, caminho, corpo, extra = {}) {
  const r = await fetch(URL_ + caminho, { method: metodo, headers: { ...H, ...extra }, body: corpo ? JSON.stringify(corpo) : undefined });
  const txt = await r.text();
  let json = null; try { json = txt ? JSON.parse(txt) : null; } catch { /* vazio */ }
  return { status: r.status, ok: r.ok, json, txt };
}

const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/l/I
const gerarSenha = () => Array.from({ length: 10 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
const emailDe = (mat) => `${mat}@${EMAIL_DOMINIO}`;

async function carregarUsuariosExistentes() {
  const mapa = new Map();
  for (let pagina = 1; pagina < 50; pagina++) {
    const r = await api('GET', `/auth/v1/admin/users?page=${pagina}&per_page=1000`);
    if (!r.ok) throw new Error(`Não consegui listar usuários (${r.status}): ${r.txt.slice(0, 200)}`);
    const lista = r.json.users || [];
    lista.forEach(u => mapa.set((u.email || '').toLowerCase(), u.id));
    if (lista.length < 1000) break;
  }
  return mapa;
}

const contatos = valor('--contatos') ? JSON.parse(readFileSync(valor('--contatos'), 'utf8')) : {};
const resetar = new Set((valor('--resetar') || '').split(',').map(s => s.trim()).filter(Boolean));

const existentes = await carregarUsuariosExistentes();
const senhasGeradas = [];
let criados = 0, atualizados = 0, resetados = 0, erros = 0;

for (const f of funcionarios) {
  const email = emailDe(f.matricula);
  let id = existentes.get(email);
  const meta = { matricula: f.matricula, nome: f.nome, ...(contatos[f.matricula] ? { email_contato: contatos[f.matricula] } : {}) };
  let novo = false;
  if (!id) {
    const senha = gerarSenha();
    const r = await api('POST', '/auth/v1/admin/users', { email, password: senha, email_confirm: true, user_metadata: meta });
    if (!r.ok) { erros++; console.error(`  ✗ ${f.matricula} ${f.nome}: ${r.json?.msg || r.json?.message || r.txt.slice(0, 160)}`); continue; }
    id = r.json.id; novo = true; criados++;
    senhasGeradas.push({ ...f, senha });
  } else if (resetar.has(f.matricula)) {
    const senha = gerarSenha();
    const r = await api('PUT', `/auth/v1/admin/users/${id}`, { password: senha, user_metadata: meta });
    if (!r.ok) { erros++; console.error(`  ✗ reset ${f.matricula}: ${r.txt.slice(0, 160)}`); continue; }
    resetados++; senhasGeradas.push({ ...f, senha });
    await api('PATCH', `/rest/v1/profiles?id=eq.${id}`, { trocar_senha: true });
  } else {
    atualizados++;
  }
  // perfil (nome + função). Em quem já existe, não mexe em trocar_senha.
  const perfil = { id, matricula: f.matricula, nome: f.nome, funcao: f.funcao, ativo: true, ...(novo ? { trocar_senha: true } : {}) };
  const r2 = await api('POST', '/rest/v1/profiles?on_conflict=id', perfil, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  if (!r2.ok) { erros++; console.error(`  ✗ perfil ${f.matricula} ${f.nome}: ${r2.json?.message || r2.txt.slice(0, 200)}`); }
}

if (flag('--desativar-ausentes')) {
  const presentes = new Set(funcionarios.map(f => f.matricula));
  const r = await api('GET', '/rest/v1/profiles?select=id,matricula,nome&ativo=eq.true');
  for (const p of r.json || []) {
    if (!presentes.has(p.matricula)) {
      await api('PATCH', `/rest/v1/profiles?id=eq.${p.id}`, { ativo: false });
      console.log(`  desativado: ${p.matricula} ${p.nome}`);
    }
  }
}

if (senhasGeradas.length) {
  const csv = 'matricula;nome;funcao;senha_provisoria\n' +
    senhasGeradas.map(s => [s.matricula, s.nome, s.funcao, s.senha].join(';')).join('\n') + '\n';
  writeFileSync('senhas_iniciais.csv', csv, { mode: 0o600 });
  try { chmodSync('senhas_iniciais.csv', 0o600); } catch { /* windows */ }
}
console.log(`\nPronto: ${criados} criados, ${atualizados} já existiam (atualizados), ${resetados} com senha redefinida, ${erros} erros.`);
if (senhasGeradas.length) console.log('Senhas provisórias em  senhas_iniciais.csv  — entregue individualmente e apague o arquivo depois.');
process.exit(erros ? 1 : 0);
