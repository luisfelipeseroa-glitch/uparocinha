-- =====================================================================
-- 02_permissoes.sql — MATRIZ DE PERMISSÕES
-- Quem pode ver / criar / editar / excluir / receber em cada módulo.
--
-- Para mudar uma regra: edite a linha do módulo aqui e rode o arquivo de novo.
-- O site e o banco passam a valer a nova regra na hora (sem mexer em código).
--
-- Grupos (veja 01_base.sql):
--   gestor        Gestor Assistencial, Gestor Administrativo, RH Focal
--   adm           Recepcionista, Assistente Administrativo, Almoxarife, NIR, TI
--   assistencial  Médico, Pediatra, Enfermeiro, Téc. Enfermagem, Farmacêutico,
--                 Téc. Farmácia, Radiologista, Téc. Radiologia, Téc. Laboratório,
--                 Assistente Social
--   apoio         ASG (higienização), Vigilante, Maqueiro
--   terceiro      Manutenção, Refrigeração   (só enxergam Solicitação de Manutenção)
--   sem_acesso    Agente Regulador           (por enquanto não acessa nada)
-- =====================================================================

-- Ajudantes para montar as listas (apagados no final)
create or replace function public._grupo(p text) returns text[]
language sql stable as $$ select coalesce(array_agg(nome order by nome), '{}') from public.funcoes where grupo = p $$;

create or replace function public._dar(p_modulo text, p_acao text, p_funcoes text[])
returns void language plpgsql as $$
declare f text;
begin
  foreach f in array p_funcoes loop
    if not exists (select 1 from public.funcoes where nome = f) then
      raise exception 'Função inexistente na matriz: %', f;
    end if;
    insert into public.permissoes (modulo, funcao, acao) values (p_modulo, f, p_acao)
    on conflict do nothing;
  end loop;
end $$;

begin;

delete from public.permissoes;

do $matriz$
declare
  gestores     text[] := public._grupo('gestor');
  adms         text[] := public._grupo('adm');
  assistenc    text[] := public._grupo('assistencial');
  apoio        text[] := public._grupo('apoio');
  terceiros    text[] := public._grupo('terceiro');
  -- "todos" = todo mundo que entra no sistema (menos terceiros e Agente Regulador)
  todos        text[] := public._grupo('gestor') || public._grupo('adm')
                         || public._grupo('assistencial') || public._grupo('apoio');
begin
  -- Avisos Gerais (faixa da tela inicial): todos veem; gestores publicam
  perform public._dar('avisos', 'ver',     todos);
  perform public._dar('avisos', 'criar',   gestores);
  perform public._dar('avisos', 'editar',  gestores);
  perform public._dar('avisos', 'excluir', gestores);

  -- 1. Estoque de Insumos e Medicamentos: todos veem; gestores, farmacêuticos e almoxarife editam
  perform public._dar('estoque', 'ver',     todos);
  perform public._dar('estoque', 'criar',   gestores || array['Farmacêutico','Almoxarife']);
  perform public._dar('estoque', 'editar',  gestores || array['Farmacêutico','Almoxarife']);
  perform public._dar('estoque', 'excluir', gestores || array['Farmacêutico','Almoxarife']);

  -- 2. Calculadoras (um botão só): enfermeiros, téc. enfermagem, médicos, farmacêuticos e gestores
  perform public._dar('calculadoras', 'ver',
          gestores || array['Enfermeiro','Técnico de Enfermagem','Médico','Pediatra','Farmacêutico']);

  -- 3. Dieta e Nutrição: ver = enf, téc. enf, médico, gestor | solicitar = enf, médico, gestor
  perform public._dar('dieta', 'ver',
          gestores || array['Enfermeiro','Técnico de Enfermagem','Médico','Pediatra']);
  perform public._dar('dieta', 'criar',
          gestores || array['Enfermeiro','Médico','Pediatra']);
  perform public._dar('dieta', 'editar',  gestores);   -- cancelar solicitação lançada por engano

  -- 4. Documentos Institucionais: todos veem; só gestores inserem, editam e excluem
  perform public._dar('documentos', 'ver',     todos);
  perform public._dar('documentos', 'criar',   gestores);
  perform public._dar('documentos', 'editar',  gestores);
  perform public._dar('documentos', 'excluir', gestores);

  -- 5. Escala de Plantão: todos veem; só ADM e gestores editam, inserem e excluem
  perform public._dar('escala', 'ver',     todos);
  perform public._dar('escala', 'criar',   adms || gestores);
  perform public._dar('escala', 'editar',  adms || gestores);
  perform public._dar('escala', 'excluir', adms || gestores);

  -- 6. Evento Adverso: todos veem a tela e notificam; só gestores acessam o relatório
  perform public._dar('evento', 'ver',   todos);
  perform public._dar('evento', 'criar', todos);
  perform public._dar('evento_relatorio', 'ver',    gestores);
  perform public._dar('evento_relatorio', 'editar', gestores);   -- analisar / concluir

  -- 7. Passagem de Plantão: ver = assistenciais, gestores e ADM (não vigilante, ASG, maqueiro)
  --    inserir / editar / receber / excluir = ADM e gestores (gestor pode tudo)
  perform public._dar('passagem', 'ver',     assistenc || gestores || adms);
  perform public._dar('passagem', 'criar',   adms || gestores);
  perform public._dar('passagem', 'editar',  adms || gestores);
  perform public._dar('passagem', 'receber', adms || gestores);
  perform public._dar('passagem', 'excluir', adms || gestores);
  perform public._dar('passagem_auditoria', 'ver', gestores);    -- quem alterou/excluiu e por quê

  -- 8. Protocolos Clínicos: assistenciais e gestores (não ADM, vigilante, maqueiro, ASG)
  perform public._dar('protocolos', 'ver', assistenc || gestores);

  -- 9. Relatório Gerencial: todos veem; só gestores incluem, editam e excluem
  perform public._dar('relatorio', 'ver',     todos);
  perform public._dar('relatorio', 'criar',   gestores);
  perform public._dar('relatorio', 'editar',  gestores);
  perform public._dar('relatorio', 'excluir', gestores);

  -- 10. RH: todos solicitam; gestores autorizam
  perform public._dar('rh', 'ver',    todos);
  perform public._dar('rh', 'criar',  todos);
  perform public._dar('rh', 'editar', gestores);

  -- 11. Treinamento: todos fazem; gestores cadastram cursos e validam certificados
  perform public._dar('treinamento', 'ver',     todos);
  perform public._dar('treinamento', 'criar',   gestores);
  perform public._dar('treinamento', 'editar',  gestores);
  perform public._dar('treinamento', 'excluir', gestores);

  -- 12. Safety Huddle: todos
  perform public._dar('safety', 'ver',     todos);
  perform public._dar('safety', 'criar',   todos);
  perform public._dar('safety', 'editar',  gestores);
  perform public._dar('safety', 'excluir', gestores);

  -- 13. Solicitação de Manutenção: todos abrem chamado (inclui os terceiros);
  --     gestores e terceiros (Manutenção/Refrigeração) atendem
  perform public._dar('manutencao', 'ver',    todos || terceiros);
  perform public._dar('manutencao', 'criar',  todos || terceiros);
  perform public._dar('manutencao', 'editar', gestores || terceiros);

  -- 14. Sistemas (links externos): todos menos vigilante, maqueiro e ASG
  perform public._dar('sistemas', 'ver', gestores || adms || assistenc);

  -- 16. Chat: todos
  perform public._dar('chat', 'ver', todos);
end
$matriz$;

commit;

drop function public._dar(text, text, text[]);
drop function public._grupo(text);

-- Conferência: quantas permissões cada função recebeu
select f.grupo, f.nome as funcao, count(p.*) as permissoes
  from public.funcoes f
  left join public.permissoes p on p.funcao = f.nome
 group by f.grupo, f.nome
 order by f.grupo, f.nome;
