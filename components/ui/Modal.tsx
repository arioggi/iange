import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // Usaremos Portal para garantizar que cubra todo

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxWidth?: string;
    hideHeader?: boolean;
    zIndex?: number; // Nueva prop opcional para controlar capas
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    maxWidth = "max-w-2xl",
    hideHeader = false,
    zIndex = 50 // Valor por defecto
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        
        // Bloquear scroll del body cuando el modal está abierto
        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Renderizamos en el body usando Portal para escapar de cualquier contenedor relativo
    return createPortal(
        <div 
            className="fixed inset-0 h-screen w-screen flex justify-center items-center p-4"
            style={{ zIndex: zIndex }}
        >
            {/* 1. BACKDROP ESTANDARIZADO */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>

            {/* 2. CONTENIDO DEL MODAL */}
            <div
                ref={modalRef}
                className={`relative bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-down`}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro
            >
                {!hideHeader && title && (
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10 shrink-0">
                        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <span className="text-2xl leading-none">&times;</span>
                        </button>
                    </div>
                )}
                
                <div className={`${!hideHeader && title ? "p-6" : "p-0"} overflow-y-auto custom-scrollbar`}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;