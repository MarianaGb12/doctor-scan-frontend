function bytesMB(b){ return (b/1024/1024).toFixed(2); }

// crea elemento y asigna atributos
function el(t, attrs){ return Object.assign(document.createElement(t), attrs || {}); } 

let currentFile;
const API_URL = "http://localhost:8000/predict";

// DOM
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const preview = document.getElementById('preview');
const analyzeBtn = document.getElementById('analyzeBtn');

console.log(fileInput);

// Reglas
const VALID = ['image/jpeg','image/png'];
const MAX_MB = 5;

function setEnabled(ok){
    analyzeBtn.disabled = !ok;
    if (ok) analyzeBtn.classList.add('enabled'); else analyzeBtn.classList.remove('enabled');
}

// previsualiza el archivo
function describe(file){
    console.log('describe', file);
    preview.innerHTML = '';
    const p = el('p');
    p.textContent = 'Archivo: ' + file.name + ' — ' + bytesMB(file.size) + ' MB';
    preview.appendChild(p);

    if (file.type.indexOf('image/') === 0){
    const img = el('img');
    img.alt = 'Vista previa';
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
    }
}

function validate(file){
    console.log('validate', file);
    if (!file) return { ok:false, msg:'Ningún archivo seleccionado.' };
    if (VALID.indexOf(file.type) === -1) return { ok:false, msg:'Formato inválido. Usa JPG o PNG.' };
    if (file.size > MAX_MB*1024*1024) return { ok:false, msg:'El archivo supera ' + MAX_MB + 'MB.' };
    return { ok:true };
}

function handleFiles(files){
    console.log('handleFiles', files);
    currentFile = files && files[0];
    const res = validate(currentFile);
    if (!res.ok){
        preview.innerHTML = '<p class="status-err">' + res.msg + '</p>';
        setEnabled(false);
        return;
    }
    describe(currentFile);
    preview.insertAdjacentHTML('beforeend', '<p class="status-ok">Listo para analizar.</p>');
    setEnabled(true);
    analyzeBtn.dataset.blobUrl = URL.createObjectURL(currentFile);
}

// Eventos
drop.addEventListener('click', function(){
    console.log('click drop');
    fileInput.click(); 
});
fileInput.addEventListener('change', function(e){
    console.log('change fileInput');
    handleFiles(e.target.files); 
    e.target.value = '';
});

['dragenter','dragover'].forEach(function(ev){
    drop.addEventListener(ev, function(e){
        e.preventDefault(); e.stopPropagation();
        drop.style.background = 'rgba(59,130,246,.05)';
    });
});
['dragleave','drop'].forEach(function(ev){
    drop.addEventListener(ev, function(e){
        e.preventDefault(); e.stopPropagation();
        drop.style.background = 'transparent';
    });
});
drop.addEventListener('drop', function(e){ handleFiles(e.dataTransfer.files); });

async function sendToApi(file){
    if(!file) return;
    
    const formData = new FormData();
    formData.append('file', file); //api espera un campo 'file'

    try{
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        return result;
    }
    catch(error){
        console.error('Error al enviar a la API:', error);
        throw error;
    }
}
analyzeBtn.addEventListener('click', async function(){
    if (analyzeBtn.disabled) return;

    const btnText = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = '<span style="font-weight:800">Analizando…</span>';
    analyzeBtn.style.filter = 'brightness(.95)';

    try {
        const res = await sendToApi(currentFile);
        console.log('API response:', res);

        const code = typeof res.result === 'number' ? res.result : parseInt(res.result, 10);
        const confidence = res.confidence != null
            ? (res.confidence * 100).toFixed(1) + '%'
            : 'N/A';

        let titulo = '';
        let mensaje = '';

        //        CASOS DEL MODELO
        // ============================

        if (code === 0) {
            titulo = 'Resultado: Normal';
            mensaje = `
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
            `;
        }

        else if (code === 1) {
            titulo = 'Resultado: Benigno';
            mensaje = `
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
            `;
        }

        else if (code === 2) {
            titulo = 'Resultado: Maligno o Altamente Sospechoso';
            mensaje = `
                <strong>Situación:</strong><br>
                El estudio muestra hallazgos que sugieren malignidad (masa irregular, microcalcificaciones agrupadas,
                densidad sospechosa) o fue categorizado como altamente sospechoso (equivalente a BIRADS 5).<br><br>

                <strong>Recomendaciones sugeridas:</strong><br>
                • Derivar de inmediato a un equipo especializado en mama para biopsia o diagnóstico definitivo.<br>
                • Realizar estudios complementarios (ecografía, resonancia, tomografía, analíticas según indicación).<br>
                • Discusión multidisciplinaria del caso para definir tratamiento (cirugía, quimio, radioterapia, etc.).<br>
                • Evaluar factores adicionales de riesgo y planificar seguimiento a largo plazo.<br>
                • Acceso a apoyo psicológico y acompañamiento durante el proceso diagnóstico y terapéutico.<br><br>

                <strong>Precauciones:</strong><br>
                • No demorar la evaluación: el diagnóstico temprano mejora el pronóstico.<br>
                • Confirmar el hallazgo en un centro experto en patología mamaria.<br>
                • Solicitar información clara sobre opciones de tratamiento y pronóstico.
            `;
        }

        else {
            titulo = 'Resultado Desconocido';
            mensaje = 'El modelo devolvió un código no esperado: ' + res.result;
        }

        //         FINAL
        // ============================

        const popup = document.createElement('div');
        popup.innerHTML = `
            <strong>${titulo}</strong><br><br>
            <span style="display:block; text-align:left; font-size:0.90rem;">${mensaje}</span><br>
            <small><strong>Confianza del modelo:</strong> ${confidence}</small>
        `;

        Object.assign(popup.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#ffffff',
            padding: '20px',
            border: '2px solid #4caf50',
            borderRadius: '12px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
            zIndex: 2000,
            maxWidth: '350px',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.45',
            color: '#111'
        });

        popup.addEventListener('click', () => popup.remove());
        document.body.appendChild(popup);

        setTimeout(() => popup.remove(), 12000);

    } catch (error) {
        console.error('Error al analizar:', error);
        const popup = document.createElement('div');
        popup.innerHTML = `
            <strong>Error al analizar la imagen</strong><br>
            <span>Intenta nuevamente.</span>
        `;
        Object.assign(popup.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#ffecec',
            padding: '15px 20px',
            border: '2px solid #e11d48',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            zIndex: 2000,
            color: '#333'
        });
        popup.addEventListener('click', () => popup.remove());
        document.body.appendChild(popup);
    } finally {
        setTimeout(function(){
            analyzeBtn.innerHTML = btnText;
            analyzeBtn.style.filter = '';
        }, 900);
    }
});
