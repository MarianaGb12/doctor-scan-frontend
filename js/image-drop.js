// Configuración
const API_URL = "http://localhost:3000/predict";
const VALID = ['image/jpeg','image/png'];
const MAX_MB = 5;

// Estado
let currentFile;

// DOM Elements
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const preview = document.getElementById('preview');
const analyzeBtn = document.getElementById('analyzeBtn');

// Utilidades
function bytesMB(b){ 
  return (b/1024/1024).toFixed(2); 
}

function setEnabled(ok){
  analyzeBtn.disabled = !ok;
}

function describe(file){
  preview.style.display = 'block';
  preview.innerHTML = '';
  
  const p = document.createElement('p');
  p.textContent = `${file.name} • ${bytesMB(file.size)} MB`;
  preview.appendChild(p);

  if (file.type.indexOf('image/') === 0){
    const img = document.createElement('img');
    img.alt = 'Vista previa';
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  }
}

function validate(file){
  if (!file) return { ok:false, msg:'Ningún archivo seleccionado.' };
  if (VALID.indexOf(file.type) === -1) return { ok:false, msg:'Formato inválido. Usa JPG o PNG.' };
  if (file.size > MAX_MB*1024*1024) return { ok:false, msg:`El archivo supera ${MAX_MB}MB.` };
  return { ok:true };
}

function updateDropZoneState(hasFile, fileName = ''){
  if (hasFile) {
    drop.classList.add('has-file');
    drop.querySelector('.title').textContent = 'Imagen seleccionada';
    drop.querySelector('.hint').textContent = fileName;
    drop.querySelector('.file-formats').textContent = 'Haz clic para cambiar la imagen';
  } else {
    drop.classList.remove('has-file');
    drop.querySelector('.title').textContent = 'Arrastra la imagen aquí';
    drop.querySelector('.hint').textContent = 'o haz clic para seleccionar';
    drop.querySelector('.file-formats').textContent = 'JPG, PNG • Máximo 5MB';
  }
}

function handleFiles(files){
  currentFile = files && files[0];
  const res = validate(currentFile);
  
  if (!res.ok){
    preview.style.display = 'block';
    preview.innerHTML = `<p class="status-err">${res.msg}</p>`;
    setEnabled(false);
    updateDropZoneState(false);
    return;
  }
  
  describe(currentFile);
  const statusP = document.createElement('p');
  statusP.className = 'status-ok';
  statusP.textContent = '✓ Listo para analizar';
  preview.appendChild(statusP);
  setEnabled(true);
  updateDropZoneState(true, currentFile.name);
}

// Event Listeners - File Upload
drop.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files); 
  e.target.value = '';
});

['dragenter','dragover'].forEach(ev => {
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    drop.classList.add('drag-over');
  });
});

['dragleave','drop'].forEach(ev => {
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    drop.classList.remove('drag-over');
  });
});

drop.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

// API Communication
async function sendToApi(file){
  if(!file) return;
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) throw new Error('Network response was not ok');
  return await response.json();
}

// Result Display
function getResultData(code){
  const results = {
    2: {
      title: 'Resultado: Normal',
      icon: '✓',
      className: 'normal',
      message: `
        <strong>Situación:</strong><br>
            La mamografía no mostró hallazgos sospechosos: no hay masas, microcalcificaciones significativas,
            asimetrías nuevas ni alteraciones que sugieran malignidad.<br><br>

            <strong>Recomendaciones sugeridas:</strong><br>
            • Continuar con el cribado (screening) habitual según la guía local (cada 1-2 años según normativa).<br>
            • Mantener autoexamen mamario consciente y vigilar cambios nuevos (nódulo, retracción, secreción, etc).<br>
            • Evaluar factores de riesgo personales y familiares; considerar estudios adicionales si hay riesgo elevado.<br>
            • Mantener hábitos saludables: ejercicio, alimentación equilibrada, peso adecuado, limitar alcohol.<br><br>

            <strong>Precauciones:</strong><br>
            • “Normal” no significa riesgo cero; la mamografía no tiene 100% de sensibilidad.<br>
            • Si aparecen síntomas nuevos, consultar antes del próximo screening.
        `
    },
    0: {
      title: 'Resultado: Benigno',
      icon: '⚠',
      className: 'benign',
      message: `
        <strong>Situación:</strong><br>
        Se encontró un hallazgo evaluado como de bajo riesgo o claramente benigno (por ejemplo, quiste simple,
        calcificación vascular, fibroadenoma conocido estable, etc.).<br><br>

        <strong>Recomendaciones sugeridas:</strong><br>
        • Mantener seguimiento según indique el radiólogo (control cada 6–12 meses o siguiente screening).<br>
        • Si es “probablemente benigno” (BIRADS 2 o 3), confirmar intervalos de vigilancia sugeridos.<br>
        • Registrar el hallazgo en el historial mamario para referencia futura.<br>
        • Observar cambios en tamaño, forma o síntomas asociados.<br>
        • Continuar con screening general y hábitos saludables.<br><br>

        <strong>Precauciones:</strong><br>
        • Si el hallazgo cambia (crece, se vuelve doloroso, secreción, etc.), acudir inmediatamente.<br>
        • Asegurarse de que quede claro el plan de seguimiento indicado por el radiólogo.
      `
    },
    1: {
      title: 'Resultado: Maligno o Altamente Sospechoso',
      icon: '⚠',
      className: 'malignant',
      message: `
        <strong>Situación:</strong><br>
        La mamografía no mostró hallazgos sospechosos: no hay masas, microcalcificaciones significativas,
        asimetrías nuevas ni alteraciones que sugieran malignidad.<br><br>

        <strong>Recomendaciones sugeridas:</strong><br>
        • Continuar con el cribado (screening) habitual según la guía local (cada 1-2 años según normativa).<br>
        • Mantener autoexamen mamario consciente y vigilar cambios nuevos (nódulo, retracción, secreción, etc).<br>
        • Evaluar factores de riesgo personales y familiares; considerar estudios adicionales si hay riesgo elevado.<br>
        • Mantener hábitos saludables: ejercicio, alimentación equilibrada, peso adecuado, limitar alcohol.<br><br>

        <strong>Precauciones:</strong><br>
        • “Normal” no significa riesgo cero; la mamografía no tiene 100% de sensibilidad.<br>
        • Si aparecen síntomas nuevos, consultar antes del próximo screening.
      `
    }
  };

  return results[code] || {
    title: 'Resultado Desconocido',
    icon: '?',
    className: 'benign',
    message: `El modelo devolvió un código no esperado: ${code}`
  };
}

function showResult(code, confidence){
  const result = getResultData(code);

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';

  const popup = document.createElement('div');
  popup.className = 'result-popup';
  popup.innerHTML = `
    <div class="result-header">
      <div class="result-icon ${result.className}">${result.icon}</div>
      <div class="result-title">${result.title}</div>
    </div>
    <div class="result-content-wrapper">
      <div class="result-content">
        ${result.message}
        <div>
          <span class="confidence-badge">Confianza del modelo: ${confidence}</span>
        </div>
      </div>
    </div>
    <div class="result-footer">
      <button class="close-btn">Cerrar</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  const closeBtn = popup.querySelector('.close-btn');
  const close = () => {
    overlay.remove();
    popup.remove();
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
}

function showError(){
  const errorOverlay = document.createElement('div');
  errorOverlay.className = 'popup-overlay';
  
  const errorPopup = document.createElement('div');
  errorPopup.className = 'result-popup';
  errorPopup.innerHTML = `
    <div class="result-header">
      <div class="result-icon malignant">✕</div>
      <div class="result-title">Error al analizar</div>
    </div>
    <div class="result-content-wrapper">
      <div class="result-content">
        No se pudo conectar con el servidor. Por favor, verifica que la API esté funcionando e intenta nuevamente.
      </div>
    </div>
    <div class="result-footer">
      <button class="close-btn">Cerrar</button>
    </div>
  `;
  
  document.body.appendChild(errorOverlay);
  document.body.appendChild(errorPopup);
  
  const close = () => {
    errorOverlay.remove();
    errorPopup.remove();
  };
  
  errorPopup.querySelector('.close-btn').addEventListener('click', close);
  errorOverlay.addEventListener('click', close);
}

// Analyze Button Handler
analyzeBtn.addEventListener('click', async () => {
  if (analyzeBtn.disabled) return;

  const btnContent = analyzeBtn.querySelector('span');
  const originalText = btnContent.textContent;
  btnContent.innerHTML = '<span class="loading-spinner"></span> Analizando...';
  analyzeBtn.disabled = true;

  try {
    const res = await sendToApi(currentFile);
    console.log('API response:', res);

    const code = typeof res.result === 'number' ? res.result : parseInt(res.result, 10);
    const confidence = res.confidence != null
      ? (res.confidence * 100).toFixed(1) + '%'
      : 'N/A';

    showResult(code, confidence);

  } catch (error) {
    console.error('Error al analizar:', error);
    showError();
  } finally {
    setTimeout(() => {
      btnContent.textContent = originalText;
      analyzeBtn.disabled = false;
    }, 500);
  }
});