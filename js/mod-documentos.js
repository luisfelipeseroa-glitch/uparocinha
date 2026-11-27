/* Documentos Institucionais — todos veem; só gestores inserem, editam e excluem. */
(function () {
  'use strict';
  const U = window.UPA, esc = U.esc;
  const TIPOS = ['POP', 'Protocolo', 'Norma', 'Manual', 'Formulário', 'Ofício', 'Portaria', 'Documento'];
  const CAMPOS = [
    { n: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS, obrig: true, semVazio: true },
    { n: 'assunto', rotulo: 'Título / assunto', obrig: true, max: 250 },
    { n: 'status', rotulo: 'Situação', tipo: 'select', opcoes: ['Ativo', 'Inativo'], semVazio: true },
    { n: 'link', rotulo: 'Link (opcional)', tipo: 'url', ph: 'https://...', ajuda: 'Prefira anexar o arquivo abaixo; o link serve só para documentos que já existem em outro lugar.' },
  ];

  U.registrar({
    id: 'documentos', label: 'Documentos Institucionais', icone: 'fa-file-lines', cor: 'c-docs',
    async render(el) {
      const edita = U.can('documentos', 'editar'), cria = U.can('documentos', 'criar'), exclui = U.can('documentos', 'excluir');
      const desenhar = async () => {
        const docs = await U.db(window.sb.from('documentos').select('*').order('assunto'));
        const tipo = (el.querySelector('#dc-tipo') || {}).value || '';
        const busca = ((el.querySelector('#dc-busca') || {}).value || '').toLowerCase();
        el.innerHTML = (cria ? '' : U.leituraAviso('Somente gestores incluem, alteram ou excluem documentos.')) +
          `<div class="barra"><input type="text" id="dc-busca" placeholder="Buscar..." value="${esc(busca)}" style="max-width:240px;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:6px">
           <select id="dc-tipo" style="padding:9px;border:1.5px solid var(--gray-200);border-radius:6px"><option value="">Todos os tipos</option>${TIPOS.map(t => `<option${t === tipo ? ' selected' : ''}>${t}</option>`).join('')}</select>
           <span class="espaco"></span>${cria ? '<button class="btn btn-primary" id="dc-novo"><i class="fas fa-plus"></i> Novo documento</button>' : ''}</div><div id="dc-lista"></div>`;
        const lista = docs.filter(d => (edita || d.status === 'Ativo') && (!tipo || d.tipo === tipo) && d.assunto.toLowerCase().includes(busca));
        el.querySelector('#dc-lista').innerHTML = U.tabela([
          { t: 'Tipo', f: d => `<span class="tag azul">${esc(d.tipo)}</span>` },
          { t: 'Documento', f: d => `<b>${esc(d.assunto)}</b>` },
          { t: 'Situação', f: d => `<span class="tag ${d.status === 'Ativo' ? 'verde' : ''}">${esc(d.status)}</span>` },
          { t: 'Atualizado', f: d => U.fmtData(d.atualizado_em) },
          { t: '', f: d => `${d.arquivo_path || d.link ? `<button class="btn btn-ghost btn-icone" data-ab="${d.id}"><i class="fas fa-eye"></i> Abrir</button> ` : ''}${edita ? `<button class="btn btn-ghost btn-icone" data-ed="${d.id}"><i class="fas fa-pen"></i></button> ` : ''}${exclui ? `<button class="btn btn-ghost btn-icone" data-ex="${d.id}"><i class="fas fa-trash"></i></button>` : ''}` },
        ], lista, 'Nenhum documento encontrado.');
        el.querySelector('#dc-busca').oninput = desenhar; el.querySelector('#dc-tipo').onchange = desenhar;
        // manter foco no campo de busca após redesenhar
        const bi = el.querySelector('#dc-busca'); if (busca) { bi.focus(); bi.setSelectionRange(busca.length, busca.length); }
        const form = reg => {
          const m = U.formulario({
            titulo: reg ? 'Editar documento' : 'Novo documento', campos: CAMPOS, valores: reg || { tipo: 'POP', status: 'Ativo' }, colunas: 1,
            depois: `<label class="fl">Arquivo (PDF, Word, imagem — até 20 MB)</label><input type="file" id="dc-arq" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg">${reg && reg.arquivo_path ? '<div class="ajuda">Já há um arquivo anexado; enviar outro substitui o anterior.</div>' : ''}`,
            aoSalvar: async (v, box) => {
              const arq = box.querySelector('#dc-arq').files[0];
              v.link = v.link || null;
              if (!reg && !arq && !v.link) throw new Error('Anexe o arquivo ou informe um link.');
              let novoPath = null;
              if (arq) {
                if (arq.size > 20 * 1024 * 1024) throw new Error('Arquivo maior que 20 MB.');
                novoPath = `${Date.now()}_${U.nomeSeguro(arq.name)}`;
                await U.enviarArquivo('documentos', novoPath, arq);
                v.arquivo_path = novoPath;
              }
              if (reg) await U.db(window.sb.from('documentos').update(v).eq('id', reg.id));
              else await U.db(window.sb.from('documentos').insert(v));
              if (novoPath && reg && reg.arquivo_path) await window.sb.storage.from('documentos').remove([reg.arquivo_path]);
              U.toast('Documento salvo.'); await desenhar();
            },
          });
          return m;
        };
        const nv = el.querySelector('#dc-novo'); if (nv) nv.onclick = () => form(null);
        el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => form(docs.find(d => String(d.id) === b.dataset.ed)));
        el.querySelectorAll('[data-ab]').forEach(b => b.onclick = () => { const d = docs.find(x => String(x.id) === b.dataset.ab); if (d.arquivo_path) U.abrirArquivo('documentos', d.arquivo_path); else window.open(d.link, '_blank', 'noopener'); });
        el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => {
          const d = docs.find(x => String(x.id) === b.dataset.ex);
          if (!await U.confirmar(`Excluir "${d.assunto}"?`, 'Excluir', true)) return;
          try {
            await U.db(window.sb.from('documentos').delete().eq('id', d.id));
            if (d.arquivo_path) await window.sb.storage.from('documentos').remove([d.arquivo_path]);
            U.toast('Documento excluído.'); await desenhar();
          } catch (e) { U.erro(e); }
        });
      };
      await desenhar();
    },
  });
})();
