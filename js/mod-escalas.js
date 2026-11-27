/* Escalas por setor e equipe fixa (RH/DP).
   Todos veem e têm "Minha escala". ADM, gestores e as pessoas indicadas como editores corrigem
   (troca, cobertura em cima da hora, extra, RPA) — toda correção grava quem, quando e o motivo.
   Cadastro, importação, regras e editores: só gestores. */
(function () {
  'use strict';
  /* Modo embutido: o GIUS Coordenador abre esta mesma tela dentro dele (…/uparocinha/?embed=1#/escalas).
     Esconde o cabeçalho, o menu e o chat do Colaborador, e mantém a pessoa sempre na tela de Escalas. */
  if (/[?&]embed=1\b/.test(location.search)) {
    document.documentElement.classList.add('gius-embed');
    const st = document.createElement('style');
    st.textContent = '.gius-embed .topbar,.gius-embed .sidebar,.gius-embed .mv-header,.gius-embed #chat-fab,.gius-embed #chat-window,.gius-embed .banner{display:none!important}' +
      '.gius-embed .main{margin:0!important;min-height:0!important}';
    document.head.appendChild(st);
    if (!/^#\/escalas/.test(location.hash)) location.hash = '#/escalas';
    let voltas = 0;
    window.addEventListener('hashchange', () => { if (!/^#\/escalas/.test(location.hash) && voltas++ < 3) location.hash = '#/escalas'; });
  }
  const U = window.UPA, esc = U.esc;
  const SETORES = [['enfermagem', 'Enfermagem'], ['farmacia', 'Farmácia'], ['medico', 'Médicos'], ['radiologia', 'Radiologia'], ['seso', 'Serviço Social'],
    ['administrativo', 'Administrativo'], ['higienizacao', 'Higienização (ASG)'], ['maqueiro', 'Maqueiros'], ['vigilancia', 'Vigilância'], ['coordenacao', 'Coordenação e rotinas']];
  const SETOR_NOME = Object.fromEntries(SETORES);
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const ORIGENS = [['escala', 'Escala prevista'], ['extra', 'Plantão extra'], ['rpa', 'RPA'], ['cobertura', 'Cobertura em cima da hora'], ['troca', 'Troca / permuta']];
  const ORIGEM_NOME = Object.fromEntries(ORIGENS);
  const SIGLA = { rpa: 'RPA', extra: 'EXTRA' };
  const COR_SUB = { rpa: '#DDD6FE', extra: '#FBCFE8' };
  const SAI = [['', 'Tirar da escala'], ['FT', 'FT — Falta'], ['AT', 'AT — Atestado'], ['FL', 'FL — Folga'], ['PM', 'PM — Permuta'], ['TR', 'TR — Troca']];
  const p2 = n => String(n).padStart(2, '0');
  const iso = (a, m, d) => `${a}-${p2(m)}-${p2(d)}`;
  const ndias = (a, m) => new Date(a, m, 0).getDate();
  const dow = (a, m, d) => new Date(a, m - 1, d).getDay();

  const S = { ano: 0, mes: 0, setor: 'enfermagem', aba: 'equipe', cols: [], cods: {}, cob: [], lan: new Map(), editor: false, meus: [], carregado: false };
  const CSS = `<style>
    .esc-abas{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.esc-abas button{border:1.5px solid var(--gray-200);background:#fff;border-radius:20px;padding:6px 13px;font-size:12px;font-weight:700;cursor:pointer;color:var(--gray-600)}
    .esc-abas button.on{background:var(--blue-main);color:#fff;border-color:var(--blue-main)}
    .esc-wrap{overflow:auto;max-height:72vh;border:1px solid var(--gray-200);border-radius:8px;background:#fff}
    .esc-tab{border-collapse:separate;border-spacing:0;font-size:11px}.esc-tab th,.esc-tab td{border-right:1px solid #eef0f3;border-bottom:1px solid #eef0f3;padding:0;text-align:center}
    .esc-tab thead th{position:sticky;top:0;background:#F3F4F6;z-index:2;min-width:30px;font-size:10px;padding:3px 0;line-height:1.15}.esc-tab th.fds{background:#E5E7EB}
    .esc-tab .esc-nome{position:sticky;left:0;background:#fff;z-index:1;text-align:left;min-width:210px;max-width:210px;padding:4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .esc-tab thead .esc-nome{z-index:3;background:#F3F4F6}.esc-nome small{display:block;color:var(--gray-500);font-size:10px}
    .esc-tab tr.esc-eq td{background:#DBEAFE;color:#1E3A8A;font-weight:800;text-align:left;padding:4px 8px;position:sticky;left:0}
    .esc-cel{height:30px;min-width:30px;font-weight:700;font-size:10px;cursor:default}.esc-cel.ed{cursor:pointer}.esc-cel.ed:hover{outline:2px solid var(--blue-main);outline-offset:-2px}
    .esc-cel.fds:empty{background:#F9FAFB}.esc-cel i{display:block;font-size:8px;font-style:normal;opacity:.8}
    .esc-tab tr.esc-cob td{background:#F9FAFB;font-weight:700}.esc-tab tr.esc-cob .esc-nome{background:#F9FAFB;font-weight:700}
    .esc-ok{color:#065F46}.esc-bad{background:#FEE2E2!important;color:#991B1B}.esc-vaga{color:#A21CAF;font-style:italic}
    .esc-leg{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;font-size:11px}.esc-leg span{padding:2px 8px;border-radius:6px;border:1px solid #0001}
    .esc-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;max-width:560px}.esc-cal div{border:1px solid var(--gray-200);border-radius:6px;min-height:52px;padding:3px 5px;font-size:11px;background:#fff}
    .esc-cal .cab{background:#F3F4F6;font-weight:800;text-align:center;min-height:0}.esc-cal b{display:block;font-size:12px}.esc-cal em{font-style:normal;font-weight:800;font-size:11px;padding:1px 5px;border-radius:5px}
    .esc-tab tr.esc-sub td{background:#FAF5FF}.esc-tab tr.esc-sub .esc-nome{background:#FAF5FF;padding-left:18px;color:#6B21A8}
    .esc-cel b.esc-sig{display:block;font-size:9px;line-height:1.1}.esc-cel.esc-vz.ed:empty:hover::after{content:'+';color:#6B21A8}
    .esc-dias{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:6px 0}.esc-dias label{border:1px solid var(--gray-200);border-radius:6px;padding:3px;text-align:center;font-size:11px;cursor:pointer}
    .esc-dias label:has(input:checked){background:#EDE9FE;border-color:#7C3AED}.esc-dias small{display:block;font-size:9px;color:var(--gray-500);min-height:11px}
    .esc-doc{border:1px solid var(--gray-200);border-radius:8px;padding:8px 10px;margin-bottom:6px}.esc-doc.ok{background:#F0FDF4;border-color:#86EFAC}
    .esc-doc .arq{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:5px;font-size:12px}
    @media print{.esc-wrap{max-height:none;overflow:visible}}
  </style>`;

  /* ---------- dados ---------- */
  async function pagina(montar) {
    let tudo = [], de = 0;
    for (;;) { const r = await U.db(montar().range(de, de + 999)); tudo = tudo.concat(r || []); if (!r || r.length < 1000) break; de += 1000; }
    return tudo;
  }
  async function carregarBase() {
    const [cols, cods, cob, ed, meus] = await Promise.all([
      pagina(() => window.sb.from('esc_colaboradores').select('*').order('setor').order('ordem').order('nome')),
      U.db(window.sb.from('esc_codigos').select('*').order('ordem')),
      U.db(window.sb.from('esc_cobertura').select('*').order('id')),
      U.db(window.sb.rpc('esc_pode_editar')),
      U.db(window.sb.rpc('esc_meus')),
    ]);
    S.cols = cols; S.cods = Object.fromEntries(cods.map(c => [c.codigo, c])); S.cob = cob; S.editor = !!ed; S.meus = (meus || []).map(Number);
    S.config = U.can('escalas_config', 'editar'); S.criar = U.can('escalas', 'criar');
  }
  async function carregarMes() {
    const ini = iso(S.ano, S.mes, 1), fim = iso(S.ano, S.mes, ndias(S.ano, S.mes));
    const l = await pagina(() => window.sb.from('esc_lancamentos').select('*').gte('data', ini).lte('data', fim).order('id'));
    S.lan = new Map(l.map(x => [x.colaborador_id + '|' + x.data, x]));
  }
  const colab = id => S.cols.find(c => c.id === id);
  const cor = c => (S.cods[c] || {}).cor || '#E5E7EB';
  const lanDe = (id, d) => S.lan.get(id + '|' + d);

  /* ---------- cobertura ---------- */
  function contar(r, data) {
    const wd = dow(+data.slice(0, 4), +data.slice(5, 7), +data.slice(8, 10));
    if (r.turno === 'uteis' && (wd === 0 || wd === 6)) return null;
    let n = 0;
    for (const c of S.cols) {
      if (c.vaga || !c.ativo || c.setor !== r.setor) continue;
      const l = lanDe(c.id, data); if (!l) continue;
      const k = S.cods[l.codigo]; if (!k || !k.presenca) continue;
      if (r.cargo === 'Pediatria') { if (l.area !== 'Pediatria') continue; } else if (c.cargo !== r.cargo) continue;
      const t = k.turno;
      if (r.turno === '24h' ? t === '24h' : r.turno === 'dia' ? (t === 'dia' || t === '24h') : r.turno === 'noite' ? (t === 'noite' || t === '24h') : true) n++;
    }
    return n;
  }
  const regrasDe = setor => S.cob.filter(r => r.ativo && (!setor || r.setor === setor));

  /* ---------- tela principal ---------- */
  U.registrar({
    id: 'escalas', label: 'Escalas (RH/DP)', icone: 'fa-people-group', cor: 'c-escala',
    async render(el) {
      const h = new Date(U.hojeISO() + 'T12:00:00');
      if (!S.ano) { S.ano = h.getFullYear(); S.mes = h.getMonth() + 1; }
      el.innerHTML = '<div class="spinner"><i class="fas fa-circle-notch spin"></i> Carregando escalas...</div>';
      try { await carregarBase(); await carregarMes(); } catch (e) {
        el.innerHTML = `<div class="vazio">Não foi possível abrir as escalas: ${esc(e.message)}<br><small>Se for a primeira vez, rode o arquivo supabase/12_escalas.sql no Supabase.</small></div>`; return;
      }
      const redesenhar = async () => { el.innerHTML = CSS + cabecalho() + '<div id="esc-corpo"></div>'; ligar(); await aba(); };
      const cabecalho = () => {
        const abas = [['equipe', 'Por equipe'], ['minha', 'Minha escala'], ['cobertura', 'Cobertura'], ['dp', 'Relatório DP']];
        if (S.editor || S.config) abas.push(['alter', 'Alterações']);
        if (S.editor || S.config) abas.push(['rpa', 'RPA / Extra']);
        if (S.config) abas.push(['cadastro', 'Cadastro']);
        return `<div class="barra"><button class="btn btn-ghost" id="es-ant"><i class="fas fa-chevron-left"></i></button>
          <b style="min-width:150px;text-align:center">${MESES[S.mes - 1]} de ${S.ano}</b><button class="btn btn-ghost" id="es-prox"><i class="fas fa-chevron-right"></i></button>
          <button class="btn btn-ghost" id="es-hoje">Hoje</button><span class="espaco"></span>
          ${S.editor ? '<span class="tag verde">Você pode corrigir a escala</span>' : ''}</div>
          <div class="esc-abas">${abas.map(a => `<button data-aba="${a[0]}" class="${S.aba === a[0] ? 'on' : ''}">${a[1]}</button>`).join('')}</div>`;
      };
      const ligar = () => {
        const mover = async n => { S.mes += n; if (S.mes > 12) { S.mes = 1; S.ano++; } if (S.mes < 1) { S.mes = 12; S.ano--; } await carregarMes(); await redesenhar(); };
        el.querySelector('#es-ant').onclick = () => mover(-1); el.querySelector('#es-prox').onclick = () => mover(1);
        el.querySelector('#es-hoje').onclick = async () => { S.ano = h.getFullYear(); S.mes = h.getMonth() + 1; await carregarMes(); await redesenhar(); };
        el.querySelectorAll('[data-aba]').forEach(b => b.onclick = async () => { S.aba = b.dataset.aba; await redesenhar(); });
      };
      S.redesenhar = async () => { await carregarMes(); await redesenhar(); };
      S.redesenharTudo = async () => { await carregarBase(); await carregarMes(); await redesenhar(); };
      const aba = async () => {
        const corpo = el.querySelector('#esc-corpo');
        try { await ({ equipe: abaEquipe, minha: abaMinha, cobertura: abaCobertura, dp: abaDP, alter: abaAlter, rpa: abaRPA, cadastro: abaCadastro }[S.aba])(corpo); } catch (e) { corpo.innerHTML = `<div class="vazio">${esc(e.message)}</div>`; }
      };
      await redesenhar();
    },
  });

  /* ---------- aba: por equipe ---------- */
  const ordEquipe = nome => { const m = /^S(\d)$/.exec(nome || ''); return m ? +m[1] : (nome || '').startsWith('PAR') ? 20 : (nome || '').startsWith('ÍMPAR') ? 30 : nome === 'Diurno' ? 40 : nome === 'Noturno' ? 41 : 90; };
  function legendaHtml() {
    return `<div class="esc-leg">${Object.values(S.cods).map(c => `<span style="background:${c.cor}"><b>${esc(c.codigo)}</b> ${esc(c.descricao)}</span>`).join('')}<span style="background:${COR_SUB.rpa}"><b>RPA</b> Cobertura por RPA</span><span style="background:${COR_SUB.extra}"><b>EXTRA</b> Cobertura por extra</span></div>`;
  }

  /* ---------- RPA / Extra: ajudantes ---------- */
  const presenca = l => !!(l && S.cods[l.codigo] && S.cods[l.codigo].presenca);
  const sigla = l => !presenca(l) ? l.codigo : SIGLA[l.origem] || l.codigo;
  /* quem cobre quem no mês: { idSubstituido: [idsSubstitutos] } */
  function coberturas() {
    const m = {};
    for (const l of S.lan.values()) {
      if (!l.cobre_id || !colab(l.colaborador_id)) continue;
      (m[l.cobre_id] = m[l.cobre_id] || new Set()).add(l.colaborador_id);
    }
    Object.keys(m).forEach(k => { m[k] = [...m[k]].sort((a, b) => colab(a).nome.localeCompare(colab(b).nome, 'pt-BR')); });
    return m;
  }
  const totalMes = (id, origem) => [...S.lan.values()].filter(l => l.colaborador_id === id && l.origem === origem && presenca(l)).length;
  const lanCobre = (sub, ausente, data) => { const l = lanDe(sub, data); return l && l.cobre_id === ausente ? l : null; };
  const resumoSub = (sub, ausente, dd) => {
    const r = { rpa: 0, extra: 0 };
    dd.forEach(d => { const l = lanCobre(sub, ausente, iso(S.ano, S.mes, d)); if (presenca(l) && r[l.origem] !== undefined) r[l.origem]++; });
    return r;
  };
  function abaEquipe(corpo) {
    const dias = ndias(S.ano, S.mes), hoje = U.hojeISO();
    const comLanc = new Set([...S.lan.values()].map(l => l.colaborador_id));
    const setoresOk = SETORES.filter(s => S.cols.some(c => c.setor === s[0]));
    if (!setoresOk.some(s => s[0] === S.setor)) S.setor = (setoresOk[0] || ['enfermagem'])[0];
    const cob = coberturas();
    /* RPA/Extra avulso só ganha linha própria se tiver dia fora de uma cobertura; as coberturas ficam abaixo de quem saiu */
    const proprios = new Set([...S.lan.values()].filter(l => !l.cobre_id).map(l => l.colaborador_id));
    const pessoas = S.cols.filter(c => c.setor === S.setor && (cob[c.id] || (c.vinculo !== 'CLT' && c.equipe === 'Extra / RPA' ? proprios.has(c.id) : (c.ativo || comLanc.has(c.id)))));
    const grupos = {};
    pessoas.forEach(c => (grupos[c.equipe || 'Sem equipe fixa'] = grupos[c.equipe || 'Sem equipe fixa'] || []).push(c));
    const nomes = Object.keys(grupos).sort((a, b) => ordEquipe(a === 'Sem equipe fixa' ? null : a) - ordEquipe(b === 'Sem equipe fixa' ? null : b) || a.localeCompare(b, 'pt-BR'));
    const dd = [...Array(dias)].map((_, i) => i + 1);
    const cab = `<tr><th class="esc-nome">Colaborador</th>${dd.map(d => `<th class="${[0, 6].includes(dow(S.ano, S.mes, d)) ? 'fds' : ''}">${d}<br>${DOW[dow(S.ano, S.mes, d)]}</th>`).join('')}<th>Dias</th></tr>`;
    let linhas = '';
    nomes.forEach(n => {
      linhas += `<tr class="esc-eq"><td colspan="${dias + 2}">${esc(n)} · ${grupos[n].filter(c => !c.vaga).length} pessoa(s)</td></tr>`;
      grupos[n].forEach(c => {
        let tot = 0;
        const cel = dd.map(d => {
          const data = iso(S.ano, S.mes, d), l = lanDe(c.id, data), fds = [0, 6].includes(dow(S.ano, S.mes, d));
          if (!l || (l.cobre_id && c.vinculo !== 'CLT' && c.equipe === 'Extra / RPA')) return `<td class="esc-cel${S.editor ? ' ed' : ''}${fds ? ' fds' : ''}" data-c="${c.id}" data-d="${data}"></td>`;
          if (S.cods[l.codigo] && S.cods[l.codigo].presenca) tot++;
          const dica = [S.cods[l.codigo] ? S.cods[l.codigo].descricao : l.codigo, l.equipe && l.equipe !== c.equipe ? 'Equipe: ' + l.equipe : '', l.origem !== 'escala' ? ORIGEM_NOME[l.origem] : '', l.area || '', l.observacao || ''].filter(Boolean).join(' · ');
          return `<td class="esc-cel${S.editor ? ' ed' : ''}" data-c="${c.id}" data-d="${data}" style="background:${cor(l.codigo)}${data === hoje ? ';box-shadow:inset 0 0 0 2px #1D4ED8' : ''}" title="${esc(dica)}">${esc(l.codigo)}${l.origem !== 'escala' ? '<i>' + ({ extra: 'EXT', rpa: 'RPA', cobertura: 'COB', troca: 'TRC' }[l.origem]) + '</i>' : ''}</td>`;
        }).join('');
        linhas += `<tr><td class="esc-nome${c.vaga ? ' esc-vaga' : ''}">${esc(c.nome)}${c.vinculo !== 'CLT' ? ` <span class="tag azul">${esc(c.vinculo)}</span>` : ''}<small>${esc(c.cargo)}${c.regime ? ' · ' + esc(c.regime) : ''}</small></td>${cel}<td><b>${tot}</b></td></tr>`;
        (cob[c.id] || []).forEach(sid => {
          const x = colab(sid), r = resumoSub(sid, c.id, dd);
          const cels = dd.map(d => {
            const data = iso(S.ano, S.mes, d), l = lanCobre(sid, c.id, data);
            if (!l) return `<td class="esc-cel esc-vz${S.editor ? ' ed' : ''}" data-cob="${c.id}" data-sub="${sid}" data-d="${data}"></td>`;
            return `<td class="esc-cel${S.editor ? ' ed' : ''}" data-c="${sid}" data-d="${data}" style="background:${presenca(l) ? COR_SUB[l.origem] : cor(l.codigo)}" title="${esc(x.nome + ' cobre ' + c.nome + ' · ' + l.codigo)}"><b class="esc-sig">${esc(sigla(l))}</b>${presenca(l) ? '<i>' + esc(l.codigo) + '</i>' : ''}</td>`;
          }).join('');
          const mes = ['rpa', 'extra'].filter(o => r[o]).map(o => `${SIGLA[o]} no mês: ${totalMes(sid, o)}`).join(' · ');
          linhas += `<tr class="esc-sub"><td class="esc-nome" title="${esc(x.nome)}">↳ ${esc(x.nome)}<small>${esc(x.especializacao || x.cargo)}${x.matricula ? ' · mat. ' + esc(x.matricula) : ''}${mes ? ' · ' + mes : ''}</small></td>${cels}<td title="Plantões cobrindo ${esc(c.nome)}"><b>${r.rpa + r.extra}</b></td></tr>`;
        });
      });
    });
    const regras = regrasDe(S.setor);
    const cobL = regras.map(r => `<tr class="esc-cob"><td class="esc-nome">${esc(r.rotulo || r.cargo)}<small>mínimo ${r.minimo}</small></td>${dd.map(d => {
      const n = contar(r, iso(S.ano, S.mes, d)); return n === null ? '<td>–</td>' : `<td class="${n < r.minimo ? 'esc-bad' : 'esc-ok'}">${n}</td>`;
    }).join('')}<td></td></tr>`).join('');
    corpo.innerHTML = `<div class="barra" style="margin-bottom:8px">${setoresOk.map(s => `<button class="btn ${s[0] === S.setor ? 'btn-primary' : 'btn-ghost'}" data-setor="${s[0]}">${s[1]}</button>`).join('')}
        <span class="espaco"></span><button class="btn btn-ghost" id="es-imp"><i class="fas fa-print"></i> Imprimir</button></div>
      <div class="esc-wrap"><table class="esc-tab"><thead>${cab}</thead><tbody>${linhas}${cobL ? `<tr class="esc-eq"><td colspan="${dias + 2}">Cobertura do dia (vermelho = abaixo do mínimo)</td></tr>${cobL}` : ''}</tbody></table></div>
      ${S.editor ? '<div class="ajuda">Toque num dia para corrigir, cobrir com RPA / Extra ou trocar o nome. Quem cobre aparece logo abaixo de quem saiu. Fica registrado quem alterou e o motivo.</div>' : ''}${legendaHtml()}`;
    corpo.querySelectorAll('[data-setor]').forEach(b => b.onclick = () => { S.setor = b.dataset.setor; abaEquipe(corpo); });
    if (S.editor) corpo.querySelectorAll('.esc-cel').forEach(td => td.onclick = () => td.dataset.cob ? dlgCobrir(+td.dataset.cob, td.dataset.d, +td.dataset.sub) : dlgDia(+td.dataset.c, td.dataset.d));
    corpo.querySelector('#es-imp').onclick = () => imprimirSetor(S.setor, nomes, grupos, dd, regras);
  }

  function imprimirSetor(setor, nomes, grupos, dd, regras) {
    const cob = coberturas();
    const dias = dd.length, th = dd.map(d => `<th style="padding:2px;font-size:8px;text-align:center;${[0, 6].includes(dow(S.ano, S.mes, d)) ? 'background:#ddd' : ''}">${d}<br>${DOW[dow(S.ano, S.mes, d)]}</th>`).join('');
    let corpo = '';
    nomes.forEach(n => {
      corpo += `<tr><td colspan="${dias + 2}" style="background:#DBEAFE;font-weight:700">${esc(n)}</td></tr>`;
      grupos[n].forEach(c => {
        let t = 0;
        const cel = dd.map(d => { let l = lanDe(c.id, iso(S.ano, S.mes, d)); if (l && l.cobre_id && c.vinculo !== 'CLT' && c.equipe === 'Extra / RPA') l = null; if (l && S.cods[l.codigo] && S.cods[l.codigo].presenca) t++; return `<td style="padding:1px;font-size:8px;text-align:center;${l ? 'background:' + cor(l.codigo) : ''}">${l ? esc(l.codigo) : ''}</td>`; }).join('');
        corpo += `<tr><td style="font-size:9px;white-space:nowrap">${esc(c.nome)}<br><span style="color:#555;font-size:8px">${esc(c.cargo)}</span></td>${cel}<td style="font-size:9px;text-align:center"><b>${t}</b></td></tr>`;
        (cob[c.id] || []).forEach(sid => {
          const x = colab(sid), r = resumoSub(sid, c.id, dd);
          const cels = dd.map(d => { const l = lanCobre(sid, c.id, iso(S.ano, S.mes, d)); return `<td style="padding:1px;font-size:7px;text-align:center;${l ? 'background:' + (presenca(l) ? COR_SUB[l.origem] : cor(l.codigo)) : ''}">${l ? '<b>' + esc(sigla(l)) + '</b>' + (presenca(l) ? '<br>' + esc(l.codigo) : '') : ''}</td>`; }).join('');
          corpo += `<tr><td style="font-size:8px;white-space:nowrap;padding-left:10px;background:#FAF5FF">↳ ${esc(x.nome)}<br><span style="color:#555;font-size:7px">${esc(x.especializacao || x.cargo)}${x.matricula ? ' · mat. ' + esc(x.matricula) : ''}</span></td>${cels}<td style="font-size:9px;text-align:center"><b>${r.rpa + r.extra}</b></td></tr>`;
        });
      });
    });
    const leg = Object.values(S.cods).map(c => `<span style="background:${c.cor};border:1px solid #999;padding:1px 5px;margin:1px;display:inline-block;font-size:8px"><b>${esc(c.codigo)}</b> ${esc(c.descricao)}</span>`).join('') + ['rpa', 'extra'].map(o => `<span style="background:${COR_SUB[o]};border:1px solid #999;padding:1px 5px;margin:1px;display:inline-block;font-size:8px"><b>${SIGLA[o]}</b> cobertura</span>`).join('');
    U.imprimir(U.cabecalho(`Escala — ${SETOR_NOME[setor]}`, `${MESES[S.mes - 1]} de ${S.ano}`) +
      `<table><thead><tr><th style="font-size:9px">Colaborador</th>${th}<th style="font-size:8px">Dias</th></tr></thead><tbody>${corpo}</tbody></table><div style="margin-top:6px">${leg}</div>
       <div style="display:flex;gap:30px;margin-top:34px"><div class="assin" style="width:40%"><div class="linha">Coordenação responsável</div></div><div class="assin" style="width:40%"><div class="linha">Gestão / RH</div></div></div>` +
      U.rodape(U.ctx.nome), `Escala ${SETOR_NOME[setor]} ${MESES[S.mes - 1]} ${S.ano}`, { paisagem: true, margem: '8mm' });
  }

  /* ---------- corrigir um dia ---------- */
  function dlgDia(id, data) {
    const c = colab(id), l = lanDe(id, data);
    const opc = ['<option value="">— sem lançamento (remover) —</option>', ...Object.values(S.cods).map(k => `<option value="${esc(k.codigo)}"${l && l.codigo === k.codigo ? ' selected' : ''}>${esc(k.codigo)} — ${esc(k.descricao)}</option>`)].join('');
    const saiu = l && l.cobre_id ? colab(l.cobre_id) : null;
    U.modal({
      titulo: `${c.nome} · ${U.fmtData(data)}`, largura: 500,
      corpo: `<div class="ajuda" style="margin:0 0 6px">${esc(c.cargo)} · equipe ${esc(c.equipe || '—')}${l ? ' · hoje: <b>' + esc(l.codigo) + '</b>' : ' · sem lançamento'}${l && l.atualizado_por_nome ? ' · última alteração: ' + esc(l.atualizado_por_nome) : ''}</div>
        ${saiu ? `<div class="ajuda" style="background:#FAF5FF;padding:7px 9px;border-radius:6px">Cobrindo <b>${esc(saiu.nome)}</b>. Para desfazer, escolha "sem lançamento (remover)".</div>` : ''}
        <label class="fl">Código do dia</label><select id="d-cod">${opc}</select>
        <label class="fl">Tipo</label><select id="d-ori">${ORIGENS.map(o => `<option value="${o[0]}"${l && l.origem === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>
        <label class="fl">Área (opcional)</label><input id="d-area" maxlength="40" value="${esc(l ? l.area || '' : '')}" placeholder="Ex.: Pediatria">
        <label class="fl">Observação (opcional)</label><input id="d-obs" maxlength="120" value="${esc(l ? l.observacao || '' : '')}">
        <label class="fl">Motivo da correção *</label><textarea id="d-mot" rows="2" maxlength="300" placeholder="Ex.: troca combinada com a coordenação"></textarea>`,
      botoes: [{ rotulo: 'Cancelar' },
        ...(!saiu ? [{ rotulo: 'Cobrir com RPA / Extra…', acao: (el, f) => { f(); dlgCobrir(id, data); return false; } }] : []),
        ...(!saiu && presenca(l) ? [{ rotulo: 'Trocar o nome / permuta…', acao: (el, f) => { f(); dlgSubst(id, data); return false; } }] : []),
        { rotulo: 'Salvar', classe: 'btn-primary', acao: async el => {
          const mot = el.querySelector('#d-mot').value.trim();
          if (mot.length < 5) { U.toast('Escreva o motivo (mínimo 5 letras).', 'erro'); return false; }
          await U.db(window.sb.rpc('esc_corrigir', { p_data: data, p_colab: id, p_codigo: el.querySelector('#d-cod').value, p_motivo: mot, p_area: el.querySelector('#d-area').value, p_obs: el.querySelector('#d-obs').value, p_origem: el.querySelector('#d-ori').value }));
          U.toast('Escala corrigida e registrada.'); await S.redesenhar();
        } }],
    });
  }

  function dlgSubst(id, data) {
    const c = colab(id), l = lanDe(id, data);
    const cand = S.cols.filter(x => x.id !== id && x.ativo && !x.vaga && x.setor === c.setor && x.cargo === c.cargo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const ocup = x => { const t = lanDe(x.id, data); return t && S.cods[t.codigo] && S.cods[t.codigo].presenca ? ' (já escalado: ' + t.codigo + ')' : t ? ' (' + t.codigo + ')' : ''; };
    U.modal({
      titulo: 'Trocar o nome / cobertura', largura: 520,
      corpo: `<p style="margin-bottom:6px"><b>${esc(c.nome)}</b> perde o plantão <b>${esc(l.codigo)}</b> de ${U.fmtData(data)} e outra pessoa assume (mesma equipe e horário).</p>
        <label class="fl">Quem assume *</label><select id="s-para"><option value="">Selecione...</option>${cand.map(x => `<option value="${x.id}">${esc(x.nome)} — ${esc(x.equipe || 'sem equipe')}${esc(ocup(x))}</option>`).join('')}</select>
        <label class="fl">O que fica para quem sai</label><select id="s-de">${SAI.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
        <label class="fl">Tipo</label><select id="s-ori"><option value="cobertura">Cobertura em cima da hora</option><option value="troca">Troca / permuta</option></select>
        <label class="fl">Motivo *</label><textarea id="s-mot" rows="2" maxlength="300"></textarea>`,
      botoes: [{ rotulo: 'Cancelar' }, { rotulo: 'Confirmar troca', classe: 'btn-primary', acao: async el => {
        const q = s => el.querySelector(s), mot = q('#s-mot').value.trim(); let para = q('#s-para').value;
        if (!para) { U.toast('Escolha quem assume.', 'erro'); return false; }
        if (mot.length < 5) { U.toast('Escreva o motivo (mínimo 5 letras).', 'erro'); return false; }
        await U.db(window.sb.rpc('esc_substituir', { p_data: data, p_de: id, p_para: +para, p_cod_de: q('#s-de').value, p_motivo: mot, p_origem: q('#s-ori').value }));
        U.toast('Troca registrada.'); await S.redesenharTudo();
      } }],
    });
  }

  /* ---------- cobrir com RPA / Extra ---------- */
  function turnoHabitual(c, l) {
    if (presenca(l)) return l.codigo;
    const n = {};
    for (const x of S.lan.values()) if (x.colaborador_id === c.id && presenca(x)) n[x.codigo] = (n[x.codigo] || 0) + 1;
    const mais = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    if (mais) return mais;
    if (S.cods[c.codigo_padrao]) return c.codigo_padrao;
    const t = /\bSN\b/i.test(c.equipe || '') ? 'SN' : 'SD';
    return S.cods[t] ? t : '';
  }
  function dlgCobrir(ausId, data, subId) {
    const a = colab(ausId), la = lanDe(ausId, data), dias = ndias(S.ano, S.mes), tocado = +data.slice(8);
    const ordem = (x, y) => (y.cargo === a.cargo) - (x.cargo === a.cargo) || x.nome.localeCompare(y.nome, 'pt-BR');
    const disp = S.cols.filter(x => x.id !== a.id && x.ativo && !x.vaga && x.setor === a.setor);
    const avulsos = disp.filter(x => x.vinculo !== 'CLT').sort(ordem), colegas = disp.filter(x => x.vinculo === 'CLT' && x.cargo === a.cargo).sort(ordem);
    const op = x => `<option value="${x.id}"${x.id === subId ? ' selected' : ''}>${esc(x.nome)} — ${esc(x.especializacao || x.cargo)}${x.matricula ? ' · mat. ' + esc(x.matricula) : ''}</option>`;
    const turnos = Object.values(S.cods).filter(k => k.presenca), faltas = Object.values(S.cods).filter(k => !k.presenca);
    const turno = turnoHabitual(a, la);
    const motivoAus = la && !presenca(la) ? la.codigo : '';
    const grade = [...Array(dias)].map((_, i) => {
      const d = i + 1, l = lanDe(a.id, iso(S.ano, S.mes, d));
      return `<label>${d} ${DOW[dow(S.ano, S.mes, d)]}<br><input type="checkbox" value="${d}"${d === tocado ? ' checked' : ''}><small>${esc(l ? l.codigo : '')}</small></label>`;
    }).join('');
    const m = U.modal({
      titulo: `Cobrir ${a.nome}`, largura: 560,
      corpo: `<p class="ajuda" style="margin:0 0 6px">${esc(a.nome)} fica com a ausência (férias, falta, atestado) e quem cobre aparece logo abaixo.</p>
        <label class="fl">Quem vai cobrir *</label><select id="c-sub"><option value="">Selecione...</option>
          <optgroup label="RPA / Extra cadastrados">${avulsos.map(op).join('')}</optgroup><optgroup label="Colegas do mesmo cargo (extra)">${colegas.map(op).join('')}</optgroup></select>
        <button type="button" class="btn btn-ghost" id="c-novo" style="margin-top:6px"><i class="fas fa-user-plus"></i> Cadastrar novo RPA / Extra</button>
        <div class="grade2"><div><label class="fl">Sigla *</label><select id="c-tipo"><option value="rpa">RPA</option><option value="extra">EXTRA</option></select></div>
          <div><label class="fl">Turno do plantão *</label><select id="c-turno">${turnos.map(k => `<option value="${esc(k.codigo)}"${k.codigo === turno ? ' selected' : ''}>${esc(k.codigo)} — ${esc(k.descricao)}</option>`).join('')}</select></div></div>
        <label class="fl">Dias de ${MESES[S.mes - 1]}/${S.ano} *</label>
        <div class="barra"><button type="button" class="btn btn-ghost" data-m="impar">Ímpares</button><button type="button" class="btn btn-ghost" data-m="par">Pares</button><button type="button" class="btn btn-ghost" data-m="nada">Limpar</button></div>
        <div class="esc-dias">${grade}</div>
        <div id="c-falta-bloco"><label class="fl">Por que ${esc(a.nome.split(' ')[0])} não vem? *</label><select id="c-falta"><option value="">Selecione...</option>${faltas.map(k => `<option value="${esc(k.codigo)}">${esc(k.codigo)} — ${esc(k.descricao)}</option>`).join('')}</select>
          <div class="ajuda">Usado nos dias marcados em que ainda não há férias, falta ou atestado lançados.</div></div>
        <label class="fl">Motivo *</label><textarea id="c-mot" rows="2" maxlength="300" placeholder="Ex.: cobertura de férias"></textarea>`,
      botoes: [{ rotulo: 'Cancelar' }, { rotulo: 'Salvar cobertura', classe: 'btn-primary', acao: async el => {
        const q = x => el.querySelector(x), sub = +q('#c-sub').value, mot = q('#c-mot').value.trim(), marc = marcados();
        if (!sub) { U.toast('Escolha quem vai cobrir.', 'erro'); return false; }
        if (!marc.length) { U.toast('Marque pelo menos um dia.', 'erro'); return false; }
        if (precisaFalta() && !q('#c-falta').value) { U.toast('Informe por que a pessoa não vem.', 'erro'); return false; }
        if (mot.length < 5) { U.toast('Escreva o motivo (mínimo 5 letras).', 'erro'); return false; }
        const n = await U.db(window.sb.rpc('esc_cobrir', { p_ausente: a.id, p_substituto: sub, p_datas: marc.map(d => iso(S.ano, S.mes, d)), p_tipo: q('#c-tipo').value, p_turno: q('#c-turno').value, p_cod_ausente: precisaFalta() ? q('#c-falta').value : '', p_motivo: mot }));
        U.toast(`Cobertura salva em ${n} dia(s).`); await S.redesenharTudo();
      } }],
    });
    const el = m.el, caixas = [...el.querySelectorAll('.esc-dias input')];
    const marcados = () => caixas.filter(c => c.checked).map(c => +c.value);
    const precisaFalta = () => !a.vaga && marcados().some(d => { const l = lanDe(a.id, iso(S.ano, S.mes, d)); return !l || presenca(l); });
    const atualiza = () => { el.querySelector('#c-falta-bloco').style.display = precisaFalta() ? 'block' : 'none'; };
    caixas.forEach(c => { c.onchange = atualiza; });
    /* Ímpares / Pares: se o dia tocado é uma ausência (ex.: FER), marca só os dias com essa mesma ausência */
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      caixas.forEach(c => {
        const d = +c.value, l = lanDe(a.id, iso(S.ano, S.mes, d));
        c.checked = b.dataset.m !== 'nada' && d % 2 === (b.dataset.m === 'impar' ? 1 : 0) && (!motivoAus || !!(l && l.codigo === motivoAus));
      });
      atualiza();
    });
    const tipoPadrao = () => { const x = colab(+el.querySelector('#c-sub').value); if (x) el.querySelector('#c-tipo').value = x.vinculo === 'RPA' ? 'rpa' : 'extra'; };
    el.querySelector('#c-sub').onchange = tipoPadrao; tipoPadrao(); atualiza();
    el.querySelector('#c-novo').onclick = () => { m.fechar(); formRPA(null, { setor: a.setor, cargo: a.cargo }, id => dlgCobrir(ausId, data, id)); };
  }

  /* ---------- cadastro de RPA / Extra ---------- */
  async function formRPA(c, def, depois) {
    let ct = {};
    try { if (c) ct = (await U.db(window.sb.from('esc_rpa_contatos').select('*').eq('colaborador_id', c.id).limit(1)))[0] || {}; } catch (e) { U.erro(e); return; }
    const cargos = [...new Set(S.cols.map(x => x.cargo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    U.formulario({
      titulo: c ? 'Editar RPA / Extra' : 'Cadastrar RPA / Extra', colunas: 2, largura: 600,
      valores: c ? { ...c, telefone: ct.telefone || '', email: ct.email || '' } : { vinculo: 'RPA', ativo: true, ...def },
      campos: [{ n: 'nome', rotulo: 'Nome completo', obrig: true, max: 120, col: '1 / -1' }, { n: 'especializacao', rotulo: 'Especialização', max: 80, ph: 'Ex.: Enfermagem em emergência' }, { n: 'matricula', rotulo: 'Matrícula', max: 20 },
        { n: 'telefone', rotulo: 'Telefone', max: 30, ph: '(21) 90000-0000' }, { n: 'email', rotulo: 'E-mail', max: 120 },
        { n: 'setor', rotulo: 'Setor', tipo: 'select', opcoes: SETORES, semVazio: true }, { n: 'cargo', rotulo: 'Cargo', tipo: 'select', opcoes: cargos, obrig: true },
        { n: 'vinculo', rotulo: 'Vínculo', tipo: 'select', opcoes: ['RPA', 'Extra'], semVazio: true }, { n: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }],
      aoSalvar: async v => {
        const id = await U.db(window.sb.rpc('esc_cadastrar_rpa', { p_id: c ? c.id : null, p_nome: v.nome, p_especializacao: v.especializacao || '', p_matricula: v.matricula || '', p_telefone: v.telefone || '', p_email: v.email || '', p_setor: v.setor, p_cargo: v.cargo, p_vinculo: v.vinculo, p_ativo: !!v.ativo }));
        U.toast('Cadastro salvo.'); await carregarBase(); await depois(+id);
      },
    });
  }

  /* ---------- aba: RPA / Extra ---------- */
  async function abaRPA(corpo) {
    const gestor = S.config, setor = corpo.dataset.setor || '';
    const [contatos, ano, tipos, docs] = await Promise.all([
      pagina(() => window.sb.from('esc_rpa_contatos').select('*').order('colaborador_id')),
      pagina(() => window.sb.from('esc_lancamentos').select('id,colaborador_id,codigo,origem').gte('data', `${S.ano}-01-01`).lte('data', `${S.ano}-12-31`).in('origem', ['rpa', 'extra']).order('id')),
      gestor ? U.db(window.sb.from('esc_rpa_tipos').select('*').order('ordem').order('nome')) : [],
      gestor ? pagina(() => window.sb.from('esc_rpa_documentos').select('*').order('id')) : [],
    ]);
    const ct = Object.fromEntries(contatos.map(x => [x.colaborador_id, x]));
    const totalAno = (id, o) => ano.filter(l => l.colaborador_id === id && l.origem === o && presenca(l)).length;
    const obrig = tipos.filter(t => t.ativo && t.obrigatorio);
    const entregues = id => obrig.filter(t => docs.some(d => d.colaborador_id === id && d.tipo_id === t.id)).length;
    const L = S.cols.filter(c => !c.vaga && (!setor || c.setor === setor) && (c.vinculo !== 'CLT' || totalAno(c.id, 'rpa') + totalAno(c.id, 'extra') > 0))
      .sort((a, b) => (a.vinculo === 'CLT') - (b.vinculo === 'CLT') || a.nome.localeCompare(b.nome, 'pt-BR'));
    const conta = (c, o) => `<b>${totalMes(c.id, o)}</b> no mês<br><small>${totalAno(c.id, o)} em ${S.ano}</small>`;
    const colunas = [
      { t: 'Nome', f: c => `<b>${esc(c.nome)}</b> <span class="tag azul">${esc(c.vinculo)}</span>${c.ativo ? '' : ' <span class="tag">inativo</span>'}<br><small>${esc(c.especializacao || '')}${c.especializacao ? ' · ' : ''}${esc(c.cargo)} · ${esc(SETOR_NOME[c.setor] || c.setor)}</small>` },
      { t: 'Matrícula', f: c => esc(c.matricula || '—') },
      { t: 'Contato', f: c => { const x = ct[c.id] || {}; return x.telefone || x.email ? `${esc(x.telefone || '')}<br><small>${esc(x.email || '')}</small>` : '—'; } },
      { t: 'Plantões RPA', f: c => conta(c, 'rpa') }, { t: 'Extras', f: c => conta(c, 'extra') },
      ...(gestor ? [{ t: 'Documentos', f: c => c.vinculo === 'CLT' ? '—' : `<button class="btn ${entregues(c.id) === obrig.length ? 'btn-ghost' : 'btn-primary'}" data-docs="${c.id}"><i class="fas fa-folder-open"></i> ${entregues(c.id)} de ${obrig.length}</button>` }] : []),
      { t: '', f: c => c.vinculo === 'CLT' ? '' : `<button class="btn btn-ghost" data-ed="${c.id}" title="Editar"><i class="fas fa-pen"></i></button> <button class="btn btn-ghost" data-avulso="${c.id}" title="Lançar plantão sem substituir ninguém"><i class="fas fa-calendar-plus"></i></button>` },
    ];
    corpo.innerHTML = `<div class="barra"><select id="rp-set"><option value="">Todos os setores</option>${SETORES.map(x => `<option value="${x[0]}"${x[0] === setor ? ' selected' : ''}>${x[1]}</option>`).join('')}</select><span class="espaco"></span>
      <button class="btn btn-primary" id="rp-novo"><i class="fas fa-user-plus"></i> Cadastrar RPA / Extra</button></div>
      ${U.tabela(colunas, L, 'Nenhum RPA ou Extra cadastrado.')}
      <div class="ajuda">Totais de ${MESES[S.mes - 1]} e do ano de ${S.ano}. ${gestor ? 'Documentos: visíveis somente para gestores. O número mostra os itens obrigatórios já entregues.' : 'Os documentos são vistos somente pelos gestores.'}</div>`;
    const dest = () => abaRPA(corpo);
    corpo.querySelector('#rp-set').onchange = e => { corpo.dataset.setor = e.target.value; dest(); };
    corpo.querySelector('#rp-novo').onclick = () => formRPA(null, { setor: setor || S.setor }, dest);
    corpo.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => formRPA(colab(+b.dataset.ed), null, dest));
    corpo.querySelectorAll('[data-docs]').forEach(b => b.onclick = () => dlgDocs(colab(+b.dataset.docs), dest));
    corpo.querySelectorAll('[data-avulso]').forEach(b => b.onclick = () => {
      const c = colab(+b.dataset.avulso), h = U.hojeISO(), mes = `${S.ano}-${p2(S.mes)}`;
      U.formulario({ titulo: `Plantão avulso · ${c.nome}`, largura: 420, valores: { data: h.startsWith(mes) ? h : mes + '-01' }, campos: [{ n: 'data', rotulo: `Dia (dentro de ${MESES[S.mes - 1]})`, tipo: 'date', obrig: true }],
        aoSalvar: v => { if (!String(v.data).startsWith(mes)) { U.toast('Escolha um dia do mês que está aberto.', 'erro'); return false; } setTimeout(() => dlgDia(c.id, v.data), 0); } });
    });
  }

  /* ---------- documentos do RPA (somente gestores) ---------- */
  const BALDE = 'rpa-documentos';
  const TIPOS_ARQ = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  async function dlgDocs(c, depois) {
    const m = U.modal({ titulo: `Documentos · ${c.nome}`, largura: 640, corpo: '<div id="dc-lista"><div class="spinner"><i class="fas fa-circle-notch spin"></i> Carregando...</div></div>',
      botoes: [{ rotulo: 'Fechar', acao: async () => { await depois(); } }] });
    const lista = m.el.querySelector('#dc-lista');
    m.el.querySelector('.upa-x').addEventListener('click', () => depois());
    async function desenha() {
      const [tipos, docs] = await Promise.all([
        U.db(window.sb.from('esc_rpa_tipos').select('*').order('ordem').order('nome')),
        U.db(window.sb.from('esc_rpa_documentos').select('*').eq('colaborador_id', c.id).order('id')),
      ]);
      const meus = t => docs.filter(d => d.tipo_id === t.id);
      const vis = tipos.filter(t => t.ativo || meus(t).length), obrig = tipos.filter(t => t.ativo && t.obrigatorio), ok = obrig.filter(t => meus(t).length).length;
      lista.innerHTML = `<p style="margin-bottom:8px"><span class="tag ${ok === obrig.length ? 'verde' : 'amarelo'}">${ok} de ${obrig.length} obrigatórios entregues</span></p>
        ${vis.map(t => `<div class="esc-doc${meus(t).length ? ' ok' : ''}" data-t="${t.id}">
          <div class="barra" style="margin:0"><b>${meus(t).length ? '✅' : '⬜'} ${esc(t.nome)}</b> <small>${t.obrigatorio ? 'obrigatório' : 'opcional'}${t.ativo ? '' : ' · fora da lista'}</small><span class="espaco"></span>
            ${t.ativo ? `<button type="button" class="btn btn-ghost" data-env="${t.id}"><i class="fas fa-paperclip"></i> Anexar</button><button type="button" class="btn btn-ghost" data-tira="${t.id}" title="Retirar este item da lista"><i class="fas fa-eye-slash"></i></button>` : ''}</div>
          ${meus(t).map(d => `<div class="arq"><span>📄 <b>${esc(d.descricao || d.nome_arquivo)}</b><br><small>${esc(d.nome_arquivo)} · ${U.fmtDH(d.enviado_em)} · ${esc(d.enviado_por_nome || '')}</small></span><span class="espaco"></span>
            <button type="button" class="btn btn-ghost" data-abre="${d.id}"><i class="fas fa-eye"></i> Abrir</button><button type="button" class="btn btn-ghost" data-apaga="${d.id}" title="Apagar"><i class="fas fa-trash"></i></button></div>`).join('')}
          <div data-form="${t.id}" style="display:none;margin-top:6px"><label class="fl">O que é este documento? (opcional)</label><input data-desc maxlength="200" placeholder="Ex.: COREN frente e verso">
            <label class="fl">Arquivo (PDF ou foto, até 10 MB)</label><input type="file" data-arq accept=".pdf,image/jpeg,image/png,image/webp"><button type="button" class="btn btn-primary" data-salva="${t.id}" style="margin-top:6px">Enviar</button></div></div>`).join('')}
        <div class="barra" style="margin-top:10px"><input id="dc-novo" maxlength="80" placeholder="Novo item do checklist" style="flex:1;padding:8px;border:1.5px solid var(--gray-200);border-radius:6px">
          <label style="font-size:12px;display:flex;gap:4px;align-items:center"><input type="checkbox" id="dc-obr" checked> obrigatório</label><button type="button" class="btn btn-ghost" id="dc-add">Incluir item</button></div>
        <div class="ajuda">A lista vale para todos os RPAs. Itens retirados não apagam arquivos já enviados.</div>`;
      const tenta = fn => async ev => { const b = ev.currentTarget; b.disabled = true; try { await fn(b); } catch (e) { U.erro(e); } finally { b.disabled = false; } };
      lista.querySelectorAll('[data-env]').forEach(b => b.onclick = () => { const f = lista.querySelector(`[data-form="${b.dataset.env}"]`); f.style.display = f.style.display === 'none' ? 'block' : 'none'; });
      lista.querySelectorAll('[data-salva]').forEach(b => b.onclick = tenta(async () => {
        const f = lista.querySelector(`[data-form="${b.dataset.salva}"]`), arq = f.querySelector('[data-arq]').files[0];
        if (!arq) { U.toast('Escolha o arquivo.', 'erro'); return; }
        const ext = TIPOS_ARQ[arq.type];
        if (!ext) { U.toast('Envie PDF, JPG, PNG ou WEBP.', 'erro'); return; }
        if (arq.size > 10485760) { U.toast('O arquivo passa de 10 MB.', 'erro'); return; }
        const caminho = `${c.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
        await U.enviarArquivo(BALDE, caminho, arq);
        try {
          await U.db(window.sb.from('esc_rpa_documentos').insert({ colaborador_id: c.id, tipo_id: +b.dataset.salva, descricao: f.querySelector('[data-desc]').value.trim() || null, caminho, nome_arquivo: arq.name.slice(-150) }));
        } catch (e) { await window.sb.storage.from(BALDE).remove([caminho]); throw e; }
        U.toast('Documento anexado.'); await desenha();
      }));
      lista.querySelectorAll('[data-abre]').forEach(b => b.onclick = tenta(async () => {
        const d = docs.find(x => x.id === +b.dataset.abre), j = window.open('', '_blank');
        try {
          const url = await U.urlAssinada(BALDE, d.caminho, 120);
          if (j) { j.opener = null; j.location = url; } else location.assign(url);
        } catch (e) { if (j) j.close(); throw e; }
      }));
      lista.querySelectorAll('[data-apaga]').forEach(b => b.onclick = tenta(async () => {
        const d = docs.find(x => x.id === +b.dataset.apaga);
        if (!await U.confirmar(`Apagar "${d.descricao || d.nome_arquivo}"? Não dá para desfazer.`, 'Apagar', true)) return;
        const r = await window.sb.storage.from(BALDE).remove([d.caminho]);
        if (r.error) throw new Error('Não foi possível apagar o arquivo.');
        await U.db(window.sb.from('esc_rpa_documentos').delete().eq('id', d.id)); await desenha();
      }));
      lista.querySelectorAll('[data-tira]').forEach(b => b.onclick = tenta(async () => {
        const t = tipos.find(x => x.id === +b.dataset.tira);
        if (!await U.confirmar(`Retirar "${t.nome}" do checklist de todos os RPAs?`, 'Retirar')) return;
        await U.db(window.sb.from('esc_rpa_tipos').update({ ativo: false }).eq('id', t.id)); await desenha();
      }));
      lista.querySelector('#dc-add').onclick = tenta(async () => {
        const nome = lista.querySelector('#dc-novo').value.trim(), obrigatorio = lista.querySelector('#dc-obr').checked;
        if (nome.length < 2) { U.toast('Escreva o nome do item.', 'erro'); return; }
        const ja = tipos.find(t => t.nome.toLowerCase() === nome.toLowerCase());
        await U.db(ja ? window.sb.from('esc_rpa_tipos').update({ ativo: true, obrigatorio }).eq('id', ja.id) : window.sb.from('esc_rpa_tipos').insert({ nome, obrigatorio, ordem: 500 }));
        await desenha();
      });
    }
    try { await desenha(); } catch (e) { lista.innerHTML = `<div class="vazio">${esc(e.message)}</div>`; }
  }

  /* ---------- aba: minha escala ---------- */
  async function abaMinha(corpo) {
    if (!S.meus.length) { corpo.innerHTML = '<div class="vazio">Não encontrei você na escala (a matrícula do seu acesso precisa ser a mesma do cadastro da escala). Fale com a coordenação.</div>'; return; }
    const ini = new Date(Date.now() - 7 * 864e5).toISOString();
    const alts = await U.db(window.sb.from('esc_alteracoes').select('*').in('colaborador_id', S.meus).gte('em', ini).order('em', { ascending: false }).limit(20)).catch(() => []);
    let h = '';
    if (alts.length) h += `<div class="ajuda" style="background:#FEF3C7;color:#78350F;padding:8px 10px;border-radius:8px;margin-bottom:10px"><b>Alterações recentes na sua escala</b><br>${alts.map(a => `${U.fmtDH(a.em)} — ${esc(descAlt(a))} (por ${esc(a.por_nome || '—')}${a.motivo ? ': ' + esc(a.motivo) : ''})`).join('<br>')}</div>`;
    S.meus.forEach(id => {
      const c = colab(id); if (!c) return;
      const dias = ndias(S.ano, S.mes), off = dow(S.ano, S.mes, 1), hoje = U.hojeISO();
      let cal = DOW.map(d => `<div class="cab">${d}</div>`).join('') + '<div style="border:none;background:none"></div>'.repeat(off);
      let tot = 0, hrs = 0;
      for (let d = 1; d <= dias; d++) {
        const data = iso(S.ano, S.mes, d), l = lanDe(id, data), k = l && S.cods[l.codigo];
        if (k && k.presenca) { tot++; hrs += +k.horas; }
        cal += `<div style="${data === hoje ? 'outline:2px solid #1D4ED8;' : ''}"><b>${d}</b>${l ? `<em style="background:${cor(l.codigo)}">${esc(l.codigo)}</em>${l.origem !== 'escala' ? '<br><small>' + ORIGEM_NOME[l.origem] + '</small>' : ''}` : ''}</div>`;
      }
      const prox = [...S.lan.values()].filter(l => l.colaborador_id === id && l.data >= hoje && S.cods[l.codigo] && S.cods[l.codigo].presenca).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5);
      h += `<h3 style="margin:8px 0 2px">${esc(c.nome)}</h3><div class="ajuda" style="margin-bottom:8px">${esc(c.cargo)} · ${esc(SETOR_NOME[c.setor] || c.setor)} · equipe <b>${esc(c.equipe || '—')}</b> · ${tot} dia(s) de trabalho · ${hrs} h no mês</div>
        ${prox.length ? `<div style="margin-bottom:8px"><b>Próximos plantões:</b> ${prox.map(l => `${U.fmtData(l.data)} (${esc(l.codigo)})`).join(' · ')}</div>` : ''}<div class="esc-cal">${cal}</div>`;
    });
    corpo.innerHTML = h + legendaHtml();
  }
  function descAlt(a) {
    const j = x => x ? (x.codigo ? x.codigo : x.equipe !== undefined ? 'equipe ' + (x.equipe || '—') : '') : '';
    const d = a.data ? U.fmtData(a.data) + ': ' : '';
    if (a.acao === 'remocao') return `${d}${a.colaborador_nome} saiu da escala (era ${j(a.antes)})`;
    if (a.acao === 'substituicao') return a.depois && a.depois.assume ? `${d}${a.colaborador_nome} → ${a.depois.assume} assume ${a.depois.codigo}${a.depois.codigo_de ? ' (sai: ' + a.depois.codigo_de + ')' : ''}` : `${d}${a.colaborador_nome} cobre ${(a.depois || {}).cobre || ''} (${(a.depois || {}).codigo || ''})`;
    if (a.acao === 'equipe') return `${a.colaborador_nome}: ${j(a.antes)} → ${j(a.depois)}`;
    if (a.acao === 'extra') return `Cadastro de ${(a.depois || {}).vinculo || 'extra'}: ${a.colaborador_nome}`;
    if (a.acao === 'importacao' || a.acao === 'geracao') return `${a.acao === 'importacao' ? 'Importação' : 'Geração'} de escala (${(a.depois || {}).dias || 0} dias)`;
    return `${d}${a.colaborador_nome}: ${j(a.antes) || 'vazio'} → ${j(a.depois) || 'vazio'}`;
  }

  /* ---------- aba: cobertura ---------- */
  function abaCobertura(corpo) {
    const dias = ndias(S.ano, S.mes), hoje = U.hojeISO(), regras = S.cob.filter(r => r.ativo);
    const so = corpo.dataset.so === undefined ? (hoje.slice(0, 7) === `${S.ano}-${p2(S.mes)}`) : corpo.dataset.so === '1';
    const falhas = [];
    for (let d = 1; d <= dias; d++) {
      const data = iso(S.ano, S.mes, d); if (so && data < hoje) continue;
      regras.forEach(r => { const n = contar(r, data); if (n !== null && n < r.minimo) falhas.push({ data, r, n }); });
    }
    corpo.innerHTML = `<div class="barra"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="co-so" ${so ? 'checked' : ''}> Só de hoje em diante</label><span class="espaco"></span>
      <span class="tag ${falhas.length ? 'vermelho' : 'verde'}">${falhas.length} alerta(s) em ${MESES[S.mes - 1]}</span></div>` +
      U.tabela([{ t: 'Data', f: x => `${U.fmtData(x.data)} <small>(${DOW[dow(S.ano, S.mes, +x.data.slice(8))]})</small>` }, { t: 'Setor', f: x => esc(SETOR_NOME[x.r.setor]) }, { t: 'Posto', f: x => esc(x.r.rotulo || x.r.cargo) },
        { t: 'Escalados', f: x => `<b style="color:#B91C1C">${x.n}</b>` }, { t: 'Mínimo', f: x => x.r.minimo }, { t: 'Falta', f: x => `<span class="tag vermelho">${x.r.minimo - x.n}</span>` }], falhas, 'Nenhum dia abaixo do mínimo. Cobertura completa neste período.') +
      '<div class="ajuda">Vagas (postos sem titular) não contam. As regras de mínimo ficam em Cadastro → Regras de cobertura.</div>';
    corpo.querySelector('#co-so').onchange = e => { corpo.dataset.so = e.target.checked ? '1' : '0'; abaCobertura(corpo); };
  }

  /* ---------- aba: relatório DP ---------- */
  function resumoDP(setor) {
    const linhas = [];
    S.cols.filter(c => (!setor || c.setor === setor) && !c.vaga).forEach(c => {
      const r = { c, plantoes: 0, horas: 0, noturnas: 0, FER: 0, AFT: 0, AT: 0, FT: 0, extras: 0 };
      let tem = false;
      for (let d = 1; d <= ndias(S.ano, S.mes); d++) {
        const l = lanDe(c.id, iso(S.ano, S.mes, d)); if (!l) continue; tem = true;
        const k = S.cods[l.codigo] || {};
        if (k.presenca) { r.plantoes++; r.horas += +k.horas; r.noturnas += +k.horas_noturnas; if (l.origem !== 'escala') r.extras++; }
        if (['FER', 'AFT', 'AT', 'FT'].includes(l.codigo)) r[l.codigo]++;
      }
      if (tem) linhas.push(r);
    });
    return linhas;
  }
  function abaDP(corpo) {
    const setor = corpo.dataset.setor || '';
    const L = resumoDP(setor), soma = k => L.reduce((s, r) => s + r[k], 0);
    corpo.innerHTML = `<div class="barra"><select id="dp-set"><option value="">Todos os setores</option>${SETORES.map(s => `<option value="${s[0]}"${s[0] === setor ? ' selected' : ''}>${s[1]}</option>`).join('')}</select>
      <span class="espaco"></span><button class="btn btn-ghost" id="dp-csv"><i class="fas fa-file-excel"></i> Baixar (Excel/CSV)</button><button class="btn btn-ghost" id="dp-pdf"><i class="fas fa-print"></i> Imprimir</button></div>
      ${U.tabela([{ t: 'Colaborador', f: r => `${esc(r.c.nome)}<br><small>${esc(r.c.cargo)}${r.c.matricula ? ' · mat. ' + esc(r.c.matricula) : ''}</small>` }, { t: 'Setor / equipe', f: r => `${esc(SETOR_NOME[r.c.setor] || r.c.setor)}<br><small>${esc(r.c.equipe || '—')}</small>` },
        { t: 'Plantões', f: r => r.plantoes }, { t: 'Horas', f: r => r.horas }, { t: 'H. noturnas', f: r => r.noturnas }, { t: 'Extras/RPA/cob.', f: r => r.extras }, { t: 'Férias', f: r => r.FER || '' },
        { t: 'Afast.', f: r => r.AFT || '' }, { t: 'Atest.', f: r => r.AT || '' }, { t: 'Faltas', f: r => r.FT ? `<b style="color:#B91C1C">${r.FT}</b>` : '' }], L, 'Sem lançamentos neste mês.')}
      <div class="ajuda">Total: ${soma('plantoes')} plantões · ${soma('horas')} h · ${soma('noturnas')} h noturnas · ${soma('FT')} falta(s). As horas vêm da tabela de códigos (Cadastro); confira com a regra do DP antes de usar na folha.</div>`;
    corpo.querySelector('#dp-set').onchange = e => { corpo.dataset.setor = e.target.value; abaDP(corpo); };
    const cab = ['Colaborador', 'Matrícula', 'Cargo', 'Setor', 'Equipe', 'Plantões', 'Horas', 'H. noturnas', 'Extras/RPA/cobertura', 'Férias', 'Afastamento', 'Atestado', 'Faltas'];
    const rows = L.map(r => [r.c.nome, r.c.matricula || '', r.c.cargo, SETOR_NOME[r.c.setor], r.c.equipe || '', r.plantoes, r.horas, r.noturnas, r.extras, r.FER, r.AFT, r.AT, r.FT]);
    const nomeArq = `escala_dp_${S.ano}-${p2(S.mes)}${setor ? '_' + setor : ''}`;
    corpo.querySelector('#dp-csv').onclick = () => {
      const csv = '﻿' + [cab, ...rows].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nomeArq + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    corpo.querySelector('#dp-pdf').onclick = () => U.imprimir(U.cabecalho('Resumo mensal da escala (DP)', `${MESES[S.mes - 1]} de ${S.ano}${setor ? ' · ' + SETOR_NOME[setor] : ''}`) +
      `<table style="font-size:10px"><thead><tr>${cab.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` + U.rodape(U.ctx.nome), nomeArq, { paisagem: true, margem: '10mm' });
  }

  /* ---------- aba: alterações ---------- */
  async function abaAlter(corpo) {
    const L = await U.db(window.sb.from('esc_alteracoes').select('*').order('em', { ascending: false }).limit(200));
    corpo.innerHTML = U.tabela([{ t: 'Quando', f: a => U.fmtDH(a.em) }, { t: 'Quem alterou', f: a => `${esc(a.por_nome || '—')}<br><small>${esc(a.por_matricula || '')}</small>` },
      { t: 'O que mudou', f: a => esc(descAlt(a)) }, { t: 'Motivo', f: a => esc(a.motivo || '') }], L, 'Nenhuma alteração registrada.') + '<div class="ajuda">Mostra as últimas 200 alterações.</div>';
  }

  /* ---------- aba: cadastro (gestores) ---------- */
  async function abaCadastro(corpo) {
    const editores = await U.db(window.sb.from('esc_editores').select('*').order('nome'));
    const setor = corpo.dataset.setor || 'enfermagem';
    const pess = S.cols.filter(c => c.setor === setor);
    corpo.innerHTML = `
      <h3>Importar planilhas e gerar o mês</h3>
      <div class="barra"><label class="btn btn-ghost" style="cursor:pointer"><i class="fas fa-file-import"></i> Importar arquivo de escalas (.json)<input type="file" id="cd-arq" accept=".json,application/json" style="display:none"></label>
        <button class="btn btn-ghost" id="cd-ger"><i class="fas fa-wand-magic-sparkles"></i> Gerar ${MESES[S.mes - 1]}/${S.ano} automaticamente</button></div>
      <div class="ajuda">Gerar preenche só os dias que ainda estão vazios: 24h a cada 6 dias (enfermagem/farmácia), 7 dias (raio X), 12x48 (serviço social), pares/ímpares (12x36), seg-sex (diaristas) e repete a semana anterior dos médicos. Não mexe no que já foi corrigido.</div>
      <h3 style="margin-top:18px">Pessoas</h3>
      <div class="barra"><select id="cd-set">${SETORES.map(s => `<option value="${s[0]}"${s[0] === setor ? ' selected' : ''}>${s[1]}</option>`).join('')}</select><span class="espaco"></span><button class="btn btn-primary" id="cd-nova"><i class="fas fa-plus"></i> Nova pessoa</button></div>
      ${U.tabela([{ t: 'Nome', f: c => `<span class="${c.vaga ? 'esc-vaga' : ''}">${esc(c.nome)}</span>${c.ativo ? '' : ' <span class="tag">inativo</span>'}${c.vaga ? ' <span class="tag amarelo">vaga</span>' : ''}` }, { t: 'Cargo', f: c => esc(c.cargo) }, { t: 'Equipe', f: c => esc(c.equipe || '—') },
        { t: 'Matrícula', f: c => esc(c.matricula || '—') }, { t: 'Regime', f: c => esc(c.regime || '—') }, { t: '', f: c => `<button class="btn btn-ghost" data-ed="${c.id}"><i class="fas fa-pen"></i></button>` }], pess, 'Ninguém neste setor.')}
      <h3 style="margin-top:18px">Regras de cobertura (mínimo por turno)</h3>
      ${U.tabela([{ t: 'Posto', f: r => `${esc(r.rotulo || r.cargo)}<br><small>${esc(SETOR_NOME[r.setor] || r.setor)} · ${r.turno}</small>` }, { t: 'Mínimo', f: r => `<input type="number" min="0" max="99" value="${r.minimo}" data-min="${r.id}" style="width:64px;padding:4px">` },
        { t: 'Ativa', f: r => `<input type="checkbox" data-atv="${r.id}" ${r.ativo ? 'checked' : ''}>` }], S.cob)}
      <h3 style="margin-top:18px">Quem pode corrigir a escala além de gestores e ADM</h3>
      <div class="ajuda">Ex.: rotina de enfermagem. Informe a matrícula do acesso da pessoa.</div>
      ${U.tabela([{ t: 'Nome', f: e => esc(e.nome || '') }, { t: '', f: e => `<button class="btn btn-ghost" data-rm="${e.profile_id}"><i class="fas fa-xmark"></i></button>` }], editores, 'Nenhum editor extra.')}
      <div class="barra" style="margin-top:8px"><input id="cd-mat" placeholder="Matrícula" style="padding:8px;border:1.5px solid var(--gray-200);border-radius:6px"><button class="btn btn-ghost" id="cd-addEd">Adicionar editor</button></div>`;
    const dest = () => abaCadastro(corpo);
    corpo.querySelector('#cd-set').onchange = e => { corpo.dataset.setor = e.target.value; dest(); };
    corpo.querySelector('#cd-arq').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text()); if (j.schema !== 'gius-escala-importacao') throw new Error('Arquivo não é de importação de escalas.');
        if (!await U.confirmar(`Importar ${j.colaboradores.length} pessoas e ${j.lancamentos.length} dias lançados? Dias já existentes serão atualizados.`, 'Importar')) return;
        U.toast('Importando... não feche a tela.');
        for (let i = 0; i < j.colaboradores.length; i += 100) await U.db(window.sb.rpc('esc_importar', { p: { colaboradores: j.colaboradores.slice(i, i + 100) } }));
        for (let i = 0; i < j.lancamentos.length; i += 400) await U.db(window.sb.rpc('esc_importar', { p: { lancamentos: j.lancamentos.slice(i, i + 400) } }));
        U.toast('Escalas importadas.'); await S.redesenharTudo();
      } catch (err) { U.erro(err); }
    };
    corpo.querySelector('#cd-ger').onclick = async () => {
      if (!S.criar) { U.toast('Sem permissão para gerar.', 'erro'); return; }
      if (!await U.confirmar(`Gerar a escala de ${MESES[S.mes - 1]}/${S.ano}? Só os dias vazios serão preenchidos.`, 'Gerar')) return;
      try { const n = await U.db(window.sb.rpc('esc_gerar', { p_ano: S.ano, p_mes: S.mes })); U.toast(`${n} dia(s) lançado(s).`); await S.redesenhar(); } catch (e) { U.erro(e); }
    };
    corpo.querySelector('#cd-nova').onclick = () => formPessoa(null, setor, dest);
    corpo.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => formPessoa(colab(+b.dataset.ed), setor, dest));
    corpo.querySelectorAll('[data-min]').forEach(i => i.onchange = async () => { try { await U.db(window.sb.from('esc_cobertura').update({ minimo: +i.value }).eq('id', +i.dataset.min)); S.cob.find(r => r.id === +i.dataset.min).minimo = +i.value; U.toast('Mínimo salvo.'); } catch (e) { U.erro(e); } });
    corpo.querySelectorAll('[data-atv]').forEach(i => i.onchange = async () => { try { await U.db(window.sb.from('esc_cobertura').update({ ativo: i.checked }).eq('id', +i.dataset.atv)); S.cob.find(r => r.id === +i.dataset.atv).ativo = i.checked; U.toast('Regra atualizada.'); } catch (e) { U.erro(e); } });
    corpo.querySelector('#cd-addEd').onclick = async () => {
      const m = corpo.querySelector('#cd-mat').value.trim(); if (!m) return;
      try {
        const p = (await U.db(window.sb.from('profiles').select('id,nome').eq('matricula', m).limit(1)))[0]; if (!p) throw new Error('Matrícula não encontrada.');
        await U.db(window.sb.from('esc_editores').upsert({ profile_id: p.id, nome: p.nome })); U.toast(p.nome + ' agora pode corrigir a escala.'); dest();
      } catch (e) { U.erro(e); }
    };
    corpo.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { try { await U.db(window.sb.from('esc_editores').delete().eq('profile_id', b.dataset.rm)); dest(); } catch (e) { U.erro(e); } });
  }

  function formPessoa(c, setor, depois) {
    const cargos = [...new Set(S.cols.filter(x => x.setor === setor).map(x => x.cargo))];
    U.formulario({
      titulo: c ? 'Editar pessoa' : 'Nova pessoa', colunas: 2, largura: 600,
      valores: c || { setor, ativo: true, vinculo: 'CLT' },
      campos: [{ n: 'nome', rotulo: 'Nome', obrig: true, max: 120, col: '1 / -1' }, { n: 'matricula', rotulo: 'Matrícula', max: 20 }, { n: 'registro', rotulo: 'Registro (COREN, CRF...)', max: 30 },
        { n: 'setor', rotulo: 'Setor', tipo: 'select', opcoes: SETORES, semVazio: true }, { n: 'cargo', rotulo: 'Cargo', obrig: true, max: 60, ajuda: cargos.length ? 'Usados neste setor: ' + cargos.join(', ') : '' },
        { n: 'equipe', rotulo: 'Equipe (S1, PAR SD...)', max: 40 }, { n: 'regime', rotulo: 'Regime', max: 60 }, { n: 'vinculo', rotulo: 'Vínculo', tipo: 'select', opcoes: ['CLT', 'RPA', 'Extra'], semVazio: true },
        { n: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }, { n: 'vaga', rotulo: 'É uma vaga (posto sem titular)', tipo: 'checkbox' },
        { n: 'gerar', rotulo: 'Geração automática', tipo: 'select', opcoes: [['ciclo', 'A cada N dias'], ['par', 'Dias pares'], ['impar', 'Dias ímpares'], ['uteis', 'Segunda a sexta'], ['semana', 'Repetir a semana anterior']] },
        { n: 'codigo_padrao', rotulo: 'Código padrão', tipo: 'select', opcoes: Object.keys(S.cods) }, { n: 'ciclo_dias', rotulo: 'A cada quantos dias', tipo: 'number', min: 2, step: '1' }, { n: 'ancora', rotulo: 'Um dia em que trabalha', tipo: 'date' }],
      aoSalvar: async v => {
        const o = { ...v, matricula: v.matricula || null, registro: v.registro || null, equipe: v.equipe || null, regime: v.regime || null, gerar: v.gerar || null, codigo_padrao: v.codigo_padrao || null, ancora: v.ancora || null, atualizado_em: new Date().toISOString() };
        if (c) {
          if ((c.equipe || '') !== (o.equipe || '')) {
            const mot = await U.pedirMotivo('Mudança de equipe', `${c.nome}: ${c.equipe || '—'} → ${o.equipe || '—'}. Vale a partir de hoje nos dias já lançados.`); if (!mot) return false;
            await U.db(window.sb.rpc('esc_mudar_equipe', { p_colab: c.id, p_equipe: o.equipe || '', p_motivo: mot, p_a_partir: U.hojeISO() }));
          }
          delete o.equipe; await U.db(window.sb.from('esc_colaboradores').update(o).eq('id', c.id));
        } else {
          await U.db(window.sb.from('esc_colaboradores').insert({ ...o, chave: 'man|' + o.setor + '|' + Date.now(), ordem: 800 }));
        }
        U.toast('Cadastro salvo.'); await carregarBase(); depois();
      },
    });
  }
})();
