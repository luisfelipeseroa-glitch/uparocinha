/* Solicitação de Manutenção — todos abrem chamado; gestores e terceiros (Manutenção/Refrigeração) atendem. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const ST = { aberto: ['Aberto', 'vermelho'], em_atendimento: ['Em atendimento', 'amarelo'], aguardando_material: ['Aguardando material', 'azul'], concluido: ['Concluído', 'verde'], cancelado: ['Cancelado', ''] };
  const PRI = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };
  const CATS = ['Elétrica', 'Hidráulica', 'Ar-condicionado / refrigeração', 'Equipamento', 'Mobiliário', 'Pintura / alvenaria', 'Porta / fechadura', 'Iluminação', 'Limpeza pesada', 'Outro'];
  const SETORES = ['Recepção / Classificação', 'Consultórios', 'Sala de Emergência', 'Observação', 'Sala de Medicação', 'Sala de Procedimentos', 'Radiologia', 'Laboratório', 'Farmácia', 'Almoxarifado', 'Administrativo', 'Banheiros', 'Área externa', 'Outro'];

  async function abrirChamado(el, depois) {
    const C = [{ n: 'setor', rotulo: 'Setor', tipo: 'select', opcoes: SETORES, obrig: true }, { n: 'local_detalhe', rotulo: 'Local detalhado', max: 120, ph: 'Ex.: Box 4, banheiro feminino' },
      { n: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: CATS, obrig: true }, { n: 'prioridade', rotulo: 'Prioridade', tipo: 'select', opcoes: Object.entries(PRI), semVazio: true },
      { n: 'descricao', rotulo: 'Descreva o problema', tipo: 'textarea', linhas: 4, obrig: true, max: 800, col: '1 / -1' }];
    el.innerHTML = `<div class="cx"><form id="mn-form"></form></div>`;
    const f = el.querySelector('#mn-form');
    f.innerHTML = U.camposHtml(C, { prioridade: 'media' }, 2) + '<label class="fl">Foto (opcional, até 5 MB)</label><input type="file" id="mn-foto" accept="image/*"><div style="margin-top:14px"><button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i> Abrir chamado</button></div>';
    f.onsubmit = async e => {
      e.preventDefault(); const v = U.lerCampos(f, C); if (!v) return;
      if (v.descricao.length < 5) { U.toast('Descreva melhor o problema.', 'erro'); return; }
      const b = f.querySelector('button[type=submit]'); b.disabled = true;
      try {
        const foto = f.querySelector('#mn-foto').files[0];
        if (foto) { if (foto.size > 5 * 1024 * 1024) throw new Error('Foto maior que 5 MB.'); v.foto_path = await U.enviarArquivo('manutencao-fotos', `${U.ctx.id}/${Date.now()}_${U.nomeSeguro(foto.name)}`, foto); }
        v.local_detalhe = v.local_detalhe || null;
        await U.db(window.sb.from('manutencao_chamados').insert(v));
        U.toast('Chamado aberto.'); depois();
      } catch (er) { U.erro(er); } finally { b.disabled = false; }
    };
  }

  async function lista(el, soMeus) {
    const atende = U.can('manutencao', 'editar');
    let q = window.sb.from('manutencao_chamados').select('*').order('criado_em', { ascending: false }).limit(300);
    if (soMeus) q = q.eq('criado_por', U.ctx.id);
    const l = await U.db(q);
    if (soMeus) { gravarVisto(); U.pendencia('mn_meus', 'manutencao', 'meus', 0, ''); }
    let filtro = '';
    const desenhar = () => {
      const f = l.filter(c => !filtro || (filtro === 'abertos' ? ['aberto', 'em_atendimento', 'aguardando_material'].includes(c.status) : c.status === filtro));
      el.innerHTML = `<div class="barra"><select id="mn-fl" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px"><option value="">Todos</option><option value="abertos"${filtro === 'abertos' ? ' selected' : ''}>Em aberto</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}"${filtro === k ? ' selected' : ''}>${v[0]}</option>`).join('')}</select><span class="ajuda">${f.length} chamado(s)</span></div>` +
        (f.map(c => `<div class="cx"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>#${c.id} · ${esc(c.categoria)}</b> — ${esc(c.setor)}${c.local_detalhe ? ' · ' + esc(c.local_detalhe) : ''}<div class="ajuda">Aberto por ${esc(c.criado_por_nome || '—')} em ${U.fmtDH(c.criado_em)}</div></div>
          <div><span class="tag ${c.prioridade === 'urgente' ? 'vermelho' : c.prioridade === 'alta' ? 'amarelo' : 'azul'}">${PRI[c.prioridade]}</span> <span class="tag ${ST[c.status][1]}">${ST[c.status][0]}</span></div></div>
          <p style="margin:8px 0;font-size:13px;white-space:pre-wrap">${esc(c.descricao)}</p>
          ${c.responsavel || c.parecer ? `<div style="background:var(--gray-50);border-radius:6px;padding:8px 10px;font-size:12px"><b>Responsável:</b> ${esc(c.responsavel || '—')}<br><b>Parecer:</b> ${esc(c.parecer || '—')}${c.concluido_em ? `<br><b>Concluído em:</b> ${U.fmtDH(c.concluido_em)}` : ''}</div>` : ''}
          <div class="barra" style="margin:8px 0 0">${c.foto_path ? `<button class="btn btn-ghost btn-sm" data-ft="${esc(c.foto_path)}"><i class="fas fa-image"></i> Ver foto</button>` : ''}${atende && c.status !== 'cancelado' ? `<button class="btn btn-primary btn-sm" data-at="${c.id}"><i class="fas fa-wrench"></i> Atender</button>` : ''}${c.criado_por === U.ctx.id && c.status === 'aberto' ? `<button class="btn btn-ghost btn-sm" data-cn="${c.id}"><i class="fas fa-ban"></i> Cancelar</button>` : ''}</div></div>`).join('') || '<div class="vazio">Nenhum chamado.</div>');
      el.querySelector('#mn-fl').onchange = e => { filtro = e.target.value; desenhar(); };
      el.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => U.abrirArquivo('manutencao-fotos', b.dataset.ft));
      el.querySelectorAll('[data-cn]').forEach(b => b.onclick = async () => { if (!await U.confirmar('Cancelar este chamado?', 'Cancelar chamado', true)) return; try { await U.db(window.sb.rpc('manutencao_cancelar', { p_id: Number(b.dataset.cn) })); lista(el, soMeus); } catch (e) { U.erro(e); } });
      el.querySelectorAll('[data-at]').forEach(b => b.onclick = () => {
        const c = l.find(x => String(x.id) === b.dataset.at);
        U.formulario({ titulo: `Atender chamado #${c.id}`, colunas: 1, valores: c,
          campos: [{ n: 'status', rotulo: 'Situação', tipo: 'select', opcoes: Object.entries(ST).filter(([k]) => k !== 'cancelado').map(([k, v]) => [k, v[0]]), semVazio: true }, { n: 'responsavel', rotulo: 'Responsável pelo atendimento', max: 120 }, { n: 'parecer', rotulo: 'Parecer / o que foi feito', tipo: 'textarea', max: 800 }],
          aoSalvar: async v => { v.responsavel = v.responsavel || null; v.parecer = v.parecer || null; await U.db(window.sb.from('manutencao_chamados').update(v).eq('id', c.id)); U.toast('Chamado atualizado.'); lista(el, soMeus); } });
      });
    };
    desenhar();
  }

  const chaveVisto = () => 'upa_mn_visto_' + U.ctx.id;
  const lerVisto = () => { try { return localStorage.getItem(chaveVisto()); } catch (e) { return null; } };
  const gravarVisto = () => { try { localStorage.setItem(chaveVisto(), new Date().toISOString()); } catch (e) { /* sem armazenamento */ } };

  /* indicadores (atendimento): mês escolhido */
  async function indicadores(el) {
    const hoje = U.hojeISO(); let ano = Number(hoje.slice(0, 4)), mes = Number(hoje.slice(5, 7));
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const desenhar = async () => {
      const ini = `${ano}-${String(mes).padStart(2, '0')}-01`, fim = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
      const l = await U.db(window.sb.from('manutencao_chamados').select('*').gte('criado_em', ini).lt('criado_em', fim).order('criado_em'));
      const conc = l.filter(c => c.status === 'concluido' && c.concluido_em);
      const horas = conc.map(c => (new Date(c.concluido_em) - new Date(c.criado_em)) / 36e5).filter(h => isFinite(h) && h >= 0);
      const media = horas.length ? horas.reduce((a, b) => a + b, 0) / horas.length : null;
      const fmtH = h => h === null ? '—' : h < 48 ? h.toFixed(1).replace('.', ',') + ' h' : (h / 24).toFixed(1).replace('.', ',') + ' dias';
      const velhos = l.filter(c => ['aberto', 'em_atendimento', 'aguardando_material'].includes(c.status) && Date.now() - new Date(c.criado_em) > 3 * 864e5).length;
      const cont = (campo) => Object.entries(l.reduce((o, c) => { o[c[campo]] = (o[c[campo]] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
      const kpi = (n, r) => `<div class="cx" style="flex:1;min-width:130px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--blue-dark)">${n}</div><div class="ajuda">${r}</div></div>`;
      const tab = (tit, pares) => `<div class="cx" style="flex:1;min-width:260px"><b>${tit}</b><table class="tb" style="margin-top:6px"><tbody>${pares.slice(0, 8).map(([k, n]) => `<tr><td>${esc(k)}</td><td style="width:50px"><b>${n}</b></td></tr>`).join('') || '<tr><td>—</td><td></td></tr>'}</tbody></table></div>`;
      el.innerHTML = `<div class="barra"><input type="number" id="mi-ano" value="${ano}" min="2020" max="2100" style="width:90px;padding:8px;border:1.5px solid var(--gray-200);border-radius:6px">
        <select id="mi-mes" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px">${MESES.map((m, i) => `<option value="${i + 1}"${i + 1 === mes ? ' selected' : ''}>${m}</option>`).join('')}</select>
        <span class="espaco"></span><button class="btn btn-ghost" id="mi-xls"><i class="fas fa-file-excel"></i> Excel</button></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">${kpi(l.length, 'chamados abertos no mês')}${kpi(conc.length, 'concluídos')}${kpi(fmtH(media), 'tempo médio até concluir')}${kpi(velhos, 'em aberto há mais de 3 dias')}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">${tab('Por categoria', cont('categoria'))}${tab('Por setor', cont('setor'))}${tab('Por situação', cont('status').map(([k, n]) => [ST[k] ? ST[k][0] : k, n]))}</div>`;
      el.querySelector('#mi-ano').onchange = e => { ano = Number(e.target.value) || ano; desenhar(); };
      el.querySelector('#mi-mes').onchange = e => { mes = Number(e.target.value); desenhar(); };
      el.querySelector('#mi-xls').onclick = () => U.baixarCsv(`manutencao_${ano}-${String(mes).padStart(2, '0')}.csv`, ['Nº', 'Aberto em', 'Setor', 'Local', 'Categoria', 'Prioridade', 'Situação', 'Responsável', 'Concluído em', 'Horas até concluir'],
        l.map(c => [c.id, U.fmtDH(c.criado_em), c.setor, c.local_detalhe || '', c.categoria, PRI[c.prioridade], ST[c.status][0], c.responsavel || '', c.concluido_em ? U.fmtDH(c.concluido_em) : '', c.concluido_em ? ((new Date(c.concluido_em) - new Date(c.criado_em)) / 36e5).toFixed(1).replace('.', ',') : '']));
    };
    await desenhar();
  }

  U.registrar({
    id: 'manutencao', label: 'Solicitação de Manutenção', icone: 'fa-screwdriver-wrench', cor: 'c-rh',
    home() {
      U.vigiar(async () => {
        const l = await U.db(window.sb.from('manutencao_chamados').select('id, status, criado_por, atualizado_em').order('criado_em', { ascending: false }).limit(200));
        if (U.can('manutencao', 'editar')) {
          const n = l.filter(c => c.status === 'aberto').length;
          U.pendencia('mn_abertos', 'manutencao', 'todos', n, `${n === 1 ? '1 chamado de manutenção aguarda' : n + ' chamados de manutenção aguardam'} atendimento`);
        }
        let visto = lerVisto(); if (!visto) { gravarVisto(); visto = lerVisto(); }
        const meus = l.filter(c => c.criado_por === U.ctx.id && c.status !== 'aberto' && new Date(c.atualizado_em) > new Date(visto)).length;
        U.pendencia('mn_meus', 'manutencao', 'meus', meus, `${meus === 1 ? '1 chamado seu teve' : meus + ' chamados seus tiveram'} novidade`);
      });
    },
    render(el) {
      let ctl;
      const abas = [];
      if (U.can('manutencao', 'criar')) abas.push({ id: 'nova', rotulo: 'Novo chamado', render: c => abrirChamado(c, () => ctl.abrir('todos')) });
      if (U.can('manutencao', 'editar')) abas.push({ id: 'ind', rotulo: 'Indicadores', render: indicadores });
      abas.push({ id: 'todos', rotulo: U.can('manutencao', 'editar') ? 'Chamados (atendimento)' : 'Todos os chamados', render: c => lista(c, false) }, { id: 'meus', rotulo: 'Meus chamados', render: c => lista(c, true) });
      ctl = U.abas(el, abas, U.can('manutencao', 'editar') ? 'todos' : abas[0].id);
    },
  });
})();
