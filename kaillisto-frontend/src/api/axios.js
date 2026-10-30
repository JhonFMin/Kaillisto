import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api', // Asegúrate de que esta URL base sea correcta
    withCredentials: true, // <-- ESTO ES VITAL PARA QUE FUNCIONE EL LOGIN
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;