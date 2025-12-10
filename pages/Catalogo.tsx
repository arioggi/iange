import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Propiedad, Propietario, Visita, User, KycData } from '../types';
import PropertyCard from '../components/catalogo/PropertyCard';
import PropertyDetailModal from '../components/catalogo/PropertyDetailModal';
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';
import KycPldForm from '../components/clientes/KycPldForm'; // <--- NUEVO IMPORT
import Modal from '../components/ui/Modal';
import { SparklesIcon, PencilIcon } from '../components/Icons';
import { initialKycState } from '../constants'; // <--- NUEVO IMPORT
import { createContact, assignBuyerToProperty } from '../Services/api'; // <--- NUEVOS IMPORTS

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
            className="fixed inset-0 z-[99999] flex justify-center items-center bg-black bg-opacity-90 backdrop-blur-sm p-2"
            onClick={onClose}
        >
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
                className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-auto max-h-[98vh] flex flex-col overflow-hidden relative"
                onClick={(e) => e.stopPropagation()} 
            >
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
    currentUser: User; // <--- AGREGADO: Necesario para saber el tenantId al crear contacto
}

const Catalogo: React.FC<CatalogoProps> = ({ propiedades, propietarios, asesores, onAddVisita, handleUpdatePropiedad, showToast, currentUser }) => {
    const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isVisitaModalOpen, setVisitaModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // Estado para el formulario de nuevo interesado (KycPldForm)
    const [nuevoInteresadoData, setNuevoInteresadoData] = useState<KycData>(initialKycState);

    const filteredAndSortedPropiedades = useMemo(() => {
        // Corrección del Paso 1 ya aplicada: No filtramos por status !== 'Vendida'
        const filtered = propiedades.filter(prop => {
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
        // Reseteamos el formulario al abrir
        setNuevoInteresadoData(initialKycState);
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

    // --- NUEVA LÓGICA DE GUARDADO DE INTERÉS ---
    const handleSaveInteresado = async (propiedadId?: number, tipoRelacion?: string) => {
        if (!selectedPropiedad || !propiedadId || !currentUser.tenantId) {
             if(!currentUser.tenantId) showToast('Error: No se identificó la empresa del usuario.', 'error');
             return;
        }

        try {
            // 1. Crear el Contacto (Comprador) en la base de datos
            const newBuyer = await createContact(nuevoInteresadoData, currentUser.tenantId, 'comprador');
            
            // 2. Vincularlo a la propiedad como "Propuesta" (o lo que haya seleccionado)
            // Nota: El form nos devuelve el tipoRelacion
            await assignBuyerToProperty(newBuyer.id, propiedadId, (tipoRelacion || 'Propuesta de compra') as any);
            
            showToast('¡Interés registrado! Cliente creado y cita agendada.', 'success');
            setVisitaModalOpen(false);
            setNuevoInteresadoData(initialKycState);
            
        } catch (error: any) {
            console.error(error);
            showToast('Error al registrar: ' + error.message, 'error');
        }
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

            {/* MODAL DE INTERÉS ACTUALIZADO */}
            {selectedPropiedad && (
                <Modal 
                    title={`Registrar Interés en ${selectedPropiedad.calle}`} 
                    isOpen={isVisitaModalOpen} 
                    onClose={() => setVisitaModalOpen(false)}
                    maxWidth="max-w-4xl" // Modal más ancho para el formulario completo
                >
                    <div className="p-1">
                        <KycPldForm 
                            formData={{
                                ...nuevoInteresadoData,
                                propiedadId: selectedPropiedad.id, // Pre-asignamos la propiedad
                                tipoRelacion: 'Propuesta de compra' // Default
                            }}
                            onFormChange={setNuevoInteresadoData}
                            onSave={handleSaveInteresado} // Conectamos a la nueva función
                            onCancel={() => setVisitaModalOpen(false)}
                            userType="Comprador"
                            propiedades={propiedades} // Pasamos la lista para que funcione el select
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Catalogo;