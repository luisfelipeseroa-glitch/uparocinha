-- =====================================================================
-- 09_ouvidoria.sql — CONTROLE GERENCIAL DE OUVIDORIAS
-- Rode DEPOIS do 05_painel.sql (SQL Editor do Supabase → New query → Run).
-- É um controle INTERNO: não substitui a plataforma oficial 1746.
-- Guarda só o necessário para acompanhar: nº do protocolo, data, categoria,
-- coordenação responsável, providência, prazo e situação da ação corretiva.
-- NÃO guarda nome do paciente, relato nem dado clínico, e o banco recusa
-- texto com cara de CPF, telefone, prontuário ou e-mail.
-- Acesso: só os 3 gestores (ver, criar, editar); excluir, só o Gestor Administrativo.
-- =====================================================================
create table if not exists public.ouvidorias (
  id                bigint generated always as identity primary key,
  protocolo         text not null,
  data_manifestacao date not null,
  categoria         text not null check (categoria in (
                      'Atendimento e acolhimento','Tempo de espera','Conduta de profissional','Estrutura e limpeza',
                      'Medicamentos e insumos','Exames e procedimentos','Documentos e processos administrativos',
                      'Elogio','Sugestão','Outros')),
  coordenacao       text not null check (coordenacao in ('Coordenação Administrativa','Coordenação Assistencial','RH Focal')),
  providencia       text not null,
  prazo             date not null,
  situacao          text not null default 'pendente' check (situacao in ('pendente','em_andamento','concluida','sem_acao')),
  criado_por        uuid, criado_por_nome text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  constraint ouvidorias_protocolo_formato check (protocolo ~ '^[A-Za-z0-9./-]{4,30}$'),
  constraint ouvidorias_protocolo_key unique (protocolo),
  constraint ouvidorias_providencia_tamanho check (char_length(trim(providencia)) between 5 and 500),
  -- proteção de dados: 9 ou mais dígitos seguidos (CPF, telefone, prontuário) ou e-mail não entram
  constraint ouvidorias_providencia_sem_dados_pessoais check (providencia !~ '(\d[ .()-]?){9,}' and providencia !~ '@'),
  constraint ouvidorias_prazo_ok check (prazo >= data_manifestacao)
);
create index if not exists ouvidorias_idx on public.ouvidorias (situacao, prazo);
alter table public.ouvidorias enable row level security;
drop policy if exists ouvidorias_sel on public.ouvidorias;
drop policy if exists ouvidorias_ins on public.ouvidorias;
drop policy if exists ouvidorias_upd on public.ouvidorias;
drop policy if exists ouvidorias_del on public.ouvidorias;
create policy ouvidorias_sel on public.ouvidorias for select to authenticated using (public.pode('ouvidoria', 'ver'));
create policy ouvidorias_ins on public.ouvidorias for insert to authenticated with check (public.pode('ouvidoria', 'criar'));
create policy ouvidorias_upd on public.ouvidorias for update to authenticated using (public.pode('ouvidoria', 'editar')) with check (public.pode('ouvidoria', 'editar'));
create policy ouvidorias_del on public.ouvidorias for delete to authenticated using (public.pode('ouvidoria', 'excluir'));
revoke all on public.ouvidorias from anon;
drop trigger if exists t_carimbar on public.ouvidorias;
create trigger t_carimbar before insert or update on public.ouvidorias for each row execute function public.carimbar();

-- permissões (também estão no 02_permissoes.sql, para não se perderem se ele for rodado de novo)
insert into public.permissoes (modulo, funcao, acao)
select 'ouvidoria', f.nome, a.acao
  from public.funcoes f, (values ('ver'), ('criar'), ('editar')) a(acao)
 where f.grupo = 'gestor'
on conflict do nothing;
insert into public.permissoes (modulo, funcao, acao) values ('ouvidoria', 'Gestor Administrativo', 'excluir')
on conflict do nothing;

-- registro de quem fez o quê (só quem/quando, nunca o conteúdo)
do $$ begin
  if to_regprocedure('public.auditar()') is not null then
    drop trigger if exists t_auditar on public.ouvidorias;
    create trigger t_auditar after insert or update or delete on public.ouvidorias for each row execute function public.auditar();
  end if;
end $$;
