/* Treinamento — todos fazem os cursos; gestores cadastram cursos/provas e validam certificados. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const abs = p => new URL(p, location.href).href;

  function certificado(t, r) {
    U.imprimir(`<div style="border:6px double #1A6FC4;padding:30px;text-align:center">
      <div style="display:flex;justify-content:space-between;align-items:center"><img src="${abs('img/logo-upa.png')}" style="height:64px"><img src="${abs('img/logo-gnosis.jpg')}" style="height:56px"></div>
      <h1 style="color:#1158A0;margin:26px 0 6px;font-size:28px">CERTIFICADO</h1><p>Certificamos que</p>
      <h2 style="font-size:22px;margin:8px 0">${esc(r.usuario_nome)}</h2><p>matrícula ${esc(r.matricula)} · ${esc(r.funcao)}</p>
      <p style="margin:14px 0">concluiu com aproveitamento o treinamento</p><h2 style="font-size:20px;color:#1158A0">${esc(t.titulo)}</h2>
      <p>${t.carga_horaria ? 'Carga horária: ' + esc(t.carga_horaria) + ' h · ' : ''}Nota: ${r.nota}% · Concluído em ${U.fmtData(r.concluido_em)}</p>
      <p style="margin-top:40px"><span style="display:inline-block;border-top:1px solid #111;padding:4px 30px">${esc(r.validado_por_nome || '')}<br><small>Validado em ${U.fmtDH(r.validado_em)} — UPA Rocinha</small></span></p></div>`, 'Certificado');
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
