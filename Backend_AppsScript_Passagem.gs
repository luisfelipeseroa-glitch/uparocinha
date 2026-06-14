/* =====================================================================
   ADIÇÃO AO APPS SCRIPT — GESTÃO INTELIGENTE UPA ROCINHA
   =====================================================================

   COMO USAR:
   1. Abra a planilha Google Sheets que já está ligada ao sistema.
   2. Menu Extensões > Apps Script (vai abrir o projeto que já existe,
      com a função doGet que alimenta o fetchSheet).
   3. NÃO apague o código existente. Apenas COLE as funções abaixo no
      final do arquivo (ou em um novo arquivo .gs dentro do mesmo
      projeto, ex: "Backend_Passagem.gs").
   4. Garanta que existe uma aba chamada exatamente "Passagemplantao"
      na planilha. Se não existir, o próprio script cria automaticamente
      na primeira gravação, já com o cabeçalho (linha 1):

        A: Nome-NIR | B: Turno | C: Lotação | D: Paciente | E: Leito |
        F: Diagnóstico | G: Prioridade | H: Pendência | I: Intercorrências |
        J: Informações adicionais | K: Link PDF

   5. Volte em Implantar > Gerenciar implantações > edite a implantação
      existente do tipo "Aplicativo da Web" e clique em "Nova versão"
      para publicar essas mudanças MANTENDO a mesma URL
      (a mesma APP_SCRIPT_URL que já está no index.html).
      - Executar como: Eu (seu usuário)
      - Quem tem acesso: Qualquer pessoa

   IMPORTANTE — CORS:
   O index.html envia POST com Content-Type "text/plain;charset=utf-8"
   propositalmente, para evitar o preflight OPTIONS que o Apps Script
   não responde. NÃO altere esse header no front-end.

   ===================================================================== */

/**
 * Ponto de entrada para todas as gravações (POST) feitas pelo app.
 * Roteia pela propriedade "action" enviada no corpo (JSON).
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (body.action) {

      case 'appendPassagem':
        return _ppAppend(ss, body);

      case 'updateCell':
        return _atualizarCelula(ss, body);

      case 'uploadPdf':
        return _uploadPdf(body);

      default:
        return _json({ ok: false, error: 'Ação desconhecida: ' + body.action });
    }
  } catch (err) {
    return _json({ ok: false, error: err.message });
  }
}

/* ---------------------------------------------------------------------
   Adiciona uma linha na aba "Passagemplantao" (colunas A a J).
   Cria a aba e o cabeçalho automaticamente se ainda não existir.
   Retorna o número da linha criada (para depois gravar o link do PDF
   na coluna K).
--------------------------------------------------------------------- */
function _ppAppend(ss, body) {
  var nomeAba = body.aba || 'Passagemplantao';
  var sheet = ss.getSheetByName(nomeAba);

  if (!sheet) {
    sheet = ss.insertSheet(nomeAba);
    sheet.appendRow([
      'Nome-NIR', 'Turno', 'Lotação', 'Paciente', 'Leito',
      'Diagnóstico', 'Prioridade', 'Pendência', 'Intercorrências',
      'Informações adicionais', 'Link PDF'
    ]);
  }

  sheet.appendRow(body.dados);
  var linha = sheet.getLastRow();
  return _json({ ok: true, linha: linha });
}

/* ---------------------------------------------------------------------
   Atualiza uma única célula (usado para gravar o link do PDF na
   coluna K, após o upload).
   body: { aba, linha, coluna, valor }
--------------------------------------------------------------------- */
function _atualizarCelula(ss, body) {
  var sheet = ss.getSheetByName(body.aba);
  if (!sheet) return _json({ ok: false, error: 'Aba não encontrada: ' + body.aba });
  sheet.getRange(body.linha, body.coluna).setValue(body.valor);
  return _json({ ok: true });
}

/* ---------------------------------------------------------------------
   Recebe um PDF em base64, salva no Google Drive (pasta
   "PassagemPlantao_PDFs", criada automaticamente na 1ª vez), define
   compartilhamento "Qualquer pessoa com o link" e retorna a URL.
   body: { filename, base64 }
--------------------------------------------------------------------- */
function _uploadPdf(body) {
  var NOME_PASTA = 'PassagemPlantao_PDFs';
  var pastas = DriveApp.getFoldersByName(NOME_PASTA);
  var pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(NOME_PASTA);

  var bytes = Utilities.base64Decode(body.base64);
  var blob  = Utilities.newBlob(bytes, 'application/pdf', body.filename || 'documento.pdf');
  var arquivo = pasta.createFile(blob);

  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return _json({ ok: true, url: arquivo.getUrl(), id: arquivo.getId() });
}

/* ---------------------------------------------------------------------
   Helper de resposta JSON
--------------------------------------------------------------------- */
function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
