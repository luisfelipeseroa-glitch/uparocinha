/* =====================================================================
   LEGADO — partes do sistema antigo que continuam iguais:
   Protocolos Clínicos, Calculadoras Clínicas, PDF com logo, Chat da equipe
   e o painel "Atendimento" da tela inicial.
   (O login, o menu e todos os módulos de dados agora estão em core.js e mod-*.js)
   ===================================================================== */
const APP_SCRIPT_URL = window.UPA_CONFIG.APP_SCRIPT_URL;

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

async function fetchSheet(aba) {
  const res = await fetch(`${APP_SCRIPT_URL}?aba=${encodeURIComponent(aba)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function gsPost(action, payload) {
  try {
    const res = await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, payload))
    });
    return await res.json();
  } catch(e) {
    return { ok:false, error: e.message };
  }
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

async function loadAtendimento() {
  const el = document.getElementById('tab-atend');
  try {
    const rows = await fetchSheet('ATENDIMENTO');
    if (!rows.length) { el.innerHTML = emptyState('fa-hospital','Sem dados'); return; }
    const r = rows[0];
    const get = (...keys) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== '') return r[k];
      }
      return undefined;
    };
    const fields = [
      ['Atendimento', get('ATENDIMENTO')],
      ['Raio-X',      get('RAIO-X','RAIO_X','RAIOX')],
      ['Status',      get('STATUS')],
      ['Tempo Médio', get('TEMPO MEDIO','TEMPO_MEDIO','TEMPO_MÉDIO')],
      ['TME Amarela', get('TEMPO_AMARELA','TME_AMARELA','TME AMARELA')],
      ['TME Laranja', get('TEMPO_LARANJA','TME_LARANJA','TME LARANJA')],
      ['TME Verde',   get('TEMPO_VERDE','TME_VERDE','TME VERDE')],
    ];
    el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${fields.map(([l,v])=>`<div style="background:var(--gray-50);border-radius:8px;padding:9px">
        <div style="font-size:10px;font-weight:700;color:var(--gray-500);text-transform:uppercase;margin-bottom:3px">${l}</div>
        <div style="font-size:20px;font-weight:800;color:var(--blue-dark)">${v??'—'}</div>
      </div>`).join('')}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>Dados indisponíveis</p></div>`;
  }
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

const CHAT_ABA_GERAL  = 'CHAT_GERAL';

const CHAT_ABA_DM     = 'CHAT_DM';

const CHAT_ABA_FOTOS  = 'CHAT_FOTOS';

const CHAT_POLL_MS    = 4000;

const CHAT_MAX_RENDER = 80;

let _chatOpen        = false;

let _chatTab         = 'geral';

let _chatDmTarget    = null;

let _chatPollTimer   = null;

let _chatLastRead    = {};

let _chatProfList    = [];

let _chatFotos       = {};

let _chatMsgsGeral   = [];

let _chatMsgsDm      = {};

async function chatInit() {
  document.getElementById('chat-fab').style.display = 'flex';
  try { _chatLastRead = JSON.parse(localStorage.getItem('uparc_chat_lr')||'{}'); } catch(e) { _chatLastRead={}; }
  try { _chatFotos = JSON.parse(localStorage.getItem('uparc_chat_fotos')||'{}'); } catch(e) { _chatFotos={}; }
  const u = currentUser;
  if (document.getElementById('cp-nome')) document.getElementById('cp-nome').textContent  = u.nome;
  if (document.getElementById('cp-mat'))  document.getElementById('cp-mat').textContent   = u.matricula;
  if (document.getElementById('cp-func')) document.getElementById('cp-func').textContent  = u.funcao;
  if (document.getElementById('chat-perfil-ini')) document.getElementById('chat-perfil-ini').textContent = initials(u.nome);
  await chatBuscarFotos();
  chatAplicarFoto(u.matricula, document.getElementById('chat-perfil-foto'), u.nome, true);
  chatAplicarFotoTopbar();
  await chatPollGeral();
  await chatPollDm();
  chatUpdateBadge();
  chatPollStart();
  chatCarregarEquipe();
}

function chatToggle() {
  _chatOpen = !_chatOpen;
  document.getElementById('chat-window').classList.toggle('open', _chatOpen);
  if (_chatOpen) {
    chatMarcarLido(_chatTab==='dm'?'dm_'+(_chatDmTarget?.matricula||''):_chatTab);
    chatUpdateBadge();
    setTimeout(()=>chatScrollFim(_chatTab==='dm'?'chat-msgs-dm':'chat-msgs-geral'),60);
  }
}

function chatTab(nome, btn) {
  _chatTab = nome;
  document.querySelectorAll('.chat-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.chat-tab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('cp-'+nome);
  if (panel) panel.classList.add('active');
  if (nome==='geral') { chatMarcarLido('geral'); chatRenderGeral(); setTimeout(()=>chatScrollFim('chat-msgs-geral'),50); }
  else if (nome==='equipe') { chatCarregarEquipe(); }
  chatUpdateBadge();
}

function chatAbrirDm(person) {
  _chatDmTarget = person;
  _chatTab = 'dm';
  document.querySelectorAll('.chat-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.chat-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('cp-dm').classList.add('active');
  document.getElementById('chat-dm-nome').textContent  = person.nome;
  document.getElementById('chat-dm-cargo').textContent = person.funcao;
  const av = document.getElementById('chat-dm-av');
  av.innerHTML = '';
  chatAplicarFoto(person.matricula, av, person.nome);
  chatMarcarLido('dm_'+person.matricula);
  chatRenderDm();
  setTimeout(()=>chatScrollFim('chat-msgs-dm'),50);
  chatUpdateBadge();
}

function chatCloseDm() {
  _chatDmTarget = null;
  chatTab('equipe', document.querySelector('.chat-tab:nth-child(2)'));
}

async function chatSend(canal) {
  const inputEl = document.getElementById(canal==='dm'?'chat-in-dm':'chat-in-geral');
  const texto   = inputEl.value.trim();
  if (!texto) return;
  const sendBtn = inputEl.nextElementSibling;
  inputEl.value = '';
  sendBtn.classList.add('chat-sending');
  const u  = currentUser;
  const id = Date.now()+'_'+Math.random().toString(36).slice(2,6);
  try {
    if (canal==='geral') {
      await gsPost('chatEnviar',{ aba:CHAT_ABA_GERAL, linha:[id,Date.now(),u.matricula,u.nome,u.funcao,texto] });
      await chatPollGeral();
      chatRenderGeral();
      setTimeout(()=>chatScrollFim('chat-msgs-geral'),50);
    } else if (canal==='dm' && _chatDmTarget) {
      await gsPost('chatEnviar',{ aba:CHAT_ABA_DM, linha:[id,Date.now(),u.matricula,u.nome,_chatDmTarget.matricula,texto] });
      const chave = chatDmChave(u.matricula,_chatDmTarget.matricula);
      if (!_chatMsgsDm[chave]) _chatMsgsDm[chave]=[];
      _chatMsgsDm[chave].push({id,ts:Date.now(),de:u.matricula,nome_de:u.nome,para:_chatDmTarget.matricula,texto});
      chatRenderDm();
      setTimeout(()=>chatScrollFim('chat-msgs-dm'),50);
    }
  } catch(e) { console.warn('chatSend err',e); }
  sendBtn.classList.remove('chat-sending');
}

function chatPollStart() {
  if (_chatPollTimer) clearInterval(_chatPollTimer);
  _chatPollTimer = setInterval(async()=>{
    await chatPollGeral();
    await chatPollDm();
    /* conversa privada aberta na tela: mensagens que chegam já contam como lidas */
    if (_chatOpen && _chatTab==='dm' && _chatDmTarget) chatMarcarLido('dm_'+_chatDmTarget.matricula);
    else if (_chatOpen && _chatTab==='geral') chatMarcarLido('geral');
    chatUpdateBadge();
    if (!_chatOpen) return;
    if (_chatTab==='geral') chatRenderGeral();
    else if (_chatTab==='dm') chatRenderDm();
    else if (_chatTab==='equipe') chatRenderEquipe();
  }, CHAT_POLL_MS);
}

async function chatPollGeral() {
  try {
    const rows = await fetchSheet(CHAT_ABA_GERAL);
    _chatMsgsGeral = rows.map(r=>({
      id:r['ID']||r['A']||'', ts:parseInt(r['TS']||r['B']||0),
      de:String(r['MATRICULA']||r['C']||''), nome_de:r['NOME']||r['D']||'',
      funcao:r['FUNCAO']||r['E']||'', texto:r['TEXTO']||r['F']||''
    })).filter(m=>m.texto).sort((a,b)=>a.ts-b.ts);
  } catch(e) {}
}

async function chatPollDm() {
  /* Busca TODAS as conversas privadas em que o usuário participa (não só a aberta),
     para o aviso (bolinha vermelha) funcionar para qualquer mensagem recebida. */
  try {
    const rows = await fetchSheet(CHAT_ABA_DM);
    const matMe = String(currentUser.matricula);
    const novo = {};
    rows.map(r=>({
      id:r['ID']||r['A']||'', ts:parseInt(r['TS']||r['B']||0),
      de:String(r['DE']||r['C']||''), nome_de:r['NOME_DE']||r['D']||'',
      para:String(r['PARA']||r['E']||''), texto:r['TEXTO']||r['F']||''
    })).filter(m=>m.texto&&(m.de===matMe||m.para===matMe))
      .sort((a,b)=>a.ts-b.ts)
      .forEach(m=>{
        const outro = m.de===matMe ? m.para : m.de;
        const chave = chatDmChave(matMe, outro);
        (novo[chave]=novo[chave]||[]).push(m);
      });
    _chatMsgsDm = novo;
  } catch(e) {}
}

function chatRenderGeral() {
  const el = document.getElementById('chat-msgs-geral');
  if (!el) return;
  const msgs = _chatMsgsGeral.slice(-CHAT_MAX_RENDER);
  if (!msgs.length) { el.innerHTML='<div class="chat-sys" style="margin-top:30px">👋 Canal geral — mande uma mensagem para a equipe!</div>'; return; }
  const atFundo = el.scrollHeight-el.scrollTop-el.clientHeight < 60;
  el.innerHTML = chatBuildHtml(msgs, false);
  if (atFundo) el.scrollTop=el.scrollHeight;
}

function chatRenderDm() {
  const el = document.getElementById('chat-msgs-dm');
  if (!el||!_chatDmTarget) return;
  const chave = chatDmChave(currentUser.matricula,_chatDmTarget.matricula);
  const msgs  = (_chatMsgsDm[chave]||[]).slice(-CHAT_MAX_RENDER);
  if (!msgs.length) { el.innerHTML=`<div class="chat-sys" style="margin-top:30px">💬 Início da conversa com ${_chatDmTarget.nome}</div>`; return; }
  const atFundo = el.scrollHeight-el.scrollTop-el.clientHeight < 60;
  el.innerHTML  = chatBuildHtml(msgs, true);
  if (atFundo) el.scrollTop=el.scrollHeight;
}

function chatBuildHtml(msgs, isDm) {
  let html='', lastDate='';
  msgs.forEach(m=>{
    const d=new Date(m.ts);
    const dataStr=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const hora=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    if (dataStr!==lastDate) { html+=`<div class="chat-date-sep">${dataStr}</div>`; lastDate=dataStr; }
    const mine=m.de===currentUser.matricula;
    const foto=_chatFotos[m.de];
    const ini=initials(m.nome_de||'?');
    const avHtml=foto
      ?`<div class="cmsg-av"><img src="${foto}" alt="${ini}"></div>`
      :`<div class="cmsg-av" style="background:${chatCor(m.de)}">${ini}</div>`;
    const funcaoStr=(!isDm&&!mine&&m.funcao)?` · <span style="font-weight:500;color:var(--gray-400)">${escHtml(m.funcao)}</span>`:'';
    html+=`<div class="cmsg ${mine?'mine':'other'}">
      ${mine?'':avHtml}
      <div class="cmsg-body">
        ${!mine?`<div class="cmsg-sender">${escHtml(m.nome_de)}${funcaoStr}</div>`:''}
        <div class="cmsg-bubble">${escHtml(m.texto)}</div>
        <div class="cmsg-time">${hora}</div>
      </div>
      ${mine?avHtml:''}
    </div>`;
  });
  return html;
}

async function chatCarregarEquipe() {
  try {
    if (!_chatProfList.length) {
      // A lista da equipe agora vem dos perfis do sistema (Supabase), não mais da planilha.
      const { data, error } = await sb.from('profiles').select('matricula,nome,funcao').eq('ativo', true).order('nome');
      if (error) throw error;
      _chatProfList = (data || []).map(r => ({ matricula: String(r.matricula), nome: r.nome, funcao: r.funcao }));
    }
    chatRenderEquipe();
  } catch(e) {
    const el=document.getElementById('chat-people-list');
    if (el) el.innerHTML='<div class="chat-loading">⚠️ Não foi possível carregar a equipe.</div>';
  }
}

function chatRenderEquipe() {
  const el=document.getElementById('chat-people-list');
  if (!el) return;
  const outros=_chatProfList.filter(p=>p.matricula!==currentUser.matricula).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  if (!outros.length) { el.innerHTML='<div class="chat-loading">Nenhum profissional cadastrado.</div>'; return; }
  el.innerHTML=outros.map(p=>{
    const foto=_chatFotos[p.matricula];
    const ini=initials(p.nome);
    const avHtml=foto
      ?`<div class="chat-pav"><img src="${foto}" alt="${ini}"></div>`
      :`<div class="chat-pav" style="background:${chatCor(p.matricula)}">${ini}</div>`;
    const chave=chatDmChave(currentUser.matricula,p.matricula);
    const msgs=_chatMsgsDm[chave]||[];
    const lr=_chatLastRead['dm_'+p.matricula]||0;
    const unread=msgs.filter(m=>m.de===p.matricula&&m.ts>lr).length;
    const pStr=JSON.stringify(p).replace(/"/g,'&quot;');
    return `<div class="chat-person" onclick='chatAbrirDm(${pStr})'>
      ${avHtml}
      <div class="chat-pinfo">
        <div class="chat-pname">${escHtml(p.nome)}</div>
        <div class="chat-prole">${escHtml(p.funcao)}</div>
      </div>
      <div class="chat-punread ${unread?'show':''}">${unread||''}</div>
    </div>`;
  }).join('');
}

function chatUploadFoto(input) {
  const file=input.files[0];
  if (!file) return;
  if (file.size>800*1024) { alert('Imagem muito grande. Use uma foto menor que 800 KB.'); return; }
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      const max=120; let w=img.width,h=img.height;
      if (w>h) { if(w>max){h=h*max/w;w=max;} } else { if(h>max){w=w*max/h;h=max;} }
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const dataUrl=canvas.toDataURL('image/jpeg',0.82);
      _chatFotos[currentUser.matricula]=dataUrl;
      localStorage.setItem('uparc_chat_fotos',JSON.stringify(_chatFotos));
      chatAplicarFoto(currentUser.matricula,document.getElementById('chat-perfil-foto'),currentUser.nome,true);
      chatAplicarFotoTopbar();
      // Salva na planilha CHAT_FOTOS para os outros verem
      gsPost('chatSalvarFoto',{matricula:currentUser.matricula,foto:dataUrl}).catch(()=>{});
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

async function chatBuscarFotos() {
  try {
    const rows=await fetchSheet(CHAT_ABA_FOTOS);
    rows.forEach(r=>{
      const mat=String(r['MATRICULA']||r['A']||'').trim();
      const foto=r['FOTO']||r['B']||'';
      if (mat&&foto) _chatFotos[mat]=foto;
    });
    localStorage.setItem('uparc_chat_fotos',JSON.stringify(_chatFotos));
    chatAplicarFotoTopbar();
  } catch(e) {}
}

function chatAplicarFoto(matricula, containerEl, nome, grande) {
  if (!containerEl) return;
  const foto=_chatFotos[matricula];
  const ini=initials(nome||'??');
  if (foto) { containerEl.innerHTML=`<img src="${foto}" alt="${ini}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
  else { containerEl.innerHTML=grande?`<span>${ini}</span>`:ini; }
}

function chatAplicarFotoTopbar() {
  const av=document.getElementById('avatar-btn');
  if (!av) return;
  const foto=_chatFotos[currentUser?.matricula];
  const ini=initials(currentUser?.nome||'');
  const iniEl=document.getElementById('avatar-initials');
  av.querySelectorAll('img.av-photo').forEach(i=>i.remove());
  if (foto) {
    const img=document.createElement('img');
    img.src=foto; img.className='av-photo';
    img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;top:0;left:0;';
    av.appendChild(img);
    if (iniEl) iniEl.style.display='none';
  } else {
    if (iniEl) { iniEl.style.display=''; iniEl.textContent=ini; }
  }
}

function chatUpdateBadge() {
  const badge=document.getElementById('chat-badge');
  if (!badge) return;
  const lrG=_chatLastRead['geral']||0;
  let unread=_chatMsgsGeral.filter(m=>m.de!==currentUser.matricula&&m.ts>lrG).length;
  Object.entries(_chatMsgsDm).forEach(([chave,msgs])=>{
    const parts=chave.split('_vs_');
    const other=parts.find(p=>p!==currentUser.matricula)||'';
    const lr=_chatLastRead['dm_'+other]||0;
    unread+=msgs.filter(m=>m.de!==currentUser.matricula&&m.ts>lr).length;
  });
  badge.textContent=unread>9?'9+':unread;
  badge.classList.toggle('show',unread>0);
}

function chatMarcarLido(canal) {
  _chatLastRead[canal]=Date.now();
  localStorage.setItem('uparc_chat_lr',JSON.stringify(_chatLastRead));
}

function chatScrollFim(id) { const el=document.getElementById(id); if(el) el.scrollTop=el.scrollHeight; }

function chatDmChave(m1,m2) { return [m1,m2].sort().join('_vs_'); }

function chatCor(seed) {
  const cores=['#1A6FC4','#27AE60','#D97706','#7C3AED','#0E7490','#DB2777','#DC2626','#059669'];
  let h=0; for(let i=0;i<seed.length;i++) h=seed.charCodeAt(i)+((h<<5)-h);
  return cores[Math.abs(h)%cores.length];
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
