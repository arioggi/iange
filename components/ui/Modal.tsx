import React, { useEffect, useRef } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string; // Permitimos anchos personalizados
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 backdrop-blur-sm transition-opacity">
            <div
                ref={modalRef}
                className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[95vh] flex flex-col overflow-hidden`}
                role="dialog"
                aria-modal="true"
            >
                {/* --- CORRECCIÓN CRÍTICA: SI NO HAY TÍTULO, NO RENDERIZA NADA DE CABECERA --- */}
                {title && (
                    <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                        <h2 className="text-lg font-bold text-iange-dark">{title}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <span className="text-2xl">&times;</span>
                        </button>
                    </div>
                )}
                
                {/* Si no hay título, quitamos el padding (p-0) para que la foto llegue al borde */}
                <div className={`${title ? "p-6" : "p-0"} overflow-y-auto`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;