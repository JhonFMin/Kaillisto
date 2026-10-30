import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'; // <-- ESTA LÍNEA ES LA QUE ACTIVA TODO EL DISEÑO
import { AuthProvider } from './context/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)