/* App instalável: botão "Instalar app" no menu do usuário (Android/Chrome/Edge) e instruções para iPhone. */
(function () {
  'use strict';
  const U = window.UPA;
  let evento = null;
  const instalado = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const mostrar = ok => { const b = document.getElementById('btn-instalar'); if (b) b.style.display = ok && !instalado() ? 'flex' : 'none'; };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); evento = e; mostrar(true); });
  window.addEventListener('appinstalled', () => { evento = null; mostrar(false); });
  document.addEventListener('DOMContentLoaded', () => { if (ios()) mostrar(true); });

  U.instalar = async function () {
    if (evento) { evento.prompt(); try { await evento.userChoice; } catch (e) { /* ignora */ } evento = null; mostrar(false); return; }
    U.modal({ titulo: 'Instalar o app', largura: 420,
      corpo: ios()
        ? '<p>No iPhone/iPad (Safari):</p><ol style="margin:8px 0 0 18px;line-height:1.7"><li>Toque no botão <b>Compartilhar</b> (quadrado com seta).</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li></ol>'
        : '<p>No Chrome ou Edge, abra o menu do navegador (três pontinhos) e escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>',
      botoes: [{ rotulo: 'Ok', classe: 'btn-primary' }] });
  };
})();
