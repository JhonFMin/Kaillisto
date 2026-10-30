import axios from 'axios';

const BASE = 'http://127.0.0.1:8000/api';

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