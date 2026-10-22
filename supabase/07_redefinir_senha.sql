-- =====================================================================
-- 07_redefinir_senha.sql — BOTÃO "REDEFINIR SENHA" (Painel do Gestor)
-- Rode DEPOIS do 05_painel.sql (SQL Editor do Supabase → New query → Run).
-- Quem pode: só o Gestor Administrativo. Gera uma senha provisória nova,
-- derruba os acessos abertos da pessoa e a obriga a criar a senha dela no
-- próximo login. Cada redefinição fica no Registro de ações (quem e quando,
-- nunca a senha).
-- =====================================================================

-- permissão (também está no 02_permissoes.sql, para não se perder se ele for rodado de novo)
insert into public.permissoes (modulo, funcao, acao) values ('painel', 'Gestor Administrativo', 'editar')
on conflict do nothing;

create or replace function public.redefinir_senha(p_matricula text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_id uuid; v_nome text; v_func text; v_senha text := '';
  v_alfa constant text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.pode('painel', 'editar') then
    raise exception 'Somente o Gestor Administrativo redefine senhas.' using errcode = '42501';
  end if;
  select id, nome, funcao into v_id, v_nome, v_func
    from public.profiles where matricula = trim(coalesce(p_matricula, '')) and ativo;
  if not found then
    raise exception 'Matrícula não encontrada ou desativada.' using errcode = 'P0002';
  end if;
  for i in 1..10 loop
    v_senha := v_senha || substr(v_alfa, 1 + (get_byte(gen_random_bytes(1), 0) % length(v_alfa)), 1);
  end loop;
  update auth.users set encrypted_password = crypt(v_senha, gen_salt('bf')), updated_at = now() where id = v_id;
  update public.profiles set trocar_senha = true where id = v_id;
  delete from auth.sessions where user_id = v_id;      -- derruba quem estiver logado com a senha antiga
  insert into public.auditoria (usuario_id, usuario_nome, usuario_matricula, tipo, acao, tabela, registro)
  values (auth.uid(), public.meu_nome(), public.minha_matricula(), 'acao', 'senha_redefinida', 'profiles', v_id::text);
  return jsonb_build_object('matricula', trim(p_matricula), 'nome', v_nome, 'funcao', v_func, 'senha', v_senha);
end $$;

revoke execute on function public.redefinir_senha(text) from public, anon;
grant  execute on function public.redefinir_senha(text) to authenticated;
