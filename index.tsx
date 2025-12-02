import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
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
    {/* ELIMINADO: AuthProvider. Ahora solo App controla todo. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);