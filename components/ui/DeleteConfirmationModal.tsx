import React from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: React.ReactNode; // ReactNode permite pasar texto o JSX (negritas, saltos de línea)
    confirmText?: string;
    cancelText?: string;
    zIndex?: number; // Por si necesitamos ajustarlo en algún lugar específico
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmar Eliminación",
    // Mensaje por defecto si no se pasa uno personalizado
    message = "¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.",
    confirmText = "Sí, Eliminar",
    cancelText = "Cancelar",
    zIndex = 100001 // Un valor alto por defecto para que siempre quede encima
}) => {
    if (!isOpen) return null;

    return (
        // Usamos fixed inset-0 para cubrir toda la pantalla
        <div 
            className="fixed inset-0 flex items-center justify-center p-4" 
            style={{ zIndex: zIndex }}
        >
            {/* Backdrop (Fondo oscuro) con efecto blur */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Contenido del Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100 animate-fade-in-down">
                <div className="text-center">
                    {/* Icono Rojo de Advertencia */}
                    <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4 shadow-sm">
                        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    
                    {/* Título */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                        {title}
                    </h3>
                    
                    {/* Mensaje Descriptivo */}
                    <div className="text-sm text-gray-500 mb-6 leading-relaxed">
                        {message}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex flex-col-reverse sm:flex-row justify-center gap-3">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose(); // Cerramos el modal automáticamente tras confirmar
                            }}
                            className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-red-600 border border-transparent text-white font-semibold rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-md transition-all"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;