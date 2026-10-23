/* POPs — Procedimentos Operacionais Padrão: cadastro, importação, histórico de versões e acompanhamento de publicação/revisão.
   Todos veem os POPs publicados; os 3 gestores cadastram, importam e acompanham; só o Gestor Administrativo exclui. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const AREAS = ['Administrativo', 'Recepção', 'Almoxarifado', 'Farmácia', 'Enfermagem', 'Médico', 'Pediatria', 'Laboratório', 'Radiologia', 'NIR', 'Higienização', 'Manutenção', 'Segurança', 'TI', 'RH', 'Qualidade e Segurança do Paciente', 'Outro'];
  const TIPOS = ['Assistencial', 'Administrativo', 'Apoio'];
  const ST = { em_elaboracao: ['Em elaboração', 'amarelo'], em_revisao: ['Em revisão', 'azul'], publicado: ['Publicado', 'verde'], obsoleto: ['Obsoleto', ''] };
  const RX_COD = /^[A-Za-z0-9._/-]{2,30}$/;

  /* ---------- datas e situação da revisão ---------- */
  const iso = d => d.toISOString().slice(0, 10);
  function addMeses(dataIso, n) {
    const [a, m, d] = dataIso.split('-').map(Number);
    const alvo = new Date(Date.UTC(a, m - 1 + n, 1));
    const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(d, ultimo));
    return iso(alvo);
  }
  const dias = di => Math.round((new Date(di + 'T00:00:00Z') - new Date(U.hojeISO() + 'T00:00:00Z')) / 864e5);
  const proxima = p => { const base = p.data_ultima_revisao || p.data_publicacao; return base ? addMeses(base, p.periodicidade_meses || 24) : null; };
  /* categoria: vencido | a_vencer (até 90 dias) | em_dia | sem_data | null (não publicado) */
  function revisao(p) {
    if (p.status !== 'publicado') return null;
    const prox = proxima(p);
    if (!prox) return { cat: 'sem_data', prox: null, d: null, html: '<span class="tag amarelo">sem data</span>' };
    const d = dias(prox);
    if (d < 0) return { cat: 'vencido', prox, d, html: `<span class="tag vermelho">vencida há ${-d} d</span>` };
    if (d <= 90) return { cat: 'a_vencer', prox, d, html: `<span class="tag amarelo">vence em ${d} d</span>` };
    return { cat: 'em_dia', prox, d, html: '<span class="tag verde">em dia</span>' };
  }

  /* ---------- CSV (planilha de controle) ---------- */
  function parseCsv(txt) {
    txt = String(txt || '').replace(/^﻿/, '');
    const prim = txt.split(/\r?\n/)[0] || '';
    const sep = [';', '\t', ','].map(s => [s, prim.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const linhas = []; let cel = '', lin = [], asp = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (asp) { if (c === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else asp = false; } else cel += c; }
      else if (c === '"') asp = true;
      else if (c === sep) { lin.push(cel); cel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; lin.push(cel); cel = ''; if (lin.some(x => x.trim())) linhas.push(lin); lin = []; }
      else cel += c;
    }
    lin.push(cel); if (lin.some(x => x.trim())) linhas.push(lin);
    return linhas;
  }
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const COLS = { codigo: 'codigo', titulo: 'titulo', nome: 'titulo', area: 'area', setor: 'area', tipo: 'tipo', responsavel: 'responsavel', versao: 'versao', status: 'status', situacao: 'status',
    publicacao: 'data_publicacao', datapublicacao: 'data_publicacao', ultimarevisao: 'data_ultima_revisao', dataultimarevisao: 'data_ultima_revisao', revisao: 'data_ultima_revisao',
    periodicidade: 'periodicidade_meses', periodicidademeses: 'periodicidade_meses', revisaoemmeses: 'periodicidade_meses' };
  const STATUS_TXT = { emelaboracao: 'em_elaboracao', elaboracao: 'em_elaboracao', rascunho: 'em_elaboracao', emrevisao: 'em_revisao', revisao: 'em_revisao', publicado: 'publicado', vigente: 'publicado', ativo: 'publicado', obsoleto: 'obsoleto', inativo: 'obsoleto' };
  function data(v) {
    v = String(v || '').trim(); if (!v) return { ok: true, v: null };
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/), a, mm, d;
    if (m) { [, a, mm, d] = m; } else if ((m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) { [, d, mm, a] = m; } else return { ok: false };
    const dt = new Date(Date.UTC(+a, +mm - 1, +d));
    if (dt.getUTCFullYear() !== +a || dt.getUTCMonth() !== +mm - 1 || dt.getUTCDate() !== +d) return { ok: false };
    return { ok: true, v: iso(dt) };
  }
  /* converte as linhas do CSV em registros validados: [{linha, reg, erros[]}] */
  function lerPlanilha(linhas) {
    if (linhas.length < 2) return { erro: 'A planilha precisa ter o cabeçalho e ao menos uma linha.' };
    const mapa = linhas[0].map(h => COLS[norm(h)] || null);
    if (!mapa.includes('codigo') || !mapa.includes('titulo')) return { erro: 'O cabeçalho precisa ter as colunas "código" e "título".' };
    const vistos = new Set();
    return { itens: linhas.slice(1).map((l, i) => {
      const r = {}; mapa.forEach((c, k) => { if (c) r[c] = (l[k] || '').trim(); });
      const erros = [], reg = {};
      reg.codigo = r.codigo || ''; if (!RX_COD.test(reg.codigo)) erros.push('código inválido (2 a 30 letras, números, ponto, barra ou hífen)');
      else if (vistos.has(reg.codigo.toLowerCase())) erros.push('código repetido na planilha'); else vistos.add(reg.codigo.toLowerCase());
      reg.titulo = r.titulo || ''; if (reg.titulo.length < 3) erros.push('título ausente');
      reg.area = r.area || ''; if (reg.area.length < 2) erros.push('área ausente');
      const tp = TIPOS.find(t => norm(t) === norm(r.tipo)); reg.tipo = tp || 'Assistencial'; if (r.tipo && !tp) erros.push('tipo deve ser Assistencial, Administrativo ou Apoio');
      reg.versao = r.versao || '1.0';
      const pub = data(r.data_publicacao), rev = data(r.data_ultima_revisao);
      if (!pub.ok) erros.push('data de publicação inválida'); if (!rev.ok) erros.push('data da última revisão inválida');
      reg.data_publicacao = pub.v || null; reg.data_ultima_revisao = rev.v || null;
      if (r.status) { reg.status = STATUS_TXT[norm(r.status)]; if (!reg.status) erros.push('situação não reconhecida'); } else reg.status = reg.data_publicacao ? 'publicado' : 'em_elaboracao';
      if (reg.status === 'publicado' && !reg.data_publicacao && !reg.data_ultima_revisao) erros.push('POP publicado precisa de data de publicação');
      reg.periodicidade_meses = r.periodicidade_meses ? Number(r.periodicidade_meses) : 24;
      if (!Number.isInteger(reg.periodicidade_meses) || reg.periodicidade_meses < 1 || reg.periodicidade_meses > 60) erros.push('periodicidade deve ser de 1 a 60 meses');
      if (r.responsavel) reg.responsavel = r.responsavel;
      return { linha: i + 2, reg, erros };
    }) };
  }
  U.pop = { parseCsv, lerPlanilha, addMeses, revisao, proxima };   // exposto também para os testes

  const carregar = () => U.db(window.sb.from('pops').select('*').order('codigo').limit(3000));
  const lerArquivo = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f, 'utf-8'); });
  const extOk = n => /\.(pdf|docx?|xlsx?)$/i.test(n);

  function proxVersao(v) { const m = String(v || '').match(/^(\d+)(?:\.\d+)?$/); return m ? `${Number(m[1]) + 1}.0` : ''; }

  /* ---------- formulário de cadastro/edição ---------- */
  function formulario(reg, depois) {
    const CAMPOS = [
      { n: 'codigo', rotulo: 'Código', obrig: true, max: 30, ph: 'Ex.: POP.ENF.001' },
      { n: 'versao', rotulo: 'Versão', obrig: true, max: 20, ph: '1.0' },
      { n: 'titulo', rotulo: 'Título do POP', obrig: true, max: 250, col: '1 / -1' },
      { n: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS, semVazio: true, obrig: true },
      { n: 'area', rotulo: 'Área / setor', tipo: 'select', opcoes: AREAS, obrig: true },
      { n: 'responsavel', rotulo: 'Responsável (elaborador)', max: 120 },
      { n: 'status', rotulo: 'Situação', tipo: 'select', opcoes: Object.entries(ST).map(([k, v]) => [k, v[0]]), semVazio: true, obrig: true },
      { n: 'data_publicacao', rotulo: 'Data de publicação', tipo: 'date' },
      { n: 'data_ultima_revisao', rotulo: 'Data da última revisão', tipo: 'date' },
      { n: 'periodicidade_meses', rotulo: 'Revisar a cada (meses)', tipo: 'number', min: 1, step: '1', obrig: true, ajuda: 'A próxima revisão é calculada pela última revisão (ou pela publicação).' },
      { n: 'resumo_alteracao', rotulo: 'Resumo da alteração', tipo: 'textarea', linhas: 2, max: 500, col: '1 / -1' },
    ];
    U.formulario({
      titulo: reg ? 'Editar POP' : 'Novo POP', campos: CAMPOS, largura: 680,
      valores: reg || { tipo: 'Assistencial', status: 'em_elaboracao', versao: '1.0', periodicidade_meses: 24 },
      depois: `<label class="fl">Arquivo do POP (PDF ou Word — até 20 MB)</label><input type="file" id="pp-arq" accept=".pdf,.doc,.docx">${reg && reg.arquivo_nome ? `<div class="ajuda">Arquivo atual: ${esc(reg.arquivo_nome)}. Enviar outro substitui o da versão atual.</div>` : ''}`,
      aoSalvar: async (v, box) => {
        if (!RX_COD.test(v.codigo)) throw new Error('Código inválido: use de 2 a 30 letras, números, ponto, barra ou hífen (sem espaços).');
        if (v.status === 'publicado' && !v.data_publicacao && !v.data_ultima_revisao) throw new Error('POP publicado precisa da data de publicação.');
        if (!Number.isInteger(v.periodicidade_meses) || v.periodicidade_meses < 1 || v.periodicidade_meses > 60) throw new Error('A periodicidade deve ser de 1 a 60 meses.');
        ['responsavel', 'resumo_alteracao', 'data_publicacao', 'data_ultima_revisao'].forEach(k => { v[k] = v[k] || null; });
        const arq = box.querySelector('#pp-arq').files[0];
        if (arq) {
          if (!extOk(arq.name)) throw new Error('Envie um arquivo PDF ou Word.');
          if (arq.size > 20 * 1024 * 1024) throw new Error('Arquivo maior que 20 MB.');
          v.arquivo_path = await U.enviarArquivo('pops', `${Date.now()}_${U.nomeSeguro(arq.name)}`, arq); v.arquivo_nome = arq.name;
        }
        try {
          if (reg) await U.db(window.sb.from('pops').update(v).eq('id', reg.id)); else await U.db(window.sb.from('pops').insert(v));
        } catch (e) { if (/pops_codigo_key|duplicate/i.test(e.message || '')) throw new Error('Já existe um POP com este código.'); throw e; }
        U.toast('POP salvo.'); depois();
      },
    });
  }

  /* ---------- nova versão / revisão ---------- */
  function novaVersao(p, depois) {
    U.formulario({
      titulo: `Registrar revisão — ${p.codigo}`, largura: 560, colunas: 1, rotuloSalvar: 'Registrar',
      valores: { versao: proxVersao(p.versao), data_ultima_revisao: U.hojeISO() },
      campos: [
        { n: 'versao', rotulo: `Nova versão (atual: ${p.versao})`, obrig: true, max: 20 },
        { n: 'data_ultima_revisao', rotulo: 'Data da revisão', tipo: 'date', obrig: true },
        { n: 'resumo_alteracao', rotulo: 'O que mudou', tipo: 'textarea', linhas: 3, max: 500, obrig: true },
      ],
      depois: '<label class="fl">Arquivo da nova versão (PDF ou Word — opcional)</label><input type="file" id="pp-arq" accept=".pdf,.doc,.docx"><div class="ajuda">Ao registrar, o POP fica como <b>Publicado</b> e a próxima revisão passa a contar da data acima. A versão anterior continua no histórico.</div>',
      aoSalvar: async (v, box) => {
        if (v.versao === p.versao) throw new Error('Informe um número de versão diferente da atual.');
        const upd = { versao: v.versao, data_ultima_revisao: v.data_ultima_revisao, resumo_alteracao: v.resumo_alteracao, status: 'publicado' };
        if (!p.data_publicacao) upd.data_publicacao = v.data_ultima_revisao;
        const arq = box.querySelector('#pp-arq').files[0];
        if (arq) {
          if (!extOk(arq.name)) throw new Error('Envie um arquivo PDF ou Word.');
          if (arq.size > 20 * 1024 * 1024) throw new Error('Arquivo maior que 20 MB.');
          upd.arquivo_path = await U.enviarArquivo('pops', `${p.id}/${Date.now()}_${U.nomeSeguro(arq.name)}`, arq); upd.arquivo_nome = arq.name;
        } else { upd.arquivo_path = null; upd.arquivo_nome = null; }
        await U.db(window.sb.from('pops').update(upd).eq('id', p.id));
        U.toast(`Revisão registrada — versão ${v.versao}.`); depois();
      },
    });
  }

  async function historico(p) {
    const h = await U.db(window.sb.from('pop_versoes').select('*').eq('pop_id', p.id).order('data', { ascending: false }));
    const m = U.modal({ titulo: `Histórico — ${p.codigo} · ${p.titulo}`, largura: 760, botoes: [{ rotulo: 'Fechar', classe: 'btn-primary' }],
      corpo: U.tabela([
        { t: 'Versão', f: x => `<b>${esc(x.versao)}</b>${x.versao === p.versao ? ' <span class="tag verde">atual</span>' : ''}` }, { t: 'Data', f: x => U.fmtData(x.data) },
        { t: 'O que mudou', f: x => esc(x.resumo || '—') }, { t: 'Registrado por', f: x => esc(x.registrado_por_nome || '—') },
        { t: '', f: x => x.arquivo_path ? `<button class="btn btn-ghost btn-sm" data-ab="${esc(x.arquivo_path)}"><i class="fas fa-eye"></i> Abrir</button>` : '—' },
      ], h, 'Sem histórico registrado.') });
    (m.el || document).querySelectorAll('[data-ab]').forEach(b => b.onclick = () => U.abrirArquivo('pops', b.dataset.ab));
  }

  /* ---------- aba: lista de POPs ---------- */
  async function lista(el) {
    const todos = await carregar();
    const edita = U.can('pop', 'editar'), cria = U.can('pop', 'criar'), exclui = U.can('pop', 'excluir');
    let fArea = '', fSt = '', fRev = '', busca = '';
    const filtra = () => todos.filter(p => (!fArea || p.area === fArea) && (!fSt || p.status === fSt) && (!fRev || (revisao(p) || {}).cat === fRev) &&
      (!busca || `${p.codigo} ${p.titulo} ${p.responsavel || ''}`.toLowerCase().includes(busca)));
    const selS = 'padding:9px;border:1.5px solid var(--gray-200);border-radius:6px';
    const desenhar = () => {
      const f = filtra();
      el.innerHTML = (cria ? '' : U.leituraAviso('Aqui ficam os POPs publicados. Somente os gestores cadastram e atualizam.')) +
        `<div class="barra"><input id="pp-b" placeholder="Buscar código ou título" value="${esc(busca)}" style="${selS}">
          <select id="pp-a" style="${selS}"><option value="">Todas as áreas</option>${AREAS.map(a => `<option${fArea === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select>
          ${edita ? `<select id="pp-s" style="${selS}"><option value="">Todas as situações</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}"${fSt === k ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>
          <select id="pp-r" style="${selS}"><option value="">Qualquer revisão</option>${[['vencido', 'Revisão vencida'], ['a_vencer', 'Vence em 90 dias'], ['em_dia', 'Em dia'], ['sem_data', 'Sem data']].map(([k, v]) => `<option value="${k}"${fRev === k ? ' selected' : ''}>${v}</option>`).join('')}</select>` : ''}
          <span class="ajuda">${f.length} POP(s)</span><span class="espaco"></span>${cria ? '<button class="btn btn-primary" id="pp-novo"><i class="fas fa-plus"></i> Novo POP</button>' : ''}</div>
        ${U.tabela([
          { t: 'Código', f: p => `<b>${esc(p.codigo)}</b>` },
          { t: 'POP', f: p => `${esc(p.titulo)}<div class="ajuda">${esc(p.area)} · ${esc(p.tipo)}${p.responsavel ? ' · ' + esc(p.responsavel) : ''}</div>` },
          { t: 'Versão', f: p => esc(p.versao) }, { t: 'Publicação', f: p => p.data_publicacao ? U.fmtData(p.data_publicacao) : '—' },
          { t: 'Próxima revisão', f: p => { const r = revisao(p); return r ? `${r.prox ? U.fmtData(r.prox) + '<br>' : ''}${r.html}` : '—'; } },
          { t: 'Situação', f: p => `<span class="tag ${ST[p.status][1]}">${ST[p.status][0]}</span>` },
          { t: '', f: p => `<div style="white-space:nowrap">${p.arquivo_path ? `<button class="btn btn-primary btn-sm" data-ab="${p.id}"><i class="fas fa-eye"></i> Abrir</button> ` : ''}<button class="btn btn-ghost btn-icone" data-hi="${p.id}" title="Histórico de versões"><i class="fas fa-clock-rotate-left"></i></button>${edita ? ` <button class="btn btn-ghost btn-icone" data-rv="${p.id}" title="Registrar revisão / nova versão"><i class="fas fa-file-circle-check"></i></button> <button class="btn btn-ghost btn-icone" data-ed="${p.id}" title="Editar"><i class="fas fa-pen"></i></button>` : ''}${exclui ? ` <button class="btn btn-ghost btn-icone" data-ex="${p.id}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}</div>` },
        ], f, 'Nenhum POP encontrado.')}`;
      const b = el.querySelector('#pp-b'); b.oninput = e => { busca = e.target.value.trim().toLowerCase(); desenhar(); const n = el.querySelector('#pp-b'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
      el.querySelector('#pp-a').onchange = e => { fArea = e.target.value; desenhar(); };
      const s = el.querySelector('#pp-s'); if (s) s.onchange = e => { fSt = e.target.value; desenhar(); };
      const r = el.querySelector('#pp-r'); if (r) r.onchange = e => { fRev = e.target.value; desenhar(); };
      const novo = el.querySelector('#pp-novo'); if (novo) novo.onclick = () => formulario(null, () => lista(el));
      const por = id => todos.find(x => String(x.id) === String(id));
      el.querySelectorAll('[data-ab]').forEach(x => x.onclick = () => U.abrirArquivo('pops', por(x.dataset.ab).arquivo_path));
      el.querySelectorAll('[data-hi]').forEach(x => x.onclick = () => historico(por(x.dataset.hi)));
      el.querySelectorAll('[data-rv]').forEach(x => x.onclick = () => novaVersao(por(x.dataset.rv), () => lista(el)));
      el.querySelectorAll('[data-ed]').forEach(x => x.onclick = () => formulario(por(x.dataset.ed), () => lista(el)));
      el.querySelectorAll('[data-ex]').forEach(x => x.onclick = async () => {
        const p = por(x.dataset.ex);
        if (!await U.confirmar(`Excluir o POP ${p.codigo} e todo o histórico de versões dele?`, 'Excluir', true)) return;
        try { await U.db(window.sb.from('pops').delete().eq('id', p.id)); lista(el); } catch (e) { U.erro(e); }
      });
    };
    desenhar();
  }

  /* ---------- aba: importar ---------- */
  function importar(el) {
    el.innerHTML = `<div class="cx"><h3 style="margin-bottom:4px">1. Importar a planilha de controle</h3>
        <p class="ajuda" style="margin-bottom:8px">Cadastra os POPs de uma vez (e atualiza quem já existe, pelo código). Use um arquivo <b>CSV</b>: no Excel, <i>Salvar como → CSV</i>. Colunas: código, título, área, tipo, responsável, versão, situação, publicação, última revisão, periodicidade (meses). Só código, título e área são obrigatórios.</p>
        <div class="barra"><button class="btn btn-ghost" id="ip-modelo"><i class="fas fa-download"></i> Baixar modelo</button><input type="file" id="ip-csv" accept=".csv,.txt"></div><div id="ip-prev"></div></div>
      <div class="cx" style="margin-top:12px"><h3 style="margin-bottom:4px">2. Anexar os arquivos (PDF/Word) em lote</h3>
        <p class="ajuda" style="margin-bottom:8px">Selecione vários arquivos de uma vez. Cada um é ligado ao POP cujo <b>código aparece no nome do arquivo</b> (ex.: <i>POP.ENF.001_v2.pdf</i>). O que não casar fica listado para você conferir. Vale para a versão atual do POP.</p>
        <input type="file" id="ip-arqs" accept=".pdf,.doc,.docx" multiple><div id="ip-prev2"></div></div>`;
    el.querySelector('#ip-modelo').onclick = () => U.baixarCsv('modelo_importacao_pops.csv', ['código', 'título', 'área', 'tipo', 'responsável', 'versão', 'situação', 'publicação', 'última revisão', 'periodicidade (meses)'],
      [['POP.ENF.001', 'Higienização das mãos', 'Enfermagem', 'Assistencial', 'Enfermeira Maria', '2.0', 'Publicado', '10/03/2025', '10/03/2025', '24'], ['POP.ADM.001', 'Solicitação de EPI', 'Administrativo', 'Administrativo', '', '1.0', 'Em elaboração', '', '', '24']]);

    el.querySelector('#ip-csv').onchange = async e => {
      const prev = el.querySelector('#ip-prev'); const f = e.target.files[0]; if (!f) return;
      let r; try { r = lerPlanilha(parseCsv(await lerArquivo(f))); } catch (x) { r = { erro: 'Não foi possível ler o arquivo.' }; }
      if (r.erro) { prev.innerHTML = `<div class="somente-leitura" style="margin-top:8px">${esc(r.erro)}</div>`; return; }
      const existentes = new Set((await carregar()).map(p => p.codigo.toLowerCase()));
      const ok = r.itens.filter(i => !i.erros.length);
      prev.innerHTML = `<p style="margin:10px 0 6px"><b>${ok.length}</b> linha(s) prontas (${ok.filter(i => existentes.has(i.reg.codigo.toLowerCase())).length} atualizam POP existente) · <b style="color:#B91C1C">${r.itens.length - ok.length}</b> com problema</p>` +
        U.tabela([{ t: 'Linha', f: i => i.linha }, { t: 'Código', f: i => esc(i.reg.codigo) }, { t: 'Título', f: i => esc(i.reg.titulo) }, { t: 'Área', f: i => esc(i.reg.area) }, { t: 'Versão', f: i => esc(i.reg.versao) },
          { t: 'Resultado', f: i => i.erros.length ? `<span class="tag vermelho">${esc(i.erros.join('; '))}</span>` : existentes.has(i.reg.codigo.toLowerCase()) ? '<span class="tag azul">atualiza</span>' : '<span class="tag verde">novo</span>' }], r.itens, '') +
        (ok.length ? `<div class="barra" style="margin-top:8px"><button class="btn btn-primary" id="ip-go"><i class="fas fa-file-import"></i> Importar ${ok.length} POP(s)</button></div>` : '');
      const go = prev.querySelector('#ip-go');
      if (go) go.onclick = async () => {
        go.disabled = true;
        try {
          for (let k = 0; k < ok.length; k += 100) await U.db(window.sb.from('pops').upsert(ok.slice(k, k + 100).map(i => i.reg), { onConflict: 'codigo' }));
          U.toast(`${ok.length} POP(s) importado(s).`); prev.innerHTML = `<div class="somente-leitura" style="margin-top:8px"><i class="fas fa-circle-check"></i> ${ok.length} POP(s) importado(s). Veja na aba <b>POPs</b>.</div>`;
        } catch (x) { go.disabled = false; U.erro(x); }
      };
    };

    el.querySelector('#ip-arqs').onchange = async e => {
      const prev = el.querySelector('#ip-prev2'); const fs = Array.from(e.target.files); if (!fs.length) return;
      const pops = (await carregar()).sort((a, b) => b.codigo.length - a.codigo.length);
      const itens = fs.map(f => {
        const nome = f.name.toLowerCase();
        const p = extOk(f.name) ? pops.find(x => nome.includes(x.codigo.toLowerCase())) : null;
        return { f, p, erro: !extOk(f.name) ? 'tipo de arquivo não aceito' : f.size > 20 * 1024 * 1024 ? 'maior que 20 MB' : !p ? 'nenhum código de POP no nome' : '' };
      });
      const ok = itens.filter(i => !i.erro);
      prev.innerHTML = `<p style="margin:10px 0 6px"><b>${ok.length}</b> arquivo(s) casaram com um POP · <b style="color:#B91C1C">${itens.length - ok.length}</b> sem correspondência</p>` +
        U.tabela([{ t: 'Arquivo', f: i => esc(i.f.name) }, { t: 'POP', f: i => i.p && !i.erro ? `<b>${esc(i.p.codigo)}</b> ${esc(i.p.titulo)}` : '—' }, { t: 'Resultado', f: i => i.erro ? `<span class="tag vermelho">${esc(i.erro)}</span>` : '<span class="tag verde">será anexado</span>' }], itens, '') +
        (ok.length ? `<div class="barra" style="margin-top:8px"><button class="btn btn-primary" id="ip-go2"><i class="fas fa-paperclip"></i> Anexar ${ok.length} arquivo(s)</button></div>` : '');
      const go = prev.querySelector('#ip-go2');
      if (go) go.onclick = async () => {
        go.disabled = true; let feitos = 0;
        try {
          for (const i of ok) {
            const path = await U.enviarArquivo('pops', `${i.p.id}/${Date.now()}_${U.nomeSeguro(i.f.name)}`, i.f);
            await U.db(window.sb.from('pops').update({ arquivo_path: path, arquivo_nome: i.f.name }).eq('id', i.p.id)); feitos++;
          }
          U.toast(`${feitos} arquivo(s) anexado(s).`); prev.innerHTML = `<div class="somente-leitura" style="margin-top:8px"><i class="fas fa-circle-check"></i> ${feitos} arquivo(s) anexado(s).</div>`;
        } catch (x) { go.disabled = false; U.erro(new Error(`Anexados ${feitos} de ${ok.length}. ${x.message || x}`)); }
      };
    };
  }

  /* ---------- aba: acompanhamento (relatório) ---------- */
  function calc(todos) {
    const pub = todos.filter(p => p.status === 'publicado');
    const rev = p => (revisao(p) || {}).cat;
    const k = { total: todos.length, publicados: pub.length, elaboracao: todos.filter(p => p.status === 'em_elaboracao').length, emRevisao: todos.filter(p => p.status === 'em_revisao').length, obsoletos: todos.filter(p => p.status === 'obsoleto').length,
      vencidos: pub.filter(p => rev(p) === 'vencido').length, aVencer: pub.filter(p => rev(p) === 'a_vencer').length, semArquivo: pub.filter(p => !p.arquivo_path).length, emDia: pub.filter(p => rev(p) === 'em_dia').length };
    k.pctDia = pub.length ? Math.round(100 * k.emDia / pub.length) : 0;
    const areas = [...new Set(todos.map(p => p.area))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(a => {
      const l = todos.filter(p => p.area === a), pb = l.filter(p => p.status === 'publicado');
      return { a, total: l.length, pub: pb.length, andamento: l.filter(p => p.status === 'em_elaboracao' || p.status === 'em_revisao').length, venc: pb.filter(p => rev(p) === 'vencido').length, aVencer: pb.filter(p => rev(p) === 'a_vencer').length, semArq: pb.filter(p => !p.arquivo_path).length, pct: pb.length ? Math.round(100 * pb.filter(p => rev(p) === 'em_dia').length / pb.length) : 0 };
    });
    const pend = pub.filter(p => ['vencido', 'a_vencer', 'sem_data'].includes(rev(p))).sort((a, b) => (proxima(a) || '0000').localeCompare(proxima(b) || '0000'));
    return { k, areas, pend };
  }

  async function acompanhamento(el) {
    const todos = await carregar(); const { k, areas, pend } = calc(todos);
    const kpi = (v, t, cor) => `<div class="cx" style="flex:1;min-width:120px;text-align:center"><div style="font-size:26px;font-weight:800;color:${cor || 'var(--blue-dark)'}">${v}</div><div class="ajuda">${t}</div></div>`;
    const tabArea = () => `<table class="tb"><thead><tr><th>Área</th><th>Total</th><th>Publicados</th><th>Em elaboração/revisão</th><th>Revisão vencida</th><th>Vence em 90 d</th><th>Sem arquivo</th><th>% em dia</th></tr></thead><tbody>${
      areas.map(a => `<tr><td>${esc(a.a)}</td><td>${a.total}</td><td>${a.pub}</td><td>${a.andamento}</td><td style="${a.venc ? 'color:#B91C1C;font-weight:700' : ''}">${a.venc}</td><td>${a.aVencer}</td><td>${a.semArq}</td><td>${a.pub ? a.pct + '%' : '—'}</td></tr>`).join('')}</tbody></table>`;
    el.innerHTML = todos.length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">${kpi(k.total, 'POPs cadastrados')}${kpi(k.publicados, 'publicados', '#15803D')}${kpi(k.elaboracao + k.emRevisao, 'em elaboração ou revisão', '#B45309')}${kpi(k.vencidos, 'com revisão vencida', k.vencidos ? '#B91C1C' : '')}${kpi(k.aVencer, 'vencem em 90 dias', '#B45309')}${kpi(k.pctDia + '%', 'dos publicados em dia')}</div>
      <div class="barra"><button class="btn btn-ghost" id="ac-xls"><i class="fas fa-file-excel"></i> Excel (controle completo)</button><button class="btn btn-primary" id="ac-pdf"><i class="fas fa-print"></i> Relatório para imprimir / PDF</button></div>
      <div class="section-title">Por área</div><div class="cx">${tabArea()}</div>
      <div class="section-title" style="margin-top:14px">Revisões pendentes (${pend.length})</div>
      <div class="cx">${U.tabela([{ t: 'Código', f: p => `<b>${esc(p.codigo)}</b>` }, { t: 'POP', f: p => esc(p.titulo) }, { t: 'Área', f: p => esc(p.area) }, { t: 'Responsável', f: p => esc(p.responsavel || '—') }, { t: 'Versão', f: p => esc(p.versao) },
        { t: 'Próxima revisão', f: p => { const r = revisao(p); return `${r.prox ? U.fmtData(r.prox) + '<br>' : ''}${r.html}`; } }], pend, 'Nenhum POP com revisão pendente. 🎉')}</div>`
      : '<div class="vazio">Nenhum POP cadastrado ainda. Use a aba Importar ou o botão Novo POP.</div>';
    if (!todos.length) return;
    el.querySelector('#ac-xls').onclick = () => U.baixarCsv('controle_de_pops.csv', ['Código', 'Título', 'Tipo', 'Área', 'Responsável', 'Versão', 'Situação', 'Publicação', 'Última revisão', 'Periodicidade (meses)', 'Próxima revisão', 'Situação da revisão', 'Tem arquivo'],
      todos.map(p => { const r = revisao(p); return [p.codigo, p.titulo, p.tipo, p.area, p.responsavel || '', p.versao, ST[p.status][0], p.data_publicacao ? U.fmtData(p.data_publicacao) : '', p.data_ultima_revisao ? U.fmtData(p.data_ultima_revisao) : '', p.periodicidade_meses, r && r.prox ? U.fmtData(r.prox) : '', r ? { vencido: 'Vencida', a_vencer: 'Vence em 90 dias', em_dia: 'Em dia', sem_data: 'Sem data' }[r.cat] : '', p.arquivo_path ? 'Sim' : 'Não']; }));
    el.querySelector('#ac-pdf').onclick = () => {
      const logo = new URL('img/logo-upa.png', location.href).href;
      const kv = (a, b) => `<tr><td style="width:34%;background:#F3F4F6"><b>${a}</b></td><td>${b}</td></tr>`;
      U.imprimir(`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:3px solid #0B3A8C;padding-bottom:8px">
          <img src="${logo}" style="height:58px"><div style="text-align:right"><h2 style="margin:0;color:#0B3A8C">Acompanhamento de POPs</h2><div class="sub">UPA Rocinha · publicação e revisão</div></div></div>
        <table style="margin:10px 0"><tbody>${kv('Data e hora de emissão', U.fmtDH(new Date().toISOString()))}${kv('Emitido por', `${esc(U.ctx.nome)} · matrícula ${esc(U.ctx.matricula)}`)}
          ${kv('Situação geral', `${k.total} POPs · ${k.publicados} publicados · ${k.elaboracao + k.emRevisao} em elaboração/revisão · ${k.obsoletos} obsoletos`)}
          ${kv('Revisão', `<b style="color:#B91C1C">${k.vencidos} vencida(s)</b> · ${k.aVencer} vence(m) em 90 dias · ${k.pctDia}% dos publicados em dia · ${k.semArquivo} publicado(s) sem arquivo`)}</tbody></table>
        <h3>Por área</h3>${tabArea()}
        <h3 style="margin-top:12px">Revisões pendentes (${pend.length})</h3>` +
        (pend.length ? `<table><thead><tr><th>Código</th><th>POP</th><th>Área</th><th>Responsável</th><th>Versão</th><th>Próxima revisão</th></tr></thead><tbody>${pend.map(p => { const r = revisao(p); return `<tr><td><b>${esc(p.codigo)}</b></td><td>${esc(p.titulo)}</td><td>${esc(p.area)}</td><td>${esc(p.responsavel || '—')}</td><td>${esc(p.versao)}</td><td>${r.prox ? U.fmtData(r.prox) : 'sem data'} — ${r.cat === 'vencido' ? 'vencida há ' + (-r.d) + ' d' : r.cat === 'a_vencer' ? 'vence em ' + r.d + ' d' : 'sem data'}</td></tr>`; }).join('')}</tbody></table>` : '<p>Nenhum POP com revisão pendente.</p>') +
        '<p class="sub" style="margin-top:12px;font-size:10px">Emitido pelo sistema Gestão Inteligente UPA Rocinha. A próxima revisão é calculada a partir da data da última revisão (ou da publicação) e da periodicidade de cada POP.</p>', 'Acompanhamento de POPs');
    };
  }

  U.registrar({
    id: 'pop', label: 'POPs', icone: 'fa-book-medical', cor: 'c-docs',
    home() {
      U.vigiar(async () => {
        if (!U.can('pop', 'editar')) return;
        const l = (await U.db(window.sb.from('pops').select('status, data_publicacao, data_ultima_revisao, periodicidade_meses').eq('status', 'publicado').limit(3000))) || [];
        const v = l.filter(p => (revisao(p) || {}).cat === 'vencido').length, a = l.filter(p => { const r = revisao(p); return r && r.cat === 'a_vencer' && r.d <= 30; }).length;
        U.pendencia('pop_venc', 'pop', 'acomp', v, `${v === 1 ? '1 POP está' : v + ' POPs estão'} com a revisão vencida`);
        U.pendencia('pop_prox', 'pop', 'acomp', a, `${a === 1 ? '1 POP vence' : a + ' POPs vencem'} a revisão em até 30 dias`);
      });
    },
    render(el) {
      const abas = [{ id: 'lista', rotulo: 'POPs', render: lista }];
      if (U.can('pop', 'editar')) abas.push({ id: 'acomp', rotulo: 'Acompanhamento', render: acompanhamento });
      if (U.can('pop', 'criar')) abas.push({ id: 'imp', rotulo: 'Importar', render: importar });
      U.abas(el, abas);
    },
  });
})();
