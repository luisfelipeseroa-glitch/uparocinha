/* Painel do Gestor — só gestores: adesão ao sistema (quem já entrou) e registro de ações (quem fez o quê). */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const GRUPOS = { gestor: 'Gestão', adm: 'Administrativo', assistencial: 'Assistencial', apoio: 'Apoio', terceiro: 'Terceiros', sem_acesso: 'Sem acesso' };
  const ACOES = { insert: 'incluiu', update: 'alterou', delete: 'excluiu', login: 'entrou no sistema', senha_trocada: 'trocou a senha', senha_redefinida: 'redefiniu a senha de um colega' };
  const TABELAS = { avisos: 'Avisos', estoque_itens: 'Estoque', documentos: 'Documentos', escala_plantao: 'Escala', eventos_adversos: 'Evento Adverso', passagem_cards: 'Passagem de Plantão', dieta_pedidos: 'Dieta', indicadores_mensais: 'Relatório Gerencial', rh_solicitacoes: 'RH', treinamentos: 'Treinamento', safety_huddles: 'Safety Huddle', manutencao_chamados: 'Manutenção', ouvidorias: 'Ouvidorias' };

  async function adesao(el) {
    const [res, pend] = await Promise.all([U.db(window.sb.rpc('adesao_resumo')), U.db(window.sb.rpc('adesao_pendentes'))]);
    const r = res || [], p = pend || [];
    const total = r.reduce((a, x) => a + Number(x.total), 0), entr = r.reduce((a, x) => a + Number(x.entraram), 0);
    const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
    el.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <div class="cx" style="flex:1;min-width:140px;text-align:center"><div style="font-size:28px;font-weight:800;color:var(--blue-dark)">${pct(entr, total)}%</div><div class="ajuda">já entraram e criaram a senha</div></div>
        <div class="cx" style="flex:1;min-width:140px;text-align:center"><div style="font-size:28px;font-weight:800;color:var(--blue-dark)">${entr}/${total}</div><div class="ajuda">pessoas cadastradas</div></div>
        <div class="cx" style="flex:1;min-width:140px;text-align:center"><div style="font-size:28px;font-weight:800;color:#C2410C">${total - entr}</div><div class="ajuda">ainda não entraram</div></div></div>
      <div class="section-title">Por função</div>
      <div class="cx"><table class="tb"><thead><tr><th>Função</th><th>Grupo</th><th style="width:80px">Entraram</th><th style="width:80px">Total</th><th style="width:150px">Adesão</th></tr></thead><tbody>
        ${r.map(x => { const v = pct(Number(x.entraram), Number(x.total)); return `<tr><td>${esc(x.funcao)}</td><td>${esc(GRUPOS[x.grupo] || x.grupo)}</td><td>${x.entraram}</td><td>${x.total}</td><td><div style="background:var(--gray-100);border-radius:6px;height:10px;overflow:hidden"><div style="width:${v}%;height:100%;background:${v >= 80 ? '#16A34A' : v >= 40 ? '#F59E0B' : '#EF4444'}"></div></div><span class="ajuda">${v}%</span></td></tr>`; }).join('')}</tbody></table></div>
      <div class="section-title" style="margin-top:14px">Quem ainda não entrou (${p.length})</div>
      <div class="barra"><button class="btn btn-ghost" id="ad-xls"><i class="fas fa-file-excel"></i> Excel</button></div>
      <div class="cx">${p.length ? `<table class="tb"><thead><tr><th style="width:110px">Matrícula</th><th>Nome</th><th>Função</th></tr></thead><tbody>${p.map(x => `<tr><td>${esc(x.matricula)}</td><td>${esc(x.nome)}</td><td>${esc(x.funcao)}</td></tr>`).join('')}</tbody></table>` : '<div class="vazio">Todos já entraram.</div>'}</div>`;
    el.querySelector('#ad-xls').onclick = () => U.baixarCsv('quem_nao_entrou.csv', ['Matrícula', 'Nome', 'Função'], p.map(x => [x.matricula, x.nome, x.funcao]));
  }

  async function registro(el) {
    let tipo = '', tabela = '', busca = '';
    const dados = await U.db(window.sb.from('auditoria').select('*').order('em', { ascending: false }).limit(500));
    const linhas = () => dados.filter(a => (!tipo || a.tipo === tipo) && (!tabela || a.tabela === tabela) && (!busca || `${a.usuario_nome} ${a.usuario_matricula}`.toLowerCase().includes(busca)));
    const desenhar = () => {
      const f = linhas();
      el.innerHTML = `<div class="barra"><select id="au-t" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px"><option value="">Acessos e ações</option><option value="acesso"${tipo === 'acesso' ? ' selected' : ''}>Só acessos</option><option value="acao"${tipo === 'acao' ? ' selected' : ''}>Só ações</option></select>
        <select id="au-m" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px"><option value="">Todos os módulos</option>${Object.entries(TABELAS).map(([k, v]) => `<option value="${k}"${tabela === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <input id="au-b" placeholder="Nome ou matrícula" value="${esc(busca)}" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px"><span class="ajuda">${f.length} registro(s) · últimos 500</span><span class="espaco"></span>
        <button class="btn btn-ghost" id="au-xls"><i class="fas fa-file-excel"></i> Excel</button></div>
        <div class="cx">${f.length ? `<table class="tb"><thead><tr><th style="width:150px">Quando</th><th>Quem</th><th>O que fez</th><th>Onde</th></tr></thead><tbody>${f.slice(0, 200).map(a => `<tr><td>${U.fmtDH(a.em)}</td><td>${esc(a.usuario_nome || 'sistema')}${a.usuario_matricula ? ' <span class="ajuda">· ' + esc(a.usuario_matricula) + '</span>' : ''}</td><td>${esc(ACOES[a.acao] || a.acao)}</td><td>${a.tabela ? esc(TABELAS[a.tabela] || a.tabela) + (a.registro ? ' <span class="ajuda">#' + esc(String(a.registro).slice(0, 8)) + '</span>' : '') : '—'}</td></tr>`).join('')}</tbody></table>${f.length > 200 ? '<div class="ajuda">Mostrando 200; use o Excel para ver todos.</div>' : ''}` : '<div class="vazio">Nada registrado com esse filtro.</div>'}</div>`;
      el.querySelector('#au-t').onchange = e => { tipo = e.target.value; desenhar(); };
      el.querySelector('#au-m').onchange = e => { tabela = e.target.value; desenhar(); };
      const b = el.querySelector('#au-b'); b.onchange = e => { busca = e.target.value.trim().toLowerCase(); desenhar(); };
      el.querySelector('#au-xls').onclick = () => U.baixarCsv('registro_de_acoes.csv', ['Quando', 'Matrícula', 'Nome', 'Ação', 'Módulo', 'Registro'], f.map(a => [U.fmtDH(a.em), a.usuario_matricula || '', a.usuario_nome || '', ACOES[a.acao] || a.acao, a.tabela ? (TABELAS[a.tabela] || a.tabela) : '', a.registro || '']));
    };
    desenhar();
  }

  /* Redefinir senha: só o Gestor Administrativo (painel:editar). Gera a provisória e mostra uma vez. */
  function senhas(el) {
    el.innerHTML = `<div class="cx" style="max-width:520px">
        <h3 style="margin-bottom:6px">Redefinir senha de um colega</h3>
        <p class="ajuda" style="margin-bottom:10px">Use quando alguém esquecer ou perder a senha. O sistema gera uma senha provisória, a pessoa entra com ela e é obrigada a criar uma senha nova. Esta tela não mostra a senha antiga (ninguém consegue vê-la).</p>
        <label class="fl">Matrícula</label>
        <input type="text" id="rs-mat" inputmode="numeric" autocomplete="off" placeholder="Ex.: 10344" style="width:100%;padding:11px;border:1.5px solid var(--gray-200);border-radius:6px;font-size:16px">
        <div class="barra" style="margin-top:12px"><button class="btn btn-primary" id="rs-ok"><i class="fas fa-key"></i> Gerar nova senha provisória</button></div></div>`;
    const campo = el.querySelector('#rs-mat');
    el.querySelector('#rs-ok').onclick = async () => {
      const mat = campo.value.trim();
      if (!mat) { U.toast('Digite a matrícula.', 'erro'); return; }
      try {
        const r = await U.db(window.sb.rpc('redefinir_senha', { p_matricula: mat }));
        campo.value = '';
        U.modal({ titulo: 'Senha provisória gerada', largura: 440, corpo: `<p><b>${esc(r.nome)}</b><br><span class="ajuda">${esc(r.funcao)} · matrícula ${esc(r.matricula)}</span></p>
          <div style="margin:12px 0;padding:14px;text-align:center;background:#FFF7ED;border:2px dashed #F5731E;border-radius:8px;font:700 26px 'Courier New',monospace;letter-spacing:.08em;user-select:all" id="rs-senha">${esc(r.senha)}</div>
          <p class="ajuda">Passe esta senha <b>só para a própria pessoa</b>. No próximo acesso ela será obrigada a criar uma senha nova. Esta tela não mostra a senha de novo: anote ou copie agora.</p>`,
          botoes: [{ rotulo: 'Copiar senha', classe: 'btn-ghost', acao: async () => { try { await navigator.clipboard.writeText(r.senha); U.toast('Senha copiada.'); } catch (e) { U.toast('Selecione e copie manualmente.', 'erro'); } return false; } }, { rotulo: 'Fechar', classe: 'btn-primary' }] });
      } catch (e) { U.erro(e); }
    };
  }

  U.registrar({
    id: 'painel', label: 'Painel do Gestor', icone: 'fa-gauge-high', cor: 'c-sistemas',
    render(el) {
      const abas = [{ id: 'adesao', rotulo: 'Adesão ao sistema', render: adesao }, { id: 'registro', rotulo: 'Registro de ações', render: registro }];
      if (U.can('painel', 'editar')) abas.push({ id: 'senhas', rotulo: 'Redefinir senha', render: senhas });
      U.abas(el, abas);
    },
  });
})();
