// Testa o fluxo do importador contra um servidor de mentira (imita Auth admin + PostgREST do Supabase).
import http from 'node:http';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'importar_usuarios.mjs');
let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { falhas++; console.log('  ✗ FALHOU:', m); } };

const usuarios = new Map([['10344@upa.local', 'uuid-existente-luis']]);  // já cadastrado
const perfis = [], chamadas = [];
const srv = http.createServer((req, res) => {
  let corpo = ''; req.on('data', d => corpo += d); req.on('end', () => {
    const j = corpo ? JSON.parse(corpo) : null;
    chamadas.push(`${req.method} ${req.url}`);
    const auth = req.headers.authorization || '';
    const resp = (st, obj) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (!auth.startsWith('Bearer ')) return resp(401, { msg: 'sem chave' });
    if (req.method === 'GET' && req.url.startsWith('/auth/v1/admin/users'))
      return resp(200, { users: [...usuarios].map(([email, id]) => ({ id, email })) });
    if (req.method === 'POST' && req.url === '/auth/v1/admin/users') {
      if (!j.email_confirm || !j.password || j.password.length < 8) return resp(400, { msg: 'payload ruim' });
      if (j.email.startsWith('99999')) return resp(422, { msg: 'email inválido de teste' });
      const id = 'uuid-' + j.email.split('@')[0]; usuarios.set(j.email, id); return resp(200, { id });
    }
    if (req.method === 'PUT' && req.url.startsWith('/auth/v1/admin/users/')) return resp(200, {});
    if (req.method === 'POST' && req.url.startsWith('/rest/v1/profiles')) { perfis.push(j); return resp(201, null); }
    if (req.method === 'PATCH' && req.url.startsWith('/rest/v1/profiles')) return resp(204, null);
    if (req.method === 'GET' && req.url.startsWith('/rest/v1/profiles'))
      return resp(200, [{ id: 'uuid-existente-luis', matricula: '10344', nome: 'Luis' }, { id: 'uuid-sumido', matricula: '55555', nome: 'Desligado' }]);
    resp(404, { msg: 'rota desconhecida ' + req.url });
  });
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const porta = srv.address().port;

const dir = mkdtempSync(join(tmpdir(), 'imp-'));
writeFileSync(join(dir, 'f.csv'), [
  '10344\tLUIS FELIPE WANG SEROA DA MOTTA  COORDENADOR ADMINISTRATIVO  GESTOR ADMINISTRATIVO',
  '18865\tADRIANA CHAVES MARQUES\tMEDICO\tASSISTENCIAL',
  '9564\tWANDERLEY JOSE DA SILVA\tVIGILANTE  APOIO',
  '15357\tMANUELLE DE OLIVEIRA MONTEIRO\tAUXILIAR ADMINISTRATIVO\t ADM',
].join('\r\n'));
writeFileSync(join(dir, 'ajustes.json'), JSON.stringify({ '15357': 'Almoxarife' }));
const jwt = (role) => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;
const rodar = (extra, key = jwt('service_role')) => new Promise(resolve => {
  const p = spawn('node', [script, join(dir, 'f.csv'), ...extra], { cwd: dir, env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${porta}`, SUPABASE_SERVICE_ROLE_KEY: key } });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => resolve({ code, out }));
});

// 1) chave errada (anon) é barrada antes de qualquer chamada
let r = await rodar([], jwt('anon'));
ok(r.code !== 0 && /service_role/.test(r.out), 'recusa chave anon');
ok(chamadas.length === 0, 'não faz chamada nenhuma com chave errada');

// 2) importação normal (com ajuste de função)
r = await rodar(['--ajustes', join(dir, 'ajustes.json')]);
ok(r.code === 0, 'importação termina sem erro: ' + r.out.slice(-300));
ok(/3 criados, 1 já existiam/.test(r.out), 'conta 3 criados e 1 existente');
ok(perfis.length === 4, 'grava 4 perfis');
const luis = perfis.find(p => p.matricula === '10344');
ok(luis.id === 'uuid-existente-luis' && luis.funcao === 'Gestor Administrativo' && !('trocar_senha' in luis), 'quem já existe NÃO tem trocar_senha mexido');
const adriana = perfis.find(p => p.matricula === '18865');
ok(adriana.funcao === 'Médico' && adriana.trocar_senha === true && adriana.nome === 'Adriana Chaves Marques', 'novo entra com função, nome formatado e trocar_senha=true');
ok(perfis.find(p => p.matricula === '15357').funcao === 'Almoxarife', 'ajuste de função aplicado');
const arq = join(dir, 'senhas_iniciais.csv');
ok(existsSync(arq), 'gera senhas_iniciais.csv');
const linhas = readFileSync(arq, 'utf8').trim().split('\n');
ok(linhas.length === 4, 'senhas só dos 3 novos (+ cabeçalho)');
ok(!linhas.join().includes('10344;'), 'quem já existia não ganha nova senha');
ok(new Set(linhas.slice(1).map(l => l.split(';')[3])).size === 3 && linhas.slice(1).every(l => l.split(';')[3].length === 10), 'senhas diferentes de 10 caracteres');
ok((statSync(arq).mode & 0o077) === 0, 'arquivo de senhas só o dono lê (0600)');

// 3) segunda rodada: nada novo, não gera senhas
const antes = linhas.join();
r = await rodar([]);
ok(/0 criados, 4 já existiam/.test(r.out), 'segunda rodada não cria nada');
ok(readFileSync(arq, 'utf8').trim().split('\n').join() === antes, 'segunda rodada não sobrescreve o arquivo de senhas');

// 4) reset de uma senha
r = await rodar(['--resetar', '10344']);
ok(/1 com senha redefinida/.test(r.out) && readFileSync(arq, 'utf8').includes('10344;'), 'reset gera nova senha só de quem pediu');

// 5) desativar ausentes
chamadas.length = 0;
r = await rodar(['--desativar-ausentes']);
ok(/desativado: 55555 Desligado/.test(r.out), 'desativa quem saiu do CSV');
ok(chamadas.filter(c => c.startsWith('PATCH')).length === 1, 'desativa só 1 pessoa');

// 6) CSV com problema aborta antes de gravar
writeFileSync(join(dir, 'ruim.csv'), '12345\tFULANO DE TAL\tCARGO INVENTADO\n');
const ruim = spawnSync('node', [script, join(dir, 'ruim.csv'), '--dry-run'], { encoding: 'utf8' });
ok(ruim.status !== 0 && /cargo não reconhecido/.test(ruim.stderr), 'cargo desconhecido é apontado e aborta');
const ajBad = spawnSync('node', [script, join(dir, 'f.csv'), '--dry-run', '--ajustes', join(dir, 'ajustes.json')], { encoding: 'utf8' });
ok(ajBad.status === 0, 'dry-run com ajustes ok');

srv.close();
console.log(`\n${total - falhas}/${total} verificações do importador passaram.`);
process.exit(falhas ? 1 : 0);
