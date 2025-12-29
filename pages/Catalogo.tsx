import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Propiedad, Propietario, Visita, User, KycData, OfferData, Comprador } from '../types'; 
import PropertyCard from '../components/catalogo/PropertyCard';
import PropertyDetailModal from '../components/catalogo/PropertyDetailModal';
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';
import KycPldForm from '../components/clientes/KycPldForm';
import OfferForm from '../components/clientes/OfferForm';
import Modal from '../components/ui/Modal';
import { ShareIcon } from '../components/Icons'; // Quitamos PlusIcon, ya no se usa
import { initialKycState, initialOfferState } from '../constants';
import { createContact, assignBuyerToProperty } from '../Services/api';

// ==========================================
// COMPONENTE: MODAL FULL SCREEN
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
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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
    compradores: Comprador[]; 
    onDataChange: () => void; 
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
    onDataChange 
}) => {
    const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isVisitaModalOpen, setVisitaModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    
    // Estados Oferta
    const [isOfferModalOpen, setOfferModalOpen] = useState(false);
    const [currentOfferData, setCurrentOfferData] = useState<OfferData>(initialOfferState);

    // Filtros
    const [filterStatus, setFilterStatus] = useState<'todos' | 'venta' | 'renta'>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const [nuevoInteresadoData, setNuevoInteresadoData] = useState<KycData>(initialKycState);
    const [editingBuyerId, setEditingBuyerId] = useState<number | null>(null);

    // Sincronización en vivo
    useEffect(() => {
        if (selectedPropiedad) {
            const propiedadActualizada = propiedades.find(p => p.id === selectedPropiedad.id);
            if (propiedadActualizada) setSelectedPropiedad(propiedadActualizada);
        }
    }, [propiedades]);

    // Cálculo de ofertas
    const offersMap = useMemo(() => {
        const map: Record<number, number> = {};
        compradores.forEach(c => {
            if (c.intereses && Array.isArray(c.intereses)) {
                c.intereses.forEach((interes: any) => {
                    if (interes.propiedadId && interes.ofertaFormal) map[interes.propiedadId] = (map[interes.propiedadId] || 0) + 1;
                });
            } else if (c.propiedadId && c.ofertaFormal) {
                map[c.propiedadId] = (map[c.propiedadId] || 0) + 1;
            }
        });
        return map;
    }, [compradores]);

    // Filtrado
    const filteredAndSortedPropiedades = useMemo(() => {
        const filtered = propiedades.filter(prop => {
            const propietario = propietarios.find(p => p.id === prop.propietarioId);
            const searchString = `${prop.calle} ${prop.colonia} ${prop.municipio} ${propietario?.nombreCompleto || ''}`.toLowerCase();
            const matchesSearch = searchString.includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'todos' ? true : prop.tipoOperacion?.toLowerCase() === filterStatus;
            return matchesSearch && matchesStatus;
        });

        return filtered.sort((a, b) => {
            const valA = parseFloat((a.valor_operacion || '0').replace(/[^0-9.-]+/g, ""));
            const valB = parseFloat((b.valor_operacion || '0').replace(/[^0-9.-]+/g, ""));
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        });
    }, [propiedades, propietarios, searchTerm, sortOrder, filterStatus]);

    // --- ACCIONES ---

    // 1. Compartir Propiedad Individual
    const handleShareProperty = (propiedad: Propiedad) => {
        const publicUrl = `${window.location.origin}/p/${propiedad.id}`;
        navigator.clipboard.writeText(publicUrl).then(() => {
            showToast(`Enlace de propiedad copiado 📋`, 'success');
        }).catch(() => showToast('Error al copiar', 'error'));
    };

    // 2. Compartir Catálogo Completo (NUEVO)
    const handleShareCatalog = () => {
        if (!currentUser.tenantId) {
            showToast('No se identificó la empresa.', 'error');
            return;
        }
        // Usaremos la ruta /c/ (Catalog) + ID de la empresa
        const catalogUrl = `${window.location.origin}/c/${currentUser.tenantId}`;
        navigator.clipboard.writeText(catalogUrl).then(() => {
            showToast(`Enlace del catálogo copiado al portapapeles 📋`, 'success');
        }).catch(() => showToast('Error al copiar', 'error'));
    };

    const handlePreview = (id: number) => window.open(`/p/${id}`, '_blank');
    
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

    const handleDeleteOffer = async (buyerId: number) => {
        if (!selectedPropiedad) return;
        try {
            const { deleteOffer } = await import('../Services/api'); 
            await deleteOffer(buyerId, selectedPropiedad.id);
            await onDataChange(); 
            showToast('Oferta eliminada correctamente.', 'success');
        } catch (e: any) {
            console.error(e);
            showToast('Error: ' + e.message, 'error');
        }
    };

    const handleSaveEdit = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
        handleUpdatePropiedad(updatedPropiedad, updatedPropietario);
        setEditModalOpen(false);
        showToast('Propiedad guardada con éxito.', 'success');
    };

    const handleSaveInteresado = async (propiedadId?: number, tipoRelacion?: string) => {
        if (!selectedPropiedad || !propiedadId || !currentUser.tenantId) {
             if(!currentUser.tenantId) showToast('Error de empresa.', 'error');
             return;
        }
        try {
            const newBuyer = await createContact(nuevoInteresadoData, currentUser.tenantId, 'comprador');
            await assignBuyerToProperty(newBuyer.id, propiedadId, (tipoRelacion || 'Propuesta de compra') as any);
            await onDataChange();
            showToast('¡Interés registrado!', 'success');
            setVisitaModalOpen(false);
            setNuevoInteresadoData(initialKycState);
        } catch (error: any) {
            showToast('Error: ' + error.message, 'error');
        }
    };

    const handleSaveOffer = async () => {
        if (!selectedPropiedad || !currentUser.tenantId) return;
        const targetBuyerId = editingBuyerId ? String(editingBuyerId) : currentOfferData.compradorId;
        if (!targetBuyerId) {
            showToast('Selecciona un cliente.', 'error');
            return;
        }
        try {
            await assignBuyerToProperty(parseInt(targetBuyerId), selectedPropiedad.id, 'Propuesta de compra', currentOfferData);
            await onDataChange();
            showToast('Propuesta registrada.', 'success');
            setOfferModalOpen(false);
            setEditingBuyerId(null); 
        } catch (error: any) {
            showToast('Error: ' + error.message, 'error');
        }
    };

    const selectedPropietario = selectedPropiedad ? propietarios.find(p => p.id === selectedPropiedad.propietarioId) : undefined;
     
    return (
        <div className="space-y-6">
            
            {/* --- HEADER: Título y Botón Compartir Catálogo --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Catálogo de Propiedades</h1>
                  <p className="text-gray-500 text-sm mt-1">Comparte y administra tu inventario público.</p>
                </div>
                
                {/* BOTÓN NUEVO: Compartir Catálogo */}
                <button 
                  onClick={handleShareCatalog}
                  className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
                >
                  <ShareIcon className="h-5 w-5" />
                  Compartir Catálogo
                </button>
            </div>

            {/* --- BARRA DE FILTROS --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                   <button onClick={() => setFilterStatus('todos')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === 'todos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Todas</button>
                   <button onClick={() => setFilterStatus('venta')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === 'venta' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-gray-200'}`}>Venta</button>
                   <button onClick={() => setFilterStatus('renta')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === 'renta' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border border-gray-200'}`}>Renta</button>
                </div>

                <div className="flex items-center space-x-2">
                    <select
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
                        className="p-2 bg-gray-50 border rounded-md text-sm focus:ring-2 focus:ring-iange-orange text-gray-900"
                    >
                        <option value="desc">Mayor Precio</option>
                        <option value="asc">Menor Precio</option>
                    </select>
                </div>
            </div>

            {/* --- GRID --- */}
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
                                    onShareClick={() => handleShareProperty(propiedad)}
                                    onPreviewClick={() => handlePreview(propiedad.id)}
                                    offerCount={offersMap[propiedad.id] || 0}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border-dashed border-2">
                    <h3 className="text-xl font-semibold text-gray-700">No se encontraron propiedades</h3>
                </div>
            )}
             
            {/* --- MODALES --- */}
            {selectedPropiedad && (
                <ModalParaFotos isOpen={isDetailModalOpen} onClose={() => setDetailModalOpen(false)}>
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

            {(selectedPropiedad || isEditModalOpen) && (
                <Modal 
                    title={`Editar ${selectedPropiedad?.calle || 'Propiedad'}`} 
                    isOpen={isEditModalOpen} 
                    onClose={() => setEditModalOpen(false)}
                    zIndex={60} 
                >
                    <EditPropiedadForm
                        propiedad={selectedPropiedad || undefined}
                        propietario={selectedPropietario}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditModalOpen(false)}
                        asesores={asesores}
                    />
                </Modal>
            )}

            {selectedPropiedad && (
                <Modal 
                    title={`Registrar Interés`} 
                    isOpen={isVisitaModalOpen} 
                    onClose={() => setVisitaModalOpen(false)}
                    maxWidth="max-w-4xl"
                    zIndex={60}
                >
                    <div className="p-1">
                        <KycPldForm 
                            formData={{ ...nuevoInteresadoData, propiedadId: selectedPropiedad.id, tipoRelacion: 'Propuesta de compra' }}
                            onFormChange={setNuevoInteresadoData}
                            onSave={handleSaveInteresado} 
                            onCancel={() => setVisitaModalOpen(false)}
                            userType="Comprador"
                            propiedades={propiedades}
                        />
                    </div>
                </Modal>
            )}

            {selectedPropiedad && isOfferModalOpen && (
                <div className="fixed inset-0 z-[100000] flex justify-center items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { setOfferModalOpen(false); setEditingBuyerId(null); }}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0 z-10 animate-fade-in-down">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-20">
                             <h3 className="text-lg font-bold text-gray-800">{editingBuyerId ? 'Editar Propuesta' : 'Nueva Propuesta'}</h3>
                             <button onClick={() => { setOfferModalOpen(false); setEditingBuyerId(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6">
                            <OfferForm
                                propiedad={selectedPropiedad}
                                formData={currentOfferData}
                                onFormChange={setCurrentOfferData}
                                onSave={handleSaveOffer}
                                onCancel={() => { setOfferModalOpen(false); setEditingBuyerId(null); }}
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