-- =====================================================================
-- 10_pops.sql — MÓDULO DE POPs (Procedimentos Operacionais Padrão)
-- Rode DEPOIS do 05_painel.sql (SQL Editor do Supabase → New query → Run).
-- Controla cada POP: código, título, área, responsável, versão, situação
-- (em elaboração / em revisão / publicado / obsoleto), datas de publicação
-- e de revisão, periodicidade e arquivo. Guarda o HISTÓRICO de versões.
-- Quem vê: todos veem os POPs PUBLICADOS; gestores veem todos.
-- Quem cadastra/edita: os 3 gestores. Excluir: só o Gestor Administrativo.
-- =====================================================================
create table if not exists public.pops (
  id                 bigint generated always as identity primary key,
  codigo             text not null,
  titulo             text not null,
  tipo               text not null default 'Assistencial' check (tipo in ('Assistencial','Administrativo','Apoio')),
  area               text not null,
  responsavel        text,
  versao             text not null default '1.0',
  status             text not null default 'em_elaboracao' check (status in ('em_elaboracao','em_revisao','publicado','obsoleto')),
  data_publicacao    date,
  data_ultima_revisao date,
  periodicidade_meses int not null default 24 check (periodicidade_meses between 1 and 60),
  resumo_alteracao   text,
  arquivo_path       text,
  arquivo_nome       text,
  criado_por         uuid, criado_por_nome text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint pops_codigo_formato check (codigo ~ '^[A-Za-z0-9._/-]{2,30}$'),
  constraint pops_codigo_key unique (codigo),
  constraint pops_titulo_ok check (char_length(trim(titulo)) between 3 and 250),
  constraint pops_area_ok check (char_length(trim(area)) between 2 and 80),
  constraint pops_versao_ok check (char_length(trim(versao)) between 1 and 20)
);
create index if not exists pops_idx on public.pops (status, area);

-- histórico: uma linha por versão (preenchida sozinha por gatilho)
create table if not exists public.pop_versoes (
  id            bigint generated always as identity primary key,
  pop_id        bigint not null references public.pops (id) on delete cascade,
  versao        text not null,
  data          date not null,
  responsavel   text,
  resumo        text,
  arquivo_path  text,
  arquivo_nome  text,
  registrado_por_nome text,
  registrado_em timestamptz not null default now(),
  unique (pop_id, versao)
);

-- permissões (também estão no 02_permissoes.sql, para não se perderem se ele for rodado de novo)
insert into public.permissoes (modulo, funcao, acao)
select 'pop', f.nome, 'ver' from public.funcoes f where f.grupo in ('gestor','adm','assistencial','apoio')
on conflict do nothing;
insert into public.permissoes (modulo, funcao, acao)
select 'pop', f.nome, a.acao from public.funcoes f, (values ('criar'), ('editar')) a(acao) where f.grupo = 'gestor'
on conflict do nothing;
insert into public.permissoes (modulo, funcao, acao) values ('pop', 'Gestor Administrativo', 'excluir')
on conflict do nothing;

-- carimba autoria no servidor (igual aos outros módulos)
drop trigger if exists t_carimbar on public.pops;
create trigger t_carimbar before insert or update on public.pops for each row execute function public.carimbar();

-- registra a versão no histórico sempre que a versão ou o arquivo mudam
create or replace function public.pop_historico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.versao is distinct from old.versao or new.arquivo_path is distinct from old.arquivo_path
     or new.resumo_alteracao is distinct from old.resumo_alteracao then
    insert into public.pop_versoes (pop_id, versao, data, responsavel, resumo, arquivo_path, arquivo_nome, registrado_por_nome)
    values (new.id, new.versao, coalesce(new.data_ultima_revisao, new.data_publicacao, (now() at time zone 'America/Sao_Paulo')::date),
            new.responsavel, new.resumo_alteracao, new.arquivo_path, new.arquivo_nome, public.meu_nome())
    on conflict (pop_id, versao) do update
      set data = excluded.data, responsavel = excluded.responsavel, resumo = excluded.resumo,
          arquivo_path = coalesce(excluded.arquivo_path, public.pop_versoes.arquivo_path),
          arquivo_nome = coalesce(excluded.arquivo_nome, public.pop_versoes.arquivo_nome),
          registrado_por_nome = excluded.registrado_por_nome, registrado_em = now();
  end if;
  return null;
end $$;
drop trigger if exists t_pop_historico on public.pops;
create trigger t_pop_historico after insert or update on public.pops for each row execute function public.pop_historico();
revoke execute on function public.pop_historico() from public, anon;

-- RLS: gestores veem tudo; os demais, só POPs publicados
alter table public.pops enable row level security;
drop policy if exists pops_sel on public.pops;
drop policy if exists pops_ins on public.pops;
drop policy if exists pops_upd on public.pops;
drop policy if exists pops_del on public.pops;
create policy pops_sel on public.pops for select to authenticated
  using (public.pode('pop', 'editar') or (public.pode('pop', 'ver') and status = 'publicado'));
create policy pops_ins on public.pops for insert to authenticated with check (public.pode('pop', 'criar'));
create policy pops_upd on public.pops for update to authenticated using (public.pode('pop', 'editar')) with check (public.pode('pop', 'editar'));
create policy pops_del on public.pops for delete to authenticated using (public.pode('pop', 'excluir'));
revoke all on public.pops from anon;

alter table public.pop_versoes enable row level security;
drop policy if exists pop_versoes_sel on public.pop_versoes;
create policy pop_versoes_sel on public.pop_versoes for select to authenticated
  using (public.pode('pop', 'editar') or exists (select 1 from public.pops p where p.id = pop_id and p.status = 'publicado' and public.pode('pop', 'ver')));
revoke all on public.pop_versoes from anon;
revoke insert, update, delete on public.pop_versoes from authenticated;      -- só pelo gatilho

-- arquivos: balde privado; gestores acessam tudo, os demais só arquivos de POP publicado
insert into storage.buckets (id, name, public, file_size_limit) values ('pops', 'pops', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
drop policy if exists "pops_ler" on storage.objects;
drop policy if exists "pops_ins" on storage.objects;
drop policy if exists "pops_del" on storage.objects;
create policy "pops_ler" on storage.objects for select to authenticated
  using (bucket_id = 'pops' and (public.pode('pop', 'editar')
         or exists (select 1 from public.pop_versoes v join public.pops p on p.id = v.pop_id
                     where v.arquivo_path = name and p.status = 'publicado' and public.pode('pop', 'ver'))));
create policy "pops_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'pops' and public.pode('pop', 'criar'));
create policy "pops_del" on storage.objects for delete to authenticated
  using (bucket_id = 'pops' and public.pode('pop', 'excluir'));

-- registro de quem fez o quê (só quem/quando, nunca o conteúdo)
do $$ begin
  if to_regprocedure('public.auditar()') is not null then
    drop trigger if exists t_auditar on public.pops;
    create trigger t_auditar after insert or update or delete on public.pops for each row execute function public.auditar();
  end if;
end $$;
