import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Propiedad, Propietario, Visita, User } from '../types';
import PropertyCard from '../components/catalogo/PropertyCard';
import PropertyDetailModal from '../components/catalogo/PropertyDetailModal';
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';
import Modal from '../components/ui/Modal';
import { SparklesIcon, PencilIcon } from '../components/Icons';

// ==========================================
// COMPONENTE: MODAL FULL SCREEN (LIMPIO)
// ==========================================
const ModalParaFotos: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; 
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] flex justify-center items-center bg-black bg-opacity-90 backdrop-blur-sm p-2" // p-2: Padding mínimo
            onClick={onClose}
        >
            {/* Estilos para ocultar la barra de scroll visualmente pero mantener la funcionalidad */}
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            <div 
                ref={modalRef}
                // AJUSTE: max-h-[98vh] aprovecha casi toda la altura de la pantalla
                className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-auto max-h-[98vh] flex flex-col overflow-hidden relative"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* ELIMINADO: El botón "X" flotante que estaba aquí se borró 
                   para evitar duplicados, ya que el hijo (children) trae el suyo.
                */}

                {/* Contenido con scroll invisible */}
                <div className="p-0 overflow-y-auto h-full bg-white hide-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

interface CatalogoProps {
    propiedades: Propiedad[];
    propietarios: Propietario[];
    asesores: User[];
    onAddVisita: (propiedadId: number, visitaData: Omit<Visita, 'id' | 'fecha'>) => void;
    handleUpdatePropiedad: (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const Catalogo: React.FC<CatalogoProps> = ({ propiedades, propietarios, asesores, onAddVisita, handleUpdatePropiedad, showToast }) => {
    const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isVisitaModalOpen, setVisitaModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const filteredAndSortedPropiedades = useMemo(() => {
        // CORRECCIÓN APLICADA: Eliminamos el filtro de 'availableProps' para mostrar TODO (incluidas vendidas)
        // const availableProps = propiedades.filter(p => p.status !== 'Vendida'); <-- LÍNEA ELIMINADA

        const filtered = propiedades.filter(prop => { // <-- Usamos 'propiedades' directamente
            const propietario = propietarios.find(p => p.id === prop.propietarioId);
            const searchString = `${prop.calle} ${prop.colonia} ${prop.municipio} ${propietario?.nombreCompleto || ''}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });

        return filtered.sort((a, b) => {
            const valA = parseFloat((a.valor_operacion || '0').replace(/[^0-9.-]+/g, ""));
            const valB = parseFloat((b.valor_operacion || '0').replace(/[^0-9.-]+/g, ""));
            if (sortOrder === 'desc') {
                return valB - valA;
            }
            return valA - valB;
        });

    }, [propiedades, propietarios, searchTerm, sortOrder]);

    const handleCardClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setDetailModalOpen(true);
    };

    const handleAddVisitaClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setVisitaModalOpen(true);
    };

    const handleEditClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setEditModalOpen(true);
    };

    const handleSaveEdit = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
        handleUpdatePropiedad(updatedPropiedad, updatedPropietario);
        setEditModalOpen(false);
        showToast('Propiedad actualizada con éxito.');
    };

    const handleVisitaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedPropiedad) return;

        const formData = new FormData(e.currentTarget);
        const visitaData: Omit<Visita, 'id' | 'fecha'> = {
            nombre: formData.get('nombre') as string,
            telefono: formData.get('telefono') as string,
            email: formData.get('email') as string,
            formaPago: formData.get('formaPago') as 'Contado' | 'Crédito Bancario' | 'Infonavit' | 'ISSSTE' | 'FOVISSSTE',
        };
        onAddVisita(selectedPropiedad.id, visitaData);
        setVisitaModalOpen(false);
    };

    const selectedPropietario = selectedPropiedad ? propietarios.find(p => p.id === selectedPropiedad.propietarioId) : undefined;
     
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-wrap justify-between items-center gap-4">
                <input
                    type="text"
                    placeholder="Buscar por dirección o propietario..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-auto flex-grow max-w-md px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900 placeholder-gray-500"
                />
                <div className="flex items-center space-x-2">
                    <label htmlFor="sort-order" className="text-sm font-medium text-gray-700">Ordenar por valor:</label>
                    <select
                        id="sort-order"
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
                        className="p-2 bg-gray-50 border rounded-md text-sm focus:ring-2 focus:ring-iange-orange text-gray-900"
                    >
                        <option value="desc">Mayor a Menor</option>
                        <option value="asc">Menor a Mayor</option>
                    </select>
                </div>
            </div>

            {filteredAndSortedPropiedades.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAndSortedPropiedades.map(propiedad => (
                        <div key={propiedad.id} className="relative group">
                            <div onClick={() => handleCardClick(propiedad)} className="cursor-pointer">
                                <PropertyCard
                                    propiedad={propiedad}
                                    propietario={propietarios.find(p => p.id === propiedad.propietarioId)}
                                />
                            </div>
                            <div className="absolute top-3 right-3 flex flex-col gap-2">
                                <button 
                                    onClick={() => handleAddVisitaClick(propiedad)}
                                    className="bg-white/80 backdrop-blur-sm p-2 rounded-full text-iange-orange shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-iange-orange hover:text-white"
                                    title="Registrar visita/interés"
                                >
                                    <SparklesIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => handleEditClick(propiedad)}
                                    className="bg-white/80 backdrop-blur-sm p-2 rounded-full text-indigo-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-indigo-600 hover:text-white"
                                    title="Editar Propiedad"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border-dashed border-2">
                    <h3 className="text-xl font-semibold text-gray-700">No se encontraron propiedades</h3>
                    <p className="text-gray-500 mt-2">No hay propiedades disponibles que coincidan con tu búsqueda.</p>
                </div>
            )}
             
            {selectedPropiedad && (
                <ModalParaFotos
                    isOpen={isDetailModalOpen} 
                    onClose={() => setDetailModalOpen(false)}
                >
                    <PropertyDetailModal 
                        propiedad={selectedPropiedad} 
                        propietario={selectedPropietario}
                        onClose={() => setDetailModalOpen(false)} 
                    />
                </ModalParaFotos>
            )}

            {selectedPropiedad && selectedPropietario && (
                <Modal title={`Editar ${selectedPropiedad.calle}`} isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
                    <EditPropiedadForm
                        propiedad={selectedPropiedad}
                        propietario={selectedPropietario}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditModalOpen(false)}
                        asesores={asesores}
                    />
                </Modal>
            )}

            {selectedPropiedad && (
                <Modal title={`Registrar Interés en ${selectedPropiedad.calle}`} isOpen={isVisitaModalOpen} onClose={() => setVisitaModalOpen(false)}>
                    <form onSubmit={handleVisitaSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Nombre del interesado</label>
                            <input name="nombre" required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Teléfono</label>
                            <input name="telefono" type="tel" required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <input name="email" type="email" required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                        </div>
                         <div>
                            <label className="text-sm font-medium">Forma de Pago Potencial</label>
                             <select name="formaPago" required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900">
                                 <option>Contado</option>
                                 <option>Crédito Bancario</option>
                                 <option>Infonavit</option>
                                 <option>ISSSTE</option>
                                 <option>FOVISSSTE</option>
                             </select>
                        </div>
                         <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={() => setVisitaModalOpen(false)} className="bg-gray-200 py-2 px-4 rounded-md">Cancelar</button>
                            <button type="submit" className="bg-iange-orange text-white py-2 px-4 rounded-md">Registrar Visita</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Catalogo;