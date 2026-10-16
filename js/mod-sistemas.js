/* Sistemas — links externos (única parte que sai do site). */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const LINKS = [
    ['http://192.168.1.15:8080/vitai', '🏥', 'Vitai — Prontuário Eletrônico', 'Rede interna · 192.168.1.15', '#EFF6FF', '#BFDBFE', '#1E3A8A'],
    ['https://ser.saude.rj.gov.br/ser/login', '📋', 'SER', 'ser.saude.rj.gov.br', '#F0F9FF', '#BAE6FD', '#0369A1'],
    ['https://web2.smsrio.org/login/index.php#/', '🛏️', 'SMS — Vaga Zero', 'web2.smsrio.org', '#F5F3FF', '#DDD6FE', '#7C3AED'],
    ['https://laudos.cientificalab.com.br/laudos/#', '🔬', 'Laboratório', 'laudos.cientificalab.com.br', '#F0FDF4', '#BBF7D0', '#166534'],
    ['https://hci.rio.gov.br/auth/sign-in', '📁', 'HCI — Histórico Clínico', 'hci.rio.gov.br', '#FEF2F2', '#FECACA', '#991B1B'],
    ['https://cadastro.saude.gov.br/segcartao', '💳', 'CADSUS', 'cadastro.saude.gov.br', '#FFFBEB', '#FDE68A', '#92400E'],
  ];
  U.registrar({
    id: 'sistemas', label: 'Sistemas', icone: 'fa-desktop', cor: 'c-sistemas',
    render(el) {
      el.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px">' + LINKS.map(l => `<a href="${esc(l[0])}" target="_blank" rel="noopener noreferrer" class="ext-link-card" style="background:${l[4]};border-color:${l[5]}"><span class="el-icon">${l[1]}</span><div class="el-body"><div class="el-title" style="color:${l[6]}">${esc(l[2])}</div><div class="el-sub">${esc(l[3])} · abre em nova aba</div></div><span class="el-arrow" style="color:${l[6]}">→</span></a>`).join('') + '</div>';
    },
  });
})();
