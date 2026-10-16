/* Passagem de Plantão — ver: assistenciais, gestores e ADM. Só ADM e gestores inserem, editam, recebem e excluem
   (editar/excluir exigem o motivo, que fica registrado na auditoria). */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const PRI = { critico: ['Crítico', 'vermelho'], atencao: ['Atenção', 'amarelo'], estavel: ['Estável', 'verde'] };
  const LOT = [['normal', 'Normal'], ['alerta', 'Alerta'], ['critica', 'Crítica']];
  const CAMPOS = [
    { n: 'turno', rotulo: 'Turno', tipo: 'select', opcoes: U.TURNOS, obrig: true, semVazio: true },
    { n: 'lotacao', rotulo: 'Lotação da unidade', tipo: 'select', opcoes: LOT, semVazio: true },
    { n: 'paciente', rotulo: 'Paciente', obrig: true, max: 150 },
    { n: 'leito', rotulo: 'Leito / Box', obrig: true, max: 30 },
    { n: 'diagnostico', rotulo: 'Diagnóstico / hipótese', obrig: true, max: 250, col: '1 / -1' },
    { n: 'prioridade', rotulo: 'Prioridade', tipo: 'select', opcoes: Object.entries(PRI).map(([k, v]) => [k, v[0]]), obrig: true, semVazio: true },
    { n: 'pendencia', rotulo: 'Pendências', tipo: 'textarea', linhas: 2, max: 500, col: '1 / -1' },
    { n: 'intercorrencias', rotulo: 'Intercorrências', tipo: 'textarea', linhas: 2, max: 500, col: '1 / -1' },
    { n: 'observacoes', rotulo: 'Observações', tipo: 'textarea', linhas: 2, max: 500, col: '1 / -1' },
  ];

  const cards = (data, turno) => U.db(window.sb.from('passagem_cards').select('*').eq('data_plantao', data).eq('turno', turno).order('criado_em'));
  const limpar = v => { ['pendencia', 'intercorrencias', 'observacoes'].forEach(k => { v[k] = v[k] || null; }); return v; };

  function cartao(c, pode) {
    const p = PRI[c.prioridade];
    return `<div class="cx" style="border-left:4px solid ${c.prioridade === 'critico' ? '#DC2626' : c.prioridade === 'atencao' ? '#F59E0B' : '#059669'};${c.recebido_em ? 'background:#F8FFFA' : ''}">
      <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(c.paciente)}</b><span class="tag ${p[1]}">${p[0]}</span></div>
      <div class="ajuda">Leito ${esc(c.leito)} · ${esc(c.diagnostico)}</div>
      ${c.pendencia ? `<p style="margin-top:6px;font-size:13px"><b>Pendências:</b> ${esc(c.pendencia)}</p>` : ''}
      ${c.intercorrencias ? `<p style="font-size:13px"><b>Intercorrências:</b> ${esc(c.intercorrencias)}</p>` : ''}
      ${c.observacoes ? `<p style="font-size:13px"><b>Obs.:</b> ${esc(c.observacoes)}</p>` : ''}
      <div class="ajuda" style="margin-top:6px">Lançado por ${esc(c.criado_por_nome || '—')} em ${U.fmtDH(c.criado_em)}${c.atualizado_em && c.atualizado_em !== c.criado_em && Math.abs(new Date(c.atualizado_em) - new Date(c.criado_em)) > 2000 ? ' · alterado ' + U.fmtDH(c.atualizado_em) : ''}</div>
      ${c.recebido_em ? `<div class="ajuda" style="color:#065F46"><i class="fas fa-circle-check"></i> Recebido por ${esc(c.recebido_por_nome)} em ${U.fmtDH(c.recebido_em)}</div>` : ''}
      ${pode.any ? `<div class="barra" style="margin:8px 0 0">
        ${pode.receber && !c.recebido_em ? `<button class="btn btn-green btn-sm" data-rc="${c.id}"><i class="fas fa-check"></i> Receber</button>` : ''}
        ${pode.editar ? `<button class="btn btn-ghost btn-sm" data-ed="${c.id}"><i class="fas fa-pen"></i> Editar</button>` : ''}
        ${pode.excluir ? `<button class="btn btn-ghost btn-sm" data-ex="${c.id}"><i class="fas fa-trash"></i> Excluir</button>` : ''}</div>` : ''}</div>`;
  }

  async function painel(el) {
    const pode = { criar: U.can('passagem', 'criar'), editar: U.can('passagem', 'editar'), excluir: U.can('passagem', 'excluir'), receber: U.can('passagem', 'receber') };
    pode.any = pode.editar || pode.excluir || pode.receber;
    let data = U.dataPlantao(), turno = U.turnoAtual(), lista = [];
    const desenhar = async () => {
      lista = await cards(data, turno);
      el.innerHTML = (pode.criar ? '' : U.leituraAviso('Somente a administração e os gestores lançam, recebem, editam e excluem a passagem de plantão. Você pode consultar.')) +
        `<div class="barra"><input type="date" id="pp-dia" value="${data}" style="padding:8px;border:1.5px solid var(--gray-200);border-radius:6px">
          <select id="pp-turno" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px">${U.TURNOS.map(t => `<option value="${t[0]}"${t[0] === turno ? ' selected' : ''}>${t[1]}</option>`).join('')}</select>
          <span class="tag azul">${lista.length} paciente(s)</span><span class="tag verde">${lista.filter(c => c.recebido_em).length} recebido(s)</span><span class="espaco"></span>
          <button class="btn btn-ghost" id="pp-imp"><i class="fas fa-print"></i> Imprimir</button>
          ${pode.criar ? '<button class="btn btn-ghost" id="pp-fim"><i class="fas fa-flag-checkered"></i> Encerrar passagem</button><button class="btn btn-primary" id="pp-novo"><i class="fas fa-plus"></i> Novo paciente</button>' : ''}</div>
         <div class="pp-colunas">${Object.entries(PRI).map(([k, v]) => `<div><div class="section-title">${v[0]} (${lista.filter(c => c.prioridade === k).length})</div>${lista.filter(c => c.prioridade === k).map(c => cartao(c, pode)).join('') || '<div class="vazio">—</div>'}</div>`).join('')}</div>`;
      el.querySelector('#pp-dia').onchange = e => { data = e.target.value || data; desenhar(); };
      el.querySelector('#pp-turno').onchange = e => { turno = e.target.value; desenhar(); };
      el.querySelector('#pp-imp').onclick = () => U.imprimir(
        `<h2>Passagem de Plantão — UPA Rocinha</h2><div class="sub">${U.fmtData(data)} · ${esc(U.turnoNome(turno))} · emitido por ${esc(U.ctx.nome)} em ${U.fmtDH(new Date())}</div><br>` +
        (lista.length ? `<table><thead><tr><th>Leito</th><th>Paciente</th><th>Prioridade</th><th>Diagnóstico</th><th>Pendências / intercorrências / obs.</th><th>Recebido</th></tr></thead><tbody>${lista.map(c => `<tr><td>${esc(c.leito)}</td><td>${esc(c.paciente)}</td><td>${PRI[c.prioridade][0]}</td><td>${esc(c.diagnostico)}</td><td>${[c.pendencia, c.intercorrencias, c.observacoes].filter(Boolean).map(esc).join('<br>')}</td><td>${c.recebido_em ? esc(c.recebido_por_nome) + '<br>' + U.fmtDH(c.recebido_em) : '—'}</td></tr>`).join('')}</tbody></table>` : '<p>Sem pacientes lançados.</p>'), 'Passagem de plantão');

      const novo = el.querySelector('#pp-novo');
      if (novo) novo.onclick = () => U.formulario({ titulo: 'Novo paciente na passagem', campos: CAMPOS, valores: { turno, lotacao: 'normal', prioridade: 'estavel' },
        aoSalvar: async v => { limpar(v); v.data_plantao = data; await U.db(window.sb.from('passagem_cards').insert(v)); U.toast('Paciente lançado.'); if (v.turno !== turno) turno = v.turno; await desenhar(); homeKanban(); } });
      const fim = el.querySelector('#pp-fim');
      if (fim) fim.onclick = async () => {
        if (!await U.confirmar(`Registrar o encerramento da passagem de ${U.fmtData(data)} · ${U.turnoNome(turno)} com ${lista.length} paciente(s)?`, 'Encerrar')) return;
        try { await U.db(window.sb.from('passagem_fechamentos').insert({ data_plantao: data, turno, total_cards: lista.length })); U.toast('Passagem encerrada e registrada.'); } catch (e) { U.erro(e); }
      };
      el.querySelectorAll('[data-rc]').forEach(b => b.onclick = async () => {
        if (!await U.confirmar('Confirmar que você recebeu este paciente na passagem?', 'Receber')) return;
        try { await U.db(window.sb.rpc('passagem_receber', { p_id: b.dataset.rc })); U.toast('Recebimento registrado.'); await desenhar(); homeKanban(); } catch (e) { U.erro(e); }
      });
      el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => {
        const c = lista.find(x => x.id === b.dataset.ed);
        U.formulario({ titulo: 'Editar passagem', campos: CAMPOS, valores: c, rotuloSalvar: 'Continuar',
          aoSalvar: async v => {
            const motivo = await U.pedirMotivo('Motivo da alteração', 'Toda alteração fica registrada com seu nome, data/hora e este motivo.');
            if (!motivo) return false;
            limpar(v);
            await U.db(window.sb.rpc('passagem_editar', { p_id: c.id, p_dados: v, p_motivo: motivo }));
            U.toast('Alteração registrada.'); await desenhar(); homeKanban();
          } });
      });
      el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
        const c = lista.find(x => x.id === b.dataset.ex);
        const motivo = await U.pedirMotivo(`Excluir ${c.paciente}`, 'A exclusão fica registrada com seu nome, data/hora e este motivo.');
        if (!motivo) return;
        try { await U.db(window.sb.rpc('passagem_excluir', { p_id: c.id, p_motivo: motivo })); U.toast('Registro excluído.'); await desenhar(); homeKanban(); } catch (e) { U.erro(e); }
      });
    };
    await desenhar();
  }

  async function auditoria(el) {
    const l = await U.db(window.sb.from('passagem_auditoria').select('*').order('em', { ascending: false }).limit(300));
    el.innerHTML = U.tabela([
      { t: 'Quando', f: a => U.fmtDH(a.em) }, { t: 'Quem', f: a => esc(a.usuario_nome || '—') },
      { t: 'Ação', f: a => `<span class="tag ${a.acao === 'excluir' ? 'vermelho' : 'amarelo'}">${a.acao === 'excluir' ? 'Exclusão' : 'Edição'}</span>` },
      { t: 'Paciente', f: a => esc((a.dados_antes || {}).paciente || '—') + ' · leito ' + esc((a.dados_antes || {}).leito || '—') },
      { t: 'Motivo', f: a => esc(a.motivo) },
    ], l, 'Nenhuma alteração ou exclusão registrada.');
  }

  async function fechamentos(el) {
    const l = await U.db(window.sb.from('passagem_fechamentos').select('*').order('criado_em', { ascending: false }).limit(200));
    el.innerHTML = U.tabela([{ t: 'Plantão', f: a => `${U.fmtData(a.data_plantao)} · ${esc(U.turnoNome(a.turno))}` }, { t: 'Pacientes', f: a => a.total_cards }, { t: 'Encerrado por', f: a => esc(a.criado_por_nome || '—') }, { t: 'Em', f: a => U.fmtDH(a.criado_em) }], l, 'Nenhum encerramento registrado.');
  }

  /* Kanban compacto da tela inicial */
  async function homeKanban() {
    if (!U.can('passagem', 'ver') || !document.getElementById('ppk_col_critico')) return;
    const turno = U.turnoAtual();
    let l = [];
    try { l = await cards(U.dataPlantao(), turno); } catch (e) { return; }
    document.getElementById('pp_turnoTag').textContent = U.turnoNome(turno);
    document.getElementById('pp_kanbanCounts').textContent = `${l.length} paciente(s) · ${l.filter(c => c.recebido_em).length} recebido(s)`;
    Object.keys(PRI).forEach(k => {
      const f = l.filter(c => c.prioridade === k);
      document.getElementById('ppk_cnt_' + k).textContent = f.length;
      document.getElementById('ppk_col_' + k).innerHTML = f.map(c => `<div class="kb-card ${k}${c.recebido_em ? ' recebido' : ''}" onclick="UPA.go('passagem')"><div class="kb-nome">${esc(c.paciente)}</div><div class="kb-det">Leito ${esc(c.leito)} · ${esc(c.diagnostico)}</div></div>`).join('');
    });
  }
  let t = null;

  U.registrar({
    id: 'passagem', label: 'Passagem de Plantão', icone: 'fa-rotate', cor: 'c-escala',
    home() { homeKanban(); if (t) clearInterval(t); t = setInterval(() => { if (U.ctx && !U.atual) homeKanban(); }, 60000); },
    render(el) {
      const abas = [{ id: 'cards', rotulo: 'Plantão', render: painel }, { id: 'fech', rotulo: 'Encerramentos', render: fechamentos }];
      if (U.can('passagem_auditoria', 'ver')) abas.push({ id: 'aud', rotulo: 'Auditoria (gestores)', render: auditoria });
      U.abas(el, abas);
    },
  });
})();
