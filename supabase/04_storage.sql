-- =====================================================================
-- 04_storage.sql — ARQUIVOS (PDFs, anexos, fotos)
-- Rode DEPOIS do 03_modulos.sql. Todos os "baldes" são PRIVADOS:
-- o site abre os arquivos por link temporário (assinado), só para quem tem permissão.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('documentos',       'documentos',       false, 20971520),   -- 20 MB
  ('rh-anexos',        'rh-anexos',        false,  5242880),   --  5 MB
  ('passagem-pdfs',    'passagem-pdfs',    false, 10485760),   -- 10 MB
  ('manutencao-fotos', 'manutencao-fotos', false,  5242880),   --  5 MB
  ('treinamento',      'treinamento',      false, 52428800)    -- 50 MB
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- ---- Documentos institucionais: todos leem; gestores gravam/alteram/apagam
drop policy if exists "doc_ler"   on storage.objects;
drop policy if exists "doc_ins"   on storage.objects;
drop policy if exists "doc_upd"   on storage.objects;
drop policy if exists "doc_del"   on storage.objects;
create policy "doc_ler" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.pode('documentos', 'ver'));
create policy "doc_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.pode('documentos', 'criar'));
create policy "doc_upd" on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and public.pode('documentos', 'editar'));
create policy "doc_del" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.pode('documentos', 'excluir'));

-- ---- Anexos do RH: o arquivo fica na pasta com o id de quem enviou ( <id>/arquivo )
drop policy if exists "rh_ler" on storage.objects;
drop policy if exists "rh_ins" on storage.objects;
drop policy if exists "rh_del" on storage.objects;
create policy "rh_ler" on storage.objects for select to authenticated
  using (bucket_id = 'rh-anexos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.pode('rh', 'editar')));
create policy "rh_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'rh-anexos'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.pode('rh', 'criar'));
create policy "rh_del" on storage.objects for delete to authenticated
  using (bucket_id = 'rh-anexos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- PDFs da passagem de plantão
drop policy if exists "pp_ler" on storage.objects;
drop policy if exists "pp_ins" on storage.objects;
create policy "pp_ler" on storage.objects for select to authenticated
  using (bucket_id = 'passagem-pdfs' and public.pode('passagem', 'ver'));
create policy "pp_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'passagem-pdfs' and public.pode('passagem', 'criar'));

-- ---- Fotos dos chamados de manutenção
drop policy if exists "man_ler" on storage.objects;
drop policy if exists "man_ins" on storage.objects;
create policy "man_ler" on storage.objects for select to authenticated
  using (bucket_id = 'manutencao-fotos' and public.pode('manutencao', 'ver'));
create policy "man_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'manutencao-fotos' and public.pode('manutencao', 'criar'));

-- ---- Material dos treinamentos
drop policy if exists "trein_ler" on storage.objects;
drop policy if exists "trein_ins" on storage.objects;
drop policy if exists "trein_upd" on storage.objects;
drop policy if exists "trein_del" on storage.objects;
create policy "trein_ler" on storage.objects for select to authenticated
  using (bucket_id = 'treinamento' and public.pode('treinamento', 'ver'));
create policy "trein_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'treinamento' and public.pode('treinamento', 'criar'));
create policy "trein_upd" on storage.objects for update to authenticated
  using (bucket_id = 'treinamento' and public.pode('treinamento', 'editar'));
create policy "trein_del" on storage.objects for delete to authenticated
  using (bucket_id = 'treinamento' and public.pode('treinamento', 'excluir'));
