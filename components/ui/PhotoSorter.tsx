import React, { useRef, useState } from 'react';

interface PhotoSorterProps {
    photos: Array<File | string>;
    onChange: (newPhotos: Array<File | string>) => void;
    onRemove: (index: number) => void;
}

const PhotoSorter: React.FC<PhotoSorterProps> = ({ photos, onChange, onRemove }) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        setIsDragging(true);
        // Datos dummy requeridos para Firefox/Chrome
        e.dataTransfer.setData('text/plain', position.toString());
        e.dataTransfer.effectAllowed = "move"; 
        
        // Opcional: Hacer transparente la imagen fantasma por defecto del navegador
        // para que se vea mejor el efecto de movimiento en la lista
        // const img = new Image();
        // img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
        // e.dataTransfer.setDragImage(img, 0, 0);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        e.preventDefault();
        dragOverItem.current = position;

        // REORDENAMIENTO EN TIEMPO REAL (FLUIDO)
        if (dragItem.current !== null && dragItem.current !== position) {
            const newPhotos = [...photos];
            const draggedPhoto = newPhotos[dragItem.current];
            
            // Eliminamos del origen
            newPhotos.splice(dragItem.current, 1);
            // Insertamos en el destino
            newPhotos.splice(position, 0, draggedPhoto);

            // Actualizamos la referencia
            dragItem.current = position;
            
            // Actualizamos el estado visual
            onChange(newPhotos);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necesario para permitir el drop
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 select-none pb-2">
            {photos.map((file, index) => {
                const imageUrl = file instanceof File ? URL.createObjectURL(file) : file;
                const isCover = index === 0;
                
                return (
                    <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        className={`
                            relative aspect-[4/3] rounded-lg overflow-hidden transition-all duration-200 group
                            cursor-grab active:cursor-grabbing bg-white border-2
                            ${isCover ? 'border-iange-orange ring-2 ring-iange-orange ring-opacity-50' : 'border-transparent hover:border-gray-300'}
                            ${isDragging && dragItem.current === index ? 'opacity-50 scale-95 grayscale' : 'opacity-100 shadow-sm'}
                        `}
                    >
                        {/* 1. Badge de Portada (ADENTRO PARA EVITAR CORTE) */}
                        {isCover && (
                            <div className="absolute top-0 left-0 bg-iange-orange text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-20 shadow-sm pointer-events-none">
                                ⭐ PORTADA
                            </div>
                        )}

                        {/* 2. Imagen */}
                        <img 
                            src={imageUrl} 
                            alt={`Foto ${index + 1}`} 
                            className="w-full h-full object-cover pointer-events-none block" 
                        />
                        
                        {/* 3. Botón Eliminar (Visible en Hover) */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-1 z-10">
                            <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(index);
                                }}
                                className="bg-white text-red-500 rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm transform scale-90 opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Eliminar foto"
                            >
                                <span className="text-lg font-bold leading-none pb-1">&times;</span>
                            </button>
                        </div>

                        {/* 4. Indicador Numérico */}
                        <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-tl-lg pointer-events-none backdrop-blur-sm z-10">
                            {index + 1}
                        </div>
                    </div>
                );
            })}
            
            {photos.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    No hay fotos seleccionadas. Sube algunas para organizarlas.
                </div>
            )}
        </div>
    );
};

export default PhotoSorter;