/* Relatório Gerencial Mensal e Anual — todos veem; só gestores lançam, editam e excluem. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const CORES = [['vermelho', '#DC2626'], ['laranja', '#F97316'], ['amarelo', '#EAB308'], ['verde', '#16A34A'], ['azul', '#2563EB']];
  const SOMA = ['cadastros', 'classificados', 'atendidos', 'raio_x', 'internacoes', 'obitos_menos_24h', 'obitos_mais_24h', 'avc', 'iam', 'sepse', 'sinan', ...CORES.map(c => 'class_' + c[0])];
  const MEDIA = ['tme_geral_min', 'permanencia_min', 'satisfacao', ...CORES.map(c => 'tme_' + c[0] + '_min')];
  const N = (nome, rot, extra) => ({ n: nome, rotulo: rot, tipo: 'number', min: 0, step: '1', ...extra });
  const MIN = (nome, rot) => N(nome, rot + ' (min)', { step: 'any' });
  const CAMPOS = [
    { n: 'ano', rotulo: 'Ano', tipo: 'number', obrig: true, min: 2020, step: '1' },
    { n: 'mes', rotulo: 'Mês', tipo: 'select', opcoes: MESES.map((m, i) => [i + 1, m]), obrig: true, semVazio: true },
    N('cadastros', 'Cadastros (recepção)'), N('classificados', 'Classificados'), N('atendidos', 'Atendidos (médico)'), N('raio_x', 'Raio-X realizados'),
    ...CORES.map(c => N('class_' + c[0], 'Classificação ' + c[0])),
    MIN('tme_geral_min', 'Tempo médio de espera geral'), ...CORES.map(c => MIN('tme_' + c[0] + '_min', 'TME ' + c[0])),
    MIN('permanencia_min', 'Permanência média'),
    N('internacoes', 'Internações'), N('obitos_menos_24h', 'Óbitos < 24h'), N('obitos_mais_24h', 'Óbitos ≥ 24h'),
    N('avc', 'AVC'), N('iam', 'IAM'), N('sepse', 'Sepse'), N('sinan', 'Notificações SINAN'),
    N('satisfacao', 'Satisfação (%)', { step: 'any' }),
    { n: 'observacoes', rotulo: 'Observações', tipo: 'textarea', max: 1000, col: '1 / -1' },
  ];
  const fmtMin = m => { if (m === null || m === undefined || m === '') return '—'; m = Math.round(Number(m)); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}min` : `${m} min`; };
  const nz = v => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR'));
  const charts = [];
  const grafico = (cv, cfg) => { if (typeof Chart === 'undefined' || !cv) return; charts.push(new Chart(cv, cfg)); };
  const zerar = () => { while (charts.length) charts.pop().destroy(); };

  function agrega(regs) {
    const o = {};
    SOMA.forEach(k => { const v = regs.filter(r => r[k] !== null && r[k] !== undefined); o[k] = v.length ? v.reduce((s, r) => s + Number(r[k]), 0) : null; });
    MEDIA.forEach(k => { const v = regs.filter(r => r[k] !== null && r[k] !== undefined); o[k] = v.length ? v.reduce((s, r) => s + Number(r[k]), 0) / v.length : null; });
    return o;
  }
  const card = (t, v, sub) => `<div class="ind-card"><div class="ind-card-label">${t}</div><div class="ind-card-value">${v}</div>${sub ? `<div class="ajuda">${sub}</div>` : ''}</div>`;

  function painel(d, titulo, serie) {
    return `<div class="section-title">Registros</div><div class="indicadores-grid">${card('Cadastros', nz(d.cadastros))}${card('Classificados', nz(d.classificados))}${card('Atendidos', nz(d.atendidos))}${card('Raio-X', nz(d.raio_x))}</div>
      <div class="section-title" style="margin-top:18px">Classificação e atendimento</div>
      <div class="graf-grade"><div class="cx"><h3>Classificação de risco</h3><canvas id="g-class"></canvas></div><div class="cx"><h3>Tempo de espera por classificação (min)</h3><canvas id="g-tme"></canvas></div></div>
      <div class="indicadores-grid">${card('Espera média geral', fmtMin(d.tme_geral_min))}${card('Permanência média', fmtMin(d.permanencia_min))}${card('Satisfação', d.satisfacao === null ? '—' : Number(d.satisfacao).toFixed(1).replace('.', ',') + '%')}</div>
      <div class="section-title" style="margin-top:18px">Internações e óbitos</div>
      <div class="indicadores-grid">${card('Internações', nz(d.internacoes))}${card('Óbitos < 24h', nz(d.obitos_menos_24h))}${card('Óbitos ≥ 24h', nz(d.obitos_mais_24h))}${card('AVC', nz(d.avc))}${card('IAM', nz(d.iam))}${card('Sepse', nz(d.sepse))}${card('SINAN', nz(d.sinan))}</div>
      ${serie ? '<div class="cx" style="margin-top:14px"><h3>Evolução mensal</h3><canvas id="g-serie"></canvas></div>' : ''}`;
  }

  function desenharGraficos(el, d, regs) {
    zerar();
    grafico(el.querySelector('#g-class'), { type: 'doughnut', data: { labels: CORES.map(c => c[0]), datasets: [{ data: CORES.map(c => d['class_' + c[0]] || 0), backgroundColor: CORES.map(c => c[1]) }] }, options: { plugins: { legend: { position: 'bottom' } } } });
    grafico(el.querySelector('#g-tme'), { type: 'bar', data: { labels: CORES.map(c => c[0]), datasets: [{ data: CORES.map(c => d['tme_' + c[0] + '_min'] || 0), backgroundColor: CORES.map(c => c[1]) }] }, options: { plugins: { legend: { display: false } } } });
    if (regs && el.querySelector('#g-serie')) {
      const por = Array.from({ length: 12 }, (_, i) => regs.find(r => r.mes === i + 1));
      grafico(el.querySelector('#g-serie'), { type: 'line', data: { labels: MESES.map(m => m.slice(0, 3)), datasets: [{ label: 'Atendidos', data: por.map(r => (r ? r.atendidos : null)), borderColor: '#1A6FC4', tension: .25 }, { label: 'Classificados', data: por.map(r => (r ? r.classificados : null)), borderColor: '#27AE60', tension: .25 }, { label: 'Internações', data: por.map(r => (r ? r.internacoes : null)), borderColor: '#F97316', tension: .25 }] }, options: { plugins: { legend: { position: 'bottom' } } } });
    }
  }

  U.registrar({
    id: 'relatorio', label: 'Relatório Gerencial', icone: 'fa-chart-column', cor: 'c-sistemas',
    async render(el) {
      const hoje = new Date(); let ano = hoje.getFullYear(), mes = hoje.getMonth() + 1, modo = 'mes';
      const cria = U.can('relatorio', 'criar'), edita = U.can('relatorio', 'editar'), exclui = U.can('relatorio', 'excluir');
      const desenhar = async () => {
        const regs = await U.db(window.sb.from('indicadores_mensais').select('*').eq('ano', ano).order('mes'));
        const reg = regs.find(r => r.mes === mes);
        const d = modo === 'mes' ? (reg || {}) : agrega(regs);
        const titulo = modo === 'mes' ? `${MESES[mes - 1]} de ${ano}` : `Ano de ${ano} (acumulado)`;
        el.innerHTML = (cria ? '' : U.leituraAviso('Somente gestores lançam ou alteram os indicadores.')) +
          `<div class="barra"><div class="abas" style="margin:0;border:0"><button class="aba${modo === 'mes' ? ' ativa' : ''}" data-m="mes">Mensal</button><button class="aba${modo === 'ano' ? ' ativa' : ''}" data-m="ano">Anual</button></div>
           <input type="number" id="rg-ano" value="${ano}" min="2020" max="2100" style="width:90px;padding:8px;border:1.5px solid var(--gray-200);border-radius:6px">
           ${modo === 'mes' ? `<select id="rg-mes" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px">${MESES.map((m, i) => `<option value="${i + 1}"${i + 1 === mes ? ' selected' : ''}>${m}</option>`).join('')}</select>` : ''}
           <span class="espaco"></span><button class="btn btn-ghost" id="rg-xls"><i class="fas fa-file-excel"></i> Excel</button><button class="btn btn-ghost" id="rg-pdf"><i class="fas fa-print"></i> PDF / Imprimir</button>
           ${modo === 'mes' && ((reg && edita) || (!reg && cria)) ? `<button class="btn btn-primary" id="rg-ed"><i class="fas fa-${reg ? 'pen' : 'plus'}"></i> ${reg ? 'Editar mês' : 'Lançar mês'}</button>` : ''}
           ${modo === 'mes' && reg && exclui ? '<button class="btn btn-ghost" id="rg-ex"><i class="fas fa-trash"></i></button>' : ''}</div>
           <h3 style="margin-bottom:10px;color:var(--blue-dark)">${titulo}</h3>
           ${modo === 'mes' && !reg ? '<div class="vazio">Indicadores deste mês ainda não foram lançados.</div>' : painel(d, titulo, modo === 'ano')}
           ${modo === 'mes' && reg && reg.observacoes ? `<div class="cx"><h3>Observações</h3>${esc(reg.observacoes)}<div class="ajuda">Lançado por ${esc(reg.criado_por_nome || '—')} · atualizado em ${U.fmtDH(reg.atualizado_em)}</div></div>` : ''}`;
        el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { modo = b.dataset.m; desenhar(); });
        el.querySelector('#rg-ano').onchange = e => { ano = Number(e.target.value) || ano; desenhar(); };
        const sm = el.querySelector('#rg-mes'); if (sm) sm.onchange = e => { mes = Number(e.target.value); desenhar(); };
        if (modo === 'ano' || reg) desenharGraficos(el, d, modo === 'ano' ? regs : null);
        el.querySelector('#rg-pdf').onclick = () => {
          const lin = ([['Cadastros', 'cadastros'], ['Classificados', 'classificados'], ['Atendidos', 'atendidos'], ['Raio-X', 'raio_x'], ...CORES.map(c => ['Classificação ' + c[0], 'class_' + c[0]]), ['Internações', 'internacoes'], ['Óbitos < 24h', 'obitos_menos_24h'], ['Óbitos ≥ 24h', 'obitos_mais_24h'], ['AVC', 'avc'], ['IAM', 'iam'], ['Sepse', 'sepse'], ['SINAN', 'sinan']]).map(([r, k]) => `<tr><td>${r}</td><td>${nz(d[k])}</td></tr>`).join('') +
            ([['Espera média geral', 'tme_geral_min'], ...CORES.map(c => ['Espera ' + c[0], 'tme_' + c[0] + '_min']), ['Permanência média', 'permanencia_min']]).map(([r, k]) => `<tr><td>${r}</td><td>${fmtMin(d[k])}</td></tr>`).join('') +
            `<tr><td>Satisfação</td><td>${d.satisfacao == null ? '—' : Number(d.satisfacao).toFixed(1) + '%'}</td></tr>`;
          U.imprimir(`<h2>Relatório Gerencial — UPA Rocinha</h2><div class="sub">${titulo}</div><br><table><tbody>${lin}</tbody></table>`, 'Relatório gerencial');
        };
        el.querySelector('#rg-xls').onclick = () => {
          const linhas = regs.map(r => CAMPOS.filter(c => c.n !== 'observacoes').map(c => (c.n === 'mes' ? MESES[r.mes - 1] : r[c.n] ?? '')));
          U.baixarCsv(`relatorio_gerencial_${ano}.csv`, CAMPOS.filter(c => c.n !== 'observacoes').map(c => c.rotulo), linhas);
        };
        const ed = el.querySelector('#rg-ed');
        if (ed) ed.onclick = () => U.formulario({ titulo: `${reg ? 'Editar' : 'Lançar'} indicadores — ${MESES[mes - 1]}/${ano}`, campos: CAMPOS, colunas: 3, largura: 820, valores: reg || { ano, mes },
          aoSalvar: async v => { Object.keys(v).forEach(k => { if (v[k] === '') v[k] = null; }); await U.db(window.sb.from('indicadores_mensais').upsert(v, { onConflict: 'ano,mes' })); ano = v.ano; mes = Number(v.mes); U.toast('Indicadores salvos.'); await desenhar(); } });
        const ex = el.querySelector('#rg-ex');
        if (ex) ex.onclick = async () => { if (!await U.confirmar(`Excluir os indicadores de ${MESES[mes - 1]}/${ano}?`, 'Excluir', true)) return; try { await U.db(window.sb.from('indicadores_mensais').delete().eq('id', reg.id)); U.toast('Mês excluído.'); await desenhar(); } catch (e) { U.erro(e); } };
      };
      await desenhar();
    },
  });
})();
