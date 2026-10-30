import axios from 'axios';

// IMPORTANTE: debe usar el MISMO host que el frontend (localhost),
// nunca 127.0.0.1. Para el navegador, "localhost" y "127.0.0.1" son
// *sitios distintos* (cross-site), así que con SESSION_COOKIE_SAMESITE
// = 'Lax' la cookie sessionid que Django pone en 127.0.0.1 nunca se
// envía en los XHR/fetch hechos desde una página servida en
// http://localhost:5173. Esto provocaba: (1) document.cookie vacío en
// el navegador (la cookie existe, pero para el dominio 127.0.0.1, no
// localhost) y (2) 403 en /api/security/me/permissions/ y en todo lo
// demás después del login, porque la cookie de sesión jamás llegaba
// de vuelta al backend. El backend debe correr en
// "python manage.py runserver localhost:8000" (no 127.0.0.1:8000).
const BASE = '/api';

const api = axios.create({
    baseURL: BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Obtiene el CSRF token del backend si aún no existe
async function ensureCsrf() {
    if (!getCookie('csrftoken')) {
        await axios.get(`${BASE}/csrf/`, { withCredentials: true });
    }
}

// Inyecta el token CSRF en cada petición que lo necesita
api.interceptors.request.use(async (config) => {
    const unsafe = ['post', 'put', 'patch', 'delete'];
    if (unsafe.includes(config.method?.toLowerCase())) {
        await ensureCsrf();
        const token = getCookie('csrftoken');
        if (token) config.headers['X-CSRFToken'] = token;
    }
    return config;
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

export default api;