import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Propiedad, Propietario, Visita, User, KycData, OfferData, Comprador } from '../types'; 
import PropertyCard from '../components/catalogo/PropertyCard';
import PropertyDetailModal from '../components/catalogo/PropertyDetailModal';
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';
import KycPldForm from '../components/clientes/KycPldForm';
import OfferForm from '../components/clientes/OfferForm';
import Modal from '../components/ui/Modal';
import { SparklesIcon, PencilIcon } from '../components/Icons';
import { initialKycState, initialOfferState } from '../constants';
import { createContact, assignBuyerToProperty } from '../Services/api';

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
    currentUser: User;
    compradores: Comprador[]; // <--- LISTA DE COMPRADORES REQUERIDA
    onDataChange: () => void; // <--- FUNCIÓN PARA REFRESCAR DATOS
}

const Catalogo: React.FC<CatalogoProps> = ({ 
    propiedades, 
    propietarios, 
    asesores, 
    onAddVisita, 
    handleUpdatePropiedad, 
    showToast, 
    currentUser, 
    compradores,
    onDataChange // Desestructuramos la función aquí
}) => {
    const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isVisitaModalOpen, setVisitaModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    
    // --- ESTADOS PARA OFERTA ---
    const [isOfferModalOpen, setOfferModalOpen] = useState(false);
    const [currentOfferData, setCurrentOfferData] = useState<OfferData>(initialOfferState);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // Estado para el formulario de nuevo interesado (KycPldForm)
    const [nuevoInteresadoData, setNuevoInteresadoData] = useState<KycData>(initialKycState);
    
    // --- NUEVO ESTADO: CONTROL DE EDICIÓN ---
    const [editingBuyerId, setEditingBuyerId] = useState<number | null>(null);

    // --- SINCRONIZACIÓN EN VIVO (LIVE UPDATE) ---
    useEffect(() => {
        if (selectedPropiedad) {
            const propiedadActualizada = propiedades.find(p => p.id === selectedPropiedad.id);
            if (propiedadActualizada) {
                setSelectedPropiedad(propiedadActualizada);
            }
        }
    }, [propiedades]);

    // --- CÁLCULO DE OFERTAS POR PROPIEDAD (Soporte Multi-Interés) ---
    const offersMap = useMemo(() => {
        const map: Record<number, number> = {};
        
        compradores.forEach(c => {
            if (c.intereses && Array.isArray(c.intereses)) {
                c.intereses.forEach((interes: any) => {
                    if (interes.propiedadId && interes.ofertaFormal) {
                        map[interes.propiedadId] = (map[interes.propiedadId] || 0) + 1;
                    }
                });
            } 
            else if (c.propiedadId && c.ofertaFormal) {
                map[c.propiedadId] = (map[c.propiedadId] || 0) + 1;
            }
        });
        
        return map;
    }, [compradores]);

    const filteredAndSortedPropiedades = useMemo(() => {
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
        setNuevoInteresadoData(initialKycState);
        setVisitaModalOpen(true);
    };

    const handleEditClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setEditModalOpen(true);
    };

    const handleOfferClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setCurrentOfferData(initialOfferState); 
        setEditingBuyerId(null);
        setOfferModalOpen(true);
    };

    const handleEditOffer = (offerData: OfferData, buyerId: number) => {
        if (!selectedPropiedad) return;
        setCurrentOfferData(offerData); 
        setEditingBuyerId(buyerId);     
        setOfferModalOpen(true);        
    };

    // --- AQUÍ ESTABA EL PROBLEMA: FALTABA onDataChange() ---
    const handleDeleteOffer = async (buyerId: number) => {
        if (!selectedPropiedad) return;
        try {
            const { deleteOffer } = await import('../Services/api'); 
            
            // 1. Borramos en DB
            await deleteOffer(buyerId, selectedPropiedad.id);
            
            // 2. ¡IMPORTANTE! Refrescamos los datos locales
            await onDataChange(); 
            
            showToast('Oferta eliminada correctamente.', 'success');
        } catch (e: any) {
            console.error(e);
            showToast('Error al eliminar oferta: ' + e.message, 'error');
        }
    };

    const handleSaveEdit = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
        handleUpdatePropiedad(updatedPropiedad, updatedPropietario);
        setEditModalOpen(false);
        showToast('Propiedad actualizada con éxito.');
    };

    const handleSaveInteresado = async (propiedadId?: number, tipoRelacion?: string) => {
        if (!selectedPropiedad || !propiedadId || !currentUser.tenantId) {
             if(!currentUser.tenantId) showToast('Error: No se identificó la empresa del usuario.', 'error');
             return;
        }

        try {
            const newBuyer = await createContact(nuevoInteresadoData, currentUser.tenantId, 'comprador');
            await assignBuyerToProperty(newBuyer.id, propiedadId, (tipoRelacion || 'Propuesta de compra') as any);
            
            // Refrescamos datos
            await onDataChange();

            showToast('¡Interés registrado! Cliente creado y cita agendada.', 'success');
            setVisitaModalOpen(false);
            setNuevoInteresadoData(initialKycState);
            
        } catch (error: any) {
            console.error(error);
            showToast('Error al registrar: ' + error.message, 'error');
        }
    };

    const handleSaveOffer = async () => {
        if (!selectedPropiedad || !currentUser.tenantId) return;
        
        const targetBuyerId = editingBuyerId ? String(editingBuyerId) : currentOfferData.compradorId;

        if (!targetBuyerId) {
            showToast('Error: Debes seleccionar un cliente comprador.', 'error');
            return;
        }

        try {
            const compradorIdNum = parseInt(targetBuyerId);

            await assignBuyerToProperty(
                compradorIdNum, 
                selectedPropiedad.id, 
                'Propuesta de compra', 
                currentOfferData       
            );

            // Refrescamos datos
            await onDataChange();

            showToast(editingBuyerId ? '✅ Oferta actualizada correctamente.' : '✅ Propuesta de compra registrada.', 'success');
            setOfferModalOpen(false);
            setEditingBuyerId(null); 

        } catch (error: any) {
            console.error(error);
            showToast('Error al guardar la oferta: ' + error.message, 'error');
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
                                    onVisitaClick={() => handleAddVisitaClick(propiedad)}
                                    onEditClick={() => handleEditClick(propiedad)}
                                    onOfferClick={() => handleOfferClick(propiedad)} 
                                    
                                    // --- PASAMOS EL CONTEO DE OFERTAS ---
                                    offerCount={offersMap[propiedad.id] || 0}
                                />
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
                        compradores={compradores} 
                        onEditOffer={handleEditOffer}
                        onDeleteOffer={handleDeleteOffer}
                    />
                </ModalParaFotos>
            )}

            {/* --- MODAL EDITAR PROPIEDAD --- */}
            {selectedPropiedad && selectedPropietario && (
                <Modal 
                    title={`Editar ${selectedPropiedad.calle}`} 
                    isOpen={isEditModalOpen} 
                    onClose={() => setEditModalOpen(false)}
                    zIndex={60} 
                >
                    <EditPropiedadForm
                        propiedad={selectedPropiedad}
                        propietario={selectedPropietario}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditModalOpen(false)}
                        asesores={asesores}
                    />
                </Modal>
            )}

            {/* --- MODAL DE INTERÉS (KYC) --- */}
            {selectedPropiedad && (
                <Modal 
                    title={`Registrar Interés en ${selectedPropiedad.calle}`} 
                    isOpen={isVisitaModalOpen} 
                    onClose={() => setVisitaModalOpen(false)}
                    maxWidth="max-w-4xl"
                    zIndex={60}
                >
                    <div className="p-1">
                        <KycPldForm 
                            formData={{
                                ...nuevoInteresadoData,
                                propiedadId: selectedPropiedad.id, 
                                tipoRelacion: 'Propuesta de compra' 
                            }}
                            onFormChange={setNuevoInteresadoData}
                            onSave={handleSaveInteresado} 
                            onCancel={() => setVisitaModalOpen(false)}
                            userType="Comprador"
                            propiedades={propiedades}
                        />
                    </div>
                </Modal>
            )}

            {/* --- MODAL PARA REGISTRAR/EDITAR OFERTA --- */}
            {selectedPropiedad && isOfferModalOpen && (
                <div className="fixed inset-0 z-[100000] flex justify-center items-center">
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
                        onClick={() => {
                            setOfferModalOpen(false);
                            setEditingBuyerId(null);
                        }}
                    ></div>
                    
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0 z-10 animate-fade-in-down">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-20">
                             <h3 className="text-lg font-bold text-gray-800">
                                {editingBuyerId ? 'Editar Propuesta de Compra' : 'Registrar Propuesta de Compra'}
                             </h3>
                             <button 
                                onClick={() => {
                                    setOfferModalOpen(false);
                                    setEditingBuyerId(null);
                                }} 
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                             >
                                 &times;
                             </button>
                        </div>
                        <div className="p-6">
                            <OfferForm
                                propiedad={selectedPropiedad}
                                formData={currentOfferData}
                                onFormChange={setCurrentOfferData}
                                onSave={handleSaveOffer}
                                onCancel={() => {
                                    setOfferModalOpen(false);
                                    setEditingBuyerId(null);
                                }}
                                compradores={compradores}
                                initialBuyerId={editingBuyerId}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Catalogo;