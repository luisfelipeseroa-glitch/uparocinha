/* Treinamento — todos fazem os cursos; gestores cadastram cursos/provas e validam certificados. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const abs = p => new URL(p, location.href).href;

  /* Selo dourado: roseta serrilhada com estrela e fitas */
  function selo() {
    const pts = []; const N = 32;
    for (let i = 0; i < N * 2; i++) { const a = Math.PI * i / N, rr = i % 2 ? 44 : 50; pts.push((60 + rr * Math.cos(a)).toFixed(1) + ',' + (60 + rr * Math.sin(a)).toFixed(1)); }
    const est = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 5, rr = i % 2 ? 9.5 : 23; est.push((60 + rr * Math.cos(a)).toFixed(1) + ',' + (58 + rr * Math.sin(a)).toFixed(1)); }
    return `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" style="width:31mm;height:auto;display:block">
      <defs>
        <linearGradient id="ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A5A12"/><stop offset=".22" stop-color="#E9C95F"/><stop offset=".45" stop-color="#FFF3B8"/><stop offset=".7" stop-color="#C9972B"/><stop offset="1" stop-color="#6E500E"/></linearGradient>
        <radialGradient id="ouro2" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#FFF6C8"/><stop offset=".45" stop-color="#E2B93E"/><stop offset="1" stop-color="#8B6914"/></radialGradient>
        <linearGradient id="fita" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E4FC4"/><stop offset="1" stop-color="#0B3A8C"/></linearGradient>
      </defs>
      <polygon points="38,92 22,146 41,138 52,148 62,96" fill="url(#fita)"/><polygon points="82,92 98,146 79,138 68,148 58,96" fill="url(#fita)"/>
      <polygon points="38,92 22,146 41,138 52,148 62,96" fill="none" stroke="#C9972B" stroke-width="1.2"/><polygon points="82,92 98,146 79,138 68,148 58,96" fill="none" stroke="#C9972B" stroke-width="1.2"/>
      <polygon points="${pts.join(' ')}" fill="url(#ouro)" stroke="#7A5A12" stroke-width=".8"/>
      <circle cx="60" cy="60" r="38" fill="url(#ouro2)" stroke="#7A5A12" stroke-width="1"/>
      <circle cx="60" cy="60" r="33" fill="none" stroke="#FFF3B8" stroke-width="1.4" stroke-dasharray="1.2 2.6"/>
      <circle cx="60" cy="60" r="28.5" fill="none" stroke="#8B6914" stroke-width=".8"/>
      <polygon points="${est.join(' ')}" fill="#FFF8D6" stroke="#8B6914" stroke-width="1" stroke-linejoin="round"/>
      <path d="M33 76 Q27 58 36 42 M87 76 Q93 58 84 42" fill="none" stroke="#8B6914" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;
  }
  function cantoOrn(rot) {
    return `<svg viewBox="0 0 60 60" style="position:absolute;width:19mm;height:19mm;${rot}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="oc${rot.length}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A5A12"/><stop offset=".5" stop-color="#F0D36E"/><stop offset="1" stop-color="#8B6914"/></linearGradient></defs>
      <path d="M2 58 V2 H58" fill="none" stroke="url(#oc${rot.length})" stroke-width="2.4"/><path d="M9 58 V9 H58" fill="none" stroke="url(#oc${rot.length})" stroke-width=".9"/>
      <path d="M16 58 Q16 16 58 16" fill="none" stroke="url(#oc${rot.length})" stroke-width="1.2"/><circle cx="9" cy="9" r="3.4" fill="url(#oc${rot.length})"/><circle cx="21" cy="9" r="1.4" fill="url(#oc${rot.length})"/><circle cx="9" cy="21" r="1.4" fill="url(#oc${rot.length})"/></svg>`;
  }

  /* Certificado: A4 na horizontal, margem de 1,5 cm (área útil 267 × 180 mm) */
  function certificado(t, r) {
    const cod = 'UPA-' + String(r.id).padStart(5, '0') + '-' + String(r.treinamento_id).padStart(3, '0');
    U.imprimir(`<div style="position:relative;width:267mm;height:179mm;box-sizing:border-box;overflow:hidden;page-break-inside:avoid;break-inside:avoid;font-family:Georgia,'Times New Roman',serif;color:#0B3A8C;
        background:radial-gradient(ellipse at 50% 42%,#FFFFFF 0,#FFFDF4 55%,#FBF3DC 100%)">
      <div style="position:absolute;inset:0;border:3.2mm solid transparent;border-image:linear-gradient(135deg,#7A5A12,#E9C95F 22%,#FFF3B8 40%,#C9972B 62%,#F0D36E 80%,#6E500E) 1"></div>
      <div style="position:absolute;inset:4.6mm;border:.5mm solid #0B3A8C"></div>
      <div style="position:absolute;inset:6mm;border:.3mm solid #C9972B"></div>
      <div style="position:absolute;inset:7mm;opacity:.06;background:repeating-radial-gradient(circle at 50% 50%,#0B3A8C 0 .3mm,transparent .3mm 3mm)"></div>
      ${cantoOrn('left:7.5mm;top:7.5mm')}${cantoOrn('right:7.5mm;top:7.5mm;transform:scaleX(-1)')}${cantoOrn('left:7.5mm;bottom:7.5mm;transform:scaleY(-1)')}${cantoOrn('right:7.5mm;bottom:7.5mm;transform:scale(-1,-1)')}

      <div style="position:absolute;left:20mm;right:20mm;top:12mm;display:flex;justify-content:space-between;align-items:center">
        <img src="${abs('img/logo-upa.png')}" style="height:19mm">
        <div style="text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;letter-spacing:.35em;color:#6B4FD8;font-weight:700">UPA ROCINHA · GESTÃO INTELIGENTE</div>
        <img src="${abs('img/logo-gnosis.jpg')}" style="height:15mm;mix-blend-mode:multiply">
      </div>

      <div style="position:absolute;left:0;right:0;top:36mm;text-align:center">
        <svg viewBox="0 0 640 64" style="width:178mm;height:auto;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A5A12"/><stop offset=".22" stop-color="#D9B342"/><stop offset=".45" stop-color="#FFF0A8"/><stop offset=".68" stop-color="#C9972B"/><stop offset="1" stop-color="#7A5A12"/></linearGradient></defs>
          <text x="320" y="52" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="60" letter-spacing="14" fill="url(#tt)" stroke="#8B6914" stroke-width=".6">CERTIFICADO</text></svg>
        <div style="display:flex;align-items:center;justify-content:center;gap:4mm;margin-top:2.4mm">
          <span style="width:38mm;height:.5mm;background:linear-gradient(90deg,transparent,#C9972B)"></span>
          <span style="font-size:10.5pt;letter-spacing:.3em;color:#8B6914;font-family:Arial,Helvetica,sans-serif;font-weight:700">DE CONCLUSÃO DE TREINAMENTO</span>
          <span style="width:38mm;height:.5mm;background:linear-gradient(270deg,transparent,#C9972B)"></span>
        </div>
        <p style="margin:9mm 0 1.5mm;font-size:12.5pt;font-style:italic;color:#4A5B7A">Certificamos que</p>
        <div style="font-size:31pt;font-style:italic;font-weight:700;line-height:1.1;padding:0 22mm">${esc(r.usuario_nome)}</div>
        <div style="margin:1.6mm auto 0;width:150mm;height:.6mm;background:linear-gradient(90deg,transparent,#C9972B 20%,#F0D36E 50%,#C9972B 80%,transparent)"></div>
        <p style="margin:1.8mm 0 0;font-size:10.5pt;font-family:Arial,Helvetica,sans-serif;color:#4A5B7A">Matrícula ${esc(r.matricula)} · ${esc(r.funcao)}</p>
        <p style="margin:9mm 0 1.8mm;font-size:12.5pt;font-style:italic;color:#4A5B7A">concluiu com aproveitamento o treinamento</p>
        <div style="font-size:21pt;font-weight:700;line-height:1.15;padding:0 26mm">${esc(t.titulo)}</div>
        <p style="margin:4.2mm 0 0;font-size:11pt;font-family:Arial,Helvetica,sans-serif;color:#1F3A5F">${t.carga_horaria ? 'Carga horária: <b>' + esc(t.carga_horaria) + ' h</b> &nbsp;·&nbsp; ' : ''}Aproveitamento: <b>${r.nota}%</b> &nbsp;·&nbsp; Concluído em <b>${U.fmtData(r.concluido_em)}</b></p>
      </div>

      <div style="position:absolute;left:23mm;right:23mm;bottom:11mm;display:flex;justify-content:space-between;align-items:flex-end;font-family:Arial,Helvetica,sans-serif">
        <div style="width:78mm;text-align:center;font-size:9pt;color:#1F3A5F">
          <div style="border-top:.4mm solid #0B3A8C;padding-top:1.5mm"><b style="font-size:10pt">${esc(r.validado_por_nome || 'Coordenação')}</b><br>Validado em ${U.fmtDH(r.validado_em)}<br><span style="color:#6B4FD8">Coordenação · UPA Rocinha</span></div>
        </div>
        <div style="margin-bottom:-2mm">${selo()}</div>
        <div style="width:78mm;text-align:center;font-size:9pt;color:#1F3A5F">
          <div style="border-top:.4mm solid #0B3A8C;padding-top:1.5mm"><b style="font-size:10pt">Código de autenticidade</b><br><span style="font-family:'Courier New',monospace;font-size:10.5pt;letter-spacing:.06em">${cod}</span><br><span style="color:#6B4FD8">Estrada da Gávea, 520 · Rocinha</span></div>
        </div>
      </div>
    </div>`, 'Certificado', { paisagem: true, margem: '15mm' });
  }

  async function prova(t, depois) {
    const q = await U.db(window.sb.rpc('treinamento_prova', { p_id: t.id }));
    const corpo = q.length
      ? q.map((x, i) => `<div style="margin-bottom:14px"><b>${i + 1}. ${esc(x.enunciado)}</b>${(x.opcoes || []).map((o, k) => `<label style="display:flex;gap:8px;margin:5px 0;cursor:pointer"><input type="radio" name="q${x.ordem}" value="${k}"> ${esc(o)}</label>`).join('')}</div>`).join('')
      : '<p>Este treinamento não tem prova. Ao confirmar, sua participação será registrada.</p>';
    U.modal({ titulo: `Prova — ${t.titulo}`, largura: 640, corpo, botoes: [{ rotulo: 'Cancelar' }, { rotulo: q.length ? 'Enviar respostas' : 'Confirmar participação', classe: 'btn-primary', acao: async box => {
      const resp = {};
      for (const x of q) { const s = box.querySelector(`input[name=q${x.ordem}]:checked`); if (!s) { U.toast(`Responda a questão ${x.ordem}.`, 'erro'); return false; } resp[x.ordem] = Number(s.value); }
      const r = await U.db(window.sb.rpc('treinamento_responder', { p_id: t.id, p_respostas: resp }));
      U.modal({ titulo: r.aprovado ? 'Aprovado!' : 'Não atingiu a nota', largura: 400, corpo: `<p style="font-size:15px">Nota: <b>${r.nota}%</b>${r.total ? ` (${r.acertos}/${r.total})` : ''}. Mínimo: ${t.nota_minima}%.</p><p class="ajuda">${r.aprovado ? 'O certificado fica disponível depois da validação do gestor.' : 'Revise o material e tente novamente.'}</p>`, botoes: [{ rotulo: 'Ok' }] });
      depois();
    } }] });
  }

  async function meus(el) {
    const [cursos, regs] = await Promise.all([
      U.db(window.sb.from('treinamentos').select('*').eq('ativo', true).order('titulo')),
      U.db(window.sb.from('treinamento_registros').select('*').eq('usuario_id', U.ctx.id).order('concluido_em', { ascending: false })),
    ]);
    const meus = cursos.filter(c => !c.funcoes.length || c.funcoes.includes(U.ctx.funcao));
    el.innerHTML = meus.length ? meus.map(c => {
      const mr = regs.filter(r => r.treinamento_id === c.id), ok = mr.find(r => r.aprovado), ult = mr[0];
      return `<div class="cx"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${esc(c.titulo)}</b> ${c.obrigatorio ? '<span class="tag vermelho">Obrigatório</span>' : ''}
        <div class="ajuda">${c.carga_horaria ? esc(c.carga_horaria) + ' h · ' : ''}nota mínima ${c.nota_minima}%</div></div>
        <div>${ok ? `<span class="tag verde">Aprovado (${ok.nota}%)</span> ${ok.validado_em ? '<span class="tag azul">Validado</span>' : '<span class="tag amarelo">Aguardando validação</span>'}` : ult ? `<span class="tag vermelho">Última nota ${ult.nota}%</span>` : '<span class="tag">Não iniciado</span>'}</div></div>
        ${c.descricao ? `<p style="margin:8px 0;font-size:13px">${esc(c.descricao)}</p>` : ''}
        <div class="barra" style="margin:8px 0 0">${c.material_path ? `<button class="btn btn-ghost btn-sm" data-mat="${c.material_path}"><i class="fas fa-book-open"></i> Abrir material</button>` : ''}${c.material_url ? `<button class="btn btn-ghost btn-sm" data-url="${esc(c.material_url)}"><i class="fas fa-link"></i> Material</button>` : ''}
        ${ok ? '' : `<button class="btn btn-primary btn-sm" data-pv="${c.id}"><i class="fas fa-pen-to-square"></i> Fazer prova</button>`}
        ${ok && ok.validado_em ? `<button class="btn btn-green btn-sm" data-cert="${ok.id}" data-c="${c.id}"><i class="fas fa-award"></i> Certificado</button>` : ''}</div></div>`;
    }).join('') : '<div class="vazio">Nenhum treinamento disponível para a sua função.</div>';
    el.querySelectorAll('[data-mat]').forEach(b => b.onclick = () => U.abrirArquivo('treinamento', b.dataset.mat));
    el.querySelectorAll('[data-url]').forEach(b => b.onclick = () => window.open(b.dataset.url, '_blank', 'noopener'));
    el.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => prova(cursos.find(c => String(c.id) === b.dataset.pv), () => meus_(el)));
    el.querySelectorAll('[data-cert]').forEach(b => b.onclick = () => certificado(cursos.find(c => String(c.id) === b.dataset.c), regs.find(r => String(r.id) === b.dataset.cert)));
  }
  const meus_ = el => meus(el);

  /* ---- gestores ---- */
  function formCurso(reg, qs, depois) {
    const FUNCS = ['Médico', 'Pediatra', 'Enfermeiro', 'Técnico de Enfermagem', 'Farmacêutico', 'Técnico de Farmácia', 'Radiologista', 'Técnico de Radiologia', 'Técnico em Laboratório', 'Assistente Social', 'Recepcionista', 'Assistente Administrativo', 'Almoxarife', 'NIR', 'TI', 'ASG', 'Vigilante', 'Maqueiro'];
    const CAMPOS = [
      { n: 'titulo', rotulo: 'Título', obrig: true, max: 200, col: '1 / -1' }, { n: 'descricao', rotulo: 'Descrição', tipo: 'textarea', max: 600, col: '1 / -1' },
      { n: 'carga_horaria', rotulo: 'Carga horária (h)', tipo: 'number', min: 0, step: '0.5' }, { n: 'nota_minima', rotulo: 'Nota mínima (%)', tipo: 'number', min: 0, step: '1', obrig: true },
      { n: 'material_url', rotulo: 'Link do material (opcional)', tipo: 'url', col: '1 / -1' },
      { n: 'funcoes', rotulo: 'Funções (nenhuma marcada = todas)', tipo: 'checks', opcoes: FUNCS, col: '1 / -1' },
      { n: 'obrigatorio', rotulo: 'Treinamento obrigatório', tipo: 'checkbox' }, { n: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' },
    ];
    const qHtml = (q, i) => `<div class="cx qbox"><label class="fl">Questão ${i + 1}</label><input type="text" class="q-en" value="${esc(q.enunciado || '')}" placeholder="Enunciado">${[0, 1, 2, 3].map(k => `<div style="display:flex;gap:6px;align-items:center;margin-top:5px"><input type="radio" name="qc${i}" value="${k}"${(q.correta ?? 0) === k ? ' checked' : ''} title="Resposta correta"><input type="text" class="q-op" value="${esc((q.opcoes || [])[k] || '')}" placeholder="Alternativa ${k + 1}"></div>`).join('')}</div>`;
    const m = U.formulario({ titulo: reg ? 'Editar treinamento' : 'Novo treinamento', campos: CAMPOS, valores: reg || { nota_minima: 70, ativo: true, funcoes: [] }, largura: 760,
      depois: `<label class="fl">Arquivo do material (PDF/vídeo — até 50 MB)</label><input type="file" id="tr-arq"><label class="fl">Prova (marque a alternativa correta)</label><div id="tr-qs">${qs.map(qHtml).join('')}</div><button type="button" class="btn btn-ghost btn-sm" id="tr-addq"><i class="fas fa-plus"></i> Adicionar questão</button>`,
      aoSalvar: async (v, box) => {
        const quest = Array.from(box.querySelectorAll('.qbox')).map((b, i) => ({ enunciado: b.querySelector('.q-en').value.trim(), opcoes: Array.from(b.querySelectorAll('.q-op')).map(x => x.value.trim()).filter(Boolean), correta: Number((b.querySelector('input[type=radio]:checked') || {}).value ?? 0) })).filter(q => q.enunciado);
        for (const q of quest) { if (q.opcoes.length < 2) throw new Error('Cada questão precisa de ao menos 2 alternativas.'); if (q.correta >= q.opcoes.length) throw new Error('A alternativa correta está vazia.'); }
        v.material_url = v.material_url || null; v.descricao = v.descricao || null;
        const arq = box.querySelector('#tr-arq').files[0];
        if (arq) { if (arq.size > 50 * 1024 * 1024) throw new Error('Arquivo maior que 50 MB.'); v.material_path = await U.enviarArquivo('treinamento', `${Date.now()}_${U.nomeSeguro(arq.name)}`, arq); }
        let id = reg && reg.id;
        if (reg) await U.db(window.sb.from('treinamentos').update(v).eq('id', id));
        else id = (await U.db(window.sb.from('treinamentos').insert(v).select('id').single())).id;
        await U.db(window.sb.from('treinamento_questoes').delete().eq('treinamento_id', id));
        if (quest.length) await U.db(window.sb.from('treinamento_questoes').insert(quest.map((q, i) => ({ ...q, treinamento_id: id, ordem: i + 1 }))));
        U.toast('Treinamento salvo.'); depois();
      } });
    m.el.querySelector('#tr-addq').onclick = () => { const box = m.el.querySelector('#tr-qs'); const i = box.querySelectorAll('.qbox').length; box.insertAdjacentHTML('beforeend', qHtml({}, i)); };
    if (!qs.length) m.el.querySelector('#tr-addq').click();
  }

  async function gerenciar(el) {
    const cursos = await U.db(window.sb.from('treinamentos').select('*').order('titulo'));
    el.innerHTML = `<div class="barra"><button class="btn btn-primary" id="tr-novo"><i class="fas fa-plus"></i> Novo treinamento</button></div>` + U.tabela([
      { t: 'Treinamento', f: c => `<b>${esc(c.titulo)}</b>` }, { t: 'Funções', f: c => c.funcoes.length ? esc(c.funcoes.join(', ')) : 'Todas' },
      { t: 'Situação', f: c => `<span class="tag ${c.ativo ? 'verde' : ''}">${c.ativo ? 'Ativo' : 'Inativo'}</span>` },
      { t: '', f: c => `<button class="btn btn-ghost btn-icone" data-ed="${c.id}"><i class="fas fa-pen"></i></button> ${U.can('treinamento', 'excluir') ? `<button class="btn btn-ghost btn-icone" data-ex="${c.id}"><i class="fas fa-trash"></i></button>` : ''}` },
    ], cursos, 'Nenhum treinamento cadastrado.');
    const recarregar = () => gerenciar(el);
    el.querySelector('#tr-novo').onclick = () => formCurso(null, [], recarregar);
    el.querySelectorAll('[data-ed]').forEach(b => b.onclick = async () => {
      const c = cursos.find(x => String(x.id) === b.dataset.ed);
      const qs = await U.db(window.sb.from('treinamento_questoes').select('*').eq('treinamento_id', c.id).order('ordem'));
      formCurso(c, qs, recarregar);
    });
    el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
      if (!await U.confirmar('Excluir este treinamento e todos os registros dele?', 'Excluir', true)) return;
      try { await U.db(window.sb.from('treinamentos').delete().eq('id', b.dataset.ex)); recarregar(); } catch (e) { U.erro(e); }
    });
  }

  async function registros(el) {
    const [regs, cursos] = await Promise.all([U.db(window.sb.from('treinamento_registros').select('*').order('concluido_em', { ascending: false }).limit(500)), U.db(window.sb.from('treinamentos').select('id,titulo'))]);
    const nome = id => (cursos.find(c => c.id === id) || {}).titulo || '—';
    el.innerHTML = U.tabela([
      { t: 'Profissional', f: r => `${esc(r.usuario_nome)}<div class="ajuda">${esc(r.funcao)} · ${esc(r.matricula)}</div>` }, { t: 'Treinamento', f: r => esc(nome(r.treinamento_id)) },
      { t: 'Nota', f: r => `<span class="tag ${r.aprovado ? 'verde' : 'vermelho'}">${r.nota}%</span> <span class="ajuda">tentativa ${r.tentativa}</span>` }, { t: 'Em', f: r => U.fmtDH(r.concluido_em) },
      { t: 'Certificado', f: r => (!r.aprovado ? '—' : r.validado_em ? `Validado por ${esc(r.validado_por_nome)}` : `<button class="btn btn-green btn-sm" data-vl="${r.id}">Validar</button>`) },
    ], regs, 'Nenhum registro ainda.');
    el.querySelectorAll('[data-vl]').forEach(b => b.onclick = async () => { try { await U.db(window.sb.rpc('treinamento_validar', { p_registro: Number(b.dataset.vl) })); U.toast('Certificado validado.'); registros(el); } catch (e) { U.erro(e); } });
  }

  U.registrar({
    id: 'treinamento', label: 'Treinamento', icone: 'fa-graduation-cap', cor: 'c-treino',
    render(el) {
      const abas = [{ id: 'meus', rotulo: 'Meus treinamentos', render: meus }];
      if (U.can('treinamento', 'editar')) abas.push({ id: 'ger', rotulo: 'Gerenciar cursos', render: gerenciar }, { id: 'reg', rotulo: 'Registros e certificados', render: registros });
      U.abas(el, abas);
    },
  });
})();
