/* Avisos Gerais — faixa da tela inicial (todos veem; gestores publicam). */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const TIPOS = ['Info', 'Importante', 'Urgente', 'Evento', 'Escala', 'Treinamento'];
  const CAMPOS = [
    { n: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS, obrig: true, semVazio: true },
    { n: 'assunto', rotulo: 'Aviso', tipo: 'textarea', obrig: true, max: 300, linhas: 3 },
    { n: 'status', rotulo: 'Situação', tipo: 'select', opcoes: [['ATIVO', 'Ativo (aparece na faixa)'], ['INATIVO', 'Inativo']], semVazio: true },
  ];
  let timer = null;

  async function listar(soAtivos) {
    let q = window.sb.from('avisos').select('*').order('data_hora', { ascending: false }).limit(soAtivos ? 12 : 200);
    if (soAtivos) q = q.eq('status', 'ATIVO');
    return U.db(q);
  }

  async function carrossel() {
    const track = document.getElementById('banner-cards'), dots = document.getElementById('carousel-dots');
    if (timer) clearInterval(timer);
    let av = [];
    try { av = await listar(true); } catch (e) { return; }
    if (!av.length) { track.innerHTML = ''; dots.innerHTML = ''; return; }
    track.innerHTML = av.map(a => `<div class="notice-card${/urg|import/i.test(a.tipo) ? ' special' : ''}"><div class="nc-tag">${esc(a.tipo)}</div><div class="nc-title">${esc(a.assunto)}</div><div class="nc-date">${U.fmtDH(a.data_hora)}</div></div>`).join('');
    dots.innerHTML = av.map((_, i) => `<button class="carousel-dot${i ? '' : ' active'}" aria-label="Aviso ${i + 1}"></button>`).join('');
    let i = 0;
    const ir = n => { i = n; track.style.transform = `translateX(-${i * 195}px)`; dots.querySelectorAll('.carousel-dot').forEach((d, k) => d.classList.toggle('active', k === i)); };
    dots.querySelectorAll('.carousel-dot').forEach((d, k) => d.onclick = () => ir(k));
    if (av.length > 1) timer = setInterval(() => ir((i + 1) % av.length), 5000);
  }

  U.registrar({
    id: 'avisos', label: 'Avisos Gerais', icone: 'fa-bell', cor: 'c-avisos',
    home: carrossel,
    async render(el) {
      const pode = a => U.can('avisos', a);
      const desenhar = async () => {
        const av = await listar(false);
        el.innerHTML =
          (pode('criar') ? '' : U.leituraAviso('Somente gestores publicam avisos.')) +
          (pode('criar') ? '<div class="barra"><button class="btn btn-primary" id="av-novo"><i class="fas fa-plus"></i> Novo aviso</button></div>' : '') +
          U.tabela([
            { t: 'Tipo', f: a => `<span class="tag ${/urg/i.test(a.tipo) ? 'vermelho' : /import/i.test(a.tipo) ? 'amarelo' : 'azul'}">${esc(a.tipo)}</span>` },
            { t: 'Aviso', f: a => esc(a.assunto) },
            { t: 'Publicado', f: a => `${U.fmtDH(a.data_hora)}<div class="ajuda">${esc(a.criado_por_nome || '')}</div>` },
            { t: 'Situação', f: a => `<span class="tag ${a.status === 'ATIVO' ? 'verde' : ''}">${a.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</span>` },
            ...(pode('editar') || pode('excluir') ? [{ t: '', f: a => `${pode('editar') ? `<button class="btn btn-ghost btn-icone" data-ed="${a.id}" title="Editar"><i class="fas fa-pen"></i></button> ` : ''}${pode('excluir') ? `<button class="btn btn-ghost btn-icone" data-ex="${a.id}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}` }] : []),
          ], av, 'Nenhum aviso publicado.');
        const novo = el.querySelector('#av-novo');
        const abrir = (reg) => U.formulario({
          titulo: reg ? 'Editar aviso' : 'Novo aviso', campos: CAMPOS, valores: reg || { tipo: 'Info', status: 'ATIVO' }, colunas: 1,
          aoSalvar: async v => {
            if (reg) await U.db(window.sb.from('avisos').update(v).eq('id', reg.id));
            else await U.db(window.sb.from('avisos').insert(v));
            U.toast('Aviso salvo.'); await desenhar(); carrossel();
          },
        });
        if (novo) novo.onclick = () => abrir(null);
        el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => abrir(av.find(a => String(a.id) === b.dataset.ed)));
        el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
          if (!await U.confirmar('Excluir este aviso?', 'Excluir', true)) return;
          try { await U.db(window.sb.from('avisos').delete().eq('id', b.dataset.ex)); U.toast('Aviso excluído.'); await desenhar(); carrossel(); } catch (e) { U.erro(e); }
        });
      };
      await desenhar();
    },
  });
})();
