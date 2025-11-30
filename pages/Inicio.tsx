import React from 'react';
import { useNavigate } from 'react-router-dom';

const NavButton: React.FC<{ label: string; path?: string; variant?: 'primary' | 'secondary'; disabled?: boolean; onClick?: () => void; }> = ({ label, path, variant = 'primary', disabled = false, onClick }) => {
    const navigate = useNavigate();
    const baseClasses = "w-full h-32 rounded-lg flex items-center justify-center font-bold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 p-4 text-xl";

    const styles = {
        primary: "bg-iange-orange text-white",
        secondary: "bg-iange-salmon text-iange-dark cursor-not-allowed opacity-70",
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (!disabled && path) {
            navigate(path);
        }
    };

    return (
        <button onClick={handleClick} disabled={disabled} className={`${baseClasses} ${styles[variant]}`}>
            <span>{label}</span>
        </button>
    );
};

const Inicio: React.FC = () => {
    const primaryButtons = [
        { label: "Dashboard", path: '/oportunidades' },
        { label: "Alta de Clientes", path: '/clientes' },
        { label: "Catálogo", path: '/catalogo' },
        { label: "Progreso", path: '/progreso' },
        { label: "Reportes", path: '/reportes' },
        { label: "Vencimiento", path: '/vencimiento' },
    ];

    const secondaryButtons = [
        { label: "Realfy", path: '/realfy' },
        { label: "Marketing IA", path: '/marketing-ia' },
        { label: "Mercado", path: '/mercado' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {primaryButtons.map(btn => (
                    <NavButton key={btn.label} label={btn.label} path={btn.path} />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {secondaryButtons.map(btn => (
                    <NavButton key={btn.label} label={btn.label} path={btn.path} variant="secondary" />
                ))}
            </div>
        </div>
    );
};

export default Inicio;
