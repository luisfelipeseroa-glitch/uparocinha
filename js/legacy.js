/* =====================================================================
   LEGADO — partes do sistema antigo que continuam iguais:
   Protocolos Clínicos, Calculadoras Clínicas, PDF com logo e Chat da equipe.
   (O login, o menu e todos os módulos de dados agora estão em core.js e mod-*.js)
   ===================================================================== */
function initials(nome) {
  const p = nome.trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : p[0]?.substring(0,2).toUpperCase()||'??';
}

function selectTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display='none');
  document.getElementById(tabId).style.display = 'block';
}

async function gerarPDFDocumento({ titulo, subtitulo, elementId, nomeArquivo, retornarBase64 }) {
  const original = document.getElementById(elementId);
  if (!original) { alert('Conteúdo não encontrado para gerar o PDF.'); return null; }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;top:0;left:-9999px;width:760px;background:#ffffff;padding:28px;font-family:Nunito,Arial,sans-serif;color:#1e293b;z-index:-1;';
  wrapper.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;border-bottom:3px solid #1A6FC4;padding-bottom:14px;margin-bottom:18px;">
      <img src="logo_upa_branca.png" crossorigin="anonymous" style="height:64px;background:#1158A0;border-radius:10px;padding:6px;">
      <div>
        <div style="font-size:21px;font-weight:900;color:#1A6FC4;letter-spacing:1px;">${titulo}</div>
        ${subtitulo ? `<div style="font-size:12px;font-weight:700;color:#64748b;margin-top:2px;">${subtitulo}</div>` : ''}
      </div>
    </div>
    <div id="pdf-conteudo-clone" style="font-size:12px;"></div>
    <div style="margin-top:48px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#334155;">
      <div><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
      <div style="text-align:center;">
        <div style="border-top:1px solid #1e293b;width:260px;margin-bottom:5px;"></div>
        Assinatura do(a) colaborador(a)
      </div>
    </div>`;
  wrapper.querySelector('#pdf-conteudo-clone').appendChild(original.cloneNode(true));
  document.body.appendChild(wrapper);

  let pdf;
  try {
    const canvas = await html2canvas(wrapper, { scale:2, useCORS:true, backgroundColor:'#ffffff' });
    const { jsPDF } = window.jspdf;
    pdf = new jsPDF('p','mm','a4');
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth   = pageWidth;
    const imgHeight  = canvas.height * imgWidth / canvas.width;
    const imgData    = canvas.toDataURL('image/png');

    let heightLeft = imgHeight, position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  } catch(e) {
    console.error('Erro ao gerar PDF:', e);
    document.body.removeChild(wrapper);
    alert('Não foi possível gerar o PDF.');
    return null;
  }
  document.body.removeChild(wrapper);

  if (nomeArquivo) pdf.save(nomeArquivo);
  if (retornarBase64) {
    const dataUri = pdf.output('datauristring');
    return dataUri.split(',')[1]; // remove "data:application/pdf;base64,"
  }
  return null;
}

const PROTOCOLOS = {
  sepse: {
    titulo:'🦠 Protocolo de Sepse', cor:'#EF4444',
    alerta:{bg:'#FEE2E2',cor:'#7F1D1D',txt:'⚠️ Cada hora sem antibiótico aumenta a mortalidade em ~7%'},
    steps:[
      {n:'1',t:'Identificar suspeita clínica',d:'Infecção + qSOFA ≥2: FR≥22, Glasgow<15 ou PAS≤100 mmHg'},
      {n:'2',t:'Coletar hemoculturas (x2)',d:'Colher antes do ATB — não atrasar o antibiótico pela coleta'},
      {n:'3',t:'Dosar lactato',d:'≥2 mmol/L = hipoperfusão | ≥4 mmol/L = choque séptico'},
      {n:'4',t:'Antibioticoterapia empírica',d:'Iniciar em até 1h. Escolher conforme foco provável'},
      {n:'5',t:'Ressuscitação volêmica',d:'SF 0,9% ou Ringer Lactato 30 mL/kg em até 3h se hipotensão ou lactato ≥4'},
      {n:'6',t:'Vasopressor se PAM < 65 mmHg',d:'Noradrenalina preferencial. Acesso venoso central se possível'},
    ],
    meta:{bg:'#FEF3C7',cor:'#78350F',txt:'🎯 Metas: PAM ≥65 | Diurese ≥0,5 mL/kg/h | Lactato clearance ≥10% em 2h'}
  },
  avc: {
    titulo:'🧠 Protocolo AVC / AVE', cor:'#8B5CF6',
    alerta:{bg:'#EDE9FE',cor:'#4C1D95',txt:'⚠️ "Tempo é cérebro" — 1,9 milhão de neurônios morrem por minuto'},
    steps:[
      {n:'1',t:'Aplicar escala FAST',d:'Face (assimetria) | Arm (fraqueza) | Speech (fala) | Time (hora)'},
      {n:'2',t:'Registrar hora exata do início',d:'Janela trombólise: até 4,5h | Trombectomia: até 24h'},
      {n:'3',t:'Acesso venoso + exames urgentes',d:'Glicemia, coagulograma, hemograma, eletrólitos'},
      {n:'4',t:'TC de crânio sem contraste — URGENTE',d:'Diferenciar AVC isquêmico de hemorrágico antes de qualquer conduta'},
      {n:'5',t:'Monitorização contínua',d:'PA, SatO2, ECG. Manter SatO2 ≥94%. Cabeceira 30° se rebaixamento'},
      {n:'6',t:'Acionar neurologista / SAMU',d:'Para avaliação de trombólise (Alteplase 0,9 mg/kg, máx 90mg) ou transferência'},
    ],
    meta:{bg:'#FEF3C7',cor:'#78350F',txt:'🚫 NÃO reduzir PA agressivamente (exceto se >220x120 no isquêmico ou >180x105 no hemorrágico)'}
  },
  iam: {
    titulo:'❤️ Dor Torácica / IAM', cor:'#DC2626',
    alerta:{bg:'#FEE2E2',cor:'#7F1D1D',txt:'⚠️ Todo ECG deve ser realizado em até 10 minutos da chegada'},
    steps:[
      {n:'1',t:'ECG 12 derivações — imediato',d:'Identificar supradesnivelamento de ST (IAMCSST) ou bloqueio de ramo novo'},
      {n:'2',t:'Acesso venoso + monitorização',d:'PA, FC, SatO2, oximetria. Oxigênio se SatO2 <94%'},
      {n:'3',t:'AAS 200mg VO — mastigar',d:'Se não houver contraindicação. Dose de ataque imediata'},
      {n:'4',t:'Colher troponina, CK-MB, BNP',d:'Hemograma, coagulograma, eletrólitos, função renal'},
      {n:'5',t:'Morfina / Nitrato se dor intensa',d:'Nitrato: contraindicado se PAS <90 ou uso de sildenafil. Morfina: 2-4mg EV'},
      {n:'6',t:'Acionar hemodinâmica / transferência',d:'IAMCSST: angioplastia em até 90min (porta-balão). Se indisponível: trombólise'},
    ],
    meta:{bg:'#FEF3C7',cor:'#78350F',txt:'🎯 Mnemônico MONAB: Morfina | Oxigênio | Nitrato | AAS | Beta-bloqueador'}
  },
  has: {
    titulo:'🩺 Crise Hipertensiva', cor:'#F59E0B',
    alerta:{bg:'#FFFBEB',cor:'#78350F',txt:'⚠️ Urgência: PA elevada sem lesão de órgão-alvo | Emergência: PA elevada COM lesão'},
    steps:[
      {n:'1',t:'Aferir PA em ambos os membros',d:'Confirmar com 2 medidas. PAS ≥180 e/ou PAD ≥120 mmHg = crise'},
      {n:'2',t:'Pesquisar lesão de órgão-alvo',d:'ECG, fundoscopia, creatinina, EAS, TC se cefaleia intensa'},
      {n:'3',t:'Urgência hipertensiva — VO',d:'Captopril 25mg SL ou Amlodipino 5-10mg VO. Reduzir PA em horas'},
      {n:'4',t:'Emergência hipertensiva — EV',d:'Nitroprussiato, Labetalol ou Hidralazina EV. UTI/monitorização'},
      {n:'5',t:'Meta de redução',d:'Reduzir PAM em no máx 25% na 1ª hora, depois atingir meta em 2-6h'},
    ],
    meta:{bg:'#FEF3C7',cor:'#78350F',txt:'🚫 Não reduzir PA abruptamente — risco de hipoperfusão coronariana e cerebral'}
  },
  pcr: {
    titulo:'💓 PCR / RCP', cor:'#1E3A8A',
    alerta:{bg:'#EFF6FF',cor:'#1E3A8A',txt:'⚠️ Cada minuto sem RCP reduz em ~10% a chance de sobrevivência'},
    steps:[
      {n:'1',t:'Confirmar PCR',d:'Ausência de responsividade, respiração e pulso central (≤10 seg)'},
      {n:'2',t:'Chamar ajuda + acionar DEA',d:'Ativar código azul. Iniciar RCP imediatamente'},
      {n:'3',t:'Compressões torácicas',d:'100-120/min, 5-6cm profundidade, relação 30:2'},
      {n:'4',t:'Via aérea + ventilação',d:'Bolsa-máscara ou IOT. Capnografia se disponível'},
      {n:'5',t:'DEA / Desfibrilação',d:'Ritmos chocáveis: FV e TV sem pulso. Chocar o mais rápido possível'},
      {n:'6',t:'Drogas vasopressoras',d:'Adrenalina 1mg EV a cada 3-5min. Amiodarona 300mg se FV refratária'},
    ],
    meta:{bg:'#FEF3C7',cor:'#78350F',txt:'🎯 H5T5: Hipovolemia, Hipóxia, H+, Hipo/Hipercalemia, Hipotermia | TEP, Pneumotórax, Tamponamento, Toxinas, Trombose'}
  },
  conv: {
    titulo:'⚡ Convulsão', cor:'#0369A1',
    alerta:{bg:'#F0F9FF',cor:'#0C4A6E',txt:'⚠️ Status epiléptico = convulsão >5min ou 2 crises sem recuperação da consciência'},
    steps:[
      {n:'1',t:'Proteger o paciente',d:'Decúbito lateral, afastar objetos. NÃO imobilizar, NÃO colocar nada na boca'},
      {n:'2',t:'Medir glicemia capilar',d:'Hipoglicemia é causa tratável imediata. SG 50% 50mL EV se <60mg/dL'},
      {n:'3',t:'Benzodiazepínico — 1ª linha',d:'Midazolam 10mg IM ou Diazepam 10mg EV (1mg/min). Repetir 1x se necessário'},
      {n:'4',t:'Antiepiléptico — 2ª linha',d:'Fenitoína 20mg/kg EV (máx 50mg/min) ou Valproato 40mg/kg EV'},
      {n:'5',t:'Status refratário — 3ª linha',d:'Fenobarbital 20mg/kg EV. Considerar anestesia geral + IOT + UTI'},
    ],
    meta:{bg:'#FEF3C7',cor:'#78350F',txt:'🎯 Causas reversíveis: Hipoglicemia, Hiponatremia, Encefalopatia hepática, Drogas/toxinas'}
  },
  trauma: {
    titulo:'🩹 Trauma — Avaliação ABCDE', cor:'#16A34A',
    alerta:{bg:'#F0FDF4',cor:'#14532D',txt:'⚠️ A triagem primária deve ser concluída em menos de 2 minutos'},
    steps:[
      {n:'A',t:'Airway — Via aérea + controle cervical',d:'Desobstruir. Jaw thrust em trauma. Colar cervical se suspeita de lesão'},
      {n:'B',t:'Breathing — Ventilação',d:'Pneumotórax hipertensivo: decompressão imediata. SatO2 alvo >94%'},
      {n:'C',t:'Circulation — Circulação + hemorragia',d:'Comprimir sangramentos. 2 acessos calibrosos. Ringer Lactato 1L rápido'},
      {n:'D',t:'Disability — Nível neurológico',d:'Glasgow, pupilas, glicemia. GCS ≤8 = IOT'},
      {n:'E',t:'Exposure — Exposição + controle térmico',d:'Despir completamente, inspecionar dorso. Cobrir para evitar hipotermia'},
    ],
    meta:{bg:'#FEF3C7',cor:'#78350F',txt:'🎯 Tríade da morte: Hipotermia + Acidose + Coagulopatia — prevenir agressivamente'}
  }
};

function showProto(key) {
  const p = PROTOCOLOS[key];
  if (!p) return;
  document.getElementById('proto-menu').style.display = 'none';
  document.getElementById('proto-detail').style.display = 'block';
  document.getElementById('proto-detail-body').innerHTML = `
    <h2 style="text-align:center;color:${p.cor};margin-bottom:12px">${p.titulo}</h2>
    <div class="fluxo-alerta" style="background:${p.alerta.bg};color:${p.alerta.cor}">${p.alerta.txt}</div>
    ${p.steps.map((s,i)=>`
      ${i>0?'<div class="fluxo-arrow">↓</div>':''}
      <div class="fluxo-step">
        <div class="fluxo-num" style="background:${p.cor}">${s.n}</div>
        <div><div class="fluxo-title">${s.t}</div><div class="fluxo-desc">${s.d}</div></div>
      </div>`).join('')}
    <div class="fluxo-alerta" style="background:${p.meta.bg};color:${p.meta.cor};margin-top:12px">${p.meta.txt}</div>`;
}

function showCalc(key) {
  document.getElementById('calc-menu').style.display = 'none';
  document.getElementById('calc-detail').style.display = 'block';
  const body = document.getElementById('calc-detail-body');

  if (key === 'glasgow') {
    body.innerHTML = `
      <h3 style="color:#7C3AED;margin-bottom:14px">🧠 Escala de Glasgow</h3>
      ${glasgowField('g_oc','Abertura Ocular',[[4,'Espontânea'],[3,'À voz'],[2,'À dor'],[1,'Ausente']])}
      ${glasgowField('g_vr','Resposta Verbal',[[5,'Orientado'],[4,'Confuso'],[3,'Palavras inapropriadas'],[2,'Sons incompreensíveis'],[1,'Ausente']])}
      ${glasgowField('g_mr','Resposta Motora',[[6,'Obedece comandos'],[5,'Localiza dor'],[4,'Retirada à dor'],[3,'Flexão anormal'],[2,'Extensão anormal'],[1,'Ausente']])}
      <div class="calc-result" id="glasgow-result" style="display:none">
        <div class="calc-result-val" id="glasgow-val">—</div>
        <div class="calc-result-lbl" id="glasgow-lbl">Pontos</div>
      </div>`;
    document.querySelectorAll('#calc-detail-body select').forEach(s=>s.addEventListener('change',calcGlasgow));

  } else if (key === 'braden') {
    body.innerHTML = `
      <h3 style="color:#D97706;margin-bottom:14px">🛏️ Escala de Braden</h3>
      ${bradenField('bd1','Percepção Sensorial',[[4,'Nenhuma limitação'],[3,'Levemente limitada'],[2,'Muito limitada'],[1,'Completamente limitada']])}
      ${bradenField('bd2','Umidade',[[4,'Raramente úmida'],[3,'Ocasionalmente úmida'],[2,'Muito úmida'],[1,'Constantemente úmida']])}
      ${bradenField('bd3','Atividade',[[4,'Anda frequentemente'],[3,'Anda ocasionalmente'],[2,'Restrito à cadeira'],[1,'Acamado']])}
      ${bradenField('bd4','Mobilidade',[[4,'Sem limitações'],[3,'Levemente limitada'],[2,'Muito limitada'],[1,'Completamente imóvel']])}
      ${bradenField('bd5','Nutrição',[[4,'Excelente'],[3,'Adequada'],[2,'Inadequada'],[1,'Muito pobre']])}
      ${bradenField('bd6','Fricção e Cisalhamento',[[3,'Nenhum problema'],[2,'Problema em potencial'],[1,'Problema']])}
      <div class="calc-result" id="braden-result" style="display:none">
        <div class="calc-result-val" id="braden-val">—</div>
        <div class="calc-result-lbl" id="braden-lbl">Pontos</div>
      </div>`;
    document.querySelectorAll('#calc-detail-body select').forEach(s=>s.addEventListener('change',calcBraden));

  } else if (key === 'vent') {
    body.innerHTML = `
      <h2 style="text-align:center; color:#0369a1; margin-top:0; margin-bottom:4px;">😷 Suporte Ventilatório Pediátrico</h2>
      <p style="font-size:0.75rem; color:#64748b; text-align:center; margin-top:-4px; margin-bottom:14px;">
        Parâmetros iniciais sugeridos — ajuste conforme resposta clínica
      </p>

      <div class="vent-table-wrap">
        <table class="vent-table">
          <thead>
            <tr>
              <th>Faixa Etária</th>
              <th>Peso (kg)</th>
              <th>Vc (mL)</th>
              <th>FR (rpm)</th>
              <th>PEEP (cmH₂O)</th>
              <th>PIP (cmH₂O)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><div class="faixa-nome">RN Prematuro</div><div class="faixa-idade">&lt; 37 semanas</div></td>
              <td>0,5 – 1,5</td><td>3 – 12</td><td>40 – 60</td><td>4 – 5</td><td>14 – 20</td>
            </tr>
            <tr>
              <td><div class="faixa-nome">RN a Termo</div><div class="faixa-idade">0 – 28 dias</div></td>
              <td>2,5 – 4</td><td>15 – 32</td><td>40 – 60</td><td>4 – 5</td><td>16 – 22</td>
            </tr>
            <tr>
              <td><div class="faixa-nome">Lactente</div><div class="faixa-idade">1 – 12 meses</div></td>
              <td>4 – 10</td><td>24 – 80</td><td>30 – 50</td><td>4 – 6</td><td>16 – 24</td>
            </tr>
            <tr>
              <td><div class="faixa-nome">Pré-escolar</div><div class="faixa-idade">1 – 5 anos</div></td>
              <td>10 – 18</td><td>60 – 144</td><td>20 – 30</td><td>5 – 6</td><td>18 – 25</td>
            </tr>
            <tr>
              <td><div class="faixa-nome">Escolar</div><div class="faixa-idade">6 – 12 anos</div></td>
              <td>18 – 40</td><td>108 – 320</td><td>16 – 24</td><td>5 – 8</td><td>18 – 28</td>
            </tr>
            <tr>
              <td><div class="faixa-nome">Adolescente</div><div class="faixa-idade">13 – 17 anos</div></td>
              <td>40 – 70</td><td>240 – 560</td><td>12 – 20</td><td>5 – 8</td><td>20 – 30</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="vent-aviso">
        <strong>⚠️ Lembretes importantes:</strong><br>
        • Vc ideal: <strong>6 – 8 mL/kg</strong> de peso predito<br>
        • Limite PIP: <strong>&lt; 30 cmH₂O</strong> sempre que possível<br>
        • Ajustar FiO₂ para SpO₂ <strong>94 – 98%</strong><br>
        • Reavalie gasometria após <strong>30 min</strong> de ventilação<br>
        • Em caso de dúvida, acione o médico responsável imediatamente
      </div>

      <h3 style="color:#0369A1;margin:18px 0 14px">🫁 Calculadora por Peso</h3>
      <div class="calc-form">
        <label>Peso (kg)</label>
        <input type="number" id="vc-peso" placeholder="Ex: 70" min="1" max="200" oninput="calcVent()">
        <label>Modo</label>
        <select id="vc-modo" onchange="calcVent()">
          <option value="adulto">Adulto (≥18 anos)</option>
          <option value="ped">Pediátrico (&lt;18 anos)</option>
        </select>
        <label>FiO₂</label>
        <select id="vc-fio2" onchange="calcVent()">
          <option value="40">40%</option><option value="50">50%</option>
          <option value="60" selected>60%</option><option value="80">80%</option><option value="100">100%</option>
        </select>
      </div>
      <div class="calc-result" id="vent-result" style="display:none">
        <div style="display:flex;flex-direction:column;gap:6px" id="vent-result-rows"></div>
      </div>`;

  } else if (key === 'calcmed') {
    body.innerHTML = `
      <h3 style="color:#155E75;margin-bottom:14px">💉 Cálculo de Medicação (rápido)</h3>
      <div class="calc-form">
        <label>Medicamento</label>
        <select id="med-select" onchange="calcMed()">
          <option value="">Selecione o medicamento...</option>
          <option value="norad" data-conc="4" data-unit="mcg/kg/min" data-min="0.01" data-max="3">Noradrenalina (4mg/50mL)</option>
          <option value="dopa" data-conc="10" data-unit="mcg/kg/min" data-min="2" data-max="20">Dopamina (200mg/20mL)</option>
          <option value="dobuta" data-conc="12.5" data-unit="mcg/kg/min" data-min="2" data-max="20">Dobutamina (250mg/20mL)</option>
          <option value="midaz" data-conc="5" data-unit="mg/h" data-min="0.02" data-max="0.1">Midazolam (50mg/10mL)</option>
          <option value="morfi" data-conc="2" data-unit="mg/h" data-min="0.01" data-max="0.1">Morfina (10mg/5mL)</option>
          <option value="kcl" data-conc="19.1" data-unit="mEq/h" data-min="10" data-max="20">KCl 10% (10mEq/mL)</option>
          <option value="insulina" data-conc="1" data-unit="UI/h" data-min="0.1" data-max="10">Insulina Regular (100UI/100mL)</option>
        </select>
        <label>Peso do paciente (kg)</label>
        <input type="number" id="med-peso" placeholder="Ex: 70" min="1" max="300" oninput="calcMed()">
        <label>Dose desejada</label>
        <input type="number" id="med-dose" placeholder="Dose" step="0.01" oninput="calcMed()">
        <div id="med-dose-hint" style="font-size:11px;color:var(--gray-500);margin-top:4px;"></div>
        <div class="calc-result" id="med-result" style="display:none">
          <div class="calc-result-val" id="med-result-val">—</div>
          <div class="calc-result-lbl" id="med-result-lbl">mL/h na bomba</div>
          <div style="margin-top:8px;font-size:12px;color:var(--gray-500)" id="med-result-obs"></div>
        </div>
      </div>
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:var(--radius);padding:12px 14px;font-size:12px;color:#92400E;">
        ⚠️ <strong>Atenção:</strong> Ferramenta auxiliar. Toda prescrição deve ser validada pelo médico responsável.
      </div>`;

  } else if (key === 'qsofa') {
    body.innerHTML = `
      <h3 style="color:#EF4444;margin-bottom:14px">🦠 qSOFA — Triagem de Sepse</h3>
      <div style="display:flex;flex-direction:column;gap:8px" id="qsofa-items">
        ${['FR ≥ 22 irpm','Glasgow < 15','PAS ≤ 100 mmHg'].map((lbl,i)=>`
          <div class="huddle-item" id="qs${i}" onclick="toggleQsofa(${i})">
            <div class="huddle-check" id="qsc${i}"></div>
            <span>${lbl}</span>
          </div>`).join('')}
      </div>
      <div class="calc-result" id="qsofa-result" style="margin-top:14px">
        <div class="calc-result-val" id="qsofa-val">0</div>
        <div class="calc-result-lbl" id="qsofa-lbl">pontos — baixo risco</div>
      </div>`;
  }
}

function glasgowField(id,label,opts) {
  return `<div style="margin-bottom:12px">
    <label style="display:block;font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;margin-bottom:5px">${label}</label>
    <select id="${id}" style="width:100%;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-family:var(--font);font-size:13px;outline:none">
      <option value="">— selecione —</option>
      ${opts.map(([v,t])=>`<option value="${v}">${v} – ${t}</option>`).join('')}
    </select>
  </div>`;
}

function bradenField(id,label,opts) { return glasgowField(id,label,opts); }

function calcGlasgow() {
  const vals = ['g_oc','g_vr','g_mr'].map(id=>parseInt(document.getElementById(id)?.value)||0);
  if(vals.some(v=>v===0)) return;
  const total = vals.reduce((a,b)=>a+b,0);
  const cls = total>=13?'Leve (13-15)':total>=9?'Moderado (9-12)':'Grave (≤8)';
  const clr = total>=13?'#065F46':total>=9?'#92400E':'#991B1B';
  const r = document.getElementById('glasgow-result');
  r.style.display='block'; r.style.borderColor=clr;
  document.getElementById('glasgow-val').style.color=clr;
  document.getElementById('glasgow-val').textContent=total;
  document.getElementById('glasgow-lbl').textContent=cls;
}

function calcBraden() {
  const ids=['bd1','bd2','bd3','bd4','bd5','bd6'];
  const vals=ids.map(id=>parseInt(document.getElementById(id)?.value)||0);
  if(vals.some(v=>v===0)) return;
  const total=vals.reduce((a,b)=>a+b,0);
  const [cls,clr]=total<=9?['Risco muito alto','#991B1B']:total<=12?['Risco alto','#B45309']:total<=14?['Risco moderado','#92400E']:total<=18?['Risco leve','#166534']:['Sem risco','#065F46'];
  const r=document.getElementById('braden-result');
  r.style.display='block'; r.style.borderColor=clr;
  document.getElementById('braden-val').style.color=clr;
  document.getElementById('braden-val').textContent=total;
  document.getElementById('braden-lbl').textContent=cls;
}

function calcVent() {
  const peso=parseFloat(document.getElementById('vc-peso')?.value)||0;
  const modo=document.getElementById('vc-modo')?.value;
  const fio2=document.getElementById('vc-fio2')?.value;
  if(!peso) return;
  const vc6=Math.round(peso*6), vc8=Math.round(peso*8);
  const fr=modo==='ped'?(peso<10?30:peso<20?24:20):14;
  const peep=modo==='ped'?4:5;
  const pip=peep+(modo==='ped'?15:20);
  const rows=[['Vc protetora (6 mL/kg)',vc6+' mL'],['Vc máximo (8 mL/kg)',vc8+' mL'],
    ['Frequência Respiratória',fr+' irpm'],['PEEP',peep+' cmH₂O'],['PIP máx',pip+' cmH₂O'],['FiO₂',fio2+'%']];
  const r=document.getElementById('vent-result');
  r.style.display='block';
  document.getElementById('vent-result-rows').innerHTML=rows.map(([l,v])=>`
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #BAE6FD;font-size:13px">
      <span style="color:#0369A1;font-weight:600">${l}</span>
      <span style="font-weight:800;color:var(--blue-dark)">${v}</span>
    </div>`).join('');
}

let qsofaState=[false,false,false];

function toggleQsofa(i) {
  qsofaState[i]=!qsofaState[i];
  const item=document.getElementById('qs'+i);
  const chk=document.getElementById('qsc'+i);
  item.classList.toggle('done',qsofaState[i]);
  chk.textContent=qsofaState[i]?'✓':'';
  const total=qsofaState.filter(Boolean).length;
  document.getElementById('qsofa-val').textContent=total;
  const [lbl,clr]=total>=2?['pontos — ALTO RISCO de sepse','#991B1B']:total===1?['ponto — atenção','#92400E']:['pontos — baixo risco','#065F46'];
  document.getElementById('qsofa-lbl').textContent=lbl;
  document.getElementById('qsofa-result').style.borderColor=clr;
  document.getElementById('qsofa-val').style.color=clr;
}

function calcMed() {
  const sel   = document.getElementById('med-select');
  const peso  = parseFloat(document.getElementById('med-peso').value)||0;
  const dose  = parseFloat(document.getElementById('med-dose').value)||0;
  const res   = document.getElementById('med-result');
  const hint  = document.getElementById('med-dose-hint');
  const opt   = sel.options[sel.selectedIndex];

  if (!opt.value) { res.style.display='none'; hint.textContent=''; return; }

  const unit  = opt.dataset.unit;
  const conc  = parseFloat(opt.dataset.conc);
  const dmin  = parseFloat(opt.dataset.min);
  const dmax  = parseFloat(opt.dataset.max);

  hint.textContent = `Faixa: ${dmin} – ${dmax} ${unit}${unit.includes('kg')?'':' (sem ajuste por peso)'}`;

  if (!dose) { res.style.display='none'; return; }

  let mlh;
  if (unit.includes('kg')) {
    if (!peso) { res.style.display='none'; return; }
    mlh = (dose * peso * 60) / (conc * 1000);
  } else {
    mlh = dose / conc;
  }

  if (mlh <= 0) { res.style.display='none'; return; }

  const warn = dose < dmin ? '⚠️ Abaixo da dose mínima' : dose > dmax ? '⚠️ Acima da dose máxima' : '✅ Dentro da faixa terapêutica';
  res.style.display = 'block';
  document.getElementById('med-result-val').textContent = mlh.toFixed(2) + ' mL/h';
  document.getElementById('med-result-lbl').textContent = `${dose} ${unit} · ${peso?peso+'kg · ':''}Concentração: ${conc} mg/mL`;
  document.getElementById('med-result-obs').textContent = warn;
}

function spinner() { return `<div class="spinner"><i class="fas fa-circle-notch spin"></i> Carregando...</div>`; }

function emptyState(icon, msg) { return `<div class="empty-state"><i class="fas ${icon}"></i><p>${msg}</p></div>`; }

function errState(e) {
  return `<div class="empty-state" style="color:#B91C1C">
    <i class="fas fa-triangle-exclamation"></i>
    <p>Erro: ${e.message}</p>
    <p style="font-size:11px;margin-top:5px">Verifique o App Script e as permissões da planilha.</p>
  </div>`;
}

const UPA_LOGO_B64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgNjAiPjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iNjAiIHJ4PSI4IiBmaWxsPSIjMUE2RkM0Ii8+PHRleHQgeD0iMTIwIiB5PSIzOCIgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5VUEEgUm9jaW5oYTwvdGV4dD48L3N2Zz4=';

async function pdfComLogo(titulo, subtitulo, elementId, nomeArquivo, extraInfo) {
  const { jsPDF } = window.jspdf;
  const el = document.getElementById(elementId);
  if (!el) { alert('Conteúdo não encontrado para exportar.'); return; }

  // Captura o elemento como canvas
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');

  const pdf  = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pw   = pdf.internal.pageSize.getWidth();
  const ph   = pdf.internal.pageSize.getHeight();

  // ── Cabeçalho azul ──
  pdf.setFillColor(26, 111, 196);
  pdf.rect(0, 0, pw, 30, 'F');

  // Logo (texto branco simulado)
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('UPA ROCINHA', 14, 12);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Unidade de Pronto Atendimento', 14, 18);

  // Título à direita do cabeçalho
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(titulo, pw - 14, 12, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(subtitulo, pw - 14, 18, { align: 'right' });

  // ── Faixa info extra (responsável / data) ──
  const agora = new Date().toLocaleString('pt-BR');
  const resp  = currentUser ? currentUser.nome + ' (' + currentUser.funcao + ')' : '';
  pdf.setFillColor(240, 244, 248);
  pdf.rect(0, 30, pw, 10, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Emitido em: ' + agora, 14, 36.5);
  if (resp) pdf.text('Responsável: ' + resp, pw - 14, 36.5, { align: 'right' });
  if (extraInfo) pdf.text(extraInfo, pw / 2, 36.5, { align: 'center' });

  // ── Conteúdo ──
  const contentW = pw - 20;
  const contentH = (canvas.height * contentW) / canvas.width;
  const maxH     = ph - 50;   // espaço disponível na página

  if (contentH <= maxH) {
    pdf.addImage(imgData, 'PNG', 10, 44, contentW, contentH);
  } else {
    // conteúdo longo: quebra em páginas
    let posY    = 44;
    let srcY    = 0;
    const ratio = canvas.width / contentW;
    while (srcY < canvas.height) {
      const sliceH = Math.min(maxH * ratio, canvas.height - srcY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = sliceH;
      sliceCanvas.getContext('2d').drawImage(canvas, 0, -srcY);
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, posY, contentW, sliceH / ratio);
      srcY += sliceH;
      if (srcY < canvas.height) {
        pdf.addPage();
        // repete mini-header nas páginas seguintes
        pdf.setFillColor(26, 111, 196);
        pdf.rect(0, 0, pw, 12, 'F');
        pdf.setTextColor(255,255,255);
        pdf.setFont('helvetica','bold');
        pdf.setFontSize(9);
        pdf.text('UPA ROCINHA — ' + titulo, pw/2, 8, { align:'center' });
        posY = 16;
      }
    }
  }

  // ── Rodapé ──
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFillColor(26, 111, 196);
    pdf.rect(0, ph - 8, pw, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.text('UPA Rocinha · Documento gerado automaticamente · Página ' + i + '/' + totalPages, pw/2, ph - 3, { align:'center' });
  }

  pdf.save(nomeArquivo);
}

/* =====================================================================
   CHAT INTERNO — Supabase (tabelas chat_*, ver supabase/11_chat.sql)
   Conversas: geral, grupos por cargo, grupos livres e conversas entre duas pessoas.
   Lista ordenada pela última mensagem; não lidas guardadas no servidor;
   mensagens novas chegam em tempo real (com atualização de reserva a cada 20 s).
   ===================================================================== */
const CHAT_PAGINA = 50;
const CHAT_RESERVA_MS = 20000;

let _chatOpen = false;
let _chatTab = 'conversas';      // conversas | equipe | perfil | sala | info | novo
let _chatSalas = [];
let _chatPodeCriar = false;
let _chatSala = null;
let _chatMsgs = {};              // sala_id -> mensagens (mais antigas primeiro)
let _chatMais = {};              // sala_id -> true se ainda há mensagens antigas
let _chatProfList = [];
let _chatFotos = {};
let _chatCanal = null;
let _chatTimer = null;
let _chatBusca = '';

const chatRpc = async (nome, args) => { const r = await sb.rpc(nome, args || {}); if (r.error) throw r.error; return r.data; };

function chatNorm(r) {
  return { id: r.id, sala_id: r.sala_id, ts: new Date(r.criado_em).getTime(), de: String(r.de_matricula || ''),
           nome_de: r.de_nome || '', funcao: r.de_funcao || '', texto: r.texto || '' };
}
function chatHoraLista(iso) {
  if (!iso) return '';
  const d = new Date(iso), h = new Date();
  if (d.toDateString() === h.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ontem = new Date(h); ontem.setDate(h.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
const chatNomeSala = s => s.tipo === 'dm' ? (s.outro ? s.outro.nome : 'Conversa') : (s.nome || 'Grupo');

async function chatInit() {
  document.getElementById('chat-fab').style.display = 'flex';
  const u = currentUser;
  if (document.getElementById('cp-nome')) document.getElementById('cp-nome').textContent = u.nome;
  if (document.getElementById('cp-mat')) document.getElementById('cp-mat').textContent = u.matricula;
  if (document.getElementById('cp-func')) document.getElementById('cp-func').textContent = u.funcao;
  if (document.getElementById('chat-perfil-ini')) document.getElementById('chat-perfil-ini').textContent = initials(u.nome);
  try { _chatFotos = JSON.parse(localStorage.getItem('uparc_chat_fotos2') || '{}'); } catch (e) { _chatFotos = {}; }
  chatAplicarFoto(u.matricula, document.getElementById('chat-perfil-foto'), u.nome, true);
  chatAplicarFotoTopbar();
  await Promise.all([chatCarregarResumo(), chatBuscarFotos()]);
  chatAssinar();
  chatCarregarEquipe();
}

function chatAssinar() {
  if (_chatCanal) { try { sb.removeChannel(_chatCanal); } catch (e) {} _chatCanal = null; }
  if (_chatTimer) clearInterval(_chatTimer);
  try {
    _chatCanal = sb.channel('chat-mensagens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' }, p => chatAoReceber(p.new))
      .subscribe();
  } catch (e) { console.warn('chat realtime', e); }
  _chatTimer = setInterval(chatReserva, CHAT_RESERVA_MS);
}

/* Atualização de reserva: caso o tempo real falhe, a lista e a conversa aberta se atualizam sozinhas. */
async function chatReserva() {
  await chatCarregarResumo();
  if (_chatOpen && _chatSala && _chatTab === 'sala') {
    const lista = _chatMsgs[_chatSala.id] || [], ult = lista.length ? lista[lista.length - 1].ts : 0;
    try {
      const r = await sb.from('chat_mensagens').select('*').eq('sala_id', _chatSala.id)
        .gt('criado_em', new Date(ult).toISOString()).order('criado_em').limit(100);
      if (!r.error && r.data.length) { r.data.forEach(m => chatAddMsg(chatNorm(m))); chatRenderSala(); chatMarcarLido(_chatSala.id); }
    } catch (e) {}
  }
}

async function chatCarregarResumo() {
  try {
    const d = await chatRpc('chat_resumo');
    _chatPodeCriar = !!d.pode_criar;
    _chatSalas = (d.salas || []);
    chatUpdateBadge();
    const b = document.getElementById('chat-novo-btn'); if (b) b.style.display = _chatPodeCriar ? '' : 'none';
    if (_chatOpen && _chatTab === 'conversas') chatRenderConversas();
  } catch (e) {
    const el = document.getElementById('chat-conv-list');
    if (el && !_chatSalas.length) el.innerHTML = '<div class="chat-loading">⚠️ Não foi possível carregar as conversas.</div>';
  }
}

function chatAoReceber(r) {
  const m = chatNorm(r);
  const eu = String(currentUser.matricula);
  let sala = _chatSalas.find(x => x.id === m.sala_id);
  if (!sala) { chatCarregarResumo(); return; }
  sala.ultima_em = r.criado_em; sala.ultima_texto = m.texto; sala.ultima_de = m.nome_de;
  const aberta = _chatOpen && _chatTab === 'sala' && _chatSala && _chatSala.id === m.sala_id;
  if (_chatMsgs[m.sala_id]) chatAddMsg(m);
  if (m.de !== eu) { if (aberta) chatMarcarLido(m.sala_id); else sala.nao_lidas = (sala.nao_lidas || 0) + 1; }
  _chatSalas.sort((a, b) => new Date(b.ultima_em) - new Date(a.ultima_em));
  chatUpdateBadge();
  if (aberta) chatRenderSala(); else if (_chatOpen && _chatTab === 'conversas') chatRenderConversas();
}

function chatAddMsg(m) {
  const l = _chatMsgs[m.sala_id] || (_chatMsgs[m.sala_id] = []);
  if (l.some(x => x.id === m.id)) return;
  l.push(m); l.sort((a, b) => a.ts - b.ts);
}

function chatToggle() {
  _chatOpen = !_chatOpen;
  document.getElementById('chat-window').classList.toggle('open', _chatOpen);
  if (_chatOpen) {
    chatCarregarResumo();
    if (_chatTab === 'sala' && _chatSala) { chatMarcarLido(_chatSala.id); chatRenderSala(); }
    else chatRenderAtual();
  }
}

function chatMostrar(painel, abaDestaque) {
  _chatTab = painel;
  document.querySelectorAll('.chat-panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('cp-' + (painel === 'conversas' ? 'conversas' : painel)); if (el) el.classList.add('active');
  const aba = abaDestaque || (painel === 'sala' || painel === 'info' || painel === 'novo' ? 'conversas' : painel);
  document.querySelectorAll('.chat-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === aba));
  document.querySelector('.chat-tabs').style.display = (painel === 'sala' || painel === 'info' || painel === 'novo') ? 'none' : '';
}

function chatRenderAtual() {
  if (_chatTab === 'conversas') chatRenderConversas();
  else if (_chatTab === 'equipe') chatRenderEquipe();
}

function chatTab(nome) {
  chatMostrar(nome);
  if (nome === 'conversas') { chatCarregarResumo(); chatRenderConversas(); }
  else if (nome === 'equipe') { chatCarregarEquipe(); }
}

/* ---------- lista de conversas ---------- */
function chatAvatar(s, tam) {
  const st = tam ? `style="width:${tam}px;height:${tam}px;font-size:${Math.round(tam / 3)}px;"` : '';
  if (s.tipo === 'dm' && s.outro) {
    const foto = _chatFotos[s.outro.matricula], ini = initials(s.outro.nome);
    return foto ? `<div class="chat-pav" ${st}><img src="${foto}" alt="${ini}"></div>` : `<div class="chat-pav" style="background:${chatCor(s.outro.matricula)};${tam ? `width:${tam}px;height:${tam}px;font-size:${Math.round(tam / 3)}px;` : ''}">${ini}</div>`;
  }
  const ic = s.tipo === 'geral' ? 'fa-users' : s.somente_aviso ? 'fa-bullhorn' : 'fa-user-group';
  return `<div class="chat-pav" style="background:${chatCor(s.id)};${tam ? `width:${tam}px;height:${tam}px;font-size:${Math.round(tam / 2.6)}px;` : ''}"><i class="fas ${ic}"></i></div>`;
}

function chatRenderConversas() {
  const el = document.getElementById('chat-conv-list'); if (!el) return;
  const q = _chatBusca.trim().toLowerCase();
  const lista = _chatSalas.filter(s => !q || chatNomeSala(s).toLowerCase().includes(q));
  if (!lista.length) { el.innerHTML = `<div class="chat-loading">${q ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda. Use a aba Pessoas para começar uma.'}</div>`; return; }
  el.innerHTML = lista.map(s => {
    const prev = s.ultima_texto ? ((s.tipo !== 'dm' && s.ultima_de ? escHtml(s.ultima_de.split(' ')[0]) + ': ' : '') + escHtml(s.ultima_texto)) : '<i>Sem mensagens</i>';
    const nl = s.nao_lidas || 0;
    return `<div class="chat-person" onclick="chatAbrirSala('${s.id}')">
      ${chatAvatar(s)}
      <div class="chat-pinfo">
        <div class="chat-pname">${escHtml(chatNomeSala(s))}${s.somente_aviso ? ' <span class="chat-tag">avisos</span>' : ''}</div>
        <div class="chat-prole chat-prev ${nl ? 'nova' : ''}">${prev}</div>
      </div>
      <div class="chat-conv-meta"><div class="chat-conv-time ${nl ? 'nova' : ''}">${chatHoraLista(s.ultima_texto ? s.ultima_em : '')}</div>
        <div class="chat-punread ${nl ? 'show' : ''}">${nl > 99 ? '99+' : nl || ''}</div></div>
    </div>`;
  }).join('');
}

function chatBuscar(v) { _chatBusca = v || ''; chatRenderConversas(); }

/* ---------- conversa aberta ---------- */
async function chatAbrirSala(id) {
  const sala = _chatSalas.find(s => s.id === id); if (!sala) return;
  _chatSala = sala;
  chatMostrar('sala');
  document.getElementById('chat-sala-nome').textContent = chatNomeSala(sala);
  const sub = sala.tipo === 'dm' ? (sala.outro ? sala.outro.funcao : '') : sala.tipo === 'geral' ? 'Toda a equipe' : sala.tipo === 'funcao' ? 'Grupo por cargo' : (sala.somente_aviso ? 'Grupo de avisos — só gestores escrevem' : 'Grupo');
  document.getElementById('chat-sala-sub').textContent = sub;
  document.getElementById('chat-sala-av').innerHTML = chatAvatar(sala, 34);
  document.getElementById('chat-sala-info').style.display = (sala.tipo === 'dm' || sala.tipo === 'geral') ? 'none' : '';
  const podeEsc = sala.pode_escrever !== false;
  document.getElementById('chat-in-row').style.display = podeEsc ? '' : 'none';
  document.getElementById('chat-aviso-leitura').style.display = podeEsc ? 'none' : '';
  const box = document.getElementById('chat-msgs-sala');
  box.innerHTML = '<div class="chat-loading"><i class="fas fa-circle-notch spin"></i> Carregando...</div>';
  try {
    const r = await sb.from('chat_mensagens').select('*').eq('sala_id', id).order('criado_em', { ascending: false }).limit(CHAT_PAGINA);
    if (r.error) throw r.error;
    const novas = r.data.map(chatNorm).reverse();
    _chatMsgs[id] = novas; _chatMais[id] = r.data.length === CHAT_PAGINA;
  } catch (e) { box.innerHTML = '<div class="chat-loading">⚠️ Não foi possível carregar as mensagens.</div>'; return; }
  chatRenderSala(true);
  chatMarcarLido(id);
  setTimeout(() => { const i = document.getElementById('chat-in-sala'); if (i && podeEsc && window.innerWidth > 700) i.focus(); }, 80);
}

function chatRenderSala(rolarFim) {
  const el = document.getElementById('chat-msgs-sala');
  if (!el || !_chatSala) return;
  const msgs = _chatMsgs[_chatSala.id] || [];
  const atFundo = rolarFim || el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  if (!msgs.length) { el.innerHTML = '<div class="chat-sys" style="margin-top:30px">💬 Nenhuma mensagem ainda. Escreva a primeira!</div>'; return; }
  const mais = _chatMais[_chatSala.id] ? '<button class="chat-mais" onclick="chatMaisAntigas()">Ver mensagens anteriores</button>' : '';
  el.innerHTML = mais + chatBuildHtml(msgs, _chatSala.tipo === 'dm');
  if (atFundo) el.scrollTop = el.scrollHeight;
}

async function chatMaisAntigas() {
  const id = _chatSala && _chatSala.id; if (!id) return;
  const l = _chatMsgs[id] || []; if (!l.length) return;
  const el = document.getElementById('chat-msgs-sala'), alturaAntes = el.scrollHeight;
  try {
    const r = await sb.from('chat_mensagens').select('*').eq('sala_id', id).lt('criado_em', new Date(l[0].ts).toISOString())
      .order('criado_em', { ascending: false }).limit(CHAT_PAGINA);
    if (r.error) throw r.error;
    r.data.map(chatNorm).forEach(chatAddMsg); _chatMais[id] = r.data.length === CHAT_PAGINA;
    chatRenderSala(); el.scrollTop = el.scrollHeight - alturaAntes;
  } catch (e) { alert('Não foi possível carregar as mensagens anteriores.'); }
}

function chatVoltar() {
  _chatSala = null;
  chatMostrar('conversas'); chatRenderConversas(); chatCarregarResumo();
}

async function chatSend() {
  if (!_chatSala) return;
  const inputEl = document.getElementById('chat-in-sala'), texto = inputEl.value.trim();
  if (!texto) return;
  const btn = inputEl.nextElementSibling; inputEl.value = ''; btn.classList.add('chat-sending');
  try {
    const r = await sb.from('chat_mensagens').insert({ sala_id: _chatSala.id, texto }).select().single();
    if (r.error) throw r.error;
    chatAddMsg(chatNorm(r.data));
    _chatSala.ultima_em = r.data.criado_em; _chatSala.ultima_texto = texto; _chatSala.ultima_de = currentUser.nome;
    _chatSalas.sort((a, b) => new Date(b.ultima_em) - new Date(a.ultima_em));
    chatRenderSala(true);
  } catch (e) {
    inputEl.value = texto;
    alert('Não foi possível enviar: ' + (e.message || e));
  }
  btn.classList.remove('chat-sending');
}

function chatBuildHtml(msgs, isDm) {
  let html = '', lastDate = '';
  msgs.forEach(m => {
    const d = new Date(m.ts);
    const dataStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (dataStr !== lastDate) { html += `<div class="chat-date-sep">${dataStr}</div>`; lastDate = dataStr; }
    const mine = m.de === String(currentUser.matricula);
    const foto = _chatFotos[m.de];
    const ini = initials(m.nome_de || '?');
    const avHtml = foto
      ? `<div class="cmsg-av"><img src="${foto}" alt="${ini}"></div>`
      : `<div class="cmsg-av" style="background:${chatCor(m.de)}">${ini}</div>`;
    const funcaoStr = (!isDm && !mine && m.funcao) ? ` · <span style="font-weight:500;color:var(--gray-400)">${escHtml(m.funcao)}</span>` : '';
    html += `<div class="cmsg ${mine ? 'mine' : 'other'}">
      ${mine ? '' : avHtml}
      <div class="cmsg-body">
        ${!mine ? `<div class="cmsg-sender">${escHtml(m.nome_de)}${funcaoStr}</div>` : ''}
        <div class="cmsg-bubble">${escHtml(m.texto)}</div>
        <div class="cmsg-time">${hora}</div>
      </div>
      ${mine ? avHtml : ''}
    </div>`;
  });
  return html;
}

async function chatMarcarLido(salaId) {
  const s = _chatSalas.find(x => x.id === salaId);
  if (s && s.nao_lidas) { s.nao_lidas = 0; chatUpdateBadge(); }
  try { await sb.rpc('chat_marcar_lido', { p_sala: salaId }); } catch (e) {}
}

function chatUpdateBadge() {
  const badge = document.getElementById('chat-badge'); if (!badge) return;
  const n = _chatSalas.reduce((a, s) => a + (s.nao_lidas || 0), 0);
  badge.textContent = n > 9 ? '9+' : n;
  badge.classList.toggle('show', n > 0);
}

/* ---------- pessoas (inicia conversa entre duas pessoas) ---------- */
async function chatCarregarEquipe() {
  try {
    if (!_chatProfList.length) {
      const { data, error } = await sb.from('profiles').select('matricula,nome,funcao').eq('ativo', true).order('nome');
      if (error) throw error;
      _chatProfList = (data || []).map(r => ({ matricula: String(r.matricula), nome: r.nome, funcao: r.funcao }));
    }
    chatRenderEquipe();
  } catch (e) {
    const el = document.getElementById('chat-people-list');
    if (el) el.innerHTML = '<div class="chat-loading">⚠️ Não foi possível carregar a equipe.</div>';
  }
}

function chatRenderEquipe() {
  const el = document.getElementById('chat-people-list'); if (!el) return;
  const q = (document.getElementById('chat-pessoa-busca') || {}).value || '';
  const qq = q.trim().toLowerCase();
  const outros = _chatProfList.filter(p => p.matricula !== String(currentUser.matricula) && (!qq || (p.nome + ' ' + p.funcao).toLowerCase().includes(qq)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!outros.length) { el.innerHTML = '<div class="chat-loading">Ninguém encontrado.</div>'; return; }
  el.innerHTML = outros.map(p => {
    const foto = _chatFotos[p.matricula], ini = initials(p.nome);
    const av = foto ? `<div class="chat-pav"><img src="${foto}" alt="${ini}"></div>` : `<div class="chat-pav" style="background:${chatCor(p.matricula)}">${ini}</div>`;
    return `<div class="chat-person" onclick="chatAbrirDm('${escHtml(p.matricula)}')">${av}
      <div class="chat-pinfo"><div class="chat-pname">${escHtml(p.nome)}</div><div class="chat-prole">${escHtml(p.funcao)}</div></div></div>`;
  }).join('');
}

async function chatAbrirDm(matricula) {
  try {
    const id = await chatRpc('chat_abrir_dm', { p_matricula: matricula });
    if (!_chatSalas.some(s => s.id === id)) {
      const p = _chatProfList.find(x => x.matricula === matricula) || { matricula, nome: matricula, funcao: '' };
      _chatSalas.unshift({ id, tipo: 'dm', nome: null, outro: p, somente_aviso: false, pode_escrever: true, nao_lidas: 0, ultima_em: new Date().toISOString(), ultima_texto: '', ultima_de: '' });
    }
    await chatAbrirSala(id);
  } catch (e) { alert('Não foi possível abrir a conversa: ' + (e.message || e)); }
}

/* ---------- novo grupo (gestores) ---------- */
function chatNovoGrupo() {
  chatMostrar('novo');
  document.getElementById('chat-novo-nome').value = '';
  document.getElementById('chat-novo-aviso').checked = false;
  document.getElementById('chat-novo-busca').value = '';
  chatRenderNovoLista();
}
function chatRenderNovoLista() {
  const el = document.getElementById('chat-novo-lista'); if (!el) return;
  const marcadas = new Set([...el.querySelectorAll('input:checked')].map(i => i.value));
  el.dataset.marcadas = [...new Set([...(el.dataset.marcadas ? el.dataset.marcadas.split(',') : []), ...marcadas])].filter(Boolean).join(',');
  const sel = new Set(el.dataset.marcadas ? el.dataset.marcadas.split(',') : []);
  const q = (document.getElementById('chat-novo-busca').value || '').trim().toLowerCase();
  el.innerHTML = _chatProfList.filter(p => p.matricula !== String(currentUser.matricula) && (!q || (p.nome + ' ' + p.funcao).toLowerCase().includes(q)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(p =>
      `<label class="chat-chk"><input type="checkbox" value="${escHtml(p.matricula)}" ${sel.has(p.matricula) ? 'checked' : ''} onchange="chatNovoMarcar(this)"> <span>${escHtml(p.nome)}</span> <small>${escHtml(p.funcao)}</small></label>`).join('');
}
function chatNovoMarcar(inp) {
  const el = document.getElementById('chat-novo-lista');
  const s = new Set(el.dataset.marcadas ? el.dataset.marcadas.split(',') : []);
  if (inp.checked) s.add(inp.value); else s.delete(inp.value);
  el.dataset.marcadas = [...s].join(',');
}
async function chatCriarGrupo() {
  const nome = document.getElementById('chat-novo-nome').value.trim();
  const aviso = document.getElementById('chat-novo-aviso').checked;
  const mats = (document.getElementById('chat-novo-lista').dataset.marcadas || '').split(',').filter(Boolean);
  if (nome.length < 2) { alert('Dê um nome ao grupo.'); return; }
  if (!mats.length) { alert('Escolha ao menos uma pessoa.'); return; }
  try {
    const id = await chatRpc('chat_criar_grupo', { p_nome: nome, p_matriculas: mats, p_somente_aviso: aviso });
    document.getElementById('chat-novo-lista').dataset.marcadas = '';
    await chatCarregarResumo();
    await chatAbrirSala(id);
  } catch (e) { alert('Não foi possível criar o grupo: ' + (e.message || e)); }
}

/* ---------- participantes do grupo ---------- */
async function chatInfoGrupo() {
  if (!_chatSala) return;
  chatMostrar('info');
  document.getElementById('chat-info-nome').textContent = chatNomeSala(_chatSala);
  const el = document.getElementById('chat-info-lista');
  el.innerHTML = '<div class="chat-loading"><i class="fas fa-circle-notch spin"></i> Carregando...</div>';
  const gerir = !!_chatSala.pode_gerir;
  document.getElementById('chat-info-add').style.display = gerir ? '' : 'none';
  document.getElementById('chat-info-excluir').style.display = gerir ? '' : 'none';
  try {
    const part = await chatRpc('chat_participantes', { p_sala: _chatSala.id });
    _chatSala._part = part;
    const ja = new Set(part.map(p => p.matricula));
    el.innerHTML = `<div class="chat-info-n">${part.length} participante(s)${_chatSala.tipo === 'funcao' ? ' · entram automaticamente pelo cargo' : ''}</div>` +
      part.map(p => `<div class="chat-person" style="cursor:default"><div class="chat-pav" style="background:${chatCor(p.matricula)}">${initials(p.nome)}</div>
        <div class="chat-pinfo"><div class="chat-pname">${escHtml(p.nome)}</div><div class="chat-prole">${escHtml(p.funcao)}</div></div>
        ${gerir && p.matricula !== String(currentUser.matricula) ? `<button class="chat-x" title="Remover" onclick="chatGerirMembro('${escHtml(p.matricula)}','remove')"><i class="fas fa-xmark"></i></button>` : ''}</div>`).join('');
    if (gerir) {
      const sel = document.getElementById('chat-info-sel');
      sel.innerHTML = '<option value="">Adicionar pessoa...</option>' + _chatProfList.filter(p => !ja.has(p.matricula)).map(p => `<option value="${escHtml(p.matricula)}">${escHtml(p.nome)} — ${escHtml(p.funcao)}</option>`).join('');
    }
  } catch (e) { el.innerHTML = '<div class="chat-loading">⚠️ Não foi possível carregar os participantes.</div>'; }
}
function chatInfoVoltar() { if (_chatSala) chatAbrirSala(_chatSala.id); else chatVoltar(); }
async function chatGerirMembro(matricula, acao) {
  try { await chatRpc('chat_gerir_membro', { p_sala: _chatSala.id, p_matricula: matricula, p_acao: acao }); await chatInfoGrupo(); }
  catch (e) { alert('Não foi possível alterar: ' + (e.message || e)); }
}
function chatAdicionarMembro() {
  const v = document.getElementById('chat-info-sel').value; if (v) chatGerirMembro(v, 'add');
}
async function chatExcluirGrupo() {
  if (!_chatSala || !confirm('Excluir o grupo "' + chatNomeSala(_chatSala) + '" e todas as mensagens dele?')) return;
  try { await chatRpc('chat_excluir_grupo', { p_sala: _chatSala.id }); _chatSala = null; await chatCarregarResumo(); chatMostrar('conversas'); chatRenderConversas(); }
  catch (e) { alert('Não foi possível excluir: ' + (e.message || e)); }
}

/* ---------- fotos de perfil ---------- */
function chatUploadFoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 800 * 1024) { alert('Imagem muito grande. Use uma foto menor que 800 KB.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const max = 120; let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = h * max / w; w = max; } } else { if (h > max) { w = w * max / h; h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      _chatFotos[currentUser.matricula] = dataUrl;
      try { localStorage.setItem('uparc_chat_fotos2', JSON.stringify(_chatFotos)); } catch (x) {}
      chatAplicarFoto(currentUser.matricula, document.getElementById('chat-perfil-foto'), currentUser.nome, true);
      chatAplicarFotoTopbar();
      const r = await sb.from('chat_fotos').upsert({ matricula: String(currentUser.matricula), foto: dataUrl, atualizado_em: new Date().toISOString() });
      if (r.error) alert('A foto não foi salva para os colegas: ' + r.error.message);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function chatBuscarFotos() {
  try {
    const ultimo = localStorage.getItem('uparc_chat_fotos2_ts') || '1970-01-01T00:00:00Z';
    const r = await sb.from('chat_fotos').select('matricula,foto,atualizado_em').gt('atualizado_em', ultimo);
    if (r.error) throw r.error;
    let max = ultimo;
    r.data.forEach(f => { _chatFotos[String(f.matricula)] = f.foto; if (f.atualizado_em > max) max = f.atualizado_em; });
    if (r.data.length) { localStorage.setItem('uparc_chat_fotos2', JSON.stringify(_chatFotos)); localStorage.setItem('uparc_chat_fotos2_ts', max); }
    chatAplicarFotoTopbar();
  } catch (e) {}
}

function chatAplicarFoto(matricula, containerEl, nome, grande) {
  if (!containerEl) return;
  const foto = _chatFotos[matricula];
  const ini = initials(nome || '??');
  if (foto) { containerEl.innerHTML = `<img src="${foto}" alt="${ini}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
  else { containerEl.innerHTML = grande ? `<span>${ini}</span>` : ini; }
}

function chatAplicarFotoTopbar() {
  const av = document.getElementById('avatar-btn');
  if (!av) return;
  const foto = _chatFotos[currentUser?.matricula];
  const ini = initials(currentUser?.nome || '');
  const iniEl = document.getElementById('avatar-initials');
  av.querySelectorAll('img.av-photo').forEach(i => i.remove());
  if (foto) {
    const img = document.createElement('img');
    img.src = foto; img.className = 'av-photo';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;top:0;left:0;';
    av.appendChild(img);
    if (iniEl) iniEl.style.display = 'none';
  } else {
    if (iniEl) { iniEl.style.display = ''; iniEl.textContent = ini; }
  }
}

function chatCor(seed) {
  seed = String(seed);
  const cores = ['#1A6FC4', '#27AE60', '#D97706', '#7C3AED', '#0E7490', '#DB2777', '#DC2626', '#059669'];
  let h = 0; for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return cores[Math.abs(h) % cores.length];
}

function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
