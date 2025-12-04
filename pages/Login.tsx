import React, { useState } from 'react';

// Interfaz simplificada (sin rememberMe)
interface LoginProps {
    onLogin: (email: string, pass: string) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // CAMBIO AQUÍ: Se inician las variables con cadenas vacías ''
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Llamada simple
    await onLogin(email, password);
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="text-center mb-8 flex flex-col items-center">
        {/* LOGO SECTION START */}
        <div className="mb-4 h-20 flex items-center justify-center">
            <img 
                src="/logo.svg" 
                alt="IANGE" 
                className="h-full w-auto object-contain max-h-16" 
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    document.getElementById('login-logo-fallback')?.classList.remove('hidden');
                }}
            />
            
            <div id="login-logo-fallback" className="hidden">
                <h1 className="text-4xl font-bold tracking-wider text-iange-dark">
                IANGE<span className="text-iange-orange">.</span>
                </h1>
            </div>
        </div>
        {/* LOGO SECTION END */}

        <p className="text-gray-600 mt-1">Gestión Inmobiliaria Inteligente</p>
      </div>

      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-iange-dark mb-6">
          Iniciar Sesión
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              placeholder="Tu dirección de correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-iange-orange focus:border-iange-orange placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-iange-orange focus:border-iange-orange placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-iange-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange transition-colors ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>

          <div className="mt-4 text-center text-xs text-gray-500">
            Al iniciar sesión aceptas nuestros{' '}
            <a 
              href="https://iange.xyz/terminos-y-condiciones" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-iange-orange hover:underline"
            >
              Términos y Condiciones
            </a>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login;