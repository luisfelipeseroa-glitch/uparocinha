/* Avisos de pendência na Home: faixa com o que precisa da sua atenção + bolinha no botão do módulo.
   Cada módulo informa a sua contagem com UPA.pendencia(...); aqui só desenhamos. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const itens = {};

  U.selo = (mod, n) => {
    U.qsa(`.module-btn[data-mod="${mod}"], .nav-item[data-mod="${mod}"]`).forEach(el => {
      const velho = el.querySelector('.selo'); if (velho) velho.remove();
      if (n > 0) { const s = document.createElement('span'); s.className = 'selo'; s.textContent = n > 99 ? '99+' : String(n); el.appendChild(s); }
    });
  };

  function desenhar() {
    const box = document.getElementById('home-pendencias'); if (!box) return;
    const lista = Object.values(itens).filter(Boolean);
    const porMod = {};
    lista.forEach(i => { porMod[i.mod] = (porMod[i.mod] || 0) + i.n; });
    new Set(Object.values(itens).filter(Boolean).map(i => i.mod).concat(Object.keys(porMod))).forEach(m => U.selo(m, porMod[m] || 0));
    box.innerHTML = lista.length
      ? `<div class="pend-titulo"><i class="fas fa-bell"></i> Precisa da sua atenção</div>` + lista.map(i => `<button type="button" class="pend" data-mod="${esc(i.mod)}" data-aba="${esc(i.aba || '')}"><span class="pend-n">${i.n}</span><span class="pend-t">${esc(i.texto)}</span><span class="pend-go">Abrir <i class="fas fa-chevron-right"></i></span></button>`).join('')
      : '';
    box.style.display = lista.length ? 'block' : 'none';
    box.querySelectorAll('.pend').forEach(b => b.onclick = () => U.irAba(b.dataset.mod, b.dataset.aba));
  }

  /* chave: id da pendência; n: quantidade (0 apaga); texto: frase pronta */
  U.pendencia = (chave, mod, aba, n, texto) => {
    const antes = itens[chave];
    itens[chave] = n > 0 ? { mod, aba, n, texto } : null;
    if (!n && antes) U.selo(mod, 0);
    desenhar();
  };

  /* abre o módulo e já clica na aba */
  U.irAba = (mod, aba) => {
    U.go(mod);
    if (!aba) return;
    let t = 0;
    const iv = setInterval(() => {
      const b = document.querySelector(`#module-host [data-aba="${aba}"]`);
      if (b) { clearInterval(iv); b.click(); } else if (++t > 30) clearInterval(iv);
    }, 100);
  };

  /* roda fn agora e a cada minuto (só enquanto a pessoa está logada) */
  U.vigiar = fn => { const rodar = async () => { if (!U.ctx) return; try { await fn(); } catch (e) { /* silencioso */ } }; rodar(); return setInterval(rodar, 60000); };
})();
