import React from 'react';
import ReactDOM from 'react-dom/client';
// CAMBIO: Importamos BrowserRouter en lugar de HashRouter
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import adapter from './data/localStorageAdapter';

// Inicialización de datos locales (legacy)
adapter.migrateData();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* CAMBIO: Usamos BrowserRouter para URLs limpias (sin #) */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);