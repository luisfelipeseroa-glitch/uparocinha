/* Safety Huddle — formulário completo por setores, assinatura e foto da equipe.
   Todos registram; gestores editam e excluem. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const SN = 'sn', TX = 'tx', NUM = 'num', TEMPO = 'tempo';
  const q = (k, t, tipo) => ({ k, t, tipo: tipo || SN });

  const SECOES = [
    { id: 'eq', t: '👥 Equipes de Plantão', i: [q('eq1', 'Todas as especialidades estão presentes no Huddle?'), q('eq2', 'Escala de funcionários, deste plantão, está completa?'), q('eq3', 'Escala de funcionários está acessível aos pacientes?')] },
    { id: 'pa', t: '🏥 Pacientes', i: [q('pa1', 'Paciente(s) com previsão de alta?'), q('pa2', 'Ocupação dos leitos total?'), q('pa3', 'Paciente(s) aguardando avaliação?'), q('pa4', 'Paciente(s) aguardando exame?'), q('pa5', 'Algum protocolo (Sepse, IAM ou AVC) foi aberto nas últimas 24h?'), q('pa6', 'Paciente(s) com suspeita de Sepse, IAM ou AVC?'), q('pa7', 'Algum paciente aguardando retorno > 2h?')] },
    { id: 'po', t: '🚪 Porta de Entrada × CR × Atendimento', i: [q('po1', 'A demanda de porta de entrada está alta?'), q('po2', 'Tempo médio entre a CR e o Atendimento', TEMPO)] },
    { id: 'nir', t: '🛏️ NIR — Núcleo Interno de Regulação', i: [q('nir_am', 'Pacientes na Sala Amarela', NUM), q('nir_ap', 'Pacientes na Sala Amarela Pediátrica', NUM), q('nir_is', 'Pacientes no Isolamento', NUM), q('nir_vm', 'Pacientes na Sala Vermelha', NUM), q('nir1', 'Todos os pacientes internados com AIH?'), q('nir2', 'Algum paciente para VAGA ZERO com pedido de procedimento ou avaliação?'), q('nir3', 'Todos os pacientes foram inseridos no SER com menos de 24h?')] },
    { id: 'ss', t: '🤝 Serviço Social', i: [q('ss1', 'Temos pacientes com acompanhamento do serviço social?'), q('ss2', 'Algum paciente aguardando abrigo, cuidados prolongados, alta social ou Ministério Público?'), q('ss3', 'Temos familiar de paciente com acompanhamento do SESO?')] },
    { id: 'nu', t: '🍽️ Nutrição', i: [q('nu1', 'Problemas com a oferta/distribuição de refeições aos pacientes?'), q('nu2', 'Algum paciente em dieta zero?'), q('nu3', 'Algum paciente com restrição alimentar?'), q('nu4', 'Relate problema (se houver)', TX)] },
    { id: 'fa', t: '💊 Farmácia', i: [q('fa1', 'Medicações em falta?'), q('fa2', 'Plano de ação em execução?'), q('fa3', 'Relate sobre o plano de ação', TX)] },
    { id: 'lab', t: '🔬 Laboratório', i: [q('lab1', 'Alguma pendência ou problema urgente?'), q('lab2', 'Algum impacto na realização de exames?'), q('lab3', 'Relate problema (se houver)', TX)] },
    { id: 'rx', t: '🩻 Raios-X', i: [q('rx1', 'Alguma pendência ou problema urgente?'), q('rx2', 'Chamado aberto?')] },
    { id: 'tc', t: '🖥️ Tomógrafo', i: [q('tc1', 'Alguma pendência ou problema urgente?'), q('tc2', 'Verificou se há chamado aberto?')] },
    { id: 'cme', t: '♻️ CME — Central de Material Esterilizado', i: [q('cme1', 'Autoclave funcionante?'), q('cme2', 'Seladora funcionante?'), q('cme3', 'Lavadora funcionante?'), q('cme4', 'Plano de ação em execução?'), q('cme5', 'Descreva (se necessário)', TX)] },
    { id: 'cci', t: '🦠 CCIH — Controle de Infecção Hospitalar', i: [q('cci1', 'Algum paciente em precaução?'), q('cci2', 'Descreva (se necessário)', TX)] },
    { id: 'vs', t: '🔭 Núcleo de Vigilância em Saúde', i: [q('vs1', 'Casos de doenças transmissíveis ou infectocontagiosas?'), q('vs2', 'Todos os casos com SINAN preenchidos?')] },
    { id: 'sp', t: '🛡️ Núcleo de Segurança do Paciente', i: [q('sp1', 'Previsão de rondas e treinamentos?'), q('sp2', 'Alguma notificação sobre queda ou outro evento adverso moderado ou grave nas últimas 24h?')] },
    { id: 'ep', t: '📚 Núcleo de Educação Permanente', i: [q('ep1', 'Previsão de treinamento previsto para hoje?')] },
    { id: 'hi', t: '🧹 Higienização', i: [q('hi1', 'Falta de material?'), q('hi2', 'Equipe completa?'), q('hi3', 'Algum impacto para a higienização devido a falta de colaborador?')] },
    { id: 'ma', t: '🛒 Maqueiros', i: [q('ma1', 'Equipe completa?'), q('ma2', 'Algum impacto para a assistência devido a falta de colaborador?')] },
    { id: 'vi', t: '🔒 Vigilantes', i: [q('vi1', 'Equipe completa?'), q('vi2', 'Algum impacto para a Unidade devido a falta de colaborador?')] },
    { id: 'ti', t: '💻 Suporte de TI', i: [q('ti1', 'Suporte de TI na Unidade?'), q('ti2', 'Problema com impressoras?'), q('ti3', 'Problemas com o sistema?')] },
    { id: 'al', t: '📦 Almoxarifado', i: [q('al1', 'Falta Insumos?'), q('al2', 'Algum impacto para a Unidade devido a falta de colaborador?'), q('al3', 'Relatada a falta à OSS?'), q('al4', 'Plano de ação em execução?'), q('al5', 'Descreva o plano de ação', TX)] },
    { id: 'ec', t: '⚙️ Engenharia Clínica', i: [q('ec1', 'Problema com Bomba Infusora?'), q('ec2', 'Problema com Monitor multiparâmetro?'), q('ec3', 'Problema com cama hospitalar ou de transferência?'), q('ec4', 'Problema com ventilador mecânico?'), q('ec5', 'Problema com aspirador de secreção?'), q('ec6', 'Problema com eletrocardiógrafo?'), q('ec7', 'Problema com desfibrilador?'), q('ec8', 'Já abriu chamado?')] },
    { id: 'ro', t: '🧺 Rouparia', i: [q('ro1', 'Problema com distribuição de roupa?'), q('ro2', 'Problema com retirada de hampers?')] },
    { id: 'mn', t: '🔧 Manutenção', i: [q('mn1', 'Problema com o cronograma de chamados?'), q('mn2', 'Alguma pendência urgente?'), q('mn3', 'Falta algum tipo de ferramenta ou peça que está atrasando um reparo solicitado?'), q('mn4', 'Já foi pedida a compra?')] },
    { id: 'pc', t: '🚨 Plano de Contingência', i: [q('pc1', 'Há necessidade de ativar algum plano de contingência?'), q('pc2', 'Fluxo devido a falta de RH?'), q('pc3', 'Fluxo devido a falta de água?'), q('pc4', 'Fluxo devido a falta de energia?'), q('pc5', 'Fluxo devido a problemas externos?')] },
  ];
  const TEMPOS = [['<30', 'Menos de 30 min'], ['30-60', '30 a 60 min'], ['>60', 'Mais de 60 min']];
  const todas = SECOES.flatMap(s => s.i);
  const IDENT = [
    { n: 'coordenacao', r: 'Coordenação' }, { n: 'rotina', r: 'Rotina' }, { n: 'lid_medica', r: 'Liderança Médica' },
    { n: 'lid_enf', r: 'Liderança de Enfermagem' }, { n: 'lid_adm', r: 'Liderança Administrativa' },
  ];
  const rotuloResp = (it, v) => it.tipo === TEMPO ? ((TEMPOS.find(t => t[0] === v) || [])[1] || '') : it.tipo === SN ? (v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : '') : (v === undefined || v === null ? '' : String(v));

  /* reduz a foto (celular gera arquivos grandes): lado maior 1600px, JPEG */
  const reduzir = f => new Promise(ok => {
    if (!f || !/^image\//.test(f.type) || !window.createImageBitmap || !document.createElement('canvas').getContext) return ok(f);
    createImageBitmap(f).then(b => {
      const e = Math.min(1, 1600 / Math.max(b.width, b.height)); const c = document.createElement('canvas');
      c.width = Math.round(b.width * e); c.height = Math.round(b.height * e);
      const g = c.getContext('2d'); if (!g) return ok(f); g.drawImage(b, 0, 0, c.width, c.height);
      c.toBlob(bl => ok(bl ? new File([bl], 'equipe.jpg', { type: 'image/jpeg' }) : f), 'image/jpeg', 0.82);
    }).catch(() => ok(f));
  });

  const sn = (k, v) => `<div class="sh-sn" data-k="${k}"><button type="button" class="btn btn-sm ${v === 'sim' ? 'btn-primary' : 'btn-ghost'}" data-v="sim">Sim</button><button type="button" class="btn btn-sm ${v === 'nao' ? 'btn-primary' : 'btn-ghost'}" data-v="nao">Não</button></div>`;
  const campoQ = (it, v) => {
    const lin = c => `<div class="sh-q"><div class="sh-t">${esc(it.t)}</div>${c}</div>`;
    if (it.tipo === TX) return `<div class="sh-q sh-w"><label class="fl" for="sh_${it.k}">${esc(it.t)}</label><textarea id="sh_${it.k}" data-k="${it.k}" rows="2" maxlength="600">${esc(v || '')}</textarea></div>`;
    if (it.tipo === NUM) return lin(`<input type="number" min="0" step="1" inputmode="numeric" data-k="${it.k}" value="${esc(v ?? '')}" style="width:90px">`);
    if (it.tipo === TEMPO) return lin(`<select data-k="${it.k}"><option value="">Selecione...</option>${TEMPOS.map(([a, b]) => `<option value="${a}"${v === a ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`);
    return lin(sn(it.k, v));
  };

  /* ---- documento completo (tela e impressão) ---- */
  const resumoHtml = (h, fotoUrl) => {
    const id = h.ident || {}, r = h.respostas || {};
    const identTxt = [['Profissional', id.nome], ['Cargo/Função', id.cargo], ...IDENT.map(c => [c.r, id[c.n]])].filter(x => x[1]).map(x => `<b>${esc(x[0])}:</b> ${esc(x[1])}`).join(' · ');
    const secs = SECOES.map(s => {
      const linhas = s.i.map(it => [it, rotuloResp(it, r[it.k])]).filter(x => x[1] !== '');
      if (!linhas.length) return '';
      return `<h3 style="margin:12px 0 4px">${esc(s.t)}</h3><table>${linhas.map(([it, v]) => `<tr><td style="width:75%">${esc(it.t)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>`;
    }).join('');
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><img src="${new URL('img/logo-upa.png', location.href).href}" style="height:54px"><div style="text-align:center;flex:1"><h2>Safety Huddle — UPA Rocinha</h2><div class="sub">${U.fmtData(h.data_huddle)} · ${esc(U.turnoNome(h.turno))}${h.hora ? ' · ' + String(h.hora).slice(0, 5) : ''}</div></div></div>
      <p style="margin:10px 0">${identTxt}</p>${secs}
      <h3 style="margin:12px 0 4px">📝 Resumo do plantão</h3><p>${esc(h.resumo || '—').replace(/\n/g, '<br>')}</p>
      ${fotoUrl ? `<h3 style="margin:12px 0 4px">📷 Equipe participante</h3><img src="${fotoUrl}" style="max-width:100%;max-height:340px">` : ''}
      ${h.assinatura ? `<div class="assin"><img src="${h.assinatura}"><div class="linha">${esc((id.nome || h.criado_por_nome || ''))}<br>${esc(id.cargo || '')}</div></div>` : ''}
      <p class="sub" style="margin-top:10px">Registrado por ${esc(h.criado_por_nome || '—')} em ${U.fmtDH(h.criado_em)}</p>`;
  };
  const legadoHtml = h => `<p><b>Registro no formato antigo (checklist simples)</b></p>${h.participantes ? `<p><b>Participantes:</b> ${esc(h.participantes)}</p>` : ''}${h.riscos ? `<p><b>Riscos:</b> ${esc(h.riscos)}</p>` : ''}${h.ocorrencias ? `<p><b>Ocorrências:</b> ${esc(h.ocorrencias)}</p>` : ''}${h.encaminhamentos ? `<p><b>Encaminhamentos:</b> ${esc(h.encaminhamentos)}</p>` : ''}`;
  const novoFormato = h => h.respostas && Object.keys(h.respostas).length > 0 || h.resumo;

  const contaSim = h => { const r = h.respostas || {}; return todas.filter(it => it.tipo === SN && r[it.k] === 'sim').length; };

  U.registrar({
    id: 'safety', label: 'Safety Huddle', icone: 'fa-shield-halved', cor: 'c-safety',
    async render(el) {
      let sub = null;
      const lista = async () => {
        const l = await U.db(window.sb.from('safety_huddles').select('*').order('data_huddle', { ascending: false }).order('criado_em', { ascending: false }).limit(60));
        el.innerHTML = `<div class="barra"><button class="btn btn-primary" id="sh-novo"><i class="fas fa-plus"></i> Novo Safety Huddle</button></div>` +
          (l.map(h => `<div class="cx"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${U.fmtData(h.data_huddle)} · ${esc(U.turnoNome(h.turno))}</b>${h.hora ? ' · ' + String(h.hora).slice(0, 5) : ''}<div class="ajuda">Registrado por ${esc(h.criado_por_nome || '—')} em ${U.fmtDH(h.criado_em)}</div></div>
            <div>${novoFormato(h) ? `<span class="tag azul">${contaSim(h)} respostas "Sim"</span> ${h.foto_path ? '<span class="tag verde"><i class="fas fa-camera"></i> foto da equipe</span>' : ''}` : '<span class="tag">formato antigo</span>'}</div></div>
            ${h.resumo ? `<p style="font-size:13px;margin-top:6px">${esc(h.resumo.length > 200 ? h.resumo.slice(0, 200) + '…' : h.resumo)}</p>` : ''}
            <div class="barra" style="margin:8px 0 0"><button class="btn btn-ghost btn-sm" data-ver="${h.id}"><i class="fas fa-eye"></i> Ver</button>${U.can('safety', 'editar') && novoFormato(h) ? `<button class="btn btn-ghost btn-sm" data-ed="${h.id}"><i class="fas fa-pen"></i> Editar</button>` : ''}${U.can('safety', 'excluir') ? `<button class="btn btn-ghost btn-sm" data-ex="${h.id}"><i class="fas fa-trash"></i> Excluir</button>` : ''}</div></div>`).join('') || '<div class="vazio">Nenhum huddle registrado.</div>');
        el.querySelector('#sh-novo').onclick = () => formulario(null);
        el.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => ver(l.find(x => String(x.id) === b.dataset.ver)));
        el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => formulario(l.find(x => String(x.id) === b.dataset.ed)));
        el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => { if (!await U.confirmar('Excluir este registro de huddle?', 'Excluir', true)) return; try { await U.db(window.sb.from('safety_huddles').delete().eq('id', b.dataset.ex)); await lista(); } catch (e) { U.erro(e); } });
      };

      const ver = async h => {
        let url = '';
        if (h.foto_path) { try { url = await U.urlAssinada('safety-fotos', h.foto_path, 600); } catch (e) { /* segue sem foto */ } }
        const corpo = novoFormato(h) ? resumoHtml(h, url) : legadoHtml(h);
        U.modal({ titulo: 'Safety Huddle', largura: 760, corpo: `<div class="sh-doc">${corpo}</div>`,
          botoes: [{ rotulo: 'Fechar' }, { rotulo: 'Imprimir / PDF', classe: 'btn-primary', acao: () => { U.imprimir(novoFormato(h) ? resumoHtml(h, url) : legadoHtml(h), 'Safety Huddle'); return false; } }] });
      };

      const formulario = reg => {
        sub = true;
        const r = (reg && reg.respostas) || {}, id = (reg && reg.ident) || {};
        const resp = { ...r };
        el.innerHTML = `<div class="barra"><button class="btn btn-ghost" id="sh-voltar"><i class="fas fa-chevron-left"></i> Voltar</button></div>
        <form id="sh-form" class="cx" novalidate>
          <h3>📋 Identificação do plantão</h3>
          <div class="grade2">
            <div class="campo"><label class="fl" for="sh_data">Data *</label><input type="date" id="sh_data" value="${esc(reg ? reg.data_huddle : U.dataPlantao())}"></div>
            <div class="campo"><label class="fl" for="sh_hora">Horário</label><input type="time" id="sh_hora" value="${esc(reg && reg.hora ? String(reg.hora).slice(0, 5) : '')}"></div>
            <div class="campo"><label class="fl" for="sh_turno">Turno *</label><select id="sh_turno">${U.TURNOS.map(([a, b]) => `<option value="${a}"${(reg ? reg.turno : U.turnoAtual()) === a ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
            <div class="campo"><label class="fl" for="sh_nome">Nome do profissional *</label><input type="text" id="sh_nome" maxlength="120" value="${esc(id.nome || (reg ? '' : U.ctx.nome) || '')}"></div>
            <div class="campo"><label class="fl" for="sh_cargo">Cargo ou função *</label><input type="text" id="sh_cargo" maxlength="80" value="${esc(id.cargo || (reg ? '' : U.ctx.funcao) || '')}"></div>
            ${IDENT.map(c => `<div class="campo"><label class="fl" for="sh_${c.n}">${esc(c.r)}</label><input type="text" id="sh_${c.n}" maxlength="120" value="${esc(id[c.n] || '')}"></div>`).join('')}
          </div>
          ${SECOES.map(s => `<h3 style="margin-top:18px">${esc(s.t)}</h3><div class="sh-grade">${s.i.map(it => campoQ(it, r[it.k])).join('')}</div>`).join('')}
          <h3 style="margin-top:18px">📝 Resumo do plantão</h3>
          <div class="campo"><label class="fl" for="sh_resumo">Resumo geral do plantão *</label><textarea id="sh_resumo" rows="4" maxlength="2000">${esc(reg ? reg.resumo || '' : '')}</textarea></div>
          <h3 style="margin-top:18px">📷 Foto da equipe participante</h3>
          <div class="campo"><label class="fl">Foto da equipe ${reg ? '(deixe vazio para manter a atual)' : '*'}</label>
            <div class="barra" style="margin:0"><button type="button" class="btn btn-primary btn-sm" id="sh_cam"><i class="fas fa-camera"></i> Tirar foto agora</button><button type="button" class="btn btn-ghost btn-sm" id="sh_gal"><i class="fas fa-image"></i> Escolher da galeria</button></div>
            <input type="file" id="sh_foto" accept="image/*" style="display:none"><div class="ajuda">Reúna a equipe que participou do huddle e tire a foto.</div><div id="sh_prev"></div></div>
          <h3 style="margin-top:18px">✍️ Assinatura do executante</h3>
          <div class="ajuda">Assine com o dedo (tela) ou com o mouse para confirmar as informações.${reg && reg.assinatura ? ' Se não assinar de novo, a assinatura anterior é mantida.' : ''}</div>
          <canvas id="sh_as" width="500" height="150" style="width:100%;max-width:520px;border:1.5px dashed var(--gray-300);border-radius:8px;background:#fff;margin-top:6px"></canvas>
          <div class="barra" style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" id="sh_lim">Limpar assinatura</button></div>
          <div style="margin-top:14px"><button type="submit" class="btn btn-primary" id="sh_env"><i class="fas fa-shield-halved"></i> ${reg ? 'Salvar alterações' : 'Enviar Safety Huddle'}</button></div>
        </form>`;
        const f = el.querySelector('#sh-form');
        const pad = U.assinatura(f.querySelector('#sh_as'));
        f.querySelector('#sh_lim').onclick = () => pad.limpar();
        el.querySelector('#sh-voltar').onclick = () => lista();
        f.querySelectorAll('.sh-sn').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
          const k = g.dataset.k; resp[k] = resp[k] === b.dataset.v ? undefined : b.dataset.v;
          g.querySelectorAll('button').forEach(x => { x.classList.toggle('btn-primary', resp[k] === x.dataset.v); x.classList.toggle('btn-ghost', resp[k] !== x.dataset.v); });
        }));
        let fotoArq = null;
        const mostra = a => { fotoArq = a; f.querySelector('#sh_prev').innerHTML = a ? `<img src="${URL.createObjectURL(a)}" style="max-width:260px;max-height:200px;margin-top:8px;border-radius:8px">` : ''; };
        const inp = f.querySelector('#sh_foto');
        inp.onchange = e => mostra(e.target.files[0] || null);
        f.querySelector('#sh_gal').onclick = () => { inp.removeAttribute('capture'); inp.click(); };
        f.querySelector('#sh_cam').onclick = async () => {
          if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { inp.setAttribute('capture', 'environment'); inp.click(); return; }
          let stream;
          try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
          catch (er) { U.toast('Não consegui abrir a câmera (permissão negada?). Use "Escolher da galeria".', 'erro'); inp.setAttribute('capture', 'environment'); inp.click(); return; }
          const fim = () => stream.getTracks().forEach(t => t.stop());
          const m = U.modal({ titulo: 'Foto da equipe', largura: 560, corpo: '<video id="sh_vid" autoplay playsinline muted style="width:100%;border-radius:8px;background:#000"></video>',
            botoes: [{ rotulo: 'Cancelar', acao: () => { fim(); } },
              { rotulo: 'Tirar foto', classe: 'btn-primary', acao: el => {
                const v = el.querySelector('#sh_vid'); if (!v.videoWidth) { U.toast('Aguarde a câmera abrir.', 'erro'); return false; }
                const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
                fim(); c.toBlob(b => mostra(new File([b], 'equipe.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85);
              } }] });
          m.el.querySelector('#sh_vid').srcObject = stream;
          const x = m.el.querySelector('.upa-x'); if (x) x.addEventListener('click', fim);
        };
        f.onsubmit = async e => {
          e.preventDefault();
          const val = n => (f.querySelector('#sh_' + n).value || '').trim();
          const falta = [['data', 'Data'], ['nome', 'Nome do profissional'], ['cargo', 'Cargo ou função'], ['resumo', 'Resumo geral do plantão']].find(([n]) => !val(n));
          if (falta) { U.toast('Preencha: ' + falta[1], 'erro'); f.querySelector('#sh_' + falta[0]).focus(); return; }
          const foto = fotoArq;
          if (!reg && !foto) { U.toast('Tire a foto da equipe participante.', 'erro'); return; }
          if (!reg && pad.vazio()) { U.toast('Faça a assinatura.', 'erro'); return; }
          const btn = f.querySelector('#sh_env'); btn.disabled = true;
          try {
            const respostas = {};
            todas.forEach(it => {
              if (it.tipo === SN) { if (resp[it.k]) respostas[it.k] = resp[it.k]; return; }
              const e2 = f.querySelector(`[data-k="${it.k}"]`); const v = (e2.value || '').trim();
              if (v !== '') respostas[it.k] = it.tipo === NUM ? Number(v) : v;
            });
            const ident = { nome: val('nome'), cargo: val('cargo') }; IDENT.forEach(c => { if (val(c.n)) ident[c.n] = val(c.n); });
            const o = { data_huddle: val('data'), hora: val('hora') || null, turno: val('turno'), ident, respostas, resumo: val('resumo') };
            if (foto) {
              const pq = await reduzir(foto);
              if (pq.size > 5 * 1024 * 1024) throw new Error('Foto maior que 5 MB.');
              o.foto_path = await U.enviarArquivo('safety-fotos', `${U.ctx.id}/${Date.now()}_${U.nomeSeguro(pq.name || 'equipe.jpg')}`, pq);
            }
            if (!pad.vazio()) o.assinatura = pad.dataUrl();
            if (reg) await U.db(window.sb.from('safety_huddles').update(o).eq('id', reg.id)); else await U.db(window.sb.from('safety_huddles').insert(o));
            U.toast(reg ? 'Huddle atualizado.' : 'Safety Huddle enviado.');
            await lista();
          } catch (er) { btn.disabled = false; U.erro(er); }
        };
      };
      await lista();
    },
  });
})();
