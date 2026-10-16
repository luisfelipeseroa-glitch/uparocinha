# Gestão Inteligente UPA Rocinha

Sistema interno da UPA Rocinha (GitHub Pages + Supabase).
Para colocar no ar e entender as permissões: **[supabase/LEIA-ME.md](supabase/LEIA-ME.md)**.

- `index.html`, `css/`, `js/` — o site (módulos em `js/mod-*.js`, regras de acesso em `supabase/02_permissoes.sql`)
- `supabase/` — tabelas, regras (RLS) e arquivos privados
- `scripts/importar_usuarios.mjs` — cria o login de cada funcionário
- `tests/` — testes automáticos
