-- =====================================================================
-- 05_painel.sql — PAINEL DO GESTOR, REGISTRO DE AÇÕES E TROCA → ESCALA
-- Rode DEPOIS de 01, 02, 03 e 04. Pode repetir sem medo.
--   1. Registro de acessos e de ações (quem fez o quê e quando)
--   2. Adesão ao sistema (quem já entrou e criou a senha)
--   3. Troca de plantão autorizada atualiza a Escala de Plantão
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. REGISTRO DE AÇÕES  (só gestores leem; ninguém grava direto)
-- ---------------------------------------------------------------------
create table if not exists public.auditoria (
  id                bigint generated always as identity primary key,
  em                timestamptz not null default now(),
  usuario_id        uuid,
  usuario_nome      text,
  usuario_matricula text,
  tipo              text not null check (tipo in ('acesso', 'acao')),
  acao              text not null,
  tabela            text,
  registro          text
);
create index if not exists auditoria_em_idx on public.auditoria (em desc);
alter table public.auditoria enable row level security;
drop policy if exists auditoria_sel on public.auditoria;
create policy auditoria_sel on public.auditoria for select to authenticated
  using (public.pode('painel', 'ver'));
revoke all on public.auditoria from anon;

-- Guarda só QUEM, O QUÊ e QUANDO (nunca o conteúdo do registro)
create or replace function public.auditar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria (usuario_id, usuario_nome, usuario_matricula, tipo, acao, tabela, registro)
  values (auth.uid(), public.meu_nome(), public.minha_matricula(), 'acao', lower(tg_op), tg_table_name,
          coalesce(case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id' else to_jsonb(new) ->> 'id' end, ''));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['avisos','estoque_itens','documentos','escala_plantao','eventos_adversos',
                           'passagem_cards','dieta_pedidos','indicadores_mensais','rh_solicitacoes',
                           'treinamentos','safety_huddles','manutencao_chamados']
  loop
    execute format('drop trigger if exists t_auditar on public.%I', t);
    execute format('create trigger t_auditar after insert or update or delete on public.%I for each row execute function public.auditar()', t);
  end loop;
end $$;

-- Login e troca de senha (chamadas pelo site logo depois do evento)
create or replace function public.registrar_acesso(p_acao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_acao not in ('login', 'senha_trocada') then
    raise exception 'Ação de acesso inválida.' using errcode = '22023';
  end if;
  if not public.sou_ativo() then return; end if;
  insert into public.auditoria (usuario_id, usuario_nome, usuario_matricula, tipo, acao)
  values (auth.uid(), public.meu_nome(), public.minha_matricula(), 'acesso', p_acao);
end $$;

-- ---------------------------------------------------------------------
-- 2. ADESÃO AO SISTEMA  (entrou = já criou a senha pessoal)
-- ---------------------------------------------------------------------
create or replace function public.adesao_resumo()
returns table (funcao text, grupo text, total bigint, entraram bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode('painel', 'ver') then
    raise exception 'Somente gestores acessam o painel.' using errcode = '42501';
  end if;
  return query
    select p.funcao, f.grupo, count(*)::bigint, count(*) filter (where not p.trocar_senha)::bigint
      from public.profiles p join public.funcoes f on f.nome = p.funcao
     where p.ativo
     group by p.funcao, f.grupo
     order by p.funcao;
end $$;

create or replace function public.adesao_pendentes()
returns table (matricula text, nome text, funcao text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode('painel', 'ver') then
    raise exception 'Somente gestores acessam o painel.' using errcode = '42501';
  end if;
  return query
    select p.matricula, p.nome, p.funcao from public.profiles p
     where p.ativo and p.trocar_senha
     order by p.funcao, p.nome;
end $$;

-- ---------------------------------------------------------------------
-- 3. TROCA AUTORIZADA → ESCALA
--    Quando o gestor autoriza uma troca, a escala troca os nomes
--    (só mexe se achar o nome nos dias/turnos informados; turnos de 12 h
--    não têm equivalente na escala e são ignorados).
-- ---------------------------------------------------------------------
create or replace function public._turno_escala(p text)
returns text language sql immutable as $$
  select case lower(trim(coalesce(p, '')))
           when 'manhã' then 'manha' when 'manha' then 'manha'
           when 'tarde' then 'tarde' when 'noite' then 'noite' else null end
$$;

create or replace function public.rh_troca_na_escala()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  d_o date; d_d date; t_o text; t_d text;
begin
  if new.tipo <> 'troca' or new.status <> 'autorizada' or old.status = 'autorizada' then return null; end if;
  begin
    d_o := (new.dados ->> 'dataOrigem')::date; d_d := (new.dados ->> 'dataDest')::date;
  exception when others then return null;
  end;
  t_o := public._turno_escala(new.dados ->> 'turnoOrigem');
  t_d := public._turno_escala(new.dados ->> 'turnoDest');
  -- quem pediu entrega o dia de origem ao colega
  if d_o is not null and t_o is not null then
    begin
      update public.escala_plantao
         set nome = new.segundo_nome, observacao = coalesce(observacao || ' · ', '') || 'Troca RH autorizada'
       where data = d_o and turno = t_o and lower(trim(nome)) = lower(trim(new.criado_por_nome));
    exception when unique_violation then null;
    end;
  end if;
  -- o colega entrega o dia de destino a quem pediu
  if d_d is not null and t_d is not null then
    begin
      update public.escala_plantao
         set nome = new.criado_por_nome, observacao = coalesce(observacao || ' · ', '') || 'Troca RH autorizada'
       where data = d_d and turno = t_d and lower(trim(nome)) = lower(trim(new.segundo_nome));
    exception when unique_violation then null;
    end;
  end if;
  return null;
end $$;
drop trigger if exists t_rh_escala on public.rh_solicitacoes;
create trigger t_rh_escala after update on public.rh_solicitacoes
  for each row execute function public.rh_troca_na_escala();

-- ---------------------------------------------------------------------
-- PERMISSÕES DE EXECUÇÃO
-- ---------------------------------------------------------------------
revoke execute on function public.auditar(), public.rh_troca_na_escala(), public._turno_escala(text) from public, anon;
revoke execute on function public.registrar_acesso(text), public.adesao_resumo(), public.adesao_pendentes() from public, anon;
grant execute on function public.registrar_acesso(text), public.adesao_resumo(), public.adesao_pendentes() to authenticated;
