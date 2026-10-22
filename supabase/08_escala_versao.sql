-- =====================================================================
-- 08_escala_versao.sql — CONFIRMAÇÃO E VERSÃO DA ESCALA DE PLANTÃO
-- Rode DEPOIS do 03_modulos.sql (SQL Editor do Supabase → New query → Run).
-- Quem tem permissão de editar a escala (administração e gestores) pode
-- CONFIRMAR a escala de um dia/turno. Cada confirmação com conteúdo novo
-- gera a próxima VERSÃO (V1, V2, V3…) e guarda quem confirmou e quando.
-- O relatório impresso mostra versão, responsável, data/hora de emissão e
-- avisa se a escala foi alterada depois da última confirmação.
-- =====================================================================
create table if not exists public.escala_confirmacoes (
  id                    bigint generated always as identity primary key,
  data                  date not null,
  turno                 text not null check (turno in ('manha','tarde','noite')),
  versao                int  not null,
  hash                  text not null,          -- "impressão digital" do conteúdo confirmado
  total                 int  not null,          -- quantos lançamentos tinha
  confirmado_por        uuid,
  confirmado_por_nome   text,
  confirmado_matricula  text,
  confirmado_funcao     text,
  confirmado_em         timestamptz not null default now(),
  unique (data, turno, versao)
);
create index if not exists escala_confirmacoes_idx on public.escala_confirmacoes (data, turno, versao desc);
alter table public.escala_confirmacoes enable row level security;
drop policy if exists escala_confirmacoes_sel on public.escala_confirmacoes;
create policy escala_confirmacoes_sel on public.escala_confirmacoes for select to authenticated
  using (public.pode('escala', 'ver'));
revoke all on public.escala_confirmacoes from anon;
revoke insert, update, delete on public.escala_confirmacoes from authenticated;   -- só pela função abaixo

-- Impressão digital do conteúdo atual da escala do dia/turno
create or replace function public.escala_hash(p_data date, p_turno text)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode('escala', 'ver') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return (select md5(coalesce(string_agg(setor || '|' || nome || '|' || coalesce(observacao, ''), E'\n'
                                         order by setor, nome, coalesce(observacao, '')), ''))
            from public.escala_plantao where data = p_data and turno = p_turno);
end $$;

-- Confirma a escala do dia/turno; devolve a versão. Se nada mudou desde a última
-- confirmação, devolve a mesma versão (não cria V novo à toa).
create or replace function public.escala_confirmar(p_data date, p_turno text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_hash text; v_total int; v_ult public.escala_confirmacoes; v_nova public.escala_confirmacoes;
begin
  if not public.pode('escala', 'editar') then
    raise exception 'Somente a administração e os gestores confirmam a escala.' using errcode = '42501';
  end if;
  if p_turno not in ('manha', 'tarde', 'noite') then
    raise exception 'Turno inválido.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('escala:' || p_data::text || ':' || p_turno));
  select count(*) into v_total from public.escala_plantao where data = p_data and turno = p_turno;
  if v_total = 0 then
    raise exception 'Não há escala lançada para este dia e turno.' using errcode = 'P0002';
  end if;
  v_hash := public.escala_hash(p_data, p_turno);
  select * into v_ult from public.escala_confirmacoes where data = p_data and turno = p_turno order by versao desc limit 1;
  if found and v_ult.hash = v_hash then
    return jsonb_build_object('versao', v_ult.versao, 'hash', v_ult.hash, 'nova', false);
  end if;
  insert into public.escala_confirmacoes (data, turno, versao, hash, total, confirmado_por, confirmado_por_nome, confirmado_matricula, confirmado_funcao)
  values (p_data, p_turno, coalesce(v_ult.versao, 0) + 1, v_hash, v_total, auth.uid(), public.meu_nome(), public.minha_matricula(),
          (select funcao from public.profiles where id = auth.uid()))
  returning * into v_nova;
  return jsonb_build_object('versao', v_nova.versao, 'hash', v_nova.hash, 'nova', true);
end $$;

revoke execute on function public.escala_hash(date, text), public.escala_confirmar(date, text) from public, anon;
grant  execute on function public.escala_hash(date, text), public.escala_confirmar(date, text) to authenticated;
