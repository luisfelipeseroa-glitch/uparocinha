/* Ajudantes de formulário e tabela, usados por todos os módulos. */
(function () {
  'use strict';
  const U = window.UPA;
  const esc = U.esc;

  const opt = o => Array.isArray(o) ? o : [o, o];

  /* campo: {n, rotulo, tipo: text|textarea|number|date|time|select|checks|url|checkbox|datetime, opcoes, obrig, valor, ajuda, ph, max, min, step, col} */
  U.campoHtml = function (c, v) {
    const val = v !== undefined ? v : c.valor;
    const id = 'f_' + c.n;
    const req = c.obrig ? ' *' : '';
    const rot = c.tipo === 'checkbox' ? '' : `<label class="fl" for="${id}">${esc(c.rotulo)}${req}</label>`;
    let h = '';
    const at = `id="${id}" name="${c.n}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}${c.max ? ` maxlength="${c.max}"` : ''}`;
    switch (c.tipo || 'text') {
      case 'textarea': h = `<textarea ${at} rows="${c.linhas || 3}">${esc(val ?? '')}</textarea>`; break;
      case 'select':
        h = `<select ${at}>${c.semVazio ? '' : '<option value="">Selecione...</option>'}${(c.opcoes || []).map(o => { const [a, b] = opt(o); return `<option value="${esc(a)}"${String(val ?? '') === String(a) ? ' selected' : ''}>${esc(b)}</option>`; }).join('')}</select>`; break;
      case 'checks': {
        const marc = new Set(val || []);
        h = `<div class="checks" id="${id}">${(c.opcoes || []).map(o => { const [a, b] = opt(o); return `<label><input type="checkbox" value="${esc(a)}"${marc.has(a) ? ' checked' : ''}> ${esc(b)}</label>`; }).join('')}</div>`; break;
      }
      case 'checkbox':
        h = `<label class="checks" style="margin-top:12px"><span style="display:flex;gap:6px;align-items:center"><input type="checkbox" ${at}${val ? ' checked' : ''}> ${esc(c.rotulo)}</span></label>`; break;
      case 'number':
        h = `<input type="number" ${at} value="${esc(val ?? '')}"${c.min !== undefined ? ` min="${c.min}"` : ''}${c.step ? ` step="${c.step}"` : ' step="any"'}>`; break;
      default:
        h = `<input type="${c.tipo || 'text'}" ${at} value="${esc(val ?? '')}">`;
    }
    return `<div class="campo"${c.col ? ` style="grid-column:${c.col}"` : ''}>${rot}${h}${c.ajuda ? `<div class="ajuda">${esc(c.ajuda)}</div>` : ''}</div>`;
  };

  U.camposHtml = (campos, valores, colunas) => {
    const g = colunas === 1 ? '' : ` class="grade${colunas || 2}"`;
    return `<div${g}>${campos.map(c => U.campoHtml(c, valores ? valores[c.n] : undefined)).join('')}</div>`;
  };

  /* Lê e valida. Retorna objeto ou null (e mostra aviso) */
  U.lerCampos = function (el, campos) {
    const o = {};
    for (const c of campos) {
      const e = el.querySelector('#f_' + c.n);
      let v;
      if (c.tipo === 'checks') v = Array.from(e.querySelectorAll('input:checked')).map(i => i.value);
      else if (c.tipo === 'checkbox') v = e.checked;
      else if (c.tipo === 'number') v = e.value === '' ? null : Number(e.value);
      else v = (e.value || '').trim();
      if (c.obrig && (v === '' || v === null || (Array.isArray(v) && !v.length))) {
        U.toast(`Preencha: ${c.rotulo}`, 'erro'); e.focus && e.focus(); return null;
      }
      if (c.tipo === 'number' && v !== null && c.min !== undefined && v < c.min) { U.toast(`${c.rotulo}: valor mínimo ${c.min}`, 'erro'); return null; }
      o[c.n] = v;
    }
    return o;
  };

  /* Janela de formulário: aoSalvar(valores, fechar) pode lançar erro (mostrado) */
  U.formulario = function (op) {
    return U.modal({
      titulo: op.titulo, largura: op.largura || 560,
      corpo: (op.antes || '') + U.camposHtml(op.campos, op.valores, op.colunas) + (op.depois || ''),
      botoes: [
        { rotulo: 'Cancelar' },
        { rotulo: op.rotuloSalvar || 'Salvar', classe: 'btn-primary', acao: async (el, fechar) => {
            const v = U.lerCampos(el, op.campos);
            if (!v) return false;
            const r = await op.aoSalvar(v, el, fechar);
            return r === false ? false : undefined;
          } },
      ],
    });
  };

  /* Tabela simples. colunas:[{t:'Título', f:(linha)=>html}] */
  U.tabela = function (colunas, linhas, vazio) {
    if (!linhas.length) return `<div class="vazio">${esc(vazio || 'Nenhum registro.')}</div>`;
    return `<div class="tabela-wrap"><table class="data-table"><thead><tr>${colunas.map(c => `<th>${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${
      linhas.map((l, i) => `<tr>${colunas.map(c => `<td>${c.f(l, i)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };

  /* Abas: abas:[{id, rotulo, render(el)}]; retorna controle */
  U.abas = function (el, abas, inicial) {
    el.innerHTML = `<div class="abas">${abas.map(a => `<button type="button" class="aba" data-aba="${a.id}">${esc(a.rotulo)}</button>`).join('')}</div><div class="aba-corpo"></div>`;
    const corpo = el.querySelector('.aba-corpo');
    const abrir = async id => {
      el.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === id));
      corpo.innerHTML = '<div class="spinner"><i class="fas fa-circle-notch spin"></i> Carregando...</div>';
      const a = abas.find(x => x.id === id);
      try { await a.render(corpo); } catch (e) { corpo.innerHTML = `<div class="vazio">${esc(e.message)}</div>`; }
    };
    el.querySelectorAll('.aba').forEach(b => b.onclick = () => abrir(b.dataset.aba));
    abrir(inicial || abas[0].id);
    return { abrir };
  };

  U.leituraAviso = txt => `<div class="somente-leitura"><i class="fas fa-eye"></i> ${esc(txt || 'Você pode consultar, mas não alterar estas informações.')}</div>`;

  /* Baixar CSV (Excel abre) */
  U.baixarCsv = function (nome, cabecalho, linhas) {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const txt = '﻿' + [cabecalho, ...linhas].map(l => l.map(q).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  };

  U.TURNOS = [['manha', 'Manhã (07h–13h)'], ['tarde', 'Tarde (13h–19h)'], ['noite', 'Noite (19h–07h)']];
  U.turnoNome = t => (U.TURNOS.find(x => x[0] === t) || [t, t])[1];
  U.turnoAtual = () => { const h = Number(new Date().toLocaleString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' })); return h >= 7 && h < 13 ? 'manha' : h >= 13 && h < 19 ? 'tarde' : 'noite'; };
})();

/* Data do plantão: o turno da noite que passa da meia-noite pertence ao dia anterior. */
window.UPA.dataPlantao = function () {
  const U = window.UPA;
  const h = Number(new Date().toLocaleString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }));
  if (h < 7) return new Date(Date.now() - 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  return U.hojeISO();
};
