/* Evento Adverso — todos notificam; somente gestores acessam o relatório. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const TIPOS = ['Queda', 'Erro de medicação', 'Falha na identificação do paciente', 'Flebite / extravasamento', 'Lesão por pressão', 'Falha de equipamento', 'Falha de comunicação', 'Perda / retirada acidental de sonda, tubo ou cateter', 'Agressão / violência', 'Evasão / fuga do paciente', 'Reação transfusional', 'Infecção relacionada à assistência', 'Acidente com perfurocortante', 'Outro'];
  const SETORES = ['Recepção / Classificação', 'Consultório médico', 'Sala de Emergência', 'Sala Vermelha', 'Sala Amarela', 'Observação adulto', 'Observação pediátrica', 'Sala de Medicação', 'Sala de Procedimentos', 'Radiologia', 'Laboratório', 'Farmácia', 'Almoxarifado', 'Administrativo', 'Higienização', 'Outro'];
  const GRAUS = [['quase_erro', 'Quase erro (não atingiu o paciente)'], ['sem_dano', 'Atingiu o paciente, sem dano'], ['leve', 'Dano leve'], ['moderado', 'Dano moderado'], ['grave', 'Dano grave'], ['obito', 'Óbito']];
  const STATUS = { nova: ['Nova', 'vermelho'], em_analise: ['Em análise', 'amarelo'], concluida: ['Concluída', 'verde'] };
  const grauNome = g => (GRAUS.find(x => x[0] === g) || [g, g])[1];

  function notificar(el) {
    const CAMPOS = [
      { n: 'data_evento', rotulo: 'Data do evento', tipo: 'date', obrig: true, valor: U.hojeISO() },
      { n: 'hora_evento', rotulo: 'Hora aproximada', tipo: 'time' },
      { n: 'setor', rotulo: 'Setor', tipo: 'select', opcoes: SETORES, obrig: true },
      { n: 'local_evento', rotulo: 'Local detalhado', max: 120, ph: 'Ex.: Box 3, corredor' },
      { n: 'tipo', rotulo: 'Tipo de evento', tipo: 'select', opcoes: TIPOS, obrig: true },
      { n: 'grau', rotulo: 'Gravidade / dano', tipo: 'select', opcoes: GRAUS, obrig: true },
      { n: 'paciente_nome', rotulo: 'Paciente (se houver)', max: 150 },
      { n: 'paciente_prontuario', rotulo: 'Prontuário / FA', max: 40 },
      { n: 'descricao', rotulo: 'O que aconteceu', tipo: 'textarea', linhas: 5, obrig: true, max: 2000, col: '1 / -1', ph: 'Descreva o fato de forma objetiva: o que, como e quem estava envolvido (função).' },
      { n: 'acao_imediata', rotulo: 'Ação imediata tomada', tipo: 'textarea', linhas: 3, max: 1000, col: '1 / -1' },
      { n: 'anonimo', rotulo: 'Notificar de forma anônima (meu nome não será registrado)', tipo: 'checkbox', col: '1 / -1' },
    ];
    el.innerHTML = `<div class="cx"><div class="ajuda" style="margin-bottom:10px">A notificação é voltada à melhoria dos processos, não à punição. Somente os gestores têm acesso ao relatório.</div><form id="ev-form"></form></div>`;
    const f = el.querySelector('#ev-form');
    f.innerHTML = U.camposHtml(CAMPOS, null, 2) + '<div style="margin-top:14px"><button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i> Enviar notificação</button></div>';
    f.onsubmit = async e => {
      e.preventDefault();
      const v = U.lerCampos(f, CAMPOS); if (!v) return;
      if (v.descricao.length < 10) { U.toast('Descreva o evento com mais detalhes.', 'erro'); return; }
      const b = f.querySelector('button[type=submit]'); b.disabled = true;
      try {
        await U.db(window.sb.rpc('evento_notificar', { p_dados: v }));
        U.toast('Notificação enviada. Obrigado por contribuir com a segurança do paciente.');
        f.reset(); f.querySelector('#f_data_evento').value = U.hojeISO();
      } catch (er) { U.erro(er); } finally { b.disabled = false; }
    };
  }

  async function relatorio(el) {
    const fim = U.hojeISO(), ini = new Date(Date.now() - 90 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    el.innerHTML = `<div class="barra"><label class="fl" style="margin:0">De</label><input type="date" id="rv-ini" value="${ini}"><label class="fl" style="margin:0">até</label><input type="date" id="rv-fim" value="${fim}">
      <select id="rv-st"><option value="">Todas as situações</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
      <button class="btn btn-ghost" id="rv-ok"><i class="fas fa-rotate"></i> Filtrar</button><span class="espaco"></span><button class="btn btn-ghost" id="rv-csv"><i class="fas fa-file-excel"></i> Exportar</button></div><div id="rv-corpo"></div>`;
    let dados = [];
    const carregar = async () => {
      let q = window.sb.from('eventos_adversos').select('*').gte('data_evento', el.querySelector('#rv-ini').value).lte('data_evento', el.querySelector('#rv-fim').value).order('criado_em', { ascending: false });
      const st = el.querySelector('#rv-st').value; if (st) q = q.eq('status', st);
      dados = await U.db(q);
      const cont = (campo, rot) => { const m = {}; dados.forEach(d => { const k = rot ? rot(d[campo]) : d[campo]; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const bloco = (t, arr) => `<div class="cx"><h3>${t}</h3>${arr.length ? arr.map(([k, n]) => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--gray-100);font-size:13px"><span>${esc(k)}</span><b>${n}</b></div>`).join('') : '<div class="vazio">—</div>'}</div>`;
      el.querySelector('#rv-corpo').innerHTML =
        `<div class="graf-grade" style="margin-bottom:6px">${bloco('Por tipo', cont('tipo'))}${bloco('Por gravidade', cont('grau', grauNome))}${bloco('Por setor', cont('setor'))}</div>
         <div class="section-title">${dados.length} notificação(ões)</div>` +
        (dados.length ? dados.map(d => `<div class="cx"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${esc(d.tipo)}</b> · ${esc(d.setor)}${d.local_evento ? ' — ' + esc(d.local_evento) : ''}<div class="ajuda">${U.fmtData(d.data_evento)}${d.hora_evento ? ' ' + esc(String(d.hora_evento).slice(0, 5)) : ''} · notificado em ${U.fmtDH(d.criado_em)} por ${d.anonimo ? '<i>anônimo</i>' : esc(d.criado_por_nome || '—')}</div></div>
          <div><span class="tag ${['grave', 'obito'].includes(d.grau) ? 'vermelho' : d.grau === 'moderado' ? 'amarelo' : 'azul'}">${esc(grauNome(d.grau))}</span> <span class="tag ${STATUS[d.status][1]}">${STATUS[d.status][0]}</span></div></div>
          ${d.paciente_nome || d.paciente_prontuario ? `<div class="ajuda" style="margin-top:6px">Paciente: ${esc(d.paciente_nome || '—')} ${d.paciente_prontuario ? '· Pront. ' + esc(d.paciente_prontuario) : ''}</div>` : ''}
          <p style="margin:8px 0;font-size:13px;white-space:pre-wrap">${esc(d.descricao)}</p>
          ${d.acao_imediata ? `<div class="ajuda"><b>Ação imediata:</b> ${esc(d.acao_imediata)}</div>` : ''}
          ${d.analise || d.plano_acao ? `<div style="background:var(--gray-50);border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px"><b>Análise:</b> ${esc(d.analise || '—')}<br><b>Plano de ação:</b> ${esc(d.plano_acao || '—')}<div class="ajuda">${esc(d.analisado_por_nome || '')} ${d.analisado_em ? '· ' + U.fmtDH(d.analisado_em) : ''}</div></div>` : ''}
          <div class="barra" style="margin:10px 0 0"><button class="btn btn-ghost btn-sm" data-an="${d.id}"><i class="fas fa-magnifying-glass-chart"></i> Analisar / atualizar</button></div></div>`).join('') : '<div class="vazio">Nenhuma notificação no período.</div>');
      el.querySelectorAll('[data-an]').forEach(b => b.onclick = () => {
        const d = dados.find(x => String(x.id) === b.dataset.an);
        U.formulario({ titulo: 'Análise do evento', colunas: 1, valores: d,
          campos: [{ n: 'status', rotulo: 'Situação', tipo: 'select', opcoes: Object.entries(STATUS).map(([k, v]) => [k, v[0]]), semVazio: true }, { n: 'analise', rotulo: 'Análise (causas)', tipo: 'textarea', linhas: 4, max: 2000 }, { n: 'plano_acao', rotulo: 'Plano de ação', tipo: 'textarea', linhas: 4, max: 2000 }],
          aoSalvar: async v => { v.analise = v.analise || null; v.plano_acao = v.plano_acao || null; await U.db(window.sb.from('eventos_adversos').update(v).eq('id', d.id)); U.toast('Análise salva.'); await carregar(); } });
      });
    };
    el.querySelector('#rv-ok').onclick = carregar;
    el.querySelector('#rv-csv').onclick = () => U.baixarCsv(`eventos_adversos_${U.hojeISO()}.csv`, ['Data', 'Hora', 'Setor', 'Local', 'Tipo', 'Gravidade', 'Situação', 'Descrição', 'Ação imediata', 'Análise', 'Plano', 'Notificante'], dados.map(d => [U.fmtData(d.data_evento), d.hora_evento || '', d.setor, d.local_evento || '', d.tipo, grauNome(d.grau), STATUS[d.status][0], d.descricao, d.acao_imediata || '', d.analise || '', d.plano_acao || '', d.anonimo ? 'Anônimo' : d.criado_por_nome || '']));
    await carregar();
  }

  U.registrar({
    id: 'evento', label: 'Evento Adverso', icone: 'fa-triangle-exclamation', cor: 'c-evento',
    render(el) {
      const abas = [{ id: 'nova', rotulo: 'Notificar evento', render: notificar }];
      if (U.can('evento_relatorio', 'ver')) abas.push({ id: 'rel', rotulo: 'Relatório (gestores)', render: relatorio });
      U.abas(el, abas);
    },
  });
})();
