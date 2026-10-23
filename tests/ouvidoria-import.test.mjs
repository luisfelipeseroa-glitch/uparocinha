// Importador de ouvidorias (CSV): as regras de validação devem espelhar as do banco (09_ouvidoria.sql).
//   cd tests && node ouvidoria-import.test.mjs
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (!c) { falhas++; console.log('  ✗ FALHOU:', m); } };

const U = new Proxy({ esc: s => String(s) }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
const window = { UPA: U };
vm.createContext({ window, console, URL, Blob: class {}, document: {} });
for (const f of ['js/mod-pop.js', 'js/mod-ouvidoria.js']) vm.runInContext(readFileSync(join(raiz, f), 'utf8'), vm.createContext({ window, console }));
const { lerPlanilha } = U.ouvidoria, { parseCsv } = U.pop;
const ler = (txt) => lerPlanilha(parseCsv(txt));
const cab = 'protocolo;data;categoria;coordenação;providência;prazo;situação\n';

let r = ler(cab + '24009430;23/09/2026;Tempo de espera;Coordenação Administrativa;Fluxo revisado com a equipe;30/09/2026;Em andamento\n');
ok(r.itens.length === 1 && !r.itens[0].erros.length, 'linha válida passa');
ok(r.itens[0].reg.situacao === 'em_andamento' && r.itens[0].reg.data_manifestacao === '2026-09-23' && r.itens[0].reg.prazo === '2026-09-30', 'converte datas e situação');
ok(Object.keys(r.itens[0].reg).sort().join() === 'categoria,coordenacao,data_manifestacao,prazo,protocolo,providencia,situacao', 'só os 7 campos permitidos');

r = ler(cab + 'ab;23/09/2026;Outros;Coordenação Administrativa;Texto ok aqui;;\n24009430;31/02/2026;Outros;Coordenação Administrativa;Texto ok aqui;;\n24009431;23/09/2026;Inventada;Coordenação Administrativa;Texto ok aqui;;\n24009432;23/09/2026;Outros;Outra;Texto ok aqui;;\n'
  + '24009433;23/09/2026;Outros;RH Focal;ligar 21 99999-1234 urgente;;\n24009434;23/09/2026;Outros;RH Focal;fulano@email.com;;\n24009435;23/09/2026;Outros;RH Focal;Texto ok aqui;22/09/2026;\n24009436;23/09/2026;Outros;RH Focal;ok;;\n24009437;23/09/2026;Outros;RH Focal;Texto ok aqui;;Talvez\n24009437;23/09/2026;Outros;RH Focal;Texto ok aqui;;\n');
const erros = r.itens.map(i => i.erros.join('|'));
ok(/protocolo inválido/.test(erros[0]), 'protocolo curto recusado');
ok(/data inválida/.test(erros[1]), 'data inexistente recusada');
ok(/categoria/.test(erros[2]), 'categoria desconhecida recusada');
ok(/coordenação/.test(erros[3]), 'coordenação desconhecida recusada');
ok(/telefone/.test(erros[4]) && /telefone/.test(erros[5]), 'telefone e e-mail na providência recusados');
ok(/prazo antes/.test(erros[6]), 'prazo anterior à data recusado');
ok(/5 a 500/.test(erros[7]), 'providência curta recusada');
ok(/situação/.test(erros[8]), 'situação desconhecida recusada');
ok(/repetido/.test(erros[9]), 'protocolo repetido na planilha recusado');
ok(ler('a;b\n1;2\n').erro && ler(cab).erro, 'cabeçalho/linhas faltando dão erro');

// arquivo real gerado a partir dos relatórios
try {
  const csv = readFileSync(process.argv[2] || join(raiz, '..', 'ouvidorias_importacao.csv'), 'utf8');
  const real = ler(csv);
  ok(real.itens.length > 100 && real.itens.every(i => !i.erros.length), `CSV de histórico: ${real.itens.length} linhas, todas válidas`);
} catch { console.log('  (CSV de histórico não encontrado — pulado)'); }
console.log(falhas ? `\n${falhas} FALHA(S) de ${total}` : `\nOK — ${total} verificações`); process.exit(falhas ? 1 : 0);
