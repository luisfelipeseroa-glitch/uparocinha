# Como colocar o sistema no ar (passo a passo)

O site (GitHub Pages) continua o mesmo endereço. O que muda: agora ele conversa com o **Supabase**
(login + banco de dados), e cada botão só aparece — e só funciona — para quem tem permissão.

> Faça tudo **antes** de publicar o novo site. Enquanto o banco não estiver pronto, o site novo não abre.

## 1) Supabase — fechar o cadastro público (1 minuto)
Painel do Supabase → **Authentication → Sign In / Providers** → desligue **"Allow new users to sign up"**.
(Assim ninguém de fora cria conta; só entram as matrículas que você importar.)

## 2) Supabase — criar tabelas e regras (4 arquivos, nesta ordem)
**SQL Editor → New query**, cole o conteúdo do arquivo, clique **Run**. Repetir para cada um:
1. `supabase/01_base.sql`
2. `supabase/02_permissoes.sql`  ← aqui ficam as regras de quem pode o quê (dá para ajustar depois e rodar de novo)
3. `supabase/03_modulos.sql`
4. `supabase/04_storage.sql`

Pode rodar de novo sem medo (é seguro repetir).

## 3) Criar o login de cada funcionário
No **seu computador** (precisa do Node 18+), na pasta do projeto:
```
node scripts/importar_usuarios.mjs funcionarios.csv --dry-run      # só confere, não grava nada
export SUPABASE_URL="https://nofxatplkkfymibbracm.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="(Project Settings → API → service_role — NUNCA suba para o GitHub)"
node scripts/importar_usuarios.mjs funcionarios.csv
```
- Login = **matrícula**; senha provisória gerada (arquivo `senhas_iniciais.csv`). No primeiro acesso a pessoa **é obrigada a criar a sua senha**.
- Funções que o CSV não distingue (Almoxarife, NIR, Recepcionista): crie um `ajustes.json` como `{"15357":"Almoxarife"}` e rode com `--ajustes ajustes.json`.
- Esqueceu a senha: `node scripts/importar_usuarios.mjs funcionarios.csv --resetar 12345`.
- Desligamentos: `--desativar-ausentes` (quem saiu do CSV perde o acesso na hora).
- ⚠️ O repositório é **público**: nunca suba `funcionarios.csv`, `senhas_iniciais.csv` nem a chave `service_role` (já estão no `.gitignore`).

## 4) Publicar o site
Subir os arquivos para o GitHub (branch principal). O `sw.js` agora busca sempre a versão nova; se alguém ainda vir a tela antiga, é só atualizar a página (Ctrl+F5).

## O que cada função enxerga
| Módulo | Quem vê | Quem inclui / edita / exclui |
|---|---|---|
| Estoque de Insumos e Medicamentos | todos | gestores, farmacêuticos, almoxarife |
| Calculadoras (botão único) | enfermeiros, téc. enfermagem, médicos, pediatras, farmacêuticos, gestores | — |
| Dieta e Nutrição | enfermeiros, téc. enfermagem, médicos, pediatras, gestores | solicitam: enfermeiros, médicos, pediatras, gestores (gestores também cancelam) |
| Documentos Institucionais | todos | só gestores |
| Escala de Plantão | todos | ADM e gestores |
| Evento Adverso | todos (todos notificam) | relatório/análise: só gestores |
| Passagem de Plantão | assistenciais, gestores, ADM | **somente ADM** inclui, edita, recebe e exclui (editar/excluir exigem motivo, que fica na auditoria dos gestores) |
| Protocolos Clínicos | assistenciais e gestores | — |
| Relatório Gerencial | todos | só gestores |
| RH, Treinamento, Safety Huddle, Manutenção, Chat | todos | RH/Treinamento: gestores autorizam/validam |
| Sistemas | gestores, ADM, assistenciais | — |
| Manutenção e Refrigeração (terceiros) | **só** Solicitação de Manutenção (onde atendem os chamados) | |
| Agente Regulador | nenhum acesso por enquanto | |

"Todos" = gestores + ADM + assistenciais + apoio (ASG, vigilante, maqueiro). Para mudar qualquer regra, edite `02_permissoes.sql` e rode de novo — o site e o banco passam a valer na hora.

## Segurança em resumo
- As regras valem **no banco** (RLS): mesmo que alguém mexa no navegador, o Supabase recusa.
- Quem fez cada lançamento (nome, data e hora) é gravado pelo servidor, não pelo navegador.
- Sessão encerra ao fechar a aba e após 30 min parado.
- Arquivos (documentos, anexos, fotos) ficam em pastas privadas, abertos por link temporário.
- A chave `anon` no `js/config.js` é pública por natureza; ela só serve para chegar ao login.

## O que continua no Google Apps Script
Somente o **Chat** e o painel **Atendimento** da tela inicial (como estavam). O restante saiu da planilha.

## Testes automáticos (para quem for mexer no código)
```
cd tests && npm i && npm test            # regras do banco (RLS)
node frontend.test.mjs                   # telas, menu por função e botões
node importador.test.mjs                 # importador de usuários
```
