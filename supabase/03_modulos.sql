-- =====================================================================
-- 03_modulos.sql — TABELAS DOS MÓDULOS + REGRAS (RLS)
-- Rode DEPOIS de 01_base.sql e 02_permissoes.sql. Pode repetir sem medo.
--
-- Regra de ouro: toda tabela tem RLS ligada e as políticas perguntam à matriz
-- (public.pode(módulo, ação)). Mesmo que alguém mexa no navegador, o banco recusa.
-- =====================================================================

-- Ajudante: cria as 4 políticas padrão (ver/criar/editar/excluir) de uma tabela
create or replace function public._rls_padrao(p_tabela text, p_modulo text)
returns void language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_sel', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_ins', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_upd', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_del', p_tabela);
  execute format('create policy %I on public.%I for select to authenticated using (public.pode(%L, ''ver''))',
                 p_tabela || '_sel', p_tabela, p_modulo);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.pode(%L, ''criar''))',
                 p_tabela || '_ins', p_tabela, p_modulo);
  execute format('create policy %I on public.%I for update to authenticated using (public.pode(%L, ''editar'')) with check (public.pode(%L, ''editar''))',
                 p_tabela || '_upd', p_tabela, p_modulo, p_modulo);
  execute format('create policy %I on public.%I for delete to authenticated using (public.pode(%L, ''excluir''))',
                 p_tabela || '_del', p_tabela, p_modulo);
  execute format('drop trigger if exists t_carimbar on public.%I', p_tabela);
  execute format('create trigger t_carimbar before insert or update on public.%I for each row execute function public.carimbar()', p_tabela);
end $$;

-- =====================================================================
-- AVISOS GERAIS (faixa da tela inicial)
-- =====================================================================
create table if not exists public.avisos (
  id              bigint generated always as identity primary key,
  tipo            text not null default 'Info',
  assunto         text not null check (char_length(trim(assunto)) > 0),
  status          text not null default 'ATIVO' check (status in ('ATIVO','INATIVO')),
  data_hora       timestamptz not null default now(),
  criado_por      uuid, criado_por_nome text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
select public._rls_padrao('avisos', 'avisos');

-- =====================================================================
-- 1. ESTOQUE DE INSUMOS E MEDICAMENTOS  (farmácia + almoxarifado)
-- =====================================================================
create table if not exists public.estoque_itens (
  id              bigint generated always as identity primary key,
  setor           text not null check (setor in ('farmacia','almoxarifado')),
  insumo          text not null check (char_length(trim(insumo)) > 0),
  quantidade      numeric not null default 0 check (quantidade >= 0),
  duracao         text,
  recomendacao    text,
  criado_por      uuid, criado_por_nome text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (setor, insumo)
);
select public._rls_padrao('estoque_itens', 'estoque');

create table if not exists public.estoque_log (
  id           bigint generated always as identity primary key,
  item_id      bigint,
  setor        text,
  insumo       text,
  acao         text,
  qtd_antes    numeric,
  qtd_depois   numeric,
  usuario      uuid,
  usuario_nome text,
  em           timestamptz not null default now()
);
alter table public.estoque_log enable row level security;
drop policy if exists estoque_log_sel on public.estoque_log;
create policy estoque_log_sel on public.estoque_log for select to authenticated
  using (public.pode('estoque', 'editar'));

create or replace function public.estoque_registrar_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.estoque_log (item_id, setor, insumo, acao, qtd_antes, qtd_depois, usuario, usuario_nome)
    values (new.id, new.setor, new.insumo, 'inclusao', null, new.quantidade, auth.uid(), public.meu_nome());
    return new;
  elsif tg_op = 'UPDATE' then
    if new.quantidade is distinct from old.quantidade or new.insumo is distinct from old.insumo then
      insert into public.estoque_log (item_id, setor, insumo, acao, qtd_antes, qtd_depois, usuario, usuario_nome)
      values (new.id, new.setor, new.insumo, 'edicao', old.quantidade, new.quantidade, auth.uid(), public.meu_nome());
    end if;
    return new;
  else
    insert into public.estoque_log (item_id, setor, insumo, acao, qtd_antes, qtd_depois, usuario, usuario_nome)
    values (old.id, old.setor, old.insumo, 'exclusao', old.quantidade, null, auth.uid(), public.meu_nome());
    return old;
  end if;
end $$;

drop trigger if exists t_estoque_log on public.estoque_itens;
create trigger t_estoque_log after insert or update or delete on public.estoque_itens
  for each row execute function public.estoque_registrar_log();

-- =====================================================================
-- 4. DOCUMENTOS INSTITUCIONAIS
-- =====================================================================
create table if not exists public.documentos (
  id              bigint generated always as identity primary key,
  tipo            text not null default 'Documento',
  assunto         text not null check (char_length(trim(assunto)) > 0),
  status          text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  link            text,
  arquivo_path    text,
  criado_por      uuid, criado_por_nome text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
select public._rls_padrao('documentos', 'documentos');

-- =====================================================================
-- 5. ESCALA DE PLANTÃO  (quem está em cada setor, por data e turno)
-- =====================================================================
create table if not exists public.escala_plantao (
  id              bigint generated always as identity primary key,
  data            date not null,
  turno           text not null check (turno in ('manha','tarde','noite')),
  setor           text not null check (char_length(trim(setor)) > 0),
  nome            text not null check (char_length(trim(nome)) > 0),
  observacao      text,
  criado_por      uuid, criado_por_nome text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (data, turno, setor, nome)
);
select public._rls_padrao('escala_plantao', 'escala');
create index if not exists escala_plantao_data_idx on public.escala_plantao (data, turno);

-- =====================================================================
-- 6. EVENTO ADVERSO
--    Todos notificam (só pela função evento_notificar); só gestores leem o relatório.
-- =====================================================================
create table if not exists public.eventos_adversos (
  id                  bigint generated always as identity primary key,
  data_evento         date not null,
  hora_evento         time,
  setor               text not null,
  local_evento        text,
  tipo                text not null,
  grau                text not null check (grau in ('quase_erro','sem_dano','leve','moderado','grave','obito')),
  paciente_nome       text,
  paciente_prontuario text,
  descricao           text not null check (char_length(trim(descricao)) >= 10),
  acao_imediata       text,
  anonimo             boolean not null default false,
  status              text not null default 'nova' check (status in ('nova','em_analise','concluida')),
  analise             text,
  plano_acao          text,
  analisado_por       uuid, analisado_por_nome text, analisado_em timestamptz,
  criado_por          uuid, criado_por_nome text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
alter table public.eventos_adversos enable row level security;
drop policy if exists eventos_adversos_sel on public.eventos_adversos;
drop policy if exists eventos_adversos_upd on public.eventos_adversos;
create policy eventos_adversos_sel on public.eventos_adversos for select to authenticated
  using (public.pode('evento_relatorio', 'ver'));
create policy eventos_adversos_upd on public.eventos_adversos for update to authenticated
  using (public.pode('evento_relatorio', 'editar')) with check (public.pode('evento_relatorio', 'editar'));
-- Sem INSERT direto: a notificação entra por public.evento_notificar().

create or replace function public.evento_antes_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- o gestor só pode mexer na análise; o relato original é imutável
  new.data_evento := old.data_evento; new.hora_evento := old.hora_evento; new.setor := old.setor;
  new.local_evento := old.local_evento; new.tipo := old.tipo; new.grau := old.grau;
  new.paciente_nome := old.paciente_nome; new.paciente_prontuario := old.paciente_prontuario;
  new.descricao := old.descricao; new.acao_imediata := old.acao_imediata; new.anonimo := old.anonimo;
  new.criado_por := old.criado_por; new.criado_por_nome := old.criado_por_nome; new.criado_em := old.criado_em;
  new.atualizado_em := now();
  if new.status is distinct from old.status or new.analise is distinct from old.analise
     or new.plano_acao is distinct from old.plano_acao then
    new.analisado_por := auth.uid();
    new.analisado_por_nome := public.meu_nome();
    new.analisado_em := now();
  end if;
  return new;
end $$;
drop trigger if exists t_evento_upd on public.eventos_adversos;
create trigger t_evento_upd before update on public.eventos_adversos
  for each row execute function public.evento_antes_update();

create or replace function public.evento_notificar(p_dados jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_anon boolean := coalesce((p_dados->>'anonimo')::boolean, false);
begin
  if not public.pode('evento', 'criar') then
    raise exception 'Sem permissão para notificar evento adverso.' using errcode = '42501';
  end if;
  insert into public.eventos_adversos
    (data_evento, hora_evento, setor, local_evento, tipo, grau, paciente_nome, paciente_prontuario,
     descricao, acao_imediata, anonimo, criado_por, criado_por_nome)
  values
    ((p_dados->>'data_evento')::date,
     nullif(p_dados->>'hora_evento', '')::time,
     p_dados->>'setor',
     nullif(trim(p_dados->>'local_evento'), ''),
     p_dados->>'tipo',
     p_dados->>'grau',
     nullif(trim(p_dados->>'paciente_nome'), ''),
     nullif(trim(p_dados->>'paciente_prontuario'), ''),
     trim(p_dados->>'descricao'),
     nullif(trim(p_dados->>'acao_imediata'), ''),
     v_anon,
     case when v_anon then null else auth.uid() end,
     case when v_anon then null else public.meu_nome() end)
  returning id into v_id;
  return v_id;
end $$;

-- =====================================================================
-- 7. PASSAGEM DE PLANTÃO
--    ver = assistenciais, gestores, ADM | inserir/editar/receber/excluir = ADM
--    Editar e excluir EXIGEM motivo e ficam registrados (passagem_auditoria).
-- =====================================================================
create table if not exists public.passagem_cards (
  id               uuid primary key default gen_random_uuid(),
  data_plantao     date not null default (now() at time zone 'America/Sao_Paulo')::date,
  turno            text not null check (turno in ('manha','tarde','noite')),
  lotacao          text not null default 'normal' check (lotacao in ('normal','alerta','critica')),
  paciente         text not null check (char_length(trim(paciente)) > 0),
  leito            text not null check (char_length(trim(leito)) > 0),
  diagnostico      text not null check (char_length(trim(diagnostico)) > 0),
  prioridade       text not null check (prioridade in ('critico','atencao','estavel')),
  pendencia        text,
  intercorrencias  text,
  observacoes      text,
  recebido_por     uuid, recebido_por_nome text, recebido_em timestamptz,
  criado_por       uuid, criado_por_nome text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists passagem_cards_data_idx on public.passagem_cards (data_plantao, turno);
alter table public.passagem_cards enable row level security;
drop policy if exists passagem_cards_sel on public.passagem_cards;
drop policy if exists passagem_cards_ins on public.passagem_cards;
create policy passagem_cards_sel on public.passagem_cards for select to authenticated
  using (public.pode('passagem', 'ver'));
create policy passagem_cards_ins on public.passagem_cards for insert to authenticated
  with check (public.pode('passagem', 'criar'));
-- Sem UPDATE/DELETE direto: só pelas funções abaixo (que exigem o motivo).
drop trigger if exists t_carimbar on public.passagem_cards;
create trigger t_carimbar before insert or update on public.passagem_cards
  for each row execute function public.carimbar();

create table if not exists public.passagem_auditoria (
  id            bigint generated always as identity primary key,
  card_id       uuid not null,
  acao          text not null check (acao in ('editar','excluir')),
  motivo        text not null check (char_length(trim(motivo)) >= 5),
  dados_antes   jsonb,
  dados_depois  jsonb,
  usuario       uuid,
  usuario_nome  text,
  em            timestamptz not null default now()
);
alter table public.passagem_auditoria enable row level security;
drop policy if exists passagem_auditoria_sel on public.passagem_auditoria;
create policy passagem_auditoria_sel on public.passagem_auditoria for select to authenticated
  using (public.pode('passagem_auditoria', 'ver'));

create table if not exists public.passagem_fechamentos (
  id             bigint generated always as identity primary key,
  data_plantao   date not null,
  turno          text not null check (turno in ('manha','tarde','noite')),
  total_cards    int  not null default 0,
  pdf_path       text,
  criado_por     uuid, criado_por_nome text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
alter table public.passagem_fechamentos enable row level security;
drop policy if exists passagem_fechamentos_sel on public.passagem_fechamentos;
drop policy if exists passagem_fechamentos_ins on public.passagem_fechamentos;
create policy passagem_fechamentos_sel on public.passagem_fechamentos for select to authenticated
  using (public.pode('passagem', 'ver'));
create policy passagem_fechamentos_ins on public.passagem_fechamentos for insert to authenticated
  with check (public.pode('passagem', 'criar'));
drop trigger if exists t_carimbar on public.passagem_fechamentos;
create trigger t_carimbar before insert or update on public.passagem_fechamentos
  for each row execute function public.carimbar();

create or replace function public.passagem_editar(p_id uuid, p_dados jsonb, p_motivo text)
returns public.passagem_cards language plpgsql security definer set search_path = public as $$
declare v_antes public.passagem_cards; v_depois public.passagem_cards;
begin
  if not public.pode('passagem', 'editar') then
    raise exception 'Sem permissão para editar a passagem de plantão.' using errcode = '42501';
  end if;
  if p_motivo is null or char_length(trim(p_motivo)) < 5 then
    raise exception 'Informe o motivo da alteração (mínimo 5 caracteres).' using errcode = '22023';
  end if;
  select * into v_antes from public.passagem_cards where id = p_id for update;
  if not found then
    raise exception 'Registro não encontrado.' using errcode = 'P0002';
  end if;
  update public.passagem_cards set
    turno           = coalesce(nullif(p_dados->>'turno', ''), turno),
    lotacao         = coalesce(nullif(p_dados->>'lotacao', ''), lotacao),
    paciente        = coalesce(nullif(trim(p_dados->>'paciente'), ''), paciente),
    leito           = coalesce(nullif(trim(p_dados->>'leito'), ''), leito),
    diagnostico     = coalesce(nullif(trim(p_dados->>'diagnostico'), ''), diagnostico),
    prioridade      = coalesce(nullif(p_dados->>'prioridade', ''), prioridade),
    pendencia       = case when p_dados ? 'pendencia'       then nullif(trim(p_dados->>'pendencia'), '')       else pendencia end,
    intercorrencias = case when p_dados ? 'intercorrencias' then nullif(trim(p_dados->>'intercorrencias'), '') else intercorrencias end,
    observacoes     = case when p_dados ? 'observacoes'     then nullif(trim(p_dados->>'observacoes'), '')     else observacoes end
  where id = p_id
  returning * into v_depois;
  insert into public.passagem_auditoria (card_id, acao, motivo, dados_antes, dados_depois, usuario, usuario_nome)
  values (p_id, 'editar', trim(p_motivo), to_jsonb(v_antes), to_jsonb(v_depois), auth.uid(), public.meu_nome());
  return v_depois;
end $$;

create or replace function public.passagem_excluir(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes public.passagem_cards;
begin
  if not public.pode('passagem', 'excluir') then
    raise exception 'Sem permissão para excluir da passagem de plantão.' using errcode = '42501';
  end if;
  if p_motivo is null or char_length(trim(p_motivo)) < 5 then
    raise exception 'Informe o motivo da exclusão (mínimo 5 caracteres).' using errcode = '22023';
  end if;
  select * into v_antes from public.passagem_cards where id = p_id for update;
  if not found then
    raise exception 'Registro não encontrado.' using errcode = 'P0002';
  end if;
  insert into public.passagem_auditoria (card_id, acao, motivo, dados_antes, dados_depois, usuario, usuario_nome)
  values (p_id, 'excluir', trim(p_motivo), to_jsonb(v_antes), null, auth.uid(), public.meu_nome());
  delete from public.passagem_cards where id = p_id;
end $$;

create or replace function public.passagem_receber(p_id uuid)
returns public.passagem_cards language plpgsql security definer set search_path = public as $$
declare v public.passagem_cards;
begin
  if not public.pode('passagem', 'receber') then
    raise exception 'Sem permissão para receber a passagem de plantão.' using errcode = '42501';
  end if;
  update public.passagem_cards
     set recebido_por = auth.uid(), recebido_por_nome = public.meu_nome(), recebido_em = now()
   where id = p_id and recebido_em is null
  returning * into v;
  if not found then
    raise exception 'Registro não encontrado ou já recebido.' using errcode = 'P0002';
  end if;
  return v;
end $$;

-- =====================================================================
-- 3. DIETA E NUTRIÇÃO
-- =====================================================================
create table if not exists public.dieta_pedidos (
  id                    uuid primary key default gen_random_uuid(),
  paciente              text not null check (char_length(trim(paciente)) > 0),
  leito                 text not null check (char_length(trim(leito)) > 0),
  idade                 text,
  peso_kg               numeric check (peso_kg is null or (peso_kg > 0 and peso_kg < 400)),
  diagnostico           text,
  tipo_dieta            text not null check (tipo_dieta in
                          ('Geral','Branda','Pastosa','Líquida Completa','Líquida Restrita','Dieta Zero')),
  consistencia          text,
  volume                text,
  restricoes            text[] not null default '{}',
  outras_restricoes     text,
  enteral               boolean not null default false,
  enteral_formula       text,
  enteral_via           text,
  enteral_volume_ml_h   numeric check (enteral_volume_ml_h is null or enteral_volume_ml_h >= 0),
  enteral_velocidade    text,
  observacoes           text,
  solicitante_categoria text,
  registro_profissional text,
  status                text not null default 'solicitada' check (status in ('solicitada','cancelada')),
  cancelado_motivo      text,
  cancelado_por_nome    text,
  cancelado_em          timestamptz,
  criado_por            uuid, criado_por_nome text,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);
create index if not exists dieta_pedidos_data_idx on public.dieta_pedidos (criado_em desc);
alter table public.dieta_pedidos enable row level security;
drop policy if exists dieta_pedidos_sel on public.dieta_pedidos;
drop policy if exists dieta_pedidos_ins on public.dieta_pedidos;
create policy dieta_pedidos_sel on public.dieta_pedidos for select to authenticated
  using (public.pode('dieta', 'ver'));
create policy dieta_pedidos_ins on public.dieta_pedidos for insert to authenticated
  with check (public.pode('dieta', 'criar'));

create or replace function public.dieta_antes_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.criado_por := auth.uid();
  new.criado_por_nome := public.meu_nome();
  new.criado_em := now();
  new.atualizado_em := now();
  new.solicitante_categoria := public.minha_funcao();
  new.status := 'solicitada';
  new.cancelado_motivo := null; new.cancelado_por_nome := null; new.cancelado_em := null;
  if not new.enteral then
    new.enteral_formula := null; new.enteral_via := null;
    new.enteral_volume_ml_h := null; new.enteral_velocidade := null;
  end if;
  return new;
end $$;
drop trigger if exists t_dieta_ins on public.dieta_pedidos;
create trigger t_dieta_ins before insert on public.dieta_pedidos
  for each row execute function public.dieta_antes_insert();

create or replace function public.dieta_cancelar(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode('dieta', 'editar') then
    raise exception 'Sem permissão para cancelar a solicitação de dieta.' using errcode = '42501';
  end if;
  if p_motivo is null or char_length(trim(p_motivo)) < 5 then
    raise exception 'Informe o motivo do cancelamento (mínimo 5 caracteres).' using errcode = '22023';
  end if;
  update public.dieta_pedidos
     set status = 'cancelada', cancelado_motivo = trim(p_motivo),
         cancelado_por_nome = public.meu_nome(), cancelado_em = now(), atualizado_em = now()
   where id = p_id and status = 'solicitada';
  if not found then
    raise exception 'Solicitação não encontrada ou já cancelada.' using errcode = 'P0002';
  end if;
end $$;

-- =====================================================================
-- 9. RELATÓRIO GERENCIAL (um registro por mês)
--    tempos em MINUTOS; satisfação em %
-- =====================================================================
create table if not exists public.indicadores_mensais (
  id                bigint generated always as identity primary key,
  ano               smallint not null check (ano between 2020 and 2100),
  mes               smallint not null check (mes between 1 and 12),
  cadastros         int check (cadastros is null or cadastros >= 0),
  classificados     int check (classificados is null or classificados >= 0),
  atendidos         int check (atendidos is null or atendidos >= 0),
  class_vermelho    int, class_laranja int, class_amarelo int, class_verde int, class_azul int,
  raio_x            int,
  tme_geral_min     numeric, tme_vermelho_min numeric, tme_laranja_min numeric,
  tme_amarelo_min   numeric, tme_verde_min numeric, tme_azul_min numeric,
  permanencia_min   numeric,
  internacoes       int,
  obitos_menos_24h  int, obitos_mais_24h int,
  avc               int, iam int, sepse int, sinan int,
  satisfacao        numeric check (satisfacao is null or (satisfacao >= 0 and satisfacao <= 100)),
  observacoes       text,
  criado_por        uuid, criado_por_nome text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (ano, mes)
);
select public._rls_padrao('indicadores_mensais', 'relatorio');

-- =====================================================================
-- 10. RH — solicitações (troca, extra, RPA, justificativa de ponto, atestado)
-- =====================================================================
create table if not exists public.rh_solicitacoes (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null check (tipo in ('troca','extra','rpa','ponto','atestado')),
  matricula          text,
  profissao          text,
  setor              text,
  dados              jsonb not null default '{}'::jsonb,
  assinatura         text,
  segundo_nome       text, segundo_matricula text, segundo_assinatura text, segundo_em timestamptz,
  anexo_path         text,
  status             text not null default 'pendente'
                       check (status in ('aguardando_colega','pendente','autorizada','recusada','cancelada')),
  decidido_por       uuid, decidido_por_nome text, decidido_em timestamptz,
  decisao_obs        text, assinatura_gestor text,
  criado_por         uuid, criado_por_nome text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
create index if not exists rh_solicitacoes_status_idx on public.rh_solicitacoes (status, criado_em desc);
alter table public.rh_solicitacoes enable row level security;
drop policy if exists rh_solicitacoes_sel on public.rh_solicitacoes;
drop policy if exists rh_solicitacoes_ins on public.rh_solicitacoes;
create policy rh_solicitacoes_sel on public.rh_solicitacoes for select to authenticated
  using (criado_por = auth.uid()
         or public.pode('rh', 'editar')
         or (segundo_matricula is not null and segundo_matricula = public.minha_matricula()));
create policy rh_solicitacoes_ins on public.rh_solicitacoes for insert to authenticated
  with check (public.pode('rh', 'criar'));

create or replace function public.rh_antes_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.criado_por := auth.uid();
  new.criado_por_nome := public.meu_nome();
  new.matricula := public.minha_matricula();
  new.criado_em := now();
  new.atualizado_em := now();
  new.status := case when new.tipo = 'troca' then 'aguardando_colega' else 'pendente' end;
  new.segundo_assinatura := null; new.segundo_em := null;
  new.decidido_por := null; new.decidido_por_nome := null; new.decidido_em := null;
  new.decisao_obs := null; new.assinatura_gestor := null;
  if new.tipo = 'troca' and (new.segundo_matricula is null or new.segundo_nome is null) then
    raise exception 'Troca exige nome e matrícula do segundo membro.' using errcode = '22023';
  end if;
  if new.tipo = 'troca' and new.segundo_matricula = new.matricula then
    raise exception 'O segundo membro da troca deve ser outra pessoa.' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists t_rh_ins on public.rh_solicitacoes;
create trigger t_rh_ins before insert on public.rh_solicitacoes
  for each row execute function public.rh_antes_insert();

create or replace function public.rh_decidir(p_id uuid, p_aprovar boolean, p_obs text, p_assinatura text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rh_solicitacoes;
begin
  if not public.pode('rh', 'editar') then
    raise exception 'Somente gestores podem autorizar solicitações.' using errcode = '42501';
  end if;
  select * into r from public.rh_solicitacoes where id = p_id for update;
  if not found then raise exception 'Solicitação não encontrada.' using errcode = 'P0002'; end if;
  if r.criado_por = auth.uid() then
    raise exception 'Você não pode autorizar a sua própria solicitação.' using errcode = '42501';
  end if;
  if r.status <> 'pendente' then
    raise exception 'A solicitação não está pendente de autorização (situação: %).', r.status using errcode = '22023';
  end if;
  if not p_aprovar and (p_obs is null or char_length(trim(p_obs)) < 3) then
    raise exception 'Informe o motivo da recusa.' using errcode = '22023';
  end if;
  update public.rh_solicitacoes
     set status = case when p_aprovar then 'autorizada' else 'recusada' end,
         decidido_por = auth.uid(), decidido_por_nome = public.meu_nome(), decidido_em = now(),
         decisao_obs = nullif(trim(p_obs), ''),
         assinatura_gestor = case when p_aprovar then p_assinatura else null end,
         atualizado_em = now()
   where id = p_id;
end $$;

create or replace function public.rh_cancelar(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.rh_solicitacoes
     set status = 'cancelada', atualizado_em = now()
   where id = p_id and criado_por = auth.uid() and status in ('aguardando_colega','pendente');
  if not found then
    raise exception 'Só é possível cancelar a sua própria solicitação ainda não decidida.' using errcode = '42501';
  end if;
end $$;

create or replace function public.rh_colega_assinar(p_id uuid, p_assinatura text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_assinatura is null or char_length(p_assinatura) < 50 then
    raise exception 'Assinatura obrigatória.' using errcode = '22023';
  end if;
  update public.rh_solicitacoes
     set segundo_assinatura = p_assinatura, segundo_em = now(), status = 'pendente', atualizado_em = now()
   where id = p_id and tipo = 'troca' and status = 'aguardando_colega'
     and segundo_matricula = public.minha_matricula();
  if not found then
    raise exception 'Esta troca não está aguardando a sua assinatura.' using errcode = '42501';
  end if;
end $$;

-- =====================================================================
-- 11. TREINAMENTO
-- =====================================================================
create table if not exists public.treinamentos (
  id              bigint generated always as identity primary key,
  titulo          text not null check (char_length(trim(titulo)) > 0),
  descricao       text,
  funcoes         text[] not null default '{}',     -- vazio = todas as funções
  carga_horaria   numeric,                           -- em horas
  material_url    text,
  material_path   text,
  nota_minima     int not null default 70 check (nota_minima between 0 and 100),
  obrigatorio     boolean not null default false,
  ativo           boolean not null default true,
  criado_por      uuid, criado_por_nome text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
select public._rls_padrao('treinamentos', 'treinamento');

create table if not exists public.treinamento_questoes (
  id              bigint generated always as identity primary key,
  treinamento_id  bigint not null references public.treinamentos (id) on delete cascade,
  ordem           int not null,
  enunciado       text not null,
  opcoes          jsonb not null,
  correta         int not null check (correta >= 0),
  unique (treinamento_id, ordem)
);
alter table public.treinamento_questoes enable row level security;
drop policy if exists treinamento_questoes_all on public.treinamento_questoes;
-- O gabarito (coluna "correta") só é visível para quem edita cursos.
create policy treinamento_questoes_all on public.treinamento_questoes for all to authenticated
  using (public.pode('treinamento', 'editar')) with check (public.pode('treinamento', 'editar'));

create table if not exists public.treinamento_registros (
  id                 bigint generated always as identity primary key,
  treinamento_id     bigint not null references public.treinamentos (id) on delete cascade,
  usuario_id         uuid not null,
  usuario_nome       text, matricula text, funcao text,
  tentativa          int not null default 1,
  nota               int not null,
  aprovado           boolean not null,
  concluido_em       timestamptz not null default now(),
  validado_por       uuid, validado_por_nome text, validado_em timestamptz
);
create index if not exists treinamento_registros_idx on public.treinamento_registros (treinamento_id, usuario_id);
alter table public.treinamento_registros enable row level security;
drop policy if exists treinamento_registros_sel on public.treinamento_registros;
create policy treinamento_registros_sel on public.treinamento_registros for select to authenticated
  using (usuario_id = auth.uid() or public.pode('treinamento', 'editar'));

create or replace function public.treinamento_prova(p_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode('treinamento', 'ver') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('ordem', ordem, 'enunciado', enunciado, 'opcoes', opcoes)
                                    order by ordem)
                     from public.treinamento_questoes where treinamento_id = p_id), '[]'::jsonb);
end $$;

create or replace function public.treinamento_responder(p_id bigint, p_respostas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_total int; v_acertos int; v_nota int; v_min int; v_tent int; v_id bigint; v_aprov boolean;
begin
  if not public.pode('treinamento', 'ver') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select nota_minima into v_min from public.treinamentos where id = p_id and ativo;
  if not found then raise exception 'Treinamento não encontrado ou inativo.' using errcode = 'P0002'; end if;
  select count(*) into v_total from public.treinamento_questoes where treinamento_id = p_id;
  if v_total = 0 then
    v_acertos := 0; v_nota := 100; v_aprov := true;           -- sem prova: confirma a participação
  else
    select count(*) into v_acertos
      from public.treinamento_questoes q
     where q.treinamento_id = p_id
       and nullif(p_respostas ->> q.ordem::text, '')::int = q.correta;
    v_nota := round(100.0 * v_acertos / v_total);
    v_aprov := v_nota >= v_min;
  end if;
  select coalesce(max(tentativa), 0) + 1 into v_tent
    from public.treinamento_registros where treinamento_id = p_id and usuario_id = auth.uid();
  insert into public.treinamento_registros (treinamento_id, usuario_id, usuario_nome, matricula, funcao, tentativa, nota, aprovado)
  values (p_id, auth.uid(), public.meu_nome(), public.minha_matricula(), public.minha_funcao(), v_tent, v_nota, v_aprov)
  returning id into v_id;
  return jsonb_build_object('registro_id', v_id, 'nota', v_nota, 'aprovado', v_aprov,
                            'acertos', v_acertos, 'total', v_total, 'tentativa', v_tent);
end $$;

create or replace function public.treinamento_validar(p_registro bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode('treinamento', 'editar') then
    raise exception 'Somente gestores validam certificados.' using errcode = '42501';
  end if;
  update public.treinamento_registros
     set validado_por = auth.uid(), validado_por_nome = public.meu_nome(), validado_em = now()
   where id = p_registro and aprovado and validado_em is null;
  if not found then
    raise exception 'Registro não encontrado, reprovado ou já validado.' using errcode = 'P0002';
  end if;
end $$;

-- =====================================================================
-- 12. SAFETY HUDDLE
-- =====================================================================
create table if not exists public.safety_huddles (
  id              bigint generated always as identity primary key,
  data_huddle     date not null default (now() at time zone 'America/Sao_Paulo')::date,
  hora            time,
  turno           text not null check (turno in ('manha','tarde','noite')),
  lotacao         text check (lotacao is null or lotacao in ('normal','alerta','critica')),
  participantes   text,
  checklist       jsonb not null default '{}'::jsonb,
  riscos          text,
  ocorrencias     text,
  encaminhamentos text,
  criado_por      uuid, criado_por_nome text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
select public._rls_padrao('safety_huddles', 'safety');

-- =====================================================================
-- 13. SOLICITAÇÃO DE MANUTENÇÃO
-- =====================================================================
create table if not exists public.manutencao_chamados (
  id              bigint generated always as identity primary key,
  setor           text not null check (char_length(trim(setor)) > 0),
  local_detalhe   text,
  categoria       text not null check (char_length(trim(categoria)) > 0),
  descricao       text not null check (char_length(trim(descricao)) >= 5),
  prioridade      text not null default 'media' check (prioridade in ('baixa','media','alta','urgente')),
  foto_path       text,
  status          text not null default 'aberto'
                    check (status in ('aberto','em_atendimento','aguardando_material','concluido','cancelado')),
  responsavel     text,
  parecer         text,
  concluido_em    timestamptz,
  criado_por      uuid, criado_por_nome text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index if not exists manutencao_chamados_status_idx on public.manutencao_chamados (status, criado_em desc);
alter table public.manutencao_chamados enable row level security;
drop policy if exists manutencao_chamados_sel on public.manutencao_chamados;
drop policy if exists manutencao_chamados_ins on public.manutencao_chamados;
drop policy if exists manutencao_chamados_upd on public.manutencao_chamados;
create policy manutencao_chamados_sel on public.manutencao_chamados for select to authenticated
  using (public.pode('manutencao', 'ver'));
create policy manutencao_chamados_ins on public.manutencao_chamados for insert to authenticated
  with check (public.pode('manutencao', 'criar'));
create policy manutencao_chamados_upd on public.manutencao_chamados for update to authenticated
  using (public.pode('manutencao', 'editar')) with check (public.pode('manutencao', 'editar'));

create or replace function public.manutencao_antes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := auth.uid(); new.criado_por_nome := public.meu_nome();
    new.criado_em := now(); new.status := 'aberto';
    new.responsavel := null; new.parecer := null; new.concluido_em := null;
  else
    new.criado_por := old.criado_por; new.criado_por_nome := old.criado_por_nome; new.criado_em := old.criado_em;
    if new.status = 'concluido' and old.status <> 'concluido' then new.concluido_em := now(); end if;
    if new.status <> 'concluido' then new.concluido_em := null; end if;
  end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists t_manutencao on public.manutencao_chamados;
create trigger t_manutencao before insert or update on public.manutencao_chamados
  for each row execute function public.manutencao_antes();

create or replace function public.manutencao_cancelar(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.manutencao_chamados set status = 'cancelado'
   where id = p_id and criado_por = auth.uid() and status = 'aberto';
  if not found then
    raise exception 'Só é possível cancelar o seu próprio chamado ainda aberto.' using errcode = '42501';
  end if;
end $$;

-- =====================================================================
-- PORTAS FECHADAS PARA QUEM NÃO ESTÁ LOGADO + PERMISSÕES DAS FUNÇÕES
-- =====================================================================
revoke all on all tables in schema public from anon;

revoke execute on function
  public.evento_notificar(jsonb), public.passagem_editar(uuid, jsonb, text),
  public.passagem_excluir(uuid, text), public.passagem_receber(uuid),
  public.dieta_cancelar(uuid, text), public.rh_decidir(uuid, boolean, text, text),
  public.rh_cancelar(uuid), public.rh_colega_assinar(uuid, text),
  public.treinamento_prova(bigint), public.treinamento_responder(bigint, jsonb),
  public.treinamento_validar(bigint), public.manutencao_cancelar(bigint)
  from public, anon;
grant execute on function
  public.evento_notificar(jsonb), public.passagem_editar(uuid, jsonb, text),
  public.passagem_excluir(uuid, text), public.passagem_receber(uuid),
  public.dieta_cancelar(uuid, text), public.rh_decidir(uuid, boolean, text, text),
  public.rh_cancelar(uuid), public.rh_colega_assinar(uuid, text),
  public.treinamento_prova(bigint), public.treinamento_responder(bigint, jsonb),
  public.treinamento_validar(bigint), public.manutencao_cancelar(bigint)
  to authenticated;

drop function public._rls_padrao(text, text);
