/* RH — todos solicitam (troca de plantão, extra, RPA, justificativa de ponto, atestado);
   gestores autorizam. Ninguém autoriza a própria solicitação (o banco impede). */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const TIPOS = { troca: 'Troca de plantão', extra: 'Plantão extra', rpa: 'RPA', ponto: 'Justificativa de ponto', atestado: 'Atestado médico' };
  const ST = { aguardando_colega: ['Aguardando colega', 'amarelo'], pendente: ['Aguardando autorização', 'azul'], autorizada: ['Autorizada', 'verde'], recusada: ['Recusada', 'vermelho'], cancelada: ['Cancelada', ''] };
  const TURNO_R = ['Manhã', 'Tarde', 'Noite', 'Diurno 12h', 'Noturno 12h'];
  const CAMPOS_TIPO = {
    troca: [
      { n: 'dataOrigem', rotulo: 'Dia a ser trocado', tipo: 'date', obrig: true }, { n: 'turnoOrigem', rotulo: 'Turno do dia trocado', tipo: 'select', opcoes: TURNO_R, obrig: true },
      { n: 'dataDest', rotulo: 'Dia em que irá trabalhar', tipo: 'date', obrig: true }, { n: 'turnoDest', rotulo: 'Turno desse dia', tipo: 'select', opcoes: TURNO_R, obrig: true },
      { n: 'membro2Nome', rotulo: 'Nome do 2º membro (colega)', obrig: true, max: 120 }, { n: 'membro2Mat', rotulo: 'Matrícula do 2º membro', obrig: true, max: 20 },
      { n: 'motivo', rotulo: 'Motivo', tipo: 'textarea', max: 400, col: '1 / -1' }],
    extra: [{ n: 'data', rotulo: 'Data do plantão extra', tipo: 'date', obrig: true }, { n: 'turno', rotulo: 'Turno', tipo: 'select', opcoes: TURNO_R, obrig: true }, { n: 'justificativa', rotulo: 'Justificativa', tipo: 'textarea', obrig: true, max: 500, col: '1 / -1' }],
    rpa: [{ n: 'servico', rotulo: 'Serviço prestado', obrig: true, max: 200 }, { n: 'periodo', rotulo: 'Período', obrig: true, max: 80, ph: 'Ex.: 01/10 a 15/10' }, { n: 'valor', rotulo: 'Valor (R$)', tipo: 'number', obrig: true, min: 0, step: '0.01' }, { n: 'banco', rotulo: 'Banco', max: 60 }, { n: 'conta', rotulo: 'Agência / conta', max: 60 }],
    ponto: [{ n: 'data', rotulo: 'Data', tipo: 'date', obrig: true }, { n: 'turno', rotulo: 'Turno', tipo: 'select', opcoes: TURNO_R, obrig: true }, { n: 'texto', rotulo: 'Justificativa', tipo: 'textarea', obrig: true, max: 500, col: '1 / -1' }],
    atestado: [{ n: 'data', rotulo: 'Início do afastamento', tipo: 'date', obrig: true }, { n: 'dias', rotulo: 'Dias de afastamento', tipo: 'number', obrig: true, min: 1, step: '1' }, { n: 'retorno', rotulo: 'Retorno previsto', tipo: 'date' }, { n: 'cid', rotulo: 'CID', max: 20 }, { n: 'medico', rotulo: 'Médico / CRM', max: 120 }, { n: 'obs', rotulo: 'Observações', tipo: 'textarea', max: 300, col: '1 / -1' }],
  };
  const abs = p => new URL(p, location.href).href;

  function linhasDados(r) {
    const d = r.dados || {}, L = (a, b) => `<tr><td style="width:35%;background:#f0f4fa;font-weight:700">${esc(a)}</td><td>${esc(b || '-')}</td></tr>`;
    const D = U.fmtData;
    switch (r.tipo) {
      case 'troca': return L('Dia a ser trocado', `${D(d.dataOrigem)} — ${d.turnoOrigem}`) + L('Dia a trabalhar (troca)', `${D(d.dataDest)} — ${d.turnoDest}`) + (d.motivo ? L('Motivo', d.motivo) : '') + L('2º membro', `${r.segundo_nome} — ${r.segundo_matricula}`);
      case 'extra': return L('Data do extra', D(d.data)) + L('Turno', d.turno) + L('Justificativa', d.justificativa);
      case 'rpa': return L('Serviço prestado', d.servico) + L('Período', d.periodo) + L('Valor', 'R$ ' + Number(d.valor || 0).toFixed(2).replace('.', ',')) + (d.banco ? L('Banco / conta', `${d.banco} / ${d.conta || ''}`) : '');
      case 'ponto': return L('Data', D(d.data)) + L('Turno', d.turno) + L('Justificativa', d.texto);
      case 'atestado': return L('Início do afastamento', D(d.data)) + L('Dias de afastamento', d.dias) + L('Retorno previsto', d.retorno ? D(d.retorno) : '') + L('CID', d.cid) + L('Médico / CRM', d.medico) + (d.obs ? L('Observações', d.obs) : '') + L('Anexo', r.anexo_path ? 'anexado' : 'não anexado');
      default: return '';
    }
  }

  async function imprimirDoc(r) {
    let anexo = '';
    if (r.tipo === 'atestado' && r.anexo_path && /\.(png|jpe?g|webp)$/i.test(r.anexo_path)) {
      try { anexo = `<h4 style="margin-top:14px">Cópia do atestado</h4><img src="${await U.urlAssinada('rh-anexos', r.anexo_path, 600)}" style="max-width:100%;max-height:520px;display:block;margin:6px auto;border:1px solid #aaa">`; } catch (e) { /* segue sem a imagem */ }
    }
    const sig = (img, nome, cargo, mat, quando) => `<div class="assin" style="width:30%;vertical-align:top">${img ? `<img src="${img}">` : ''}<div class="linha"><b>${esc(nome)}</b><br>${esc(cargo)}<br>${esc(mat || '')}<br><small>Rio de Janeiro, ${U.fmtDH(quando)}</small></div></div>`;
    U.imprimir(`
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #00008B;padding-bottom:8px;margin-bottom:12px">
        <img src="${abs('img/logo-upa.png')}" style="height:62px"><div style="text-align:center;flex:1"><div style="font-weight:700;text-decoration:underline;color:#00008B">DOCUMENTAÇÃO DE FORMALIZAÇÃO</div><div style="color:#00008B;font-weight:700">${esc(TIPOS[r.tipo]).toUpperCase()}</div></div><img src="${abs('img/logo-gnosis.jpg')}" style="height:54px"></div>
      <h4>1. Identificação do colaborador</h4><table>
        <tr><td style="width:35%;background:#f0f4fa;font-weight:700">Nome</td><td>${esc(r.criado_por_nome)}</td></tr>
        <tr><td style="background:#f0f4fa;font-weight:700">Função</td><td>${esc(r.profissao)}</td></tr>
        <tr><td style="background:#f0f4fa;font-weight:700">Matrícula</td><td>${esc(r.matricula)}</td></tr>
        <tr><td style="background:#f0f4fa;font-weight:700">Setor / unidade</td><td>${esc(r.setor || 'UPA Rocinha')}</td></tr>
        <tr><td style="background:#f0f4fa;font-weight:700">Data de envio</td><td>${U.fmtDH(r.criado_em)}</td></tr>
        <tr><td style="background:#f0f4fa;font-weight:700">Situação</td><td>${ST[r.status][0]}</td></tr></table>
      <h4>2. Dados da solicitação — ${esc(TIPOS[r.tipo])}</h4><table>${linhasDados(r)}</table>${anexo}
      <h4>3. Assinaturas</h4><div style="display:flex;gap:14px;justify-content:space-between">
        ${sig(r.assinatura, r.criado_por_nome, r.profissao, r.matricula, r.criado_em)}
        ${r.tipo === 'troca' ? sig(r.segundo_assinatura, r.segundo_nome, '2º membro da troca', r.segundo_matricula, r.segundo_em) : ''}
        ${r.status === 'autorizada' ? sig(r.assinatura_gestor, r.decidido_por_nome, 'Gestor', '', r.decidido_em) : `<div class="assin" style="width:30%"><i style="color:#888">${r.status === 'recusada' ? 'Recusada: ' + esc(r.decisao_obs || '') : 'Aguardando autorização'}</i></div>`}</div>
      <p style="text-align:center;font-size:10px;color:#888;margin-top:26px">Documento gerado em ${U.fmtDH(new Date())} — Gestão Inteligente UPA Rocinha</p>`, 'Documento RH');
  }

  /* janela de assinatura (retorna dataURL ou null) */
  function pedirAssinatura(titulo, texto) {
    return new Promise(res => {
      let feito = false; const fim = v => { if (!feito) { feito = true; res(v); } };
      let pad;
      const m = U.modal({ titulo, largura: 460, corpo: `${texto ? `<p style="margin-bottom:8px">${esc(texto)}</p>` : ''}<canvas id="as-cv" width="400" height="140" style="width:100%;border:1.5px dashed var(--gray-300);border-radius:8px;background:#fff"></canvas><div class="ajuda">Assine com o dedo ou o mouse dentro do quadro.</div>`,
        botoes: [{ rotulo: 'Limpar', acao: () => { pad.limpar(); return false; } }, { rotulo: 'Cancelar', acao: () => { fim(null); } },
          { rotulo: 'Confirmar', classe: 'btn-primary', acao: () => { if (pad.vazio()) { U.toast('Faça a assinatura.', 'erro'); return false; } fim(pad.dataUrl()); } }] });
      pad = U.assinatura(m.el.querySelector('#as-cv'));
      m.el.querySelector('.upa-x').addEventListener('click', () => fim(null));
    });
  }

  function nova(el, depois) {
    el.innerHTML = `<div class="cx"><div class="grade2"><div class="campo"><label class="fl">Tipo de solicitação *</label><select id="rh-tipo"><option value="">Selecione...</option>${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div class="campo"><label class="fl">Setor / unidade *</label><input type="text" id="rh-setor" maxlength="80" value="UPA Rocinha"></div></div><div id="rh-campos"></div></div>`;
    let tipo = '', pad = null;
    el.querySelector('#rh-tipo').onchange = e => {
      tipo = e.target.value; const box = el.querySelector('#rh-campos');
      if (!tipo) { box.innerHTML = ''; return; }
      box.innerHTML = U.camposHtml(CAMPOS_TIPO[tipo], null, 2) +
        (tipo === 'atestado' ? '<label class="fl">Foto ou PDF do atestado (até 5 MB)</label><input type="file" id="rh-anexo" accept="image/*,.pdf">' : '') +
        `<label class="fl">Sua assinatura *</label><canvas id="rh-as" width="400" height="140" style="width:100%;max-width:420px;border:1.5px dashed var(--gray-300);border-radius:8px;background:#fff"></canvas><div class="barra" style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" id="rh-lim">Limpar assinatura</button></div>
         <div class="barra"><button class="btn btn-primary" id="rh-env"><i class="fas fa-paper-plane"></i> Enviar solicitação</button></div>
         ${tipo === 'troca' ? '<div class="ajuda">A troca só segue para o gestor depois que o colega indicado assinar (aba "Para eu assinar" no RH dele).</div>' : ''}`;
      pad = U.assinatura(box.querySelector('#rh-as'));
      box.querySelector('#rh-lim').onclick = () => pad.limpar();
      box.querySelector('#rh-env').onclick = async ev => {
        const v = U.lerCampos(box, CAMPOS_TIPO[tipo]); if (!v) return;
        const setor = el.querySelector('#rh-setor').value.trim();
        if (!setor) { U.toast('Informe o setor.', 'erro'); return; }
        if (pad.vazio()) { U.toast('Assine no quadro antes de enviar.', 'erro'); return; }
        const btn = ev.currentTarget; btn.disabled = true;
        try {
          const reg = { tipo, setor, profissao: U.ctx.funcao, assinatura: pad.dataUrl(), dados: v };
          if (tipo === 'troca') { reg.segundo_nome = v.membro2Nome; reg.segundo_matricula = String(v.membro2Mat).trim(); delete v.membro2Nome; delete v.membro2Mat; }
          const arq = tipo === 'atestado' && box.querySelector('#rh-anexo').files[0];
          if (arq) {
            if (arq.size > 5 * 1024 * 1024) throw new Error('Arquivo maior que 5 MB.');
            reg.anexo_path = await U.enviarArquivo('rh-anexos', `${U.ctx.id}/${Date.now()}_${U.nomeSeguro(arq.name)}`, arq);
          }
          await U.db(window.sb.from('rh_solicitacoes').insert(reg));
          U.toast('Solicitação enviada.'); depois();
        } catch (e) { U.erro(e); } finally { btn.disabled = false; }
      };
    };
  }

  const cartao = (r, botoes) => `<div class="cx"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${esc(TIPOS[r.tipo])}</b> <span class="tag ${ST[r.status][1]}">${ST[r.status][0]}</span><div class="ajuda">${esc(r.criado_por_nome)} · mat. ${esc(r.matricula)} · ${esc(r.profissao)} · enviada ${U.fmtDH(r.criado_em)}</div></div></div>
      <table style="margin-top:8px">${linhasDados(r)}</table>
      ${r.decisao_obs ? `<div class="ajuda">Observação do gestor: ${esc(r.decisao_obs)}</div>` : ''}
      ${r.decidido_por_nome ? `<div class="ajuda">Decisão de ${esc(r.decidido_por_nome)} em ${U.fmtDH(r.decidido_em)}</div>` : ''}
      <div class="barra" style="margin:8px 0 0">${botoes}</div></div>`;

  async function minhas(el) {
    const l = await U.db(window.sb.from('rh_solicitacoes').select('*').eq('criado_por', U.ctx.id).order('criado_em', { ascending: false }).limit(100));
    el.innerHTML = l.length ? l.map(r => cartao(r, `${r.status === 'autorizada' ? `<button class="btn btn-ghost btn-sm" data-pr="${r.id}"><i class="fas fa-print"></i> Documento</button>` : ''}${['aguardando_colega', 'pendente'].includes(r.status) ? `<button class="btn btn-ghost btn-sm" data-cn="${r.id}"><i class="fas fa-ban"></i> Cancelar</button>` : ''}${r.anexo_path ? `<button class="btn btn-ghost btn-sm" data-an="${r.anexo_path}"><i class="fas fa-paperclip"></i> Anexo</button>` : ''}`)).join('') : '<div class="vazio">Você ainda não fez solicitações.</div>';
    ligar(el, l, () => minhas(el));
  }

  async function paraAssinar(el) {
    const l = (await U.db(window.sb.from('rh_solicitacoes').select('*').eq('status', 'aguardando_colega').eq('segundo_matricula', U.ctx.matricula).order('criado_em')));
    el.innerHTML = l.length ? l.map(r => cartao(r, `<button class="btn btn-green btn-sm" data-as="${r.id}"><i class="fas fa-signature"></i> Assinar troca</button>`)).join('') : '<div class="vazio">Nenhuma troca aguardando a sua assinatura.</div>';
    el.querySelectorAll('[data-as]').forEach(b => b.onclick = async () => {
      const a = await pedirAssinatura('Assinar troca de plantão', 'Ao assinar você confirma que concorda com a troca.'); if (!a) return;
      try { await U.db(window.sb.rpc('rh_colega_assinar', { p_id: b.dataset.as, p_assinatura: a })); U.toast('Troca assinada. Enviada ao gestor.'); paraAssinar(el); } catch (e) { U.erro(e); }
    });
  }

  async function autorizar(el) {
    const l = await U.db(window.sb.from('rh_solicitacoes').select('*').order('criado_em', { ascending: false }).limit(300));
    const pend = l.filter(r => r.status === 'pendente'), resto = l.filter(r => r.status !== 'pendente' && r.status !== 'aguardando_colega');
    el.innerHTML = `<div class="section-title">Aguardando autorização (${pend.length})</div>` +
      (pend.map(r => cartao(r, r.criado_por === U.ctx.id ? '<span class="ajuda">Você não pode autorizar a própria solicitação.</span>' : `<button class="btn btn-green btn-sm" data-ok="${r.id}"><i class="fas fa-check"></i> Autorizar</button><button class="btn btn-ghost btn-sm" data-no="${r.id}"><i class="fas fa-xmark"></i> Recusar</button>${r.anexo_path ? `<button class="btn btn-ghost btn-sm" data-an="${r.anexo_path}"><i class="fas fa-paperclip"></i> Anexo</button>` : ''}`)).join('') || '<div class="vazio">Nada pendente.</div>') +
      `<div class="section-title" style="margin-top:18px">Histórico</div>` + (resto.map(r => cartao(r, `<button class="btn btn-ghost btn-sm" data-pr="${r.id}"><i class="fas fa-print"></i> Documento</button>${r.anexo_path ? `<button class="btn btn-ghost btn-sm" data-an="${r.anexo_path}"><i class="fas fa-paperclip"></i> Anexo</button>` : ''}`)).join('') || '<div class="vazio">—</div>');
    el.querySelectorAll('[data-ok]').forEach(b => b.onclick = async () => {
      const a = await pedirAssinatura('Autorizar solicitação', 'Assine para autorizar.'); if (!a) return;
      try { await U.db(window.sb.rpc('rh_decidir', { p_id: b.dataset.ok, p_aprovar: true, p_obs: null, p_assinatura: a })); U.toast('Solicitação autorizada.'); autorizar(el); } catch (e) { U.erro(e); }
    });
    el.querySelectorAll('[data-no]').forEach(b => b.onclick = async () => {
      const m = await U.pedirMotivo('Recusar solicitação', 'Informe o motivo da recusa.'); if (!m) return;
      try { await U.db(window.sb.rpc('rh_decidir', { p_id: b.dataset.no, p_aprovar: false, p_obs: m, p_assinatura: null })); U.toast('Solicitação recusada.'); autorizar(el); } catch (e) { U.erro(e); }
    });
    ligar(el, l, () => autorizar(el));
  }

  function ligar(el, lista, recarregar) {
    el.querySelectorAll('[data-pr]').forEach(b => b.onclick = () => imprimirDoc(lista.find(r => r.id === b.dataset.pr)));
    el.querySelectorAll('[data-an]').forEach(b => b.onclick = () => U.abrirArquivo('rh-anexos', b.dataset.an));
    el.querySelectorAll('[data-cn]').forEach(b => b.onclick = async () => {
      if (!await U.confirmar('Cancelar esta solicitação?', 'Cancelar solicitação', true)) return;
      try { await U.db(window.sb.rpc('rh_cancelar', { p_id: b.dataset.cn })); U.toast('Solicitação cancelada.'); recarregar(); } catch (e) { U.erro(e); }
    });
  }

  U.registrar({
    id: 'rh', label: 'RH', icone: 'fa-id-badge', cor: 'c-rh',
    render(el) {
      let ctl;
      const abas = [
        { id: 'nova', rotulo: 'Nova solicitação', render: c => nova(c, () => ctl.abrir('min')) },
        { id: 'min', rotulo: 'Minhas solicitações', render: minhas },
        { id: 'ass', rotulo: 'Para eu assinar', render: paraAssinar },
      ];
      if (U.can('rh', 'editar')) abas.push({ id: 'aut', rotulo: 'Autorizações (gestores)', render: autorizar });
      ctl = U.abas(el, abas);
    },
  });
})();
