/* =====================================================================
   CORE — login, permissões, menu, rotas e utilitários de tela.
   Tudo que é regra de acesso vem do banco (função meu_contexto()):
   o menu só mostra o que a função da pessoa pode ver, e o banco (RLS)
   recusa o resto mesmo que alguém mexa no navegador.
   ===================================================================== */
(function () {
  'use strict';

  const CFG = window.UPA_CONFIG;
  const TZ = 'America/Sao_Paulo';

  /* ---------------- estado ---------------- */
  const UPA = {
    ctx: null,            // { id, matricula, nome, funcao, grupo, permissoes:Set }
    modulos: [],          // registro de módulos
    atual: null,
    _idleTimer: null,
    _ultimaAtividade: Date.now(),
  };
  window.UPA = UPA;

  /* ---------------- armazenamento da sessão ----------------
     sessionStorage: fechar a aba encerra o acesso (PCs compartilhados). */
  const memoria = {};
  const armazem = {
    getItem(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return memoria[k] ?? null; } },
    setItem(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { memoria[k] = v; } },
    removeItem(k) { try { window.sessionStorage.removeItem(k); } catch (e) { delete memoria[k]; } },
  };

  function criarCliente() {
    const lib = window.supabase;
    if (!lib || !lib.createClient) throw new Error('Biblioteca do Supabase não carregou.');
    return lib.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { storage: armazem, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }

  /* ---------------- utilitários ---------------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  UPA.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

  UPA.qs = (sel, el) => (el || document).querySelector(sel);
  UPA.qsa = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  function parseData(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [a, m, d] = v.split('-').map(Number); return new Date(a, m - 1, d, 12); }
    return new Date(v);
  }
  UPA.fmtData = v => { const d = parseData(v); return d && !isNaN(d) ? d.toLocaleDateString('pt-BR', { timeZone: /^\d{4}-\d{2}-\d{2}$/.test(v) ? undefined : TZ }) : '—'; };
  UPA.fmtHora = v => { const d = parseData(v); return d && !isNaN(d) ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—'; };
  UPA.fmtDH = v => { const d = parseData(v); return d && !isNaN(d) ? `${UPA.fmtData(v)} às ${UPA.fmtHora(v)}` : '—'; };
  UPA.hojeISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ });   // AAAA-MM-DD
  UPA.num = v => { const n = Number(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };

  /* ---------------- permissões ---------------- */
  UPA.can = (modulo, acao) => !!(UPA.ctx && UPA.ctx.permissoes.has(modulo + ':' + (acao || 'ver')));
  UPA.ehGestor = () => !!UPA.ctx && UPA.ctx.grupo === 'gestor';

  /* Converte a resposta {data,error} do Supabase em valor ou exceção legível. */
  UPA.db = async function (promessa) {
    const r = await promessa;
    if (r && r.error) {
      const e = r.error;
      const msg = String(e.message || e);
      if (/row-level security|permission denied|not allowed/i.test(msg) || e.code === '42501')
        throw new Error('Você não tem permissão para esta ação.');
      if (e.code === '23505') throw new Error('Já existe um registro igual a este.');
      throw new Error(msg);
    }
    return r ? r.data : null;
  };

  /* ---------------- interface: avisos, janelas ---------------- */
  UPA.toast = function (msg, tipo) {
    let box = document.getElementById('upa-toasts');
    if (!box) { box = document.createElement('div'); box.id = 'upa-toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'upa-toast ' + (tipo || 'ok');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), tipo === 'erro' ? 6000 : 3200);
  };
  UPA.erro = e => { console.error(e); UPA.toast((e && e.message) || String(e), 'erro'); };

  /* modal({titulo, corpo (html), botoes:[{rotulo, classe, acao}], largura, fechavel})
     acao(el, fechar) pode retornar false para manter aberto. Retorna {el, fechar}. */
  UPA.modal = function (op) {
    const fundo = document.createElement('div');
    fundo.className = 'upa-modal-fundo';
    const largura = op.largura || 520;
    fundo.innerHTML =
      `<div class="upa-modal" role="dialog" aria-modal="true" style="max-width:${largura}px">
         <div class="upa-modal-topo"><h3>${UPA.esc(op.titulo || '')}</h3>
           ${op.fechavel === false ? '' : '<button type="button" class="upa-x" aria-label="Fechar">&times;</button>'}</div>
         <div class="upa-modal-corpo">${op.corpo || ''}</div>
         <div class="upa-modal-pe"></div></div>`;
    document.body.appendChild(fundo);
    const fechar = () => fundo.remove();
    const pe = fundo.querySelector('.upa-modal-pe');
    (op.botoes || []).forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ' + (b.classe || 'btn-ghost');
      btn.textContent = b.rotulo;
      btn.onclick = async () => {
        if (!b.acao) { fechar(); return; }
        btn.disabled = true;
        try { const r = await b.acao(fundo, fechar); if (r !== false) fechar(); }
        catch (e) { UPA.erro(e); }
        finally { btn.disabled = false; }
      };
      pe.appendChild(btn);
    });
    const x = fundo.querySelector('.upa-x');
    if (x) x.onclick = fechar;
    if (op.fechavel !== false) fundo.addEventListener('mousedown', e => { if (e.target === fundo) fechar(); });
    const primeiro = fundo.querySelector('input,select,textarea');
    if (primeiro) setTimeout(() => primeiro.focus(), 30);
    return { el: fundo, fechar };
  };

  UPA.confirmar = (msg, rotulo, perigo) => new Promise(res => {
    let feito = false;
    const fim = v => { if (!feito) { feito = true; res(v); } };
    const m = UPA.modal({
      titulo: 'Confirmação', largura: 420, corpo: `<p>${UPA.esc(msg)}</p>`,
      botoes: [
        { rotulo: 'Cancelar', acao: () => { fim(false); } },
        { rotulo: rotulo || 'Confirmar', classe: perigo ? 'btn-danger' : 'btn-primary', acao: () => { fim(true); } },
      ],
    });
    m.el.querySelector('.upa-x').addEventListener('click', () => fim(false));
  });

  /* Janela que EXIGE um motivo escrito (mín. 5 caracteres). Resolve com o texto ou null. */
  UPA.pedirMotivo = (titulo, aviso) => new Promise(res => {
    let feito = false;
    const fim = v => { if (!feito) { feito = true; res(v); } };
    const m = UPA.modal({
      titulo, largura: 460,
      corpo: `${aviso ? `<p style="margin-bottom:10px">${UPA.esc(aviso)}</p>` : ''}
              <label class="fl">Motivo (obrigatório)</label>
              <textarea id="upa-motivo" rows="4" maxlength="500" placeholder="Explique por que esta alteração está sendo feita..."></textarea>
              <div class="ajuda" id="upa-motivo-erro" style="color:#B91C1C;display:none">Escreva o motivo (mínimo 5 letras).</div>`,
      botoes: [
        { rotulo: 'Cancelar', acao: () => { fim(null); } },
        { rotulo: 'Confirmar', classe: 'btn-primary', acao: (el) => {
            const t = el.querySelector('#upa-motivo').value.trim();
            if (t.length < 5) { el.querySelector('#upa-motivo-erro').style.display = 'block'; return false; }
            fim(t);
          } },
      ],
    });
    m.el.querySelector('.upa-x').addEventListener('click', () => fim(null));
  });

  /* ---------------- assinatura (canvas) ---------------- */
  UPA.assinatura = function (canvas) {
    const g = canvas.getContext && canvas.getContext('2d');
    let desenhando = false, tocou = false;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (canvas.width / (r.width || 1)), (e.clientY - r.top) * (canvas.height / (r.height || 1))]; };
    if (g) {
      g.lineWidth = 2; g.lineCap = 'round'; g.strokeStyle = '#111';
      canvas.style.touchAction = 'none';
      canvas.addEventListener('pointerdown', e => { desenhando = true; tocou = true; const [x, y] = pos(e); g.beginPath(); g.moveTo(x, y); e.preventDefault(); });
      canvas.addEventListener('pointermove', e => { if (!desenhando) return; const [x, y] = pos(e); g.lineTo(x, y); g.stroke(); e.preventDefault(); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { desenhando = false; }));
    }
    return {
      limpar() { if (g) g.clearRect(0, 0, canvas.width, canvas.height); tocou = false; },
      vazio: () => !tocou,
      dataUrl: () => (tocou ? canvas.toDataURL('image/png') : ''),
    };
  };

  /* ---------------- arquivos (buckets privados) ---------------- */
  UPA.nomeSeguro = n => String(n || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);
  UPA.enviarArquivo = async function (bucket, caminho, arquivo) {
    const r = await window.sb.storage.from(bucket).upload(caminho, arquivo, { upsert: false, contentType: arquivo.type || undefined });
    if (r.error) throw new Error(/row-level|policy/i.test(r.error.message) ? 'Você não tem permissão para enviar este arquivo.' : r.error.message);
    return caminho;
  };
  UPA.urlAssinada = async function (bucket, caminho, seg) {
    const r = await window.sb.storage.from(bucket).createSignedUrl(caminho, seg || 300);
    if (r.error) throw new Error('Não foi possível abrir o arquivo.');
    return r.data.signedUrl;
  };
  UPA.abrirArquivo = async function (bucket, caminho) {
    try { window.open(await UPA.urlAssinada(bucket, caminho), '_blank', 'noopener'); } catch (e) { UPA.erro(e); }
  };
  UPA.lerArquivoDataUrl = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Falha ao ler o arquivo.')); r.readAsDataURL(f); });

  /* ---------------- impressão (documento em tela própria) ---------------- */
  UPA.imprimir = function (html, titulo) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open();
    d.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${UPA.esc(titulo || 'Documento')}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:18mm;font-size:12px}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:5px 7px;text-align:left;vertical-align:top}
      h1,h2,h3{margin:0 0 6px}.sub{color:#555}.assin{display:inline-block;width:30%;text-align:center;margin-top:30px;font-size:11px}
      .assin img{max-height:60px;display:block;margin:0 auto 2px}.linha{border-top:1px solid #111;padding-top:3px}
      @media print{@page{margin:12mm}}</style></head><body>${html}</body></html>`);
    d.close();
    const imgs = Array.from(d.images || []);
    const prontas = Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))));
    Promise.race([prontas, new Promise(r => setTimeout(r, 2500))]).then(() => {
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* ambiente sem impressão */ }
      setTimeout(() => f.remove(), 60000);
    });
  };

  /* ---------------- módulos e rotas ---------------- */
  /* UPA.registrar({ id, label, icone, cor, ver (módulo da matriz; padrão = id),
                     render(el), home?() , grade:false (não aparece na grade) }) */
  UPA.registrar = function (m) {
    if (!m.id || typeof m.render !== 'function') throw new Error('Módulo inválido: ' + m.id);
    if (UPA.modulos.some(x => x.id === m.id)) throw new Error('Módulo duplicado: ' + m.id);
    m.ver = m.ver || m.id;
    UPA.modulos.push(m);
  };
  UPA.visiveis = () => UPA.modulos
    .filter(m => UPA.can(m.ver, 'ver'))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  function montarMenu() {
    const nav = document.getElementById('sidebar-nav');
    const grade = document.getElementById('modules-grid');
    nav.innerHTML = ''; grade.innerHTML = '';
    const casa = document.createElement('div');
    casa.className = 'nav-item active'; casa.dataset.mod = '';
    casa.innerHTML = '<i class="fas fa-house"></i><span class="nav-label">Home</span>';
    casa.onclick = () => UPA.go('');
    nav.appendChild(casa);
    UPA.visiveis().forEach(m => {
      const it = document.createElement('div');
      it.className = 'nav-item'; it.dataset.mod = m.id;
      it.innerHTML = `<i class="fas ${m.icone}"></i><span class="nav-label">${UPA.esc(m.label)}</span>`;
      it.onclick = () => UPA.go(m.id);
      nav.appendChild(it);
      const b = document.createElement('button');
      b.className = 'module-btn'; b.dataset.mod = m.id;
      b.innerHTML = `<div class="mb-icon ${m.cor || 'c-home'}"><i class="fas ${m.icone}"></i></div><span class="mb-label">${UPA.esc(m.label)}</span>`;
      b.onclick = () => UPA.go(m.id);
      grade.appendChild(b);
    });
  }

  UPA.go = function (id) {
    const alvo = id ? '#/' + id : '#/';
    if (location.hash === alvo) rotear(); else location.hash = alvo;
  };
  window.goHome = () => UPA.go('');

  async function rotear() {
    if (!UPA.ctx) return;
    const id = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    const home = document.getElementById('home-view');
    const host = document.getElementById('module-host');
    UPA.qsa('.nav-item').forEach(el => el.classList.toggle('active', (el.dataset.mod || '') === id));
    window.scrollTo(0, 0);
    if (!id) { UPA.atual = null; host.innerHTML = ''; host.style.display = 'none'; home.style.display = 'block'; return; }
    const m = UPA.modulos.find(x => x.id === id);
    if (!m || !UPA.can(m.ver, 'ver')) {
      if (m) UPA.toast('Você não tem acesso a este módulo.', 'erro');
      UPA.go(''); return;
    }
    UPA.atual = m;
    home.style.display = 'none'; host.style.display = 'block';
    host.innerHTML =
      `<div class="module-view active"><div class="mv-header">
         <button class="mv-back" onclick="goHome()" aria-label="Voltar"><i class="fas fa-chevron-left"></i></button>
         <span class="mv-icone ${m.cor || ''}"><i class="fas ${m.icone}"></i></span>
         <div class="mv-title">${UPA.esc(m.label)}</div></div>
         <div id="mod-body"><div class="spinner"><i class="fas fa-circle-notch spin"></i> Carregando...</div></div></div>`;
    const corpo = document.getElementById('mod-body');
    try { await m.render(corpo); }
    catch (e) { console.error(e); corpo.innerHTML = `<div class="empty-state"><i class="fas fa-triangle-exclamation"></i>${UPA.esc(e.message || 'Erro ao carregar')}</div>`; }
  }

  /* ---------------- login ---------------- */
  const emailDe = mat => String(mat).trim().toLowerCase().replace(/\s+/g, '') + '@' + CFG.EMAIL_DOMINIO;

  function msgLogin(texto) {
    const el = document.getElementById('login-error');
    el.textContent = texto || ''; el.style.display = texto ? 'block' : 'none';
  }

  UPA.entrar = async function () {
    const mat = document.getElementById('inp-matricula').value.trim();
    const senha = document.getElementById('inp-senha').value;
    const btn = document.querySelector('.btn-login');
    if (!mat || !senha) { msgLogin('Informe matrícula e senha.'); return; }
    msgLogin('');
    btn.disabled = true; btn.textContent = 'Verificando...';
    try {
      const r = await window.sb.auth.signInWithPassword({ email: emailDe(mat), password: senha });
      if (r.error) {
        msgLogin(/network|fetch/i.test(r.error.message) ? 'Sem conexão com o servidor. Tente novamente.' : 'Matrícula ou senha incorretos.');
        return;
      }
      document.getElementById('inp-senha').value = '';
      await iniciarSessao();
      try { window.sb.rpc('registrar_acesso', { p_acao: 'login' }); } catch (e) { /* segue */ }
    } catch (e) {
      msgLogin('Não foi possível entrar agora. Tente novamente.');
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-right-to-bracket" style="margin-right:8px"></i>Entrar';
    }
  };

  async function carregarContexto() {
    const r = await window.sb.rpc('meu_contexto');
    if (r.error || !r.data) return null;
    const c = r.data;
    c.permissoes = new Set(c.permissoes || []);
    return c;
  }

  async function iniciarSessao() {
    const c = await carregarContexto();
    if (!c) {
      await window.sb.auth.signOut();
      msgLogin('Seu cadastro não está ativo. Procure a coordenação.');
      mostrarLogin(); return;
    }
    UPA.ctx = c;
    window.currentUser = { matricula: c.matricula, nome: c.nome, funcao: c.funcao };
    if (c.trocar_senha) { mostrarApp(false); await UPA.trocarSenha(true); }
    mostrarApp(true);
  }

  function mostrarLogin() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  }

  function mostrarApp(montar) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    if (montar) iniciarApp();
  }

  UPA.trocarSenha = function (obrigatoria) {
    return new Promise(res => {
      UPA.modal({
        titulo: obrigatoria ? 'Crie sua senha pessoal' : 'Alterar senha',
        fechavel: !obrigatoria, largura: 420,
        corpo: `${obrigatoria ? '<p style="margin-bottom:10px">Este é seu primeiro acesso. Escolha uma senha só sua para continuar.</p>' : ''}
                <label class="fl">Nova senha (mín. 8 caracteres)</label><input type="password" id="ns1" autocomplete="new-password">
                <label class="fl">Repita a nova senha</label><input type="password" id="ns2" autocomplete="new-password">`,
        botoes: [
          ...(obrigatoria ? [{ rotulo: 'Sair', acao: async () => { await UPA.sair(); return false; } }] : [{ rotulo: 'Cancelar', acao: () => { res(false); } }]),
          { rotulo: 'Salvar senha', classe: 'btn-primary', acao: async (el) => {
              const a = el.querySelector('#ns1').value, b = el.querySelector('#ns2').value;
              if (a.length < 8) { UPA.toast('A senha precisa ter pelo menos 8 caracteres.', 'erro'); return false; }
              if (a !== b) { UPA.toast('As senhas não conferem.', 'erro'); return false; }
              if (/^\d+$/.test(a) && a === UPA.ctx.matricula) { UPA.toast('Não use a matrícula como senha.', 'erro'); return false; }
              const r = await window.sb.auth.updateUser({ password: a });
              if (r.error) { UPA.toast(/same|different/i.test(r.error.message) ? 'Escolha uma senha diferente da atual.' : 'Não foi possível salvar a senha.', 'erro'); return false; }
              await window.sb.rpc('marcar_senha_trocada');
              try { window.sb.rpc('registrar_acesso', { p_acao: 'senha_trocada' }); } catch (e) { /* segue */ }
              UPA.ctx.trocar_senha = false;
              UPA.toast('Senha alterada com sucesso.');
              res(true);
            } },
        ],
      });
    });
  };

  UPA.sair = async function (motivo) {
    pararOciosidade();
    try { await window.sb.auth.signOut(); } catch (e) { /* segue */ }
    try { window.sessionStorage.clear(); } catch (e) { /* segue */ }
    if (motivo) { try { window.sessionStorage.setItem('upa_aviso', motivo); } catch (e) { /* segue */ } }
    location.hash = '';
    location.reload();
  };
  window.doLogout = () => UPA.sair();
  window.toggleDropdown = () => document.getElementById('user-dropdown').classList.toggle('open');
  window.toggleSidebar = () => {
    const ab = document.getElementById('sidebar').classList.toggle('expanded');
    document.getElementById('main').classList.toggle('sidebar-open', ab);
  };

  /* ---------------- ociosidade ---------------- */
  function iniciarOciosidade() {
    const marca = () => { UPA._ultimaAtividade = Date.now(); };
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(ev => document.addEventListener(ev, marca, { passive: true }));
    UPA._idleTimer = setInterval(() => {
      if (Date.now() - UPA._ultimaAtividade > CFG.OCIOSIDADE_MIN * 60000) UPA.sair('Sessão encerrada por inatividade.');
    }, 20000);
  }
  function pararOciosidade() { if (UPA._idleTimer) clearInterval(UPA._idleTimer); UPA._idleTimer = null; }

  /* ---------------- montagem do app ---------------- */
  function iniciarApp() {
    const u = UPA.ctx;
    document.getElementById('top-cargo').textContent = u.funcao;
    document.getElementById('top-nome').textContent = u.nome;
    document.getElementById('avatar-initials').textContent = window.initials(u.nome);
    const h = new Date().getHours();
    const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    document.getElementById('banner-greeting').textContent =
      `${saud} · ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })}`;
    document.getElementById('banner-name').textContent = `${saud}, ${u.nome.split(' ')[0]}!`;
    document.getElementById('banner-sub').textContent = `${u.funcao} · Matrícula: ${u.matricula}`;

    montarMenu();

    // painel da direita: Kanban só para quem vê a passagem; "Atendimento" para quem vê avisos
    const painel = document.querySelector('.right-panel');
    const veKanban = UPA.can('passagem', 'ver');
    const veAtend = UPA.can('avisos', 'ver');
    painel.style.display = veKanban || veAtend ? '' : 'none';
    document.getElementById('tab-plantao').style.display = veKanban ? 'flex' : 'none';
    UPA.qsa('.tab-btn').forEach(b => { if (/Kanban/.test(b.textContent)) b.style.display = veKanban ? '' : 'none'; });
    if (!veKanban && veAtend) {
      document.getElementById('tab-atend').style.display = 'block';
      const b = UPA.qsa('.tab-btn').find(x => /Atendimento/.test(x.textContent)); if (b) b.classList.add('active');
    }
    if (veAtend && typeof window.loadAtendimento === 'function') window.loadAtendimento();

    // ganchos de cada módulo para a tela inicial (avisos, kanban...)
    UPA.modulos.forEach(m => { if (typeof m.home === 'function' && UPA.can(m.ver, 'ver')) { try { m.home(); } catch (e) { console.error(e); } } });

    if (UPA.can('chat', 'ver') && typeof window.chatInit === 'function') window.chatInit(); else document.getElementById('chat-fab').style.display = 'none';

    iniciarOciosidade();
    window.addEventListener('hashchange', rotear);
    rotear();
  }

  /* ---------------- boot ---------------- */
  UPA.boot = async function () {
    document.getElementById('inp-senha').addEventListener('keydown', e => { if (e.key === 'Enter') UPA.entrar(); });
    document.getElementById('inp-matricula').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('inp-senha').focus(); });
    document.addEventListener('click', e => { if (!e.target.closest('#avatar-btn')) { const d = document.getElementById('user-dropdown'); if (d) d.classList.remove('open'); } });
    try { window.sb = criarCliente(); } catch (e) { msgLogin('Erro ao iniciar o sistema: ' + e.message); return; }
    let aviso = null;
    try { aviso = window.sessionStorage.getItem('upa_aviso'); window.sessionStorage.removeItem('upa_aviso'); } catch (e) { /* segue */ }
    if (aviso) msgLogin(aviso);
    try {
      const s = await window.sb.auth.getSession();
      if (s.data && s.data.session) { await iniciarSessao(); return; }
    } catch (e) { /* cai para o login */ }
    mostrarLogin();
  };

  /* Utilidades expostas para testes */
  UPA._emailDe = emailDe;
})();
