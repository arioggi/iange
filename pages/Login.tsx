import React, { useState } from 'react';
import { useAuth } from '../authContext'; // ← ajusta la ruta si es necesario

const Login: React.FC = () => {
  const { login, status } = useAuth();
  const [email, setEmail] = useState('superadmin@iange.xyz');
  const [password, setPassword] = useState('1234567890');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email, password);

    if (res.error) {
      setError(res.error);
    }

    setIsSubmitting(false);
  };

  const isDisabled = isSubmitting || status === 'loading';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-wider text-iange-dark">
          IANGE<span className="text-iange-orange">.</span>
        </h1>
        <p className="text-gray-600 mt-1">Gestión Inmobiliaria Inteligente</p>
      </div>

      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-iange-dark mb-6">
          Iniciar Sesión
        </h2>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Correo electrónico
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-iange-orange focus:border-iange-orange"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-iange-orange focus:border-iange-orange"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isDisabled}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-iange-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange transition-colors ${
                isDisabled ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting || status === 'loading' ? 'Ingresando…' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-8">
        ¿No tienes una cuenta?{' '}
        <a
          href="#"
          className="font-medium text-iange-orange hover:text-orange-500"
        >
          Contacta a soporte
        </a>
      </p>
    </div>
  );
};

export default Login;
