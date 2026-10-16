/* Safety Huddle — todos registram; gestores editam e excluem. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const ITENS = ['Equipe completa e identificada', 'Leitos disponíveis verificados', 'Medicamentos críticos checados', 'Equipamentos em funcionamento', 'Pacientes críticos sinalizados', 'Exames pendentes revisados', 'Comunicação de intercorrências do turno anterior', 'EPIs disponíveis na unidade', 'Saídas de emergência desobstruídas', 'Médico responsável definido'];
  const CAMPOS = [
    { n: 'data_huddle', rotulo: 'Data', tipo: 'date', obrig: true }, { n: 'hora', rotulo: 'Hora', tipo: 'time' },
    { n: 'turno', rotulo: 'Turno', tipo: 'select', opcoes: U.TURNOS, obrig: true, semVazio: true }, { n: 'lotacao', rotulo: 'Lotação da unidade', tipo: 'select', opcoes: [['normal', 'Normal'], ['alerta', 'Alerta'], ['critica', 'Crítica']] },
    { n: 'participantes', rotulo: 'Participantes', tipo: 'textarea', linhas: 2, max: 500, col: '1 / -1', ph: 'Nomes ou funções presentes' },
    { n: 'checklist', rotulo: 'Checklist de segurança', tipo: 'checks', opcoes: ITENS.map((t, i) => [String(i), t]), col: '1 / -1' },
    { n: 'riscos', rotulo: 'Riscos identificados', tipo: 'textarea', max: 800, col: '1 / -1' },
    { n: 'ocorrencias', rotulo: 'Ocorrências do turno anterior', tipo: 'textarea', max: 800, col: '1 / -1' },
    { n: 'encaminhamentos', rotulo: 'Encaminhamentos / responsáveis', tipo: 'textarea', max: 800, col: '1 / -1' },
  ];
  const paraBanco = v => { const c = {}; ITENS.forEach((_, i) => { c[i] = v.checklist.includes(String(i)); }); const o = { ...v, checklist: c }; ['hora', 'lotacao', 'participantes', 'riscos', 'ocorrencias', 'encaminhamentos'].forEach(k => { o[k] = o[k] || null; }); return o; };
  const daBase = r => ({ ...r, hora: r.hora ? String(r.hora).slice(0, 5) : '', checklist: ITENS.map((_, i) => String(i)).filter(i => (r.checklist || {})[i]) });

  U.registrar({
    id: 'safety', label: 'Safety Huddle', icone: 'fa-shield-halved', cor: 'c-safety',
    async render(el) {
      const desenhar = async () => {
        const l = await U.db(window.sb.from('safety_huddles').select('*').order('data_huddle', { ascending: false }).order('criado_em', { ascending: false }).limit(60));
        el.innerHTML = `<div class="barra"><button class="btn btn-primary" id="sh-novo"><i class="fas fa-plus"></i> Registrar huddle</button></div>` +
          (l.map(h => { const feitos = ITENS.filter((_, i) => (h.checklist || {})[i]).length; return `<div class="cx"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${U.fmtData(h.data_huddle)} · ${esc(U.turnoNome(h.turno))}</b>${h.hora ? ' · ' + String(h.hora).slice(0, 5) : ''}<div class="ajuda">Registrado por ${esc(h.criado_por_nome || '—')} em ${U.fmtDH(h.criado_em)}</div></div><div><span class="tag ${feitos === ITENS.length ? 'verde' : 'amarelo'}">Checklist ${feitos}/${ITENS.length}</span> ${h.lotacao ? `<span class="tag ${h.lotacao === 'critica' ? 'vermelho' : h.lotacao === 'alerta' ? 'amarelo' : 'verde'}">Lotação ${h.lotacao}</span>` : ''}</div></div>
            ${h.participantes ? `<p style="font-size:13px;margin-top:6px"><b>Participantes:</b> ${esc(h.participantes)}</p>` : ''}${h.riscos ? `<p style="font-size:13px"><b>Riscos:</b> ${esc(h.riscos)}</p>` : ''}${h.ocorrencias ? `<p style="font-size:13px"><b>Ocorrências:</b> ${esc(h.ocorrencias)}</p>` : ''}${h.encaminhamentos ? `<p style="font-size:13px"><b>Encaminhamentos:</b> ${esc(h.encaminhamentos)}</p>` : ''}
            ${ITENS.some((_, i) => !(h.checklist || {})[i]) ? `<div class="ajuda">Pendentes: ${ITENS.filter((_, i) => !(h.checklist || {})[i]).map(esc).join('; ')}</div>` : ''}
            ${U.can('safety', 'editar') || U.can('safety', 'excluir') ? `<div class="barra" style="margin:8px 0 0">${U.can('safety', 'editar') ? `<button class="btn btn-ghost btn-sm" data-ed="${h.id}"><i class="fas fa-pen"></i> Editar</button>` : ''}${U.can('safety', 'excluir') ? `<button class="btn btn-ghost btn-sm" data-ex="${h.id}"><i class="fas fa-trash"></i> Excluir</button>` : ''}</div>` : ''}</div>`; }).join('') || '<div class="vazio">Nenhum huddle registrado.</div>');
        const form = reg => U.formulario({ titulo: reg ? 'Editar huddle' : 'Registrar huddle', campos: CAMPOS, colunas: 2, largura: 720, valores: reg ? daBase(reg) : { data_huddle: U.dataPlantao(), turno: U.turnoAtual(), checklist: [] },
          aoSalvar: async v => { const o = paraBanco(v); if (reg) await U.db(window.sb.from('safety_huddles').update(o).eq('id', reg.id)); else await U.db(window.sb.from('safety_huddles').insert(o)); U.toast('Huddle salvo.'); await desenhar(); } });
        el.querySelector('#sh-novo').onclick = () => form(null);
        el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => form(l.find(x => String(x.id) === b.dataset.ed)));
        el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => { if (!await U.confirmar('Excluir este registro de huddle?', 'Excluir', true)) return; try { await U.db(window.sb.from('safety_huddles').delete().eq('id', b.dataset.ex)); await desenhar(); } catch (e) { U.erro(e); } });
      };
      await desenhar();
    },
  });
})();
