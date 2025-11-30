import React, { useState } from 'react';
import { User } from '../types';

interface ChangePasswordProps {
    user: User;
    onPasswordChanged: (userId: number, newPassword: string) => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ user, onPasswordChanged }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 10) {
            setError('La contraseña debe tener al menos 10 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        onPasswordChanged(user.id, newPassword);
    };

    return (
        <div className="fixed inset-0 bg-gray-50 flex flex-col justify-center items-center p-4 z-50">
             <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-wider text-iange-dark">
                    IANGE<span className="text-iange-orange">.</span>
                </h1>
            </div>
            <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-center text-iange-dark mb-2">Cambiar Contraseña</h2>
                <p className="text-center text-sm text-gray-600 mb-6">
                    Por seguridad, debes establecer una nueva contraseña para continuar.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            Nueva Contraseña
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            required
                            minLength={10}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-iange-orange focus:border-iange-orange"
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirmar Nueva Contraseña
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            minLength={10}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-iange-orange focus:border-iange-orange"
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}
                    <div>
                        <button
                            type="submit"
                            className="w-full mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-iange-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange transition-colors"
                        >
                            Guardar Contraseña
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
