/* Controle Gerencial de Ouvidorias — controle INTERNO, não substitui a plataforma oficial 1746.
   Só gestores. Guarda apenas: protocolo, data, categoria, coordenação responsável, providência, prazo e situação.
   Não registrar nome de paciente, relato clínico, CPF, telefone, prontuário ou e-mail. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const CATEGORIAS = ['Atendimento e acolhimento', 'Tempo de espera', 'Conduta de profissional', 'Estrutura e limpeza', 'Medicamentos e insumos', 'Exames e procedimentos', 'Documentos e processos administrativos', 'Elogio', 'Sugestão', 'Outros'];
  const COORDS = ['Coordenação Administrativa', 'Coordenação Assistencial', 'RH Focal'];
  const COORD_DA_FUNCAO = { 'Gestor Administrativo': null, 'Gestor Assistencial': 'Coordenação Assistencial', 'RH Focal': 'RH Focal' };   // null = vê tudo
  const SIT = { pendente: ['Pendente', 'amarelo'], em_andamento: ['Em andamento', 'azul'], concluida: ['Concluída', 'verde'], sem_acao: ['Não se aplica', ''] };
  const ABERTAS = ['pendente', 'em_andamento'];
  const RX_DADOS = /(\d[ .()-]?){9,}|@/;
  const RX_PROTOCOLO = /^[A-Za-z0-9./-]{4,30}$/;

  const dias = prazo => Math.round((new Date(prazo + 'T00:00:00') - new Date(U.hojeISO() + 'T00:00:00')) / 864e5);
  const aberta = o => ABERTAS.includes(o.situacao);
  const vencida = o => aberta(o) && dias(o.prazo) < 0;
  const logo = o => {
    if (!aberta(o)) return '';
    const d = dias(o.prazo);
    return d < 0 ? `<span class="tag vermelho">vencido há ${-d} d</span>` : d <= 3 ? `<span class="tag amarelo">vence em ${d} d</span>` : '';
  };

  async function carregar() {
    return U.db(window.sb.from('ouvidorias').select('*').order('prazo', { ascending: true }).limit(2000));
  }

  function formulario(reg, depois) {
    const CAMPOS = [
      { n: 'protocolo', rotulo: 'Nº do protocolo (1746)', obrig: true, max: 30, ph: 'Ex.: 1746-2026-000123', ajuda: 'Copie o número do protocolo. Só o número, nada mais.' },
      { n: 'data_manifestacao', rotulo: 'Data da manifestação', tipo: 'date', obrig: true },
      { n: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: CATEGORIAS, obrig: true },
      { n: 'coordenacao', rotulo: 'Coordenação responsável', tipo: 'select', opcoes: COORDS, obrig: true },
      { n: 'providencia', rotulo: 'Providência / ação corretiva', tipo: 'textarea', linhas: 4, max: 500, obrig: true, col: '1 / -1', ajuda: 'Descreva só o que a unidade vai fazer ou fez (ex.: "orientada a equipe da recepção; revisado o fluxo"). Não escreva nome de paciente, diagnóstico, relato, CPF, telefone ou prontuário.' },
      { n: 'prazo', rotulo: 'Prazo da providência', tipo: 'date', obrig: true },
      { n: 'situacao', rotulo: 'Situação da ação corretiva', tipo: 'select', opcoes: Object.entries(SIT).map(([k, v]) => [k, v[0]]), semVazio: true, obrig: true },
    ];
    U.formulario({
      titulo: reg ? 'Editar registro de ouvidoria' : 'Novo registro de ouvidoria', campos: CAMPOS, largura: 640,
      valores: reg || { situacao: 'pendente', data_manifestacao: U.hojeISO(), coordenacao: COORD_DA_FUNCAO[U.ctx.funcao] || '' },
      antes: '<div class="somente-leitura" style="margin-bottom:10px"><i class="fas fa-shield-halved"></i> Controle interno. Não substitui o 1746. <b>Não registre dados de paciente nem relato clínico.</b></div>',
      aoSalvar: async v => {
        if (!RX_PROTOCOLO.test(v.protocolo)) throw new Error('Protocolo inválido: use de 4 a 30 letras, números, ponto, barra ou hífen (sem espaços).');
        if (RX_DADOS.test(v.providencia)) throw new Error('A providência parece ter CPF, telefone, prontuário ou e-mail. Retire esses dados e descreva só a ação tomada.');
        if (v.prazo < v.data_manifestacao) throw new Error('O prazo não pode ser anterior à data da manifestação.');
        try {
          if (reg) await U.db(window.sb.from('ouvidorias').update(v).eq('id', reg.id));
          else await U.db(window.sb.from('ouvidorias').insert(v));
        } catch (e) {
          if (/ouvidorias_protocolo_key|duplicate/i.test(e.message || '')) throw new Error('Este protocolo já está registrado.');
          throw e;
        }
        U.toast('Registro salvo.'); depois();
      },
    });
  }

  async function registros(el) {
    const dados = await carregar();
    const exclui = U.can('ouvidoria', 'excluir');
    let fSit = 'abertas', fCoord = '', fCat = '', busca = '';
    const filtra = () => dados.filter(o =>
      (fSit === 'todas' || (fSit === 'abertas' ? aberta(o) : fSit === 'vencidas' ? vencida(o) : o.situacao === fSit)) &&
      (!fCoord || o.coordenacao === fCoord) && (!fCat || o.categoria === fCat) && (!busca || o.protocolo.toLowerCase().includes(busca)));
    const desenhar = () => {
      const f = filtra();
      const k = { total: dados.length, abertas: dados.filter(aberta).length, venc: dados.filter(vencida).length, conc: dados.filter(o => o.situacao === 'concluida').length };
      const kpi = (v, t, cor) => `<div class="cx" style="flex:1;min-width:120px;text-align:center"><div style="font-size:26px;font-weight:800;color:${cor || 'var(--blue-dark)'}">${v}</div><div class="ajuda">${t}</div></div>`;
      const selStyle = 'padding:9px;border:1.5px solid var(--gray-200);border-radius:6px';
      el.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">${kpi(k.total, 'registros')}${kpi(k.abertas, 'ações em aberto')}${kpi(k.venc, 'com prazo vencido', k.venc ? '#B91C1C' : '')}${kpi(k.conc, 'concluídas', '#15803D')}</div>
        <div class="barra"><select id="ou-s" style="${selStyle}">${[['abertas', 'Em aberto'], ['vencidas', 'Prazo vencido'], ['todas', 'Todas'], ...Object.entries(SIT).map(([a, b]) => [a, b[0]])].map(([a, b]) => `<option value="${a}"${fSit === a ? ' selected' : ''}>${b}</option>`).join('')}</select>
          <select id="ou-c" style="${selStyle}"><option value="">Todas as coordenações</option>${COORDS.map(c => `<option${fCoord === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <select id="ou-k" style="${selStyle}"><option value="">Todas as categorias</option>${CATEGORIAS.map(c => `<option${fCat === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <input id="ou-b" placeholder="Buscar protocolo" value="${esc(busca)}" style="${selStyle}"><span class="espaco"></span>
          <button class="btn btn-ghost" id="ou-xls"><i class="fas fa-file-excel"></i> Excel</button><button class="btn btn-primary" id="ou-novo"><i class="fas fa-plus"></i> Novo registro</button></div>
        ${U.tabela([
          { t: 'Protocolo', f: o => `<b>${esc(o.protocolo)}</b>` }, { t: 'Data', f: o => U.fmtData(o.data_manifestacao) }, { t: 'Categoria', f: o => esc(o.categoria) }, { t: 'Coordenação', f: o => esc(o.coordenacao) },
          { t: 'Providência', f: o => `<span style="white-space:pre-wrap">${esc(o.providencia)}</span>` },
          { t: 'Prazo', f: o => `${U.fmtData(o.prazo)}<br>${logo(o)}` }, { t: 'Situação', f: o => `<span class="tag ${SIT[o.situacao][1]}">${SIT[o.situacao][0]}</span>` },
          { t: '', f: o => `<button class="btn btn-ghost btn-icone" data-ed="${o.id}" title="Editar"><i class="fas fa-pen"></i></button>${exclui ? ` <button class="btn btn-ghost btn-icone" data-ex="${o.id}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}` },
        ], f, 'Nenhum registro com esse filtro.')}
        <p class="ajuda" style="margin-top:8px">Controle interno de acompanhamento. As manifestações e as respostas oficiais continuam na plataforma 1746.</p>`;
      el.querySelector('#ou-s').onchange = e => { fSit = e.target.value; desenhar(); };
      el.querySelector('#ou-c').onchange = e => { fCoord = e.target.value; desenhar(); };
      el.querySelector('#ou-k').onchange = e => { fCat = e.target.value; desenhar(); };
      el.querySelector('#ou-b').onchange = e => { busca = e.target.value.trim().toLowerCase(); desenhar(); };
      el.querySelector('#ou-novo').onclick = () => formulario(null, () => registros(el));
      el.querySelector('#ou-xls').onclick = () => U.baixarCsv('ouvidorias_controle_interno.csv', ['Protocolo', 'Data', 'Categoria', 'Coordenação', 'Providência', 'Prazo', 'Situação'],
        f.map(o => [o.protocolo, U.fmtData(o.data_manifestacao), o.categoria, o.coordenacao, o.providencia, U.fmtData(o.prazo), SIT[o.situacao][0]]));
      el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => formulario(dados.find(o => String(o.id) === b.dataset.ed), () => registros(el)));
      el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
        const o = dados.find(x => String(x.id) === b.dataset.ex);
        if (!await U.confirmar(`Excluir o registro do protocolo ${o.protocolo}?`, 'Excluir', true)) return;
        try { await U.db(window.sb.from('ouvidorias').delete().eq('id', o.id)); registros(el); } catch (e) { U.erro(e); }
      });
    };
    desenhar();
  }

  async function resumo(el) {
    const dados = await carregar();
    const conta = (lista, chave, ordem) => ordem.map(n => { const l = lista.filter(o => o[chave] === n); return { n, total: l.length, abertas: l.filter(aberta).length, venc: l.filter(vencida).length, conc: l.filter(o => o.situacao === 'concluida').length }; });
    const bloco = (titulo, linhas) => `<div class="section-title">${titulo}</div><div class="cx"><table class="tb"><thead><tr><th>${titulo.startsWith('Por coord') ? 'Coordenação' : 'Categoria'}</th><th style="width:70px">Total</th><th style="width:90px">Em aberto</th><th style="width:90px">Vencidas</th><th style="width:100px">Concluídas</th></tr></thead><tbody>${
      linhas.map(l => `<tr><td>${esc(l.n)}</td><td>${l.total}</td><td>${l.abertas}</td><td style="${l.venc ? 'color:#B91C1C;font-weight:700' : ''}">${l.venc}</td><td>${l.conc}</td></tr>`).join('')}</tbody></table></div>`;
    el.innerHTML = dados.length
      ? bloco('Por coordenação', conta(dados, 'coordenacao', COORDS)) + '<div style="height:12px"></div>' + bloco('Por categoria', conta(dados, 'categoria', CATEGORIAS).filter(l => l.total))
      : '<div class="vazio">Nenhum registro ainda.</div>';
  }

  U.registrar({
    id: 'ouvidoria', label: 'Ouvidorias (controle interno)', icone: 'fa-bullhorn', cor: 'c-proto',
    home() {
      U.vigiar(async () => {
        if (!U.can('ouvidoria', 'ver')) return;
        const minha = COORD_DA_FUNCAO[U.ctx.funcao];
        const l = (await U.db(window.sb.from('ouvidorias').select('situacao, prazo, coordenacao').in('situacao', ABERTAS).limit(2000))).filter(o => !minha || o.coordenacao === minha);
        const v = l.filter(vencida).length, p = l.filter(o => aberta(o) && dias(o.prazo) >= 0 && dias(o.prazo) <= 3).length;
        U.pendencia('ou_venc', 'ouvidoria', 'reg', v, `${v === 1 ? '1 ação de ouvidoria está' : v + ' ações de ouvidoria estão'} com o prazo vencido`);
        U.pendencia('ou_prox', 'ouvidoria', 'reg', p, `${p === 1 ? '1 ação de ouvidoria vence' : p + ' ações de ouvidoria vencem'} em até 3 dias`);
      });
    },
    render(el) {
      U.abas(el, [{ id: 'reg', rotulo: 'Registros', render: registros }, { id: 'res', rotulo: 'Resumo', render: resumo }]);
    },
  });
})();
