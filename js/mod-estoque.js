/* Estoque de Insumos e Medicamentos — todos veem; gestores, farmacêuticos e almoxarife editam. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const SETORES = { farmacia: 'Farmácia', almoxarifado: 'Almoxarifado' };
  const CAMPOS = [
    { n: 'insumo', rotulo: 'Insumo / Medicamento', obrig: true, max: 200 },
    { n: 'quantidade', rotulo: 'Quantidade em estoque', tipo: 'number', obrig: true, min: 0 },
    { n: 'duracao', rotulo: 'Duração estimada', ph: 'Ex.: 5 dias', max: 80 },
    { n: 'recomendacao', rotulo: 'Recomendação', tipo: 'textarea', linhas: 2, max: 300 },
  ];

  function situacao(i) {
    const d = parseFloat(String(i.duracao || '').replace(',', '.'));
    if (i.quantidade <= 0) return '<span class="tag vermelho">Zerado</span>';
    if (!isNaN(d) && d <= 3) return '<span class="tag vermelho">Crítico</span>';
    if (!isNaN(d) && d <= 7) return '<span class="tag amarelo">Atenção</span>';
    return '<span class="tag verde">Ok</span>';
  }

  async function aba(setor, corpo) {
    const edita = U.can('estoque', 'editar'), cria = U.can('estoque', 'criar'), exclui = U.can('estoque', 'excluir');
    let itens = await U.db(window.sb.from('estoque_itens').select('*').eq('setor', setor).order('insumo'));
    const desenhar = () => {
      const f = (corpo.querySelector('#es-busca') || {}).value || '';
      const lista = itens.filter(i => i.insumo.toLowerCase().includes(f.toLowerCase()));
      corpo.querySelector('#es-tabela').innerHTML = U.tabela([
        { t: 'Insumo / Medicamento', f: i => `<b>${esc(i.insumo)}</b>` },
        { t: 'Quantidade', f: i => esc(i.quantidade) },
        { t: 'Duração', f: i => esc(i.duracao || '—') },
        { t: 'Situação', f: i => situacao(i) },
        { t: 'Recomendação', f: i => esc(i.recomendacao || '—') },
        { t: 'Atualizado', f: i => `${U.fmtDH(i.atualizado_em)}` },
        ...(edita || exclui ? [{ t: '', f: i => `${edita ? `<button class="btn btn-ghost btn-icone" data-ed="${i.id}" title="Editar"><i class="fas fa-pen"></i></button> ` : ''}${exclui ? `<button class="btn btn-ghost btn-icone" data-ex="${i.id}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}` }] : []),
      ], lista, 'Nenhum item encontrado.');
      corpo.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => form(itens.find(i => String(i.id) === b.dataset.ed)));
      corpo.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
        const it = itens.find(i => String(i.id) === b.dataset.ex);
        if (!await U.confirmar(`Excluir "${it.insumo}" do estoque?`, 'Excluir', true)) return;
        try { await U.db(window.sb.from('estoque_itens').delete().eq('id', it.id)); itens = itens.filter(x => x.id !== it.id); U.toast('Item excluído.'); desenhar(); } catch (e) { U.erro(e); }
      });
    };
    const recarregar = async () => { itens = await U.db(window.sb.from('estoque_itens').select('*').eq('setor', setor).order('insumo')); desenhar(); };
    const form = reg => U.formulario({
      titulo: reg ? 'Editar item' : 'Novo item', campos: CAMPOS, valores: reg || {},
      aoSalvar: async v => {
        if (reg) await U.db(window.sb.from('estoque_itens').update(v).eq('id', reg.id));
        else await U.db(window.sb.from('estoque_itens').insert({ ...v, setor }));
        U.toast('Estoque atualizado.'); await recarregar();
      },
    });
    corpo.innerHTML =
      (edita || cria ? '' : U.leituraAviso('Somente gestores, farmacêuticos e almoxarife alteram o estoque.')) +
      `<div class="barra"><input type="text" id="es-busca" placeholder="Buscar item..." style="max-width:260px;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:6px;font-family:var(--font)">
        <span class="espaco"></span>
        <button class="btn btn-ghost" id="es-exp"><i class="fas fa-file-excel"></i> Exportar</button>
        ${cria ? '<button class="btn btn-ghost" id="es-imp"><i class="fas fa-file-import"></i> Importar planilha</button><button class="btn btn-primary" id="es-novo"><i class="fas fa-plus"></i> Novo item</button>' : ''}
        <input type="file" id="es-arq" accept=".xlsx,.xls,.csv" style="display:none"></div><div id="es-tabela"></div>`;
    corpo.querySelector('#es-busca').oninput = desenhar;
    corpo.querySelector('#es-exp').onclick = () => U.baixarCsv(`estoque_${setor}_${U.hojeISO()}.csv`, ['Insumo', 'Quantidade', 'Duração', 'Recomendação'], itens.map(i => [i.insumo, i.quantidade, i.duracao, i.recomendacao]));
    if (cria) {
      corpo.querySelector('#es-novo').onclick = () => form(null);
      const arq = corpo.querySelector('#es-arq');
      corpo.querySelector('#es-imp').onclick = () => arq.click();
      arq.onchange = async () => {
        const f = arq.files[0]; if (!f) return;
        try {
          if (typeof XLSX === 'undefined') throw new Error('Biblioteca de planilhas não carregou.');
          const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
          const pega = (r, ...ks) => { for (const k of Object.keys(r)) { const kk = k.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, ''); if (ks.includes(kk)) return r[k]; } return ''; };
          const dados = rows.map(r => ({
            setor, insumo: String(pega(r, 'INSUMO', 'INSUMOSCRITICOS', 'MEDICAMENTO', 'ITEM')).trim(),
            quantidade: U.num(pega(r, 'QUANTIDADE', 'QTD', 'ESTOQUE')), duracao: String(pega(r, 'DURACAO')).trim() || null,
            recomendacao: String(pega(r, 'RECOMENDACAO')).trim() || null,
          })).filter(d => d.insumo && d.quantidade >= 0);
          if (!dados.length) throw new Error('Nenhuma linha válida (colunas: Insumo, Quantidade, Duração, Recomendação).');
          if (!await U.confirmar(`Importar ${dados.length} itens para ${SETORES[setor]}? Itens com o mesmo nome serão atualizados.`, 'Importar')) return;
          await U.db(window.sb.from('estoque_itens').upsert(dados, { onConflict: 'setor,insumo' }));
          U.toast(`${dados.length} itens importados.`); await recarregar();
        } catch (e) { U.erro(e); } finally { arq.value = ''; }
      };
    }
    desenhar();
  }

  async function historico(corpo) {
    const log = await U.db(window.sb.from('estoque_log').select('*').order('em', { ascending: false }).limit(300));
    corpo.innerHTML = U.tabela([
      { t: 'Quando', f: l => U.fmtDH(l.em) }, { t: 'Setor', f: l => esc(SETORES[l.setor] || l.setor) },
      { t: 'Item', f: l => esc(l.insumo) }, { t: 'Ação', f: l => ({ inclusao: 'Inclusão', edicao: 'Edição', exclusao: 'Exclusão' })[l.acao] || esc(l.acao) },
      { t: 'Qtd.', f: l => `${l.qtd_antes ?? '—'} → ${l.qtd_depois ?? '—'}` }, { t: 'Por', f: l => esc(l.usuario_nome || '—') },
    ], log, 'Sem movimentações.');
  }

  U.registrar({
    id: 'estoque', label: 'Estoque de Insumos', icone: 'fa-boxes-stacked', cor: 'c-almox',
    async render(el) {
      const abas = [
        { id: 'farmacia', rotulo: 'Farmácia', render: c => aba('farmacia', c) },
        { id: 'almoxarifado', rotulo: 'Almoxarifado', render: c => aba('almoxarifado', c) },
      ];
      if (U.can('estoque', 'editar')) abas.push({ id: 'hist', rotulo: 'Histórico', render: historico });
      U.abas(el, abas);
    },
  });
})();
