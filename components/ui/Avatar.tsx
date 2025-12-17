import React, { useState, useEffect } from 'react';

interface AvatarProps {
    src?: string | null;
    name?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    border?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ 
    src, 
    name = 'Usuario', 
    size = 'md', 
    className = '',
    border = false
}) => {
    const [imgError, setImgError] = useState(false);

    // Reseteamos el error si cambia la URL (por si el usuario sube una foto nueva)
    useEffect(() => {
        setImgError(false);
    }, [src]);

    // Tamaños estandarizados
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',      // Tablas, listas densas
        md: 'w-10 h-10 text-sm',    // Header, listas normales
        lg: 'w-14 h-14 text-lg',    // Tarjetas de perfil
        xl: 'w-20 h-20 text-2xl'    // Dashboard Header, Perfil grande
    };

    // Obtener iniciales (Máximo 2 letras)
    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Lógica: ¿Debemos mostrar imagen?
    // Sí, si hay URL, tiene longitud decente y no ha dado error de carga.
    const showImage = src && src.length > 10 && !imgError;

    const baseClasses = `rounded-full flex-shrink-0 object-cover ${sizeClasses[size]} ${className}`;
    const borderClass = border ? 'border-[3px] border-iange-orange p-0.5' : 'border border-gray-200';

    if (showImage) {
        return (
            <img 
                src={src} 
                alt={name} 
                className={`${baseClasses} ${borderClass} shadow-sm bg-white`}
                onError={() => setImgError(true)}
            />
        );
    }

    // Fallback: Iniciales con colores corporativos consistentes
    return (
        <div 
            className={`${baseClasses} bg-iange-salmon text-iange-orange font-bold flex items-center justify-center shadow-sm ${border ? 'border-[3px] border-white' : ''}`}
            title={name}
        >
            {initials}
        </div>
    );
};

export default Avatar;