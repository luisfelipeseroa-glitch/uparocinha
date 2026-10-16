/* Dieta e Nutrição — enfermeiros, médicos e gestores solicitam; enf., téc. enf., médicos e gestores veem. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const TIPOS = ['Geral', 'Branda', 'Pastosa', 'Líquida Completa', 'Líquida Restrita', 'Dieta Zero'];
  const RESTR = ['Sem sal', 'Sem açúcar', 'Sem glúten', 'Sem lactose', 'Sem gordura', 'Sem potássio', 'Com fibra'];
  const FORM_ENT = ['Dieta Polimérica Padrão', 'Dieta Polimérica Hipercalórica', 'Dieta Oligomérica (semielementar)', 'Dieta Elementar', 'Específica para Diabetes', 'Específica para Insuficiência Renal', 'Específica para Insuficiência Hepática', 'Específica para Imunomodulação', 'A definir — aguardar avaliação nutricional'];
  const VIAS = ['Sonda Nasogástrica (SNG)', 'Sonda Nasoenteral (SNE)', 'Gastrostomia (GTT)', 'Jejunostomia'];
  const VELS = ['Contínua (24h)', 'Intermitente (6/6h)', 'Intermitente (8/8h)', 'Bolus'];

  const CAMPOS = [
    { n: 'paciente', rotulo: 'Nome do paciente', obrig: true, max: 150 },
    { n: 'leito', rotulo: 'Leito / Box', obrig: true, max: 30, ph: 'Ex.: Box 3, Obs 7' },
    { n: 'idade', rotulo: 'Idade', max: 30, ph: 'Ex.: 45 anos' },
    { n: 'peso_kg', rotulo: 'Peso estimado (kg)', tipo: 'number', min: 1, step: '0.1' },
    { n: 'diagnostico', rotulo: 'Diagnóstico principal', max: 200, col: '1 / -1' },
    { n: 'tipo_dieta', rotulo: 'Tipo de dieta', tipo: 'select', opcoes: TIPOS, obrig: true, semVazio: true },
    { n: 'consistencia', rotulo: 'Consistência / textura', tipo: 'select', opcoes: ['Normal', 'Picada', 'Triturada', 'Homogênea'] },
    { n: 'volume', rotulo: 'Volume / porção', tipo: 'select', opcoes: ['Pequena (200 ml)', 'Média (350 ml)', 'Grande (500 ml)'] },
    { n: 'restricoes', rotulo: 'Restrições / alergias', tipo: 'checks', opcoes: RESTR, col: '1 / -1' },
    { n: 'outras_restricoes', rotulo: 'Outras restrições / alergias', max: 200, ph: 'Ex.: alergia a amendoim, ovo...', col: '1 / -1' },
    { n: 'enteral', rotulo: 'Necessita de dieta enteral', tipo: 'checkbox', col: '1 / -1' },
    { n: 'enteral_formula', rotulo: 'Fórmula / produto (enteral)', tipo: 'select', opcoes: FORM_ENT },
    { n: 'enteral_via', rotulo: 'Via de administração', tipo: 'select', opcoes: VIAS },
    { n: 'enteral_volume_ml_h', rotulo: 'Volume (ml/h)', tipo: 'number', min: 0, step: '5' },
    { n: 'enteral_velocidade', rotulo: 'Velocidade de infusão', tipo: 'select', opcoes: VELS },
    { n: 'observacoes', rotulo: 'Observações clínicas / instruções', tipo: 'textarea', max: 500, col: '1 / -1' },
    { n: 'registro_profissional', rotulo: 'CRM / COREN / CFN', max: 30, ph: 'Nº do registro' },
  ];

  function layout(p, paraImpressao) {
    const L = (r, v) => v ? `<tr><td style="width:34%;font-weight:700">${esc(r)}</td><td>${esc(v)}</td></tr>` : '';
    const cancel = p.status === 'cancelada'
      ? `<div style="background:#FEE2E2;color:#991B1B;padding:8px 10px;border-radius:6px;margin:8px 0;font-weight:700">CANCELADA em ${U.fmtDH(p.cancelado_em)} por ${esc(p.cancelado_por_nome || '')} — ${esc(p.cancelado_motivo || '')}</div>` : '';
    return `<div class="dieta-doc">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
        <div><h3 style="margin:0">Solicitação de Dieta — UPA Rocinha</h3><div class="sub" style="color:#555">Solicitada em <b>${U.fmtData(p.criado_em)}</b> às <b>${U.fmtHora(p.criado_em)}</b></div></div>
        <div style="text-align:right"><div style="font-size:18px;font-weight:800">${esc(p.tipo_dieta)}</div><div class="sub">Leito: <b>${esc(p.leito)}</b></div></div></div>
      ${cancel}
      <table style="margin-top:8px">
        ${L('Paciente', p.paciente)}${L('Idade / Peso', [p.idade, p.peso_kg ? p.peso_kg + ' kg' : ''].filter(Boolean).join(' · '))}${L('Diagnóstico', p.diagnostico)}
        ${L('Consistência', p.consistencia)}${L('Volume / porção', p.volume)}
        ${L('Restrições', [...(p.restricoes || []), p.outras_restricoes].filter(Boolean).join(', '))}
        ${p.enteral ? L('Dieta enteral', [p.enteral_formula, p.enteral_via, p.enteral_volume_ml_h ? p.enteral_volume_ml_h + ' ml/h' : '', p.enteral_velocidade].filter(Boolean).join(' · ') || 'Sim') : ''}
        ${L('Observações', p.observacoes)}
        ${L('Solicitante', `${p.criado_por_nome || ''} — ${p.solicitante_categoria || ''}${p.registro_profissional ? ' (' + p.registro_profissional + ')' : ''}`)}
      </table></div>`;
  }

  function solicitar(el, depois) {
    el.innerHTML = `<div class="cx"><form id="dt-form"></form></div>`;
    const f = el.querySelector('#dt-form');
    const valores = { tipo_dieta: 'Geral' };
    f.innerHTML = U.camposHtml(CAMPOS, valores, 2) +
      `<div style="margin-top:16px"><button class="btn btn-green" type="submit"><i class="fas fa-paper-plane"></i> Registrar pedido de dieta</button></div>
       <div class="ajuda" style="margin-top:6px">Data e hora da solicitação e o nome do solicitante são registrados automaticamente.</div>`;
    const bloco = () => {
      const on = f.querySelector('#f_enteral').checked;
      ['enteral_formula', 'enteral_via', 'enteral_volume_ml_h', 'enteral_velocidade'].forEach(n => { f.querySelector('#f_' + n).closest('.campo').style.display = on ? '' : 'none'; });
    };
    f.querySelector('#f_enteral').onchange = bloco; bloco();
    f.onsubmit = async ev => {
      ev.preventDefault();
      const v = U.lerCampos(f, CAMPOS); if (!v) return;
      const b = f.querySelector('button[type=submit]'); b.disabled = true;
      try {
        for (const k of ['idade', 'diagnostico', 'consistencia', 'volume', 'outras_restricoes', 'enteral_formula', 'enteral_via', 'enteral_velocidade', 'observacoes', 'registro_profissional']) if (v[k] === '') v[k] = null;
        if (v.enteral && !v.enteral_via) { U.toast('Informe a via de administração da dieta enteral.', 'erro'); return; }
        await U.db(window.sb.from('dieta_pedidos').insert(v));
        U.toast('Pedido de dieta registrado.'); f.reset(); bloco(); depois && depois();
      } catch (e) { U.erro(e); } finally { b.disabled = false; }
    };
  }

  async function pedidos(el) {
    const hoje = U.hojeISO();
    el.innerHTML = `<div class="barra"><label class="fl" style="margin:0">Dia</label><input type="date" id="dt-dia" value="${hoje}" style="padding:8px;border:1.5px solid var(--gray-200);border-radius:6px"><button class="btn btn-ghost" id="dt-ok"><i class="fas fa-rotate"></i> Atualizar</button><span class="espaco"></span><span class="ajuda" id="dt-total"></span></div><div id="dt-lista"></div>`;
    const carregar = async () => {
      const dia = el.querySelector('#dt-dia').value || hoje;
      const ini = new Date(dia + 'T00:00:00-03:00'), fim = new Date(ini.getTime() + 864e5);
      const lista = await U.db(window.sb.from('dieta_pedidos').select('*').gte('criado_em', ini.toISOString()).lt('criado_em', fim.toISOString()).order('criado_em', { ascending: false }));
      el.querySelector('#dt-total').textContent = `${lista.length} solicitação(ões)`;
      const box = el.querySelector('#dt-lista');
      box.innerHTML = lista.length ? lista.map(p => `<div class="cx" style="${p.status === 'cancelada' ? 'opacity:.7' : ''}">${layout(p)}
        <div class="barra" style="margin:10px 0 0"><button class="btn btn-ghost btn-sm" data-imp="${p.id}"><i class="fas fa-print"></i> Imprimir</button>
        ${U.can('dieta', 'editar') && p.status === 'solicitada' ? `<button class="btn btn-ghost btn-sm" data-can="${p.id}"><i class="fas fa-ban"></i> Cancelar solicitação</button>` : ''}</div></div>`).join('') : '<div class="vazio">Nenhuma solicitação neste dia.</div>';
      box.querySelectorAll('[data-imp]').forEach(b => b.onclick = () => U.imprimir(layout(lista.find(p => p.id === b.dataset.imp)), 'Solicitação de dieta'));
      box.querySelectorAll('[data-can]').forEach(b => b.onclick = async () => {
        const m = await U.pedirMotivo('Cancelar solicitação de dieta', 'A solicitação continuará visível, marcada como cancelada.');
        if (!m) return;
        try { await U.db(window.sb.rpc('dieta_cancelar', { p_id: b.dataset.can, p_motivo: m })); U.toast('Solicitação cancelada.'); carregar(); } catch (e) { U.erro(e); }
      });
    };
    el.querySelector('#dt-ok').onclick = carregar; el.querySelector('#dt-dia').onchange = carregar;
    await carregar();
  }

  U.registrar({
    id: 'dieta', label: 'Dieta e Nutrição', icone: 'fa-utensils', cor: 'c-dieta',
    render(el) {
      const abas = [{ id: 'ped', rotulo: 'Solicitações', render: pedidos }];
      let ctl;
      if (U.can('dieta', 'criar')) abas.unshift({ id: 'nova', rotulo: 'Nova solicitação', render: c => solicitar(c, () => ctl.abrir('ped')) });
      ctl = U.abas(el, abas, U.can('dieta', 'criar') ? 'nova' : 'ped');
    },
  });
})();
