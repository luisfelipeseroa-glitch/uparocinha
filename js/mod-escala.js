/* Escala de Plantão — todos veem; só ADM e gestores incluem, editam e excluem. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const SETORES = ['Recepção', 'Administrativo', 'Almoxarifado', 'NIR', 'ASG', 'SESO', 'Maqueiro', 'Vigilante', 'TI', 'Enfermagem', 'Téc. Enfermagem', 'Farmácia', 'Téc. Farmácia', 'Médico', 'Pediatria', 'Radiologia', 'Laboratório', 'Manutenção', 'Refrigeração', 'Agente Regulador'];

  U.registrar({
    id: 'escala', label: 'Escala de Plantão', icone: 'fa-calendar-days', cor: 'c-escala',
    async render(el) {
      const cria = U.can('escala', 'criar'), exclui = U.can('escala', 'excluir'), edita = U.can('escala', 'editar');
      let dia = U.hojeISO(), turno = U.turnoAtual();
      const desenhar = async () => {
        const reg = await U.db(window.sb.from('escala_plantao').select('*').eq('data', dia).eq('turno', turno).order('setor').order('nome'));
        const por = {};
        reg.forEach(r => (por[r.setor] = por[r.setor] || []).push(r));
        const setores = Object.keys(por).sort((a, b) => SETORES.indexOf(a) - SETORES.indexOf(b));
        el.innerHTML = (cria ? '' : U.leituraAviso('Somente a administração e os gestores alteram a escala.')) +
          `<div class="barra"><input type="date" id="es-dia" value="${dia}" style="padding:8px;border:1.5px solid var(--gray-200);border-radius:6px">
            <select id="es-turno" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px">${U.TURNOS.map(t => `<option value="${t[0]}"${t[0] === turno ? ' selected' : ''}>${t[1]}</option>`).join('')}</select>
            <span class="espaco"></span>
            <button class="btn btn-ghost" id="es-pdf"><i class="fas fa-print"></i> Imprimir / PDF</button>
            ${cria ? '<button class="btn btn-ghost" id="es-copia"><i class="fas fa-copy"></i> Copiar de outro dia</button><button class="btn btn-primary" id="es-novo"><i class="fas fa-plus"></i> Incluir na escala</button>' : ''}</div>
           ${setores.length ? `<div class="escala-grid">${setores.map(s => `<div class="escala-card"><div class="escala-card-header">${esc(s)}</div><div class="escala-card-body">${por[s].map(r => `<div class="escala-name" style="display:flex;justify-content:space-between;gap:6px"><span>${esc(r.nome)}${r.observacao ? `<br><small style="color:var(--gray-500)">${esc(r.observacao)}</small>` : ''}</span>${edita || exclui ? `<span style="white-space:nowrap">${edita ? `<button class="btn-icone" data-ed="${r.id}" title="Editar" style="border:none;background:none;cursor:pointer;color:var(--gray-500)"><i class="fas fa-pen"></i></button>` : ''}${exclui ? `<button class="btn-icone" data-ex="${r.id}" title="Remover" style="border:none;background:none;cursor:pointer;color:#B91C1C"><i class="fas fa-xmark"></i></button>` : ''}</span>` : ''}</div>`).join('')}</div></div>`).join('')}</div>` : '<div class="vazio">Escala não lançada para este dia e turno.</div>'}`;
        el.querySelector('#es-dia').onchange = e => { dia = e.target.value || dia; desenhar(); };
        el.querySelector('#es-turno').onchange = e => { turno = e.target.value; desenhar(); };
        el.querySelector('#es-pdf').onclick = () => U.imprimir(`<h2>Escala de Plantão — UPA Rocinha</h2><div class="sub">${U.fmtData(dia)} · ${esc(U.turnoNome(turno))}</div><br>` + (setores.length ? `<table><thead><tr><th>Setor</th><th>Profissionais</th></tr></thead><tbody>${setores.map(s => `<tr><td><b>${esc(s)}</b></td><td>${por[s].map(r => esc(r.nome) + (r.observacao ? ' (' + esc(r.observacao) + ')' : '')).join('<br>')}</td></tr>`).join('')}</tbody></table>` : '<p>Sem lançamentos.</p>'), 'Escala de plantão');
        const sel = ['<option value="">Selecione...</option>', ...SETORES.map(s => `<option>${esc(s)}</option>`)].join('');
        const novo = el.querySelector('#es-novo');
        if (novo) novo.onclick = () => U.modal({
          titulo: 'Incluir na escala', largura: 480,
          corpo: `<div style="color:var(--gray-500);font-size:12px;margin-bottom:6px">${U.fmtData(dia)} · ${esc(U.turnoNome(turno))}</div>
                  <label class="fl">Setor *</label><select id="en-setor">${sel}</select>
                  <label class="fl">Nomes * (um por linha)</label><textarea id="en-nomes" rows="5" placeholder="Maria da Silva&#10;João Souza"></textarea>
                  <div class="ajuda">Dica: digite exatamente como quer que apareça na escala.</div>
                  <label class="fl">Observação (opcional)</label><input type="text" id="en-obs" maxlength="120" placeholder="Ex.: 12h, sobreaviso">`,
          botoes: [{ rotulo: 'Cancelar' }, { rotulo: 'Incluir', classe: 'btn-primary', acao: async box => {
            const setor = box.querySelector('#en-setor').value;
            const lista = [...new Set(box.querySelector('#en-nomes').value.split('\n').map(x => x.trim()).filter(Boolean))];
            if (!setor || !lista.length) { U.toast('Informe o setor e ao menos um nome.', 'erro'); return false; }
            const obs = box.querySelector('#en-obs').value.trim() || null;
            await U.db(window.sb.from('escala_plantao').upsert(lista.map(nome => ({ data: dia, turno, setor, nome, observacao: obs })), { onConflict: 'data,turno,setor,nome' }));
            U.toast(`${lista.length} nome(s) incluído(s).`); await desenhar();
          } }],
        });
        el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => {
          const r = reg.find(x => String(x.id) === b.dataset.ed);
          U.formulario({ titulo: 'Editar lançamento', colunas: 1, valores: r,
            campos: [{ n: 'setor', rotulo: 'Setor', tipo: 'select', opcoes: SETORES, obrig: true, semVazio: true }, { n: 'nome', rotulo: 'Nome', obrig: true, max: 120 }, { n: 'observacao', rotulo: 'Observação', max: 120 }],
            aoSalvar: async v => { v.observacao = v.observacao || null; await U.db(window.sb.from('escala_plantao').update(v).eq('id', r.id)); U.toast('Escala atualizada.'); await desenhar(); } });
        });
        el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
          const r = reg.find(x => String(x.id) === b.dataset.ex);
          if (!await U.confirmar(`Remover ${r.nome} (${r.setor}) da escala?`, 'Remover', true)) return;
          try { await U.db(window.sb.from('escala_plantao').delete().eq('id', r.id)); await desenhar(); } catch (e) { U.erro(e); }
        });
        const cp = el.querySelector('#es-copia');
        if (cp) cp.onclick = () => U.modal({
          titulo: 'Copiar escala de outro dia', largura: 420,
          corpo: `<p style="margin-bottom:8px">Copia para <b>${U.fmtData(dia)} · ${esc(U.turnoNome(turno))}</b> tudo que foi lançado no dia/turno abaixo.</p><label class="fl">Copiar do dia</label><input type="date" id="cp-dia"><label class="fl">Do turno</label><select id="cp-turno">${U.TURNOS.map(t => `<option value="${t[0]}"${t[0] === turno ? ' selected' : ''}>${t[1]}</option>`).join('')}</select>`,
          botoes: [{ rotulo: 'Cancelar' }, { rotulo: 'Copiar', classe: 'btn-primary', acao: async box => {
            const d = box.querySelector('#cp-dia').value, t = box.querySelector('#cp-turno').value;
            if (!d) { U.toast('Escolha o dia.', 'erro'); return false; }
            const origem = await U.db(window.sb.from('escala_plantao').select('setor,nome,observacao').eq('data', d).eq('turno', t));
            if (!origem.length) { U.toast('Não há escala nesse dia/turno.', 'erro'); return false; }
            await U.db(window.sb.from('escala_plantao').upsert(origem.map(o => ({ ...o, data: dia, turno })), { onConflict: 'data,turno,setor,nome' }));
            U.toast(`${origem.length} lançamentos copiados.`); await desenhar();
          } }],
        });
      };
      await desenhar();
    },
  });
})();
