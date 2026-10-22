-- =====================================================================
-- 06_cursos.sql — CURSOS INICIAIS DO MÓDULO TREINAMENTO
-- Rode DEPOIS do 03_modulos.sql (no SQL Editor do Supabase).
-- Cria 42 cursos com resumo para estudo e prova (3 a 4 questões cada):
--   • 6 cursos para TODAS as funções
--   • 2 cursos para cada uma das 18 funções
-- Pode rodar de novo sem medo: um curso que já existe (mesmo título) NÃO é
-- recriado nem sobrescrito, então o que você editar no site fica preservado.
-- Depois de criados, edite o texto, a nota mínima ou anexe um PDF em
-- Treinamento > Gerenciar cursos.
-- =====================================================================

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Higienização das mãos: os 5 momentos') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Higienização das mãos: os 5 momentos', 'Os 5 momentos (OMS): 1) antes do contato com o paciente; 2) antes de procedimento limpo/asséptico; 3) após risco de exposição a fluidos corporais; 4) após contato com o paciente; 5) após contato com as áreas próximas ao paciente. Fricção com preparação alcoólica: 20 a 30 segundos, se as mãos não estiverem visivelmente sujas. Água e sabão: 40 a 60 segundos, se estiverem sujas. Sem anéis, pulseiras e relógio; unhas curtas e sem unhas artificiais. Luva não substitui a higiene das mãos.', '{}'::text[], 1, 70, true, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Quanto tempo dura a fricção das mãos com preparação alcoólica?', '["5 a 10 segundos", "20 a 30 segundos", "Até secar, sem esfregar", "Mais de 2 minutos"]'::jsonb, 1),
      (v_id, 2, 'Quando se deve usar água e sabão em vez do álcool?', '["Quando as mãos estão visivelmente sujas ou com sangue/secreções", "Somente ao chegar ao trabalho", "Sempre, o álcool nunca é suficiente", "Somente antes das refeições"]'::jsonb, 0),
      (v_id, 3, 'Qual das situações abaixo é um dos 5 momentos de higienização das mãos?', '["Antes de realizar um procedimento limpo/asséptico", "Ao digitar no computador do posto", "Ao entrar no refeitório", "Ao assinar o ponto no fim do plantão"]'::jsonb, 0),
      (v_id, 4, 'O uso de luvas dispensa a higienização das mãos?', '["Só em pacientes isolados", "Não: higienizar antes de calçar e depois de retirar as luvas", "Só quando a luva rasga", "Sim, luva já protege totalmente"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Uso correto de EPI') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Uso correto de EPI', 'Precauções padrão para todos os pacientes. Escolha o EPI pelo risco: luvas, avental, máscara cirúrgica, máscara N95/PFF2 (aerossóis, ex.: tuberculose), óculos ou protetor facial. Colocar: higienizar as mãos, avental, máscara, óculos/protetor facial, luvas. Retirar: luvas, óculos/protetor facial, avental, máscara (por último), higienizar as mãos. EPI rasgado, vencido ou sem condição de uso deve ser trocado. Luva usada no paciente não toca maçaneta, teclado ou telefone.', '{}'::text[], 1, 70, true, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual é o primeiro passo antes de colocar os EPIs?', '["Amarrar o avental", "Calçar as luvas", "Higienizar as mãos", "Colocar os óculos"]'::jsonb, 2),
      (v_id, 2, 'Que máscara é indicada na precaução para aerossóis (ex.: tuberculose)?', '["N95 / PFF2", "Máscara de pano", "Máscara cirúrgica comum", "Nenhuma, basta ventilar a sala"]'::jsonb, 0),
      (v_id, 3, 'Pode-se circular pela unidade, usar o telefone e abrir portas com as luvas usadas no atendimento?', '["Sim, desde que por pouco tempo", "Sim, se o paciente não estiver isolado", "Sim, se forem luvas duplas", "Não: retirar as luvas e higienizar as mãos"]'::jsonb, 3),
      (v_id, 4, 'O que fazer ao perceber que o EPI está rasgado ou danificado?', '["Guardar para usar depois", "Trocar por um novo e avisar a chefia", "Remendar com fita adesiva", "Usar mesmo assim até o fim do plantão"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Solicitação e registro de EPI') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Solicitação e registro de EPI', 'O EPI adequado à sua função é fornecido pelo empregador, sem custo (NR-6). Solicite um novo sempre que o seu estiver danificado, sujo, vencido ou acabar. Mesmo sem problema, confira seus EPIs e faça o registro pelo menos uma vez por mês. Todo EPI entregue deve ter registro: nome, matrícula, item, data e assinatura. O EPI é de uso individual, deve ser guardado limpo e identificado, e não é emprestado.', '{}'::text[], 0.5, 70, true, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Quando você deve solicitar um EPI?', '["Somente quando houver acidente", "Apenas no mês de admissão", "Sempre que estiver danificado, sujo, vencido ou acabar, e conferir pelo menos 1 vez por mês", "Só quando a chefia perguntar"]'::jsonb, 2),
      (v_id, 2, 'Quem fornece o EPI ao trabalhador?', '["Os colegas do setor", "O empregador, sem custo para o trabalhador", "O paciente", "O próprio trabalhador, com reembolso depois"]'::jsonb, 1),
      (v_id, 3, 'O que deve constar no registro de entrega de EPI?', '["Nome, matrícula, item, data e assinatura", "Somente o nome do setor", "Somente a data", "Nada, o registro é opcional"]'::jsonb, 0),
      (v_id, 4, 'Posso emprestar o meu EPI a um colega?', '["Sim, se ele esqueceu o dele", "Sim, se for máscara", "Não: o EPI é de uso individual e deve ser solicitado por cada pessoa", "Sim, sempre"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Novo aplicativo online: Gestão Inteligente UPA Rocinha') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Novo aplicativo online: Gestão Inteligente UPA Rocinha', 'O sistema abre no navegador do celular ou do computador e pode ser instalado como aplicativo. Login: sua matrícula. A senha provisória deve ser trocada no primeiro acesso. A senha é pessoal e não se compartilha. O menu mostra só os módulos da sua função. Troca de plantão: você faz o pedido, o colega assina e a coordenação autoriza. Safety Huddle: preencher com foto da equipe e assinatura. Manutenção: abra o chamado com foto. Em computador compartilhado, use sempre Sair.', '{}'::text[], 0.5, 70, true, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual é o login do sistema?', '["O seu CPF", "O seu nome completo", "O seu e-mail pessoal", "A sua matrícula"]'::jsonb, 3),
      (v_id, 2, 'O que fazer com a senha provisória?', '["Passar para um colega", "Trocar por uma senha só sua no primeiro acesso", "Manter para sempre", "Anotar no crachá"]'::jsonb, 1),
      (v_id, 3, 'Como funciona o pedido de troca de plantão?', '["Basta avisar o colega pelo WhatsApp", "Não precisa de autorização", "Você pede, o colega assina e a coordenação autoriza", "Só a coordenação pode pedir"]'::jsonb, 2),
      (v_id, 4, 'Ao terminar de usar o sistema em um computador compartilhado, o que você deve fazer?', '["Desligar o monitor", "Deixar aberto para o próximo colega", "Apenas fechar a janela e deixar a senha salva", "Clicar em Sair"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Segurança do paciente: as 6 metas e a notificação de eventos') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Segurança do paciente: as 6 metas e a notificação de eventos', 'As 6 metas internacionais: 1) identificar corretamente o paciente (no mínimo 2 identificadores, como nome completo e data de nascimento); 2) melhorar a comunicação entre profissionais; 3) segurança no uso de medicamentos; 4) cirurgia segura; 5) reduzir o risco de infecção (higiene das mãos); 6) reduzir o risco de queda e de lesão por pressão. Erros, incidentes e quase-erros (near miss) devem ser notificados no sistema. A notificação tem caráter educativo, não punitivo.', '{}'::text[], 1, 70, true, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Quantos identificadores, no mínimo, devem ser usados para confirmar a identidade do paciente?', '["Dois (por exemplo, nome completo e data de nascimento)", "Apenas o diagnóstico", "Um (o leito)", "Nenhum, se o paciente está acordado"]'::jsonb, 0),
      (v_id, 2, 'Qual meta de segurança está ligada à higiene das mãos?', '["Reduzir o risco de infecções", "Comunicação efetiva", "Cirurgia segura", "Identificação do paciente"]'::jsonb, 0),
      (v_id, 3, 'Um quase-erro (o erro foi percebido antes de atingir o paciente) deve ser notificado?', '["Não, porque ninguém se machucou", "Só se o chefe pedir", "Só se houver testemunhas", "Sim, para aprender e evitar que se repita"]'::jsonb, 3),
      (v_id, 4, 'Qual é o objetivo da notificação de eventos adversos?', '["Apenas gerar estatística para fora da unidade", "Substituir o prontuário", "Descobrir e punir o culpado", "Aprender e melhorar os processos, sem punição"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Descarte correto de resíduos e perfurocortantes') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Descarte correto de resíduos e perfurocortantes', 'Grupo A (infectante: curativos, luvas e materiais com sangue): saco branco leitoso. Grupo B (químicos, alguns medicamentos): descarte conforme orientação específica. Grupo D (comum): lixo comum/reciclável. Grupo E (perfurocortantes): caixa rígida própria, descartada no local de uso. Nunca reencapar agulhas nem separar agulha da seringa com as mãos. Fechar a caixa quando atingir o limite de enchimento marcado (cerca de 2/3 do volume). Nunca levar a caixa de perfurocortantes ao chão ou ao lixo comum.', '{}'::text[], 1, 70, true, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Onde devem ser descartadas agulhas e lâminas?', '["No saco branco comum", "Em caixa rígida de perfurocortantes, no local do uso", "No lixo comum", "No lixo reciclável"]'::jsonb, 1),
      (v_id, 2, 'Pode-se reencapar agulhas depois do uso?', '["Não: descartar direto na caixa, sem reencapar", "Sim, se o paciente é conhecido", "Sim, para evitar que caia", "Sim, com as duas mãos"]'::jsonb, 0),
      (v_id, 3, 'Quando se deve fechar a caixa de perfurocortantes?', '["Somente no fim do mês", "Nunca, ela é reutilizada", "Ao atingir o limite marcado (cerca de 2/3 do volume)", "Somente quando transbordar"]'::jsonb, 2),
      (v_id, 4, 'Qual resíduo é infectante e vai no saco branco leitoso?', '["Copo plástico limpo", "Papel de embalagem", "Restos de comida", "Luvas e gazes com sangue ou secreção"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Sepse: reconhecimento e pacote da primeira hora') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Sepse: reconhecimento e pacote da primeira hora', 'Suspeite de sepse diante de infecção com sinais de disfunção orgânica (hipotensão, alteração do nível de consciência, taquipneia, oligúria, lactato alto). Pacote da primeira hora: dosar lactato; coletar hemoculturas antes do antibiótico (sem atrasar); iniciar antibiótico de amplo espectro o quanto antes, em até 1 hora no choque ou alta probabilidade; cristaloide 30 mL/kg se hipotensão ou lactato elevado; vasopressor se a PAM seguir abaixo de 65 mmHg após volume. Reavaliar com frequência.', array['Médico']::text[], 1.5, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Em quanto tempo o antibiótico deve ser iniciado no choque séptico ou sepse de alta probabilidade?', '["Em até 24 horas", "Em até 1 hora", "Em até 6 horas", "Só depois do resultado da cultura"]'::jsonb, 1),
      (v_id, 2, 'Quando coletar as hemoculturas?', '["Só 2 dias depois do início do antibiótico", "Somente se houver febre", "Antes do antibiótico, sem atrasar o início dele", "Nunca é necessário"]'::jsonb, 2),
      (v_id, 3, 'Qual volume de cristaloide é sugerido na hipotensão ou lactato elevado?', '["30 mL/kg", "5 mL/kg", "100 mL/kg", "Nenhum volume"]'::jsonb, 0),
      (v_id, 4, 'Qual a meta de pressão arterial média (PAM) ao usar vasopressor?', '["PAM de 65 mmHg ou mais", "Não há meta", "PAM abaixo de 40 mmHg", "PAM de 120 mmHg"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Dor torácica e infarto com supra de ST') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Dor torácica e infarto com supra de ST', 'Dor torácica: realizar e avaliar o ECG em até 10 minutos da chegada. Supradesnivelamento de ST ou BRE novo: infarto com supra, é emergência de reperfusão. Conduta inicial: AAS mastigado (160 a 300 mg), monitorização, acesso venoso, oxigênio apenas se SatO2 menor que 90%. Reperfusão: angioplastia primária o mais rápido possível (meta de até 90 minutos) ou fibrinólise com meta de até 30 minutos da chegada quando a angioplastia não estiver disponível a tempo. Acionar a regulação imediatamente.', array['Médico']::text[], 1.5, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Em quanto tempo o ECG deve ser feito e avaliado na dor torácica?', '["Só após o resultado da troponina", "Só se a dor persistir por 1 dia", "Em até 10 minutos da chegada", "Em até 2 horas"]'::jsonb, 2),
      (v_id, 2, 'Qual é a conduta com AAS no infarto sem contraindicação?', '["Dar somente após a alta", "Evitar AAS em qualquer caso", "Dar apenas paracetamol", "Administrar AAS mastigado (160 a 300 mg)"]'::jsonb, 3),
      (v_id, 3, 'Qual é a meta de tempo para iniciar a fibrinólise quando indicada?', '["Em até 30 minutos da chegada", "Em até 3 dias", "Não há meta de tempo", "Em até 12 horas"]'::jsonb, 0),
      (v_id, 4, 'Quando se indica oxigênio suplementar no infarto?', '["Nunca", "Somente se o paciente pedir", "Quando a saturação está abaixo de 90%", "Sempre, em todos os casos"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Triângulo de avaliação pediátrica e criança gravemente doente') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Triângulo de avaliação pediátrica e criança gravemente doente', 'O triângulo de avaliação pediátrica (TAP) dá uma impressão geral em segundos, sem tocar na criança: 1) aparência (tônus, interação, consolabilidade, olhar, choro); 2) trabalho respiratório (tiragem, gemência, batimento de asa de nariz, posição); 3) circulação para a pele (palidez, moteamento, cianose). Alterações em um ou mais lados indicam necessidade de intervenção imediata. Letargia, gemência e dificuldade para respirar são sinais de alerta.', array['Pediatra']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Quais são os 3 lados do triângulo de avaliação pediátrica?', '["Aparência, trabalho respiratório e circulação para a pele", "Peso, altura e idade", "Pulso, pressão e temperatura", "Febre, tosse e diarreia"]'::jsonb, 0),
      (v_id, 2, 'Qual achado sugere gravidade em um lactente?', '["Mamar bem", "Gemência, tiragem e pouca interação com o ambiente", "Choro vigoroso e consolável", "Sorriso e interesse em brinquedos"]'::jsonb, 1),
      (v_id, 3, 'O TAP deve ser feito em quanto tempo?', '["Só após exames laboratoriais", "Em 1 hora", "Em segundos, antes de manipular a criança", "Só na reavaliação"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Desidratação na criança: planos A, B e C') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Desidratação na criança: planos A, B e C', 'Avalie estado geral, olhos, sede, mucosas e a prega cutânea. Plano A (sem desidratação): tratamento em casa com líquidos e soro de reidratação oral (SRO) após cada evacuação líquida, e sinais de alerta. Plano B (desidratação): SRO na unidade, em pequenos volumes e com frequência, em observação, com reavaliação. Plano C (desidratação grave): reidratação endovenosa imediata, com sinais como letargia, olhos fundos, incapacidade de beber e prega que desfaz muito lentamente. Manter o aleitamento e a alimentação.', array['Pediatra']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual achado indica desidratação grave (Plano C)?', '["Criança ativa e brincando", "Diarreia sem outros sinais", "Letargia, incapacidade de beber e prega cutânea que desfaz muito lentamente", "Sede e boca levemente seca"]'::jsonb, 2),
      (v_id, 2, 'No Plano B, onde e como a criança recebe o SRO?', '["Somente por via endovenosa", "Em casa sem retorno", "Em jejum de líquidos", "Na unidade, em pequenos volumes frequentes, em observação"]'::jsonb, 3),
      (v_id, 3, 'Deve-se interromper o aleitamento materno durante a diarreia?', '["Não, deve-se manter o aleitamento", "Sim, sempre", "Sim, por 48 horas", "Apenas se houver febre"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Classificação de risco: prioridades e tempos de espera') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Classificação de risco: prioridades e tempos de espera', 'A classificação de risco define a ordem de atendimento pela gravidade, não pela ordem de chegada. No Protocolo de Manchester: vermelho (emergência), atendimento imediato; laranja (muito urgente), até 10 minutos; amarelo (urgente), até 60 minutos; verde (pouco urgente), até 120 minutos; azul (não urgente), até 240 minutos. Reclassificar sempre que o quadro mudar. Registrar queixa, sinais vitais e discriminador usado. A classificação é ato do enfermeiro e não é triagem para negar atendimento.', array['Enfermeiro']::text[], 1.5, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Em qual ordem os pacientes são atendidos na classificação de risco?', '["Pela ordem de chegada", "Pela gravidade clínica", "Por quem reclama mais alto", "Pela idade apenas"]'::jsonb, 1),
      (v_id, 2, 'Qual é o tempo-alvo para a cor laranja (muito urgente)?', '["Até 240 minutos", "Imediato", "Até 10 minutos", "Até 120 minutos"]'::jsonb, 2),
      (v_id, 3, 'O que fazer se o paciente piora na sala de espera?', '["Esperar o próximo plantão", "Mandar embora", "Reclassificar e reavaliar a prioridade", "Manter a cor inicial"]'::jsonb, 2),
      (v_id, 4, 'A cor vermelha significa:', '["Pouco urgente", "Consulta eletiva", "Não urgente", "Emergência, atendimento imediato"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Segurança na administração de medicamentos') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Segurança na administração de medicamentos', 'Os 9 certos: paciente certo, medicamento certo, via certa, hora certa, dose certa, registro certo, orientação correta, forma certa e resposta certa. Confirmar a identidade com pelo menos 2 identificadores. Checar alergias, prescrição legível e diluição. Nunca administrar medicamento sem rótulo ou identificação. Medicamentos de alta vigilância (insulina, heparina, potássio, entre outros) exigem dupla checagem. Registrar somente depois de administrar, e notificar qualquer erro ou quase-erro.', array['Enfermeiro']::text[], 1.5, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Quantos identificadores no mínimo conferir antes de administrar o medicamento?', '["Apenas o número do leito", "Nenhum, se conheço o paciente", "Apenas o diagnóstico", "Dois (ex.: nome completo e data de nascimento)"]'::jsonb, 3),
      (v_id, 2, 'Quando registrar a administração no prontuário?', '["Somente se houver reação", "Depois de administrar o medicamento", "No dia seguinte", "Antes, para adiantar o serviço"]'::jsonb, 1),
      (v_id, 3, 'Um medicamento está sem rótulo ou identificação. O que fazer?', '["Não administrar e avisar a farmácia/chefia", "Administrar se parece o correto", "Perguntar ao paciente", "Pedir a um colega que administre"]'::jsonb, 0),
      (v_id, 4, 'Quais medicamentos exigem dupla checagem?', '["Os de alta vigilância, como insulina, heparina e potássio", "Nenhum", "Somente gotas nasais", "Somente vitaminas"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Sinais vitais: aferição correta e valores de referência') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Sinais vitais: aferição correta e valores de referência', 'Referências no adulto em repouso: frequência cardíaca 60 a 100 bpm; frequência respiratória 12 a 20 irpm; saturação de oxigênio 95% ou mais; temperatura axilar de 35,5 a 37,2 °C (febre acima de 37,8 °C); pressão arterial normal em torno de 120x80 mmHg. Para medir a pressão: paciente sentado e em repouso por 5 minutos, braço apoiado na altura do coração, manguito de tamanho adequado. Registrar os valores na hora e comunicar o enfermeiro diante de qualquer alteração.', array['Técnico de Enfermagem']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual a faixa normal de frequência respiratória no adulto?', '["40 a 60 irpm", "12 a 20 irpm", "Acima de 30 irpm", "3 a 5 irpm"]'::jsonb, 1),
      (v_id, 2, 'Como preparar o paciente para aferir a pressão arterial?', '["Em pé e falando", "Sentado, em repouso por cerca de 5 minutos, com braço apoiado", "Correndo, para ver o esforço", "Com o braço pendurado"]'::jsonb, 1),
      (v_id, 3, 'Qual temperatura axilar é considerada febre?', '["35,5 °C", "Qualquer valor abaixo de 37 °C", "Acima de 37,8 °C", "36,0 °C"]'::jsonb, 2),
      (v_id, 4, 'O que fazer ao encontrar um sinal vital muito alterado?', '["Não registrar", "Apenas anotar no papel e guardar", "Comunicar imediatamente o enfermeiro e registrar", "Esperar a próxima aferição"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Prevenção de queda e de lesão por pressão') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Prevenção de queda e de lesão por pressão', 'Queda: identificar o paciente em risco (idosos, sedados, com dificuldade de marcha), orientar o paciente a chamar ajuda, manter grades elevadas e maca/cama travada, piso seco, calçado antiderrapante, campainha ao alcance. Lesão por pressão: avaliar a pele no banho, hidratar, manter a pele limpa e seca, mudar de decúbito a cada 2 horas nos pacientes acamados, proteger proeminências ósseas, evitar arrastar o paciente. Registrar e comunicar vermelhidão que não some à digitopressão.', array['Técnico de Enfermagem']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Com que frequência se recomenda mudar de decúbito o paciente acamado de risco?', '["Uma vez por semana", "Somente se pedir", "A cada 2 horas", "A cada 24 horas"]'::jsonb, 2),
      (v_id, 2, 'Qual medida ajuda a prevenir quedas?', '["Calçados soltos", "Deixar o paciente sozinho em pé", "Piso molhado após a limpeza", "Grades elevadas, maca travada, piso seco e campainha ao alcance"]'::jsonb, 3),
      (v_id, 3, 'Qual o sinal precoce de lesão por pressão?', '["Ausência de dor", "Pele bem hidratada", "Pele de coloração normal", "Vermelhidão que não desaparece ao pressionar a pele"]'::jsonb, 3),
      (v_id, 4, 'Como movimentar o paciente para evitar lesão na pele?', '["Arrastar pelo lençol", "Levantar e rolar, sem arrastar", "Mantê-lo sempre na mesma posição", "Puxar pelos braços"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Medicamentos de alta vigilância') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Medicamentos de alta vigilância', 'Medicamentos de alta vigilância têm risco maior de causar dano grave quando há erro (ex.: insulina, heparina, cloreto de potássio concentrado, opioides, quimioterápicos, eletrólitos concentrados). Medidas: armazenamento segregado e identificado, rótulo com alerta, padronização de concentrações e diluições, dupla checagem independente na dispensação e na administração, e evitar eletrólitos concentrados nas unidades assistenciais. Notificar erros e quase-erros.', array['Farmacêutico']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que caracteriza um medicamento de alta vigilância?', '["Ser sempre injetável", "Ser o mais antigo", "Risco aumentado de dano grave quando ocorre um erro", "Ser o mais barato"]'::jsonb, 2),
      (v_id, 2, 'Qual cuidado deve ser adotado no armazenamento deles?', '["Guardar sem rótulo", "Segregação e identificação com alerta", "Misturar aos demais para facilitar", "Deixar fora do estoque controlado"]'::jsonb, 1),
      (v_id, 3, 'Qual medida reduz o risco de erro na administração de insulina e heparina?', '["Retirar a etiqueta", "Dispensar sem conferência", "Dupla checagem independente", "Pressa para agilizar"]'::jsonb, 2),
      (v_id, 4, 'Qual destes é exemplo de medicamento de alta vigilância?', '["Soro fisiológico 0,9% (frasco comum)", "Vitamina C oral", "Água destilada", "Cloreto de potássio concentrado"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Controle especial, medicamentos LASA e guarda de controlados') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Controle especial, medicamentos LASA e guarda de controlados', 'Medicamentos sujeitos a controle especial (Portaria 344/98) são guardados sob chave, com acesso restrito, e todo movimento é registrado (entrada, saída, perdas, vencimentos). Receitas e notificações seguem os tipos e prazos legais, com a retenção prevista. Diferenças de estoque devem ser comunicadas e investigadas. LASA são medicamentos com nome ou aparência parecidos: armazenar separados, identificar com destaque (letras maiúsculas e minúsculas, como no Tall man) e conferir sempre o nome, a concentração e a forma.', array['Farmacêutico']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Como devem ser guardados os medicamentos de controle especial?', '["Na recepção", "Em prateleira aberta", "Sem registro", "Sob chave, com acesso restrito e registro de toda movimentação"]'::jsonb, 3),
      (v_id, 2, 'O que significa LASA?', '["Medicamentos de uso agudo", "Medicamentos sem validade", "Medicamentos com nome ou aparência parecidos", "Medicamentos de laboratório"]'::jsonb, 2),
      (v_id, 3, 'O que fazer diante de uma divergência no estoque de um controlado?', '["Comunicar, registrar e investigar imediatamente", "Esperar o inventário do ano", "Ignorar", "Ajustar o estoque sem registro"]'::jsonb, 0),
      (v_id, 4, 'Qual cuidado reduz erros entre medicamentos LASA?', '["Conferir somente a cor da caixa", "Retirar a etiqueta", "Armazenar separados e destacar a diferença dos nomes", "Guardar juntos e iguais"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Armazenamento, validade e temperatura') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Armazenamento, validade e temperatura', 'Organizar pela regra PEPS: o primeiro que vence é o primeiro que sai. Conferir validade e lote no recebimento e a cada reposição. Medicamentos termolábeis ficam na geladeira entre 2 e 8 °C, com registro diário de temperatura máxima e mínima. Ambiente seco e ventilado, longe do sol; nada guardado no chão, as caixas ficam sobre estrado ou prateleira. Vencidos e com embalagem violada são segregados e identificados, e o farmacêutico é avisado.', array['Técnico de Farmácia']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que significa a regra PEPS?', '["Pedido Emergencial Por Setor", "O primeiro que vence é o primeiro que sai", "O último que chega é o primeiro que sai", "Produto Especial Para Saída"]'::jsonb, 1),
      (v_id, 2, 'Qual é a faixa de temperatura da geladeira de medicamentos?', '["20 a 25 °C", "2 a 8 °C", "10 a 15 °C", "Abaixo de 0 °C"]'::jsonb, 1),
      (v_id, 3, 'Onde devem ficar as caixas de medicamentos?', '["Ao sol", "Sobre estrado ou prateleira, nunca no chão", "No chão, junto à parede", "Em corredor de passagem"]'::jsonb, 1),
      (v_id, 4, 'O que fazer com um medicamento vencido?', '["Manter junto aos demais", "Entregar ao paciente", "Segregar, identificar e avisar o farmacêutico", "Jogar no lixo comum"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Separação e dispensação segura') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Separação e dispensação segura', 'Na separação, conferir sempre: nome do medicamento, concentração, forma farmacêutica, quantidade, validade e lote. Fazer a dupla checagem dos itens de alta vigilância e dos LASA (nomes ou embalagens parecidos). Não dispensar prescrição ilegível ou incompleta: acionar o prescritor ou o farmacêutico. Embalagem violada, rótulo apagado ou sem identificação não sai da farmácia. Registrar toda saída no sistema de estoque.', array['Técnico de Farmácia']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que se deve conferir na separação de um medicamento?', '["Nada, se o item é de uso comum", "Somente a quantidade", "Nome, concentração, forma, quantidade, validade e lote", "Somente a cor da caixa"]'::jsonb, 2),
      (v_id, 2, 'O que fazer ao receber uma prescrição ilegível?', '["Não dispensar e acionar o prescritor ou o farmacêutico", "Interpretar do melhor jeito", "Dispensar o que parece correto", "Pedir ao paciente que adivinhe"]'::jsonb, 0),
      (v_id, 3, 'Como evitar a troca entre medicamentos de nome parecido?', '["Retirar os rótulos", "Guardar todos lado a lado", "Conferir só a embalagem", "Conferir o nome e a concentração e identificar os LASA"]'::jsonb, 3),
      (v_id, 4, 'Medicamento com embalagem violada ou rótulo apagado deve:', '["Ser reetiquetado à mão", "Ser entregue assim mesmo", "Ser segregado e não dispensado", "Ser misturado ao estoque"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Contrastes iodados: segurança e reações adversas') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Contrastes iodados: segurança e reações adversas', 'Antes do contraste, avaliar: alergia prévia a contraste, asma, uso de metformina, função renal (creatinina), diabetes, gestação e hidratação. Manter acesso venoso e a equipe atenta durante e depois do exame. As reações podem ser leves (náusea, urticária) ou graves (anafilaxia, edema de glote, hipotensão). Na anafilaxia, a adrenalina intramuscular é o tratamento de primeira escolha, com chamada de ajuda e suporte de via aérea. Carrinho de emergência disponível na sala.', array['Radiologista']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual tratamento de primeira escolha na anafilaxia ao contraste?', '["Água com açúcar", "Apenas anti-histamínico oral", "Somente observar", "Adrenalina intramuscular"]'::jsonb, 3),
      (v_id, 2, 'O que verificar antes de aplicar o contraste iodado?', '["Nada", "Apenas o peso da mala", "Alergia prévia, função renal e uso de metformina", "Somente o horário de almoço"]'::jsonb, 2),
      (v_id, 3, 'Qual deve ser a conduta durante o exame com contraste?', '["Desligar o carrinho de emergência", "Deixar o paciente sozinho", "Retirar o acesso logo após a injeção e sair da sala", "Manter o acesso venoso e a equipe atenta"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Laudo seguro: identificação, lateralidade e resultado crítico') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Laudo seguro: identificação, lateralidade e resultado crítico', 'Antes de laudar, conferir a identidade do paciente (2 identificadores) e a correspondência com o pedido e o exame, incluindo a lateralidade (direita/esquerda) e a data. Resultados críticos (por exemplo, pneumotórax hipertensivo, hemorragia intracraniana, aneurisma roto) devem ser comunicados diretamente ao médico assistente, sem esperar o laudo escrito, com registro de quem recebeu e do horário. Laudar com clareza e objetividade, evitando abreviações ambíguas.', array['Radiologista']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Como comunicar um resultado crítico?', '["Direto ao médico assistente, com registro de quem recebeu e do horário", "Apenas no laudo escrito, no fim do dia", "Não comunicar", "Por recado ao paciente"]'::jsonb, 0),
      (v_id, 2, 'O que conferir antes de laudar?', '["Identidade do paciente, pedido, lateralidade e data", "Apenas o nome do médico", "Nada", "Somente a hora do exame"]'::jsonb, 0),
      (v_id, 3, 'Qual destes é um resultado crítico?', '["Calcificação antiga", "Exame sem alterações", "Cisto simples pequeno, sem sintomas", "Pneumotórax hipertensivo"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Proteção radiológica: tempo, distância e blindagem') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Proteção radiológica: tempo, distância e blindagem', 'Princípio ALARA: manter a dose tão baixa quanto razoavelmente possível. Três pilares: reduzir o tempo de exposição, aumentar a distância da fonte e usar blindagem (avental plumbífero, protetor de tireoide, biombo). Usar o dosímetro individual sempre, no local indicado, e nunca emprestá-lo. Perguntar sobre gestação antes do exame em mulheres em idade fértil. Fechar a porta e sinalizar durante a exposição. Acompanhante na sala deve usar avental de chumbo e não estar grávida.', array['Técnico de Radiologia']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que significa ALARA?', '["Ajuste Livre de Ar", "Aumentar a dose para melhorar a imagem", "Aparelho de laudo automático", "Manter a dose tão baixa quanto razoavelmente possível"]'::jsonb, 3),
      (v_id, 2, 'Quais são os três pilares da proteção radiológica?', '["Tempo, distância e blindagem", "Som, luz e calor", "Idade, sexo e altura", "Cor, peso e tamanho"]'::jsonb, 0),
      (v_id, 3, 'O dosímetro individual deve ser:', '["Emprestado entre colegas", "Usado sempre e nunca emprestado", "Usado só nos dias de exame difícil", "Guardado no armário"]'::jsonb, 1),
      (v_id, 4, 'O que perguntar à mulher em idade fértil antes do exame com radiação?', '["A cor preferida", "O número do sapato", "Nada", "Se há possibilidade de gestação"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Identificação do paciente, posicionamento e repetição de exames') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Identificação do paciente, posicionamento e repetição de exames', 'Confirmar a identidade com 2 identificadores e conferir o pedido (exame, região e lado). Usar o marcador de lateralidade (D/E) no campo do exame. Posicionar com cuidado para evitar repetições, que aumentam a dose do paciente. Pacientes que precisam de apoio: acompanhante com avental de chumbo, não gestante. Proteger gônadas e tireoide quando possível e quando não prejudicar o exame. Registrar o exame no sistema com o nome e a data corretos.', array['Técnico de Radiologia']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Quantos identificadores conferir antes do exame?', '["Nenhum", "Dois (por exemplo, nome completo e data de nascimento)", "Apenas o leito", "Somente a queixa"]'::jsonb, 1),
      (v_id, 2, 'Para que serve o marcador de lateralidade D/E?', '["Marcar o horário", "Indicar o lado examinado", "Medir a dose", "Deixar a imagem mais bonita"]'::jsonb, 1),
      (v_id, 3, 'Por que evitar a repetição de exames?', '["Porque cansa o técnico", "Não há motivo", "Porque aumenta a dose de radiação no paciente", "Porque gasta a tinta"]'::jsonb, 2),
      (v_id, 4, 'Quem pode acompanhar o paciente dentro da sala durante a exposição?', '["Crianças", "Acompanhante não gestante, com avental de chumbo", "Gestante, para dar apoio", "Qualquer pessoa, sem proteção"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Coleta de sangue segura: ordem dos tubos e identificação') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Coleta de sangue segura: ordem dos tubos e identificação', 'Identificar o paciente perguntando o nome completo e a data de nascimento, e rotular os tubos na presença dele, nunca antes. Garrote por no máximo 1 minuto. Ordem dos tubos: 1) frascos de hemocultura; 2) citrato (tampa azul); 3) soro (vermelho ou amarelo com gel); 4) heparina (verde); 5) EDTA (roxo); 6) fluoreto (cinza). Inverter suavemente os tubos com anticoagulante. Descartar a agulha no coletor, sem reencapar. Registrar horário e condições da coleta.', array['Técnico em Laboratório']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual é o tempo máximo recomendado para o garrote?', '["Sem limite", "1 minuto", "10 minutos", "5 minutos"]'::jsonb, 1),
      (v_id, 2, 'Quando rotular os tubos?', '["Na presença do paciente, no momento da coleta", "Quando sobrar tempo", "Antes, em lote, para adiantar", "Depois, no laboratório"]'::jsonb, 0),
      (v_id, 3, 'Qual tubo vem primeiro na ordem de coleta?', '["Fluoreto (cinza)", "Frasco de hemocultura", "EDTA (roxo)", "Heparina (verde)"]'::jsonb, 1),
      (v_id, 4, 'O que fazer com a agulha após a coleta?', '["Reencapar e guardar", "Descartar direto em coletor de perfurocortantes, sem reencapar", "Deixar sobre a bandeja", "Descartar no lixo comum"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Acidente com material biológico: o que fazer') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Acidente com material biológico: o que fazer', 'Em exposição percutânea ou de pele: lavar imediatamente com água e sabão, sem espremer nem esfregar com força. Em mucosas (olhos, boca): lavar com água ou soro fisiológico em abundância. Comunicar imediatamente a chefia e procurar atendimento no mesmo momento, pois a profilaxia pós-exposição (PEP) é mais eficaz nas primeiras horas, idealmente em até 2 horas. Emitir a Comunicação de Acidente de Trabalho (CAT) e registrar o acidente. Informar o paciente-fonte quando houver teste.', array['Técnico em Laboratório']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que fazer primeiro após um acidente com agulha?', '["Lavar com água e sabão e procurar atendimento imediato", "Espremer o local com força", "Ignorar se não sangrou muito", "Esperar o fim do plantão"]'::jsonb, 0),
      (v_id, 2, 'Em quanto tempo a profilaxia pós-exposição é mais eficaz?', '["Depois de 1 semana", "Nas primeiras horas, idealmente em até 2 horas", "Em até 1 mês", "O tempo não importa"]'::jsonb, 1),
      (v_id, 3, 'Como proceder se houver respingo de sangue nos olhos?', '["Aguardar secar", "Lavar com água ou soro fisiológico em abundância", "Esfregar com a luva", "Aplicar álcool"]'::jsonb, 1),
      (v_id, 4, 'O acidente deve ser comunicado e registrado?', '["Não, só se houver doença", "Só se alguém ver", "Só depois de 30 dias", "Sim, imediatamente, com emissão da CAT"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Acolhimento e escuta qualificada') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Acolhimento e escuta qualificada', 'Acolher é receber o usuário com respeito, ouvir sem pressa e sem julgamento, e entender suas necessidades. Apresentar-se, chamar a pessoa pelo nome, garantir um local reservado, respeitar o sigilo profissional e explicar os próximos passos. Conhecer a rede (CRAS, CREAS, Conselho Tutelar, atenção básica, benefícios) para encaminhar com responsabilidade, e registrar o que for necessário no prontuário. Respeitar direitos e diversidade, sem discriminação.', array['Assistente Social']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que é a escuta qualificada?', '["Ouvir sem pressa e sem julgamento, para compreender a necessidade", "Ouvir só o que interessa", "Dar a resposta antes da pergunta", "Anotar sem olhar para a pessoa"]'::jsonb, 0),
      (v_id, 2, 'Onde é indicado conversar com o usuário sobre assuntos sensíveis?', '["Na recepção cheia", "Em local reservado, garantindo o sigilo", "Por telefone com terceiros", "No corredor"]'::jsonb, 1),
      (v_id, 3, 'Por que conhecer a rede de serviços?', '["Para encaminhar o usuário com responsabilidade", "Para dispensar o paciente", "Para atrasar o atendimento", "Não é necessário"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Violência: notificação compulsória e comunicação obrigatória') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Violência: notificação compulsória e comunicação obrigatória', 'A suspeita ou confirmação de violência interpessoal ou autoprovocada é de notificação compulsória e deve ser registrada na ficha do SINAN. Casos de violência contra crianças e adolescentes devem ser comunicados ao Conselho Tutelar; contra pessoa idosa, às autoridades previstas no Estatuto da Pessoa Idosa; contra a mulher, notificação compulsória. Acolher sem julgar, preservar o sigilo e a segurança da vítima, não confrontar o suposto agressor e acionar a rede de proteção.', array['Assistente Social']::text[], 1.5, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'A suspeita de violência contra criança ou adolescente deve ser comunicada a quem?', '["Apenas aos vizinhos", "Ao Conselho Tutelar", "A ninguém", "Somente à família do agressor"]'::jsonb, 1),
      (v_id, 2, 'A violência interpessoal é de notificação:', '["Facultativa", "Compulsória, na ficha do SINAN", "Proibida", "Apenas se a vítima pedir"]'::jsonb, 1),
      (v_id, 3, 'Qual a postura diante de suspeita de violência?', '["Acolher sem julgar, preservar o sigilo e acionar a rede de proteção", "Divulgar o caso no grupo da unidade", "Confrontar o agressor na hora", "Ignorar"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Atendimento humanizado e atendimento prioritário') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Atendimento humanizado e atendimento prioritário', 'Cumprimentar com cordialidade, chamar o paciente pelo nome, ouvir com atenção e explicar o fluxo de atendimento e o tempo de espera. Têm prioridade legal: pessoas com 60 anos ou mais (com prioridade especial acima de 80), gestantes, lactantes, pessoas com crianças de colo, pessoas com deficiência e com mobilidade reduzida. Atenção: a prioridade de ordem é do atendimento administrativo; a ordem do atendimento médico é definida pela classificação de risco. Manter calma diante de reclamações e acionar a chefia quando necessário.', array['Recepcionista']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Quem tem prioridade legal no atendimento administrativo?', '["Ninguém", "Apenas quem conhece alguém", "Quem chegou mais cedo, sem exceção", "Idosos, gestantes, lactantes, pessoas com deficiência e com criança de colo"]'::jsonb, 3),
      (v_id, 2, 'Quem define a ordem do atendimento médico?', '["O vigilante", "A classificação de risco, feita pelo enfermeiro", "A recepção", "O próprio paciente"]'::jsonb, 1),
      (v_id, 3, 'Como lidar com um paciente irritado?', '["Desligar o guichê", "Discutir", "Ouvir com calma, explicar o fluxo e acionar a chefia se preciso", "Ignorar"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Sigilo, LGPD e dados do paciente') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Sigilo, LGPD e dados do paciente', 'Dados de saúde são dados pessoais sensíveis, protegidos pela LGPD e pelo sigilo profissional. Não informar a ninguém a presença, o diagnóstico ou o estado do paciente sem autorização, nem por telefone a desconhecidos. Conferir a identidade e o cadastro (nome completo, data de nascimento, documento, contato). Não fotografar nem compartilhar telas, prontuários ou fichas em redes e grupos. Não deixar fichas à vista. Bloquear a tela ao sair do computador.', array['Recepcionista']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Posso informar por telefone o diagnóstico de um paciente a quem diz ser da família?', '["Não, sem conferir a autorização do paciente ou do responsável", "Sim, sempre", "Sim, se a pessoa insistir", "Sim, se for um vizinho"]'::jsonb, 0),
      (v_id, 2, 'Pode-se fotografar uma tela com dados do paciente e enviar em grupo de WhatsApp?', '["Não: isso viola o sigilo e a LGPD", "Sim, se for só o nome", "Sim, se apagar depois", "Sim, para agilizar"]'::jsonb, 0),
      (v_id, 3, 'Dados de saúde são considerados:', '["Propriedade da recepção", "Dados públicos", "Dados pessoais sensíveis", "Dados sem importância"]'::jsonb, 2);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Gestão de documentos e guarda do prontuário') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Gestão de documentos e guarda do prontuário', 'Prontuário e documentos de saúde são guardados por, no mínimo, 20 anos a partir do último registro (Lei 13.787/2018), podendo ser eliminados depois, conforme o procedimento previsto, inclusive após digitalização regulamentada. Organizar por data e identificação, com acesso restrito. Registrar a retirada e a devolução de documentos. Não descartar documentos sem autorização. Cópias e informações só a quem tem direito (paciente, responsável legal ou requisição legal).', array['Assistente Administrativo']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Por quanto tempo, no mínimo, se guarda o prontuário a partir do último registro?', '["3 meses", "Não é necessário guardar", "20 anos", "1 ano"]'::jsonb, 2),
      (v_id, 2, 'Quem pode receber cópia do prontuário?', '["Qualquer pessoa", "O paciente, o responsável legal ou quem tiver requisição legal", "Qualquer colega curioso", "Quem pedir por telefone"]'::jsonb, 1),
      (v_id, 3, 'O que fazer ao retirar um documento do arquivo?', '["Registrar a retirada e a devolução", "Levar sem avisar", "Descartar após o uso", "Deixar na mesa de outro setor"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Segurança da informação: senhas, e-mails e phishing') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Segurança da informação: senhas, e-mails e phishing', 'A senha é pessoal e intransferível: não compartilhar, não anotar em papel à vista, não reutilizar em outros sites. Bloquear a tela ao sair da mesa e usar Sair em computadores compartilhados. Phishing: e-mails, mensagens e links que pedem senha ou dados, ou geram urgência. Não clicar, não responder e avisar a TI. Não instalar programas não autorizados. Pendrives desconhecidos não devem ser conectados. Comunicar de imediato qualquer suspeita de vazamento.', array['Assistente Administrativo']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Posso emprestar minha senha a um colega para adiantar o serviço?', '["Sim, por 5 minutos", "Não: a senha é pessoal e intransferível", "Sim, se o colega prometer", "Sim, se for da mesma sala"]'::jsonb, 1),
      (v_id, 2, 'O que fazer ao receber um e-mail suspeito que pede sua senha?', '["Responder com a senha", "Não clicar, não responder e avisar a TI", "Encaminhar a todos os colegas", "Clicar para conferir"]'::jsonb, 1),
      (v_id, 3, 'O que fazer ao se levantar do computador?', '["Deixar aberto", "Escrever a senha no monitor", "Pedir a um colega para vigiar", "Bloquear a tela"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Recebimento, conferência e controle de estoque') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Recebimento, conferência e controle de estoque', 'No recebimento, conferir a nota fiscal: itens, quantidade, validade, lote, integridade da embalagem e temperatura, quando aplicável. Divergências são registradas e comunicadas antes do aceite. Armazenar pela regra PEPS (o primeiro que vence é o primeiro que sai). Registrar entradas e saídas no sistema na hora, manter estoque mínimo e comunicar a falta com antecedência. Fazer inventário periódico e investigar diferenças. Itens vencidos ou danificados são segregados e identificados.', array['Almoxarife']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que conferir ao receber uma entrega?', '["Nada, só assinar", "Somente o preço", "Itens, quantidade, validade, lote e integridade da embalagem", "Somente a cor da caixa"]'::jsonb, 2),
      (v_id, 2, 'O que fazer ao notar divergência na nota fiscal?', '["Esperar alguém reclamar", "Registrar e comunicar antes de aceitar", "Rasgar a nota", "Aceitar sem registrar"]'::jsonb, 1),
      (v_id, 3, 'Quando registrar as saídas de material no sistema?', '["Nunca", "Uma vez por mês", "Na hora da retirada", "Somente quando faltar"]'::jsonb, 2),
      (v_id, 4, 'Qual a função do estoque mínimo?', '["Avisar com antecedência a necessidade de reposição", "Guardar sobras", "Esconder itens", "Aumentar o desperdício"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Armazenamento seguro e prevenção de acidentes no almoxarifado') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Armazenamento seguro e prevenção de acidentes no almoxarifado', 'Manter corredores e saídas de emergência desobstruídos, extintores visíveis e acessíveis. Empilhar com segurança, respeitando o peso e a altura máxima; itens pesados nas prateleiras baixas. Nada encostado em paredes, luminárias ou direto no chão. Produtos químicos separados e identificados, com a ficha de segurança (FISPQ) disponível. Sinalizar piso molhado. Usar EPI adequado (luva, calçado fechado) e técnica correta ao levantar peso. Segregar produtos vencidos.', array['Almoxarife']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Como devem ficar as saídas de emergência?', '["Trancadas por dentro", "Sempre livres e sinalizadas", "Com caixas empilhadas", "Cobertas com lona"]'::jsonb, 1),
      (v_id, 2, 'Onde colocar os itens mais pesados?', '["No alto, por segurança", "No corredor", "Sobre as caixas frágeis", "Nas prateleiras baixas"]'::jsonb, 3),
      (v_id, 3, 'O que não pode faltar junto aos produtos químicos?', '["Nada", "Identificação e a ficha de segurança (FISPQ)", "Perfume", "Cartaz de promoção"]'::jsonb, 1),
      (v_id, 4, 'Qual a técnica correta ao levantar peso?', '["Flexionar os joelhos e manter a carga junto ao corpo", "Curvar a coluna com as pernas esticadas", "Levantar de lado, com um braço só", "Girar o tronco com a carga"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Regulação e transferência de pacientes') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Regulação e transferência de pacientes', 'O NIR organiza o acesso a leitos e a transferência de pacientes pela gravidade e prioridade clínica, junto à regulação. Antes de solicitar a vaga: relatório médico completo com diagnóstico, estado clínico, exames e justificativa. Registrar todos os horários (solicitação, resposta, saída) para acompanhamento. Cobrar a resposta conforme a prioridade e comunicar o médico assistente e a família. Confirmar o transporte adequado à gravidade e a passagem de plantão ao serviço que vai receber.', array['NIR']::text[], 1.5, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que deve acompanhar o pedido de vaga?', '["Somente o horário", "Relatório médico completo com diagnóstico, estado clínico e justificativa", "Nada, basta ligar", "Somente o nome"]'::jsonb, 1),
      (v_id, 2, 'Por que registrar os horários da solicitação e da resposta?', '["Para acompanhar o tempo e cobrar a resposta conforme a prioridade", "Para ocultar atrasos", "Para enfeitar o relatório", "Não é necessário"]'::jsonb, 0),
      (v_id, 3, 'Quem define a prioridade clínica do paciente?', '["A equipe assistencial, com base na gravidade", "O motorista", "A recepção", "A ordem do pedido"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Comunicação efetiva e passagem de plantão (SBAR)') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Comunicação efetiva e passagem de plantão (SBAR)', 'A falha de comunicação é uma das principais causas de eventos adversos. O SBAR organiza a informação: S (Situação): o que está acontecendo agora; B (Background/Histórico): contexto e antecedentes; A (Avaliação): o que você percebe como problema; R (Recomendação): o que você sugere ou precisa. Passagem de plantão: sem pressa, com leitura de retorno (read-back) das informações críticas, registrada, em local sem interrupções e com o paciente identificado.', array['NIR']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que significa a letra S no SBAR?', '["Sinais", "Sala", "Situação", "Sono"]'::jsonb, 2),
      (v_id, 2, 'O que é a leitura de retorno (read-back)?', '["Ler em voz baixa", "Repetir a informação recebida para confirmar o entendimento", "Ler apenas o diagnóstico", "Ler o prontuário no fim do dia"]'::jsonb, 1),
      (v_id, 3, 'Qual a melhor forma de passar o plantão?', '["Sem pressa, registrada e com informações críticas confirmadas", "Rápida, de pé, no corredor", "Só por mensagem", "Sem identificar o paciente"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Segurança da informação, acessos e incidentes') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Segurança da informação, acessos e incidentes', 'Aplicar o princípio do menor privilégio: cada pessoa acessa só o que precisa. Contas individuais, senhas fortes, autenticação em dois fatores quando possível, revisão periódica de acessos e bloqueio imediato de quem sai da unidade. Manter sistemas e antivírus atualizados e backups testados. Incidentes (vazamento, acesso indevido, ransomware) devem ser contidos, registrados e comunicados à direção, e à autoridade se for o caso. Orientar a equipe sobre phishing.', array['TI']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que significa o princípio do menor privilégio?', '["Ninguém acessa nada", "Todos acessam tudo", "Cada pessoa acessa apenas o que precisa para o trabalho", "O gestor acessa só o dele"]'::jsonb, 2),
      (v_id, 2, 'O que fazer com a conta de quem deixou a unidade?', '["Bloquear imediatamente", "Passar a senha ao substituto", "Esperar um ano", "Manter ativa por segurança"]'::jsonb, 0),
      (v_id, 3, 'Por que testar o backup?', '["Para trocar a senha", "Para gastar espaço", "Para garantir que a restauração realmente funciona", "Não é necessário"]'::jsonb, 2),
      (v_id, 4, 'Diante de um possível vazamento de dados, a conduta é:', '["Esperar acontecer de novo", "Conter, registrar e comunicar a direção", "Apagar tudo", "Esconder"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Plano de contingência: o sistema fora do ar') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Plano de contingência: o sistema fora do ar', 'Toda unidade precisa de plano para a queda do sistema: formulários de contingência em papel nos setores críticos, lista de contatos de TI e de plantão, e procedimento para os registros feitos em papel serem lançados depois, com data, horário e responsável. Teste regularmente a restauração do backup e o funcionamento do plano. Comunicar a equipe sobre a queda e a previsão de retorno, priorizar os serviços críticos e registrar o incidente e o tempo de indisponibilidade.', array['TI']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que os setores críticos precisam ter para uma queda do sistema?', '["Um aviso de que ficará pior", "Formulários de contingência em papel e contatos de plantão", "Nada, aguardar", "Somente o celular pessoal"]'::jsonb, 1),
      (v_id, 2, 'O que fazer com os registros em papel depois que o sistema voltar?', '["Reescrever de memória", "Guardar sem lançar", "Lançar no sistema, com data, horário e responsável", "Jogar fora"]'::jsonb, 2),
      (v_id, 3, 'Por que testar o plano de contingência?', '["Para passar o tempo", "Para garantir que funciona quando for preciso", "Para trocar equipamentos", "Não é necessário"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Limpeza e desinfecção de superfícies') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Limpeza e desinfecção de superfícies', 'Limpar sempre do mais limpo para o mais sujo e do fundo para a saída, em movimentos unidirecionais, sem varrer a seco. Usar panos e mops separados por área (cores). Limpeza concorrente (diária, durante o uso do ambiente) e terminal (completa, após alta ou periodicamente). Em derramamento de sangue ou secreção: usar luvas, retirar a matéria orgânica com papel absorvente e depois desinfetar o local. Sinalizar piso molhado. Higienizar as mãos ao trocar de área e ao retirar as luvas.', array['ASG']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Em que direção se faz a limpeza?', '["Do mais limpo para o mais sujo, do fundo para a saída", "Da saída para o fundo", "Em qualquer ordem", "Do mais sujo para o mais limpo"]'::jsonb, 0),
      (v_id, 2, 'Pode-se varrer a seco em ambiente de saúde?', '["Sim, é mais rápido", "Sim, com vassoura de palha", "Sim, durante o atendimento", "Não: usar pano úmido ou mop"]'::jsonb, 3),
      (v_id, 3, 'Como proceder em um derramamento de sangue?', '["Cobrir com papel e deixar", "Só passar pano úmido", "Luvas, retirar a matéria orgânica com papel absorvente e depois desinfetar", "Ignorar"]'::jsonb, 2),
      (v_id, 4, 'Por que sinalizar o piso molhado?', '["Não é necessário", "Para evitar quedas", "Para enfeitar", "Porque é regra do refeitório"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Produtos químicos de limpeza: diluição, mistura e EPI') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Produtos químicos de limpeza: diluição, mistura e EPI', 'Usar o produto na diluição indicada no rótulo e na ficha de segurança (FISPQ): mais concentrado não limpa melhor e faz mal. Nunca misturar produtos de limpeza (por exemplo, hipoclorito com ácidos, amônia ou detergentes) pois podem liberar gases tóxicos. Manter na embalagem original, com rótulo legível. Usar EPI: luvas de borracha, calçado fechado antiderrapante, óculos e máscara quando necessário. Em contato com a pele ou os olhos, lavar com água em abundância e avisar a chefia.', array['ASG']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Posso misturar dois produtos de limpeza para limpar melhor?', '["Não: algumas misturas liberam gases tóxicos", "Sim, sempre", "Sim, se estiver com pressa", "Sim, hipoclorito com ácido"]'::jsonb, 0),
      (v_id, 2, 'Onde encontrar a diluição correta do produto?', '["No palpite", "No boato do corredor", "No rótulo e na ficha de segurança (FISPQ)", "Em lugar nenhum"]'::jsonb, 2),
      (v_id, 3, 'Qual a conduta se o produto cair nos olhos?', '["Aguardar passar", "Aplicar outro produto", "Lavar com água em abundância e avisar a chefia", "Esfregar com a luva"]'::jsonb, 2),
      (v_id, 4, 'Como o produto deve ser guardado?', '["Na embalagem original, com rótulo legível", "Em garrafa de refrigerante", "Sem identificação", "Junto aos alimentos"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Controle de acesso e abordagem cordial') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Controle de acesso e abordagem cordial', 'Identificar todo visitante, acompanhante e fornecedor, com registro e crachá, e orientar sobre horários e regras. Pacientes em atendimento, urgência e emergência têm acesso garantido e prioridade na entrada. Abordar com cordialidade, firmeza e respeito, sem constrangimento nem uso de força desproporcional. Não permitir a entrada com objetos que ofereçam risco. Registrar ocorrências com data, horário e pessoas envolvidas, e acionar a supervisão e a coordenação quando necessário.', array['Vigilante']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual deve ser a postura na abordagem de visitantes?', '["Hostil", "Indiferente", "Autoritária e gritando", "Cordial e firme, sem constrangimento"]'::jsonb, 3),
      (v_id, 2, 'Um paciente em urgência chega. O que fazer?', '["Liberar o acesso e acionar a equipe imediatamente", "Pedir o documento antes de tudo", "Mandar voltar amanhã", "Pedir que aguarde a vez na fila"]'::jsonb, 0),
      (v_id, 3, 'Como registrar uma ocorrência?', '["Só de memória", "Com data, horário e pessoas envolvidas", "Não registrar", "Combinar com colegas depois"]'::jsonb, 1);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Situações de agressividade e emergência') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Situações de agressividade e emergência', 'Diante de agressividade, priorizar a segurança das pessoas: manter a calma, voz baixa e firme, distância segura, postura aberta, ouvir e não provocar. Isolar o ambiente se possível, acionar o supervisor, a coordenação e a equipe de saúde, e a polícia se houver risco. Usar força apenas se estritamente necessário e proporcional. Em incêndio: acionar o alarme e a brigada, ajudar na evacuação seguindo as rotas sinalizadas, não usar elevador e não voltar ao local. Registrar tudo.', array['Vigilante']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Como se portar diante de uma pessoa agressiva?', '["Ameaçando", "Gritando de volta", "Provocando", "Calma, voz baixa e firme, mantendo distância segura"]'::jsonb, 3),
      (v_id, 2, 'Em caso de incêndio, o que NÃO fazer?', '["Ajudar na evacuação", "Usar o elevador", "Seguir as rotas de fuga", "Acionar o alarme"]'::jsonb, 1),
      (v_id, 3, 'Quando usar a força?', '["Somente se estritamente necessário e de forma proporcional", "Nunca registrar o uso", "Para resolver qualquer discussão", "Sempre que o paciente reclamar"]'::jsonb, 0);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Transporte seguro de pacientes') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Transporte seguro de pacientes', 'Confirmar o paciente com 2 identificadores e o destino. Verificar acessos, drenos, sondas e oxigênio antes de movimentar. Maca ou cadeira com freios travados ao parar e ao transferir; grades elevadas e cinto de segurança. Empurrar com atenção em curvas, portas e rampas, avisando as pessoas. Nunca deixar o paciente sozinho. Em pacientes graves, acompanhar com a equipe de saúde. Comunicar a enfermagem de qualquer intercorrência e entregar o paciente identificado no destino.', array['Maqueiro']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'O que fazer com os freios ao parar a maca?', '["Não é necessário", "Mantê-los travados", "Travar só uma roda", "Deixar soltos"]'::jsonb, 1),
      (v_id, 2, 'O paciente pode ser deixado sozinho durante o transporte?', '["Não, nunca", "Sim, se estiver dormindo", "Sim, se estiver com grades", "Sim, por alguns minutos"]'::jsonb, 0),
      (v_id, 3, 'O que verificar antes de movimentar o paciente?', '["Acessos, drenos, sondas e oxigênio", "Somente o horário", "Nada", "Somente o sapato"]'::jsonb, 0),
      (v_id, 4, 'Em caso de intercorrência durante o transporte:', '["Esperar chegar ao destino", "Continuar sem avisar", "Ligar para a família", "Parar e comunicar imediatamente a enfermagem"]'::jsonb, 3);
  end if;
end $$;

do $$ declare v_id bigint; begin
  if not exists (select 1 from public.treinamentos where titulo = 'Mecânica corporal e prevenção de lesões na movimentação') then
    insert into public.treinamentos (titulo, descricao, funcoes, carga_horaria, nota_minima, obrigatorio, ativo, criado_por_nome)
    values ('Mecânica corporal e prevenção de lesões na movimentação', 'Para proteger a coluna: aproximar-se da carga, afastar os pés para dar base de apoio, flexionar os joelhos e manter a coluna reta, usando a força das pernas. Evitar torção do tronco: girar com os pés. Pedir ajuda para pacientes pesados ou de difícil manejo, e usar equipamentos (lençol de transferência, prancha, elevador). Combinar a contagem antes de levantar em equipe. Fazer pausas, alongar e comunicar dor ou desconforto à chefia.', array['Maqueiro']::text[], 1, 70, false, true, 'Coordenação (curso modelo)') returning id into v_id;
    insert into public.treinamento_questoes (treinamento_id, ordem, enunciado, opcoes, correta) values
      (v_id, 1, 'Qual é a postura correta ao levantar um peso?', '["Girando o tronco", "De costas e com um braço só", "Joelhos flexionados, coluna reta e carga próxima ao corpo", "Pernas esticadas e coluna curvada"]'::jsonb, 2),
      (v_id, 2, 'Quando pedir ajuda para movimentar um paciente?', '["Nunca", "Quando for pesado ou de difícil manejo", "Só se o paciente reclamar", "Só se o chefe estiver olhando"]'::jsonb, 1),
      (v_id, 3, 'Como evitar torção da coluna?', '["Levantar sem planejamento", "Fazer força com um braço", "Girar com os pés, não com o tronco", "Torcer a coluna rapidamente"]'::jsonb, 2);
  end if;
end $$;
