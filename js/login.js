const $ = (s, r=document) => r.querySelector(s);
const el = (t, attrs={}) => Object.assign(document.createElement(t), attrs);
const bytesMB = b => (b / 1024 / 1024).toFixed(2);

const form = document.getElementById('form');
const msg = document.getElementById('msg');

form.addEventListener('submit', e => {
e.preventDefault();
const user = document.getElementById('usuario').value.trim();
const pass = document.getElementById('password').value.trim();

if (user === 'doctor' && pass === '123') {
    msg.textContent = '¡Bienvenido, ' + user + '!';
    msg.className = 'msg ok';
    setTimeout(() => {
    window.location.href = "image-drop.html";
    }, 400);
} else {
    msg.textContent = 'Credenciales inválidas';
    msg.className = 'msg error';
}
});