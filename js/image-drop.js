function bytesMB(b){ return (b/1024/1024).toFixed(2); }

// crea elemento y asigna atributos
function el(t, attrs){ return Object.assign(document.createElement(t), attrs || {}); } 

let currentFile;
const API_URL = "http://backend:8000/predict";

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

    // post to the api with input file
    // receive and show result + message according to the result

    const res = await sendToApi(currentFile);

    console.log('API response:', res);
    
    const popup = document.createElement('div');
    popup.innerHTML = `
        <strong>Resultado:</strong> ${res.label} <br>
        <small>Confianza: ${(res.confidence * 100).toFixed(1)}%</small>
    `;
    // css temporal para el popup
    // pls quitar y asignarle estilo con clases externas
    Object.assign(popup.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#fff',
        padding: '15px 20px',
        border: '2px solid #4caf50',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        zIndex: 1000,
        fontFamily: 'Arial, sans-serif',
        color: '#333',
        textAlign: 'center'
    });
    popup.addEventListener('click', () => popup.remove());

    document.body.appendChild(popup);

    setTimeout(function(){
        analyzeBtn.innerHTML = btnText;
        analyzeBtn.style.filter = '';
        }, 900);
});