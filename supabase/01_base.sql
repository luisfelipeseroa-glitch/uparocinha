-- =====================================================================
-- 01_base.sql — GESTÃO INTELIGENTE UPA ROCINHA
-- Funções, perfis, matriz de permissões e funções de checagem.
--
-- COMO RODAR: Supabase → SQL Editor → New query → colar tudo → Run.
-- Pode rodar de novo quando quiser (é seguro repetir).
-- Ordem dos arquivos: 01_base → 02_permissoes → 03_modulos → 04_storage
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FUNÇÕES (cargos) e GRUPOS
--    gestor | adm | assistencial | apoio | terceiro | sem_acesso
-- ---------------------------------------------------------------------
create table if not exists public.funcoes (
  nome  text primary key,
  grupo text not null check (grupo in ('gestor','adm','assistencial','apoio','terceiro','sem_acesso'))
);

insert into public.funcoes (nome, grupo) values
  ('Gestor Assistencial',        'gestor'),
  ('Gestor Administrativo',      'gestor'),
  ('RH Focal',                   'gestor'),
  ('Recepcionista',              'adm'),
  ('Assistente Administrativo',  'adm'),
  ('Almoxarife',                 'adm'),
  ('NIR',                        'adm'),
  ('TI',                         'adm'),
  ('Médico',                     'assistencial'),
  ('Pediatra',                   'assistencial'),
  ('Enfermeiro',                 'assistencial'),
  ('Técnico de Enfermagem',      'assistencial'),
  ('Farmacêutico',               'assistencial'),
  ('Técnico de Farmácia',        'assistencial'),
  ('Radiologista',               'assistencial'),
  ('Técnico de Radiologia',      'assistencial'),
  ('Técnico em Laboratório',     'assistencial'),
  ('Assistente Social',          'assistencial'),
  ('ASG',                        'apoio'),
  ('Vigilante',                  'apoio'),
  ('Maqueiro',                   'apoio'),
  ('Manutenção',                 'terceiro'),
  ('Refrigeração',               'terceiro'),
  ('Agente Regulador',           'sem_acesso')
on conflict (nome) do update set grupo = excluded.grupo;

-- ---------------------------------------------------------------------
-- 2. PERFIS (1 por usuário do Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  matricula    text not null unique,
  nome         text not null,
  funcao       text not null references public.funcoes (nome) on update cascade,
  ativo        boolean not null default true,
  trocar_senha boolean not null default true,
  criado_em    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. MATRIZ DE PERMISSÕES  (módulo × função × ação)
--    Existir a linha = a função pode fazer a ação.
--    É a ÚNICA fonte de regras: o servidor (RLS) e o menu do site leem daqui.
--    Quem preenche é o 02_permissoes.sql.
-- ---------------------------------------------------------------------
create table if not exists public.permissoes (
  modulo text not null,
  funcao text not null references public.funcoes (nome) on update cascade on delete cascade,
  acao   text not null check (acao in ('ver','criar','editar','excluir','receber')),
  primary key (modulo, funcao, acao)
);

-- ---------------------------------------------------------------------
-- 4. FUNÇÕES DE CHECAGEM (usadas pelas políticas RLS)
--    security definer = leem profiles/permissoes sem recursão de RLS.
-- ---------------------------------------------------------------------
create or replace function public.sou_ativo()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo);
$$;

create or replace function public.minha_funcao()
returns text
language sql stable security definer set search_path = public
as $$
  select funcao from public.profiles where id = auth.uid() and ativo;
$$;

create or replace function public.meu_nome()
returns text
language sql stable security definer set search_path = public
as $$
  select nome from public.profiles where id = auth.uid() and ativo;
$$;

create or replace function public.minha_matricula()
returns text
language sql stable security definer set search_path = public
as $$
  select matricula from public.profiles where id = auth.uid() and ativo;
$$;

create or replace function public.pode(p_modulo text, p_acao text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.profiles u
      join public.permissoes p on p.funcao = u.funcao
     where u.id = auth.uid()
       and u.ativo
       and p.modulo = p_modulo
       and p.acao   = p_acao
  );
$$;

-- Tudo que o site precisa saber sobre quem entrou, numa chamada só.
create or replace function public.meu_contexto()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'id',           u.id,
           'matricula',    u.matricula,
           'nome',         u.nome,
           'funcao',       u.funcao,
           'grupo',        f.grupo,
           'trocar_senha', u.trocar_senha,
           'permissoes',   coalesce((select jsonb_agg(p.modulo || ':' || p.acao order by p.modulo, p.acao)
                                       from public.permissoes p
                                      where p.funcao = u.funcao), '[]'::jsonb)
         )
    from public.profiles u
    join public.funcoes  f on f.nome = u.funcao
   where u.id = auth.uid() and u.ativo;
$$;

create or replace function public.marcar_senha_trocada()
returns void
language sql security definer set search_path = public
as $$
  update public.profiles set trocar_senha = false where id = auth.uid() and ativo;
$$;

-- Carimba autoria (quem criou/alterou) no servidor — o navegador não consegue falsificar.
create or replace function public.carimbar()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por      := auth.uid();
    new.criado_por_nome := (select nome from public.profiles where id = auth.uid());
    new.criado_em       := now();
  else
    new.criado_por      := old.criado_por;
    new.criado_por_nome := old.criado_por_nome;
    new.criado_em       := old.criado_em;
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. RLS nas tabelas desta etapa
-- ---------------------------------------------------------------------
alter table public.funcoes    enable row level security;
alter table public.profiles   enable row level security;
alter table public.permissoes enable row level security;

drop policy if exists funcoes_ler    on public.funcoes;
drop policy if exists profiles_ler   on public.profiles;
drop policy if exists permissoes_ler on public.permissoes;

create policy funcoes_ler    on public.funcoes    for select to authenticated using (public.sou_ativo());
create policy profiles_ler   on public.profiles   for select to authenticated using (public.sou_ativo());
create policy permissoes_ler on public.permissoes for select to authenticated using (public.sou_ativo());
-- Sem política de INSERT/UPDATE/DELETE: ninguém altera perfis ou permissões
-- pelo site. Isso só é feito pelo script de importação (chave de serviço) ou
-- pelo SQL Editor.

-- ---------------------------------------------------------------------
-- 6. PORTAS FECHADAS PARA QUEM NÃO ESTÁ LOGADO
-- ---------------------------------------------------------------------
revoke all on public.funcoes, public.profiles, public.permissoes from anon;
revoke execute on function public.sou_ativo(), public.minha_funcao(), public.meu_nome(),
                           public.minha_matricula(), public.pode(text, text),
                           public.meu_contexto(), public.marcar_senha_trocada(),
                           public.carimbar()
  from public, anon;
grant execute on function public.sou_ativo(), public.minha_funcao(), public.meu_nome(),
                          public.minha_matricula(), public.pode(text, text),
                          public.meu_contexto(), public.marcar_senha_trocada()
  to authenticated;
