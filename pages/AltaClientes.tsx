import React, { useState, useEffect, useMemo } from 'react';
import { Propietario, Propiedad, Comprador, ChecklistStatus, User, KycData } from '../types';
import Modal from '../components/ui/Modal';
import AddPropiedadPropietarioForm from '../components/clientes/AddPropiedadPropietarioForm';
import PropiedadesTable from '../components/clientes/PropiedadesTable';
import CompradoresTable from '../components/clientes/CompradoresTable'; 
import KycPldForm from '../components/clientes/KycPldForm';
import { initialKycState } from '../constants'; 
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';
import { FLUJO_PROGRESO } from '../constants';
import { 
    createContact, 
    createProperty, 
    uploadPropertyImage, 
    compressImage,
    deleteContact,
    updateContact,
    assignBuyerToProperty,    
    unassignBuyerFromProperty 
} from '../Services/api';

const TABS = ['Propiedades y Propietarios', 'Clientes'];

const totalChecklistItems = FLUJO_PROGRESO.reduce((acc, etapa) => acc + etapa.items.length, 0);

const calculateProgress = (checklist: ChecklistStatus): number => {
    if (totalChecklistItems === 0) return 0;
    const checkedCount = Object.values(checklist).filter(value => value === true).length;
    return Math.round((checkedCount / totalChecklistItems) * 100);
};

interface AltaClientesProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
    propiedades: Propiedad[];
    setPropiedades: React.Dispatch<React.SetStateAction<Propiedad[]>>;
    propietarios: Propietario[];
    setPropietarios: React.Dispatch<React.SetStateAction<Propietario[]>>;
    compradores: Comprador[];
    setCompradores: React.Dispatch<React.SetStateAction<Comprador[]>>;
    handleUpdatePropiedad: (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => void;
    handleDeletePropiedad: (propiedad: Propiedad) => void;
    initialEditPropId: number | null;
    setInitialEditPropId: (id: number | null) => void;
    asesores: User[];
    currentUser: User;
    onDataChange?: () => void;
}

const AltaClientes: React.FC<AltaClientesProps> = ({ 
    showToast, 
    propiedades, 
    propietarios, 
    compradores, 
    handleUpdatePropiedad,
    handleDeletePropiedad, 
    initialEditPropId,
    setInitialEditPropId,
    asesores,
    currentUser,
    onDataChange, 
}) => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    
    // Modales
    const [isAddPropiedadModalOpen, setAddPropiedadModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    
    const [isAddCompradorModalOpen, setAddCompradorModalOpen] = useState(false);
    const [isEditCompradorModalOpen, setEditCompradorModalOpen] = useState(false);
    const [isDeleteCompradorModalOpen, setDeleteCompradorModalOpen] = useState(false);

    // Selección
    const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);
    const [selectedComprador, setSelectedComprador] = useState<Comprador | null>(null);
    const [propiedadToDelete, setPropiedadToDelete] = useState<Propiedad | null>(null);
    const [compradorToDelete, setCompradorToDelete] = useState<Comprador | null>(null);

    // Datos
    const [nuevoCompradorData, setNuevoCompradorData] = useState<KycData>(initialKycState);
    const [editingCompradorData, setEditingCompradorData] = useState<KycData>(initialKycState);
    
    const [searchTerm, setSearchTerm] = useState('');
    // Estado separado para búsqueda de clientes para no mezclar
    const [clientSearchTerm, setClientSearchTerm] = useState(''); 
    const [isProcessing, setIsProcessing] = useState(false);

    const filteredPropiedades = useMemo(() => {
        if (!searchTerm) {
            return propiedades;
        }
        return propiedades.filter(prop => {
            const propietario = propietarios.find(p => p.id === prop.propietarioId);
            const searchString = `${prop.calle} ${prop.colonia} ${prop.municipio} ${propietario?.nombreCompleto || ''}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });
    }, [searchTerm, propiedades, propietarios]);

    // Filtrado de clientes
    const filteredCompradores = useMemo(() => {
        if (!clientSearchTerm) return compradores;
        return compradores.filter(c => 
            c.nombreCompleto.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
        );
    }, [clientSearchTerm, compradores]);

    // --- PROPIEDADES LOGIC ---
    const handleAddPropiedadPropietario = async (nuevaPropiedad: any, nuevoPropietario: any) => {
        if (!currentUser.tenantId) {
            showToast('Error: No se identificó la empresa.', 'error');
            return;
        }

        setIsProcessing(true);
        showToast('Procesando imágenes y guardando...', 'success');

        try {
            const ownerDb = await createContact(nuevoPropietario, currentUser.tenantId, 'propietario');
            const uploadedImageUrls: string[] = [];
            
            if (nuevaPropiedad.fotos && nuevaPropiedad.fotos.length > 0) {
                for (const file of nuevaPropiedad.fotos) {
                    try {
                        const compressedFile = await compressImage(file);
                        const publicUrl = await uploadPropertyImage(compressedFile);
                        uploadedImageUrls.push(publicUrl);
                    } catch (imgError) {
                        console.error("Error con imagen:", imgError);
                    }
                }
            }

            await createProperty({
                ...nuevaPropiedad,
                imageUrls: uploadedImageUrls
            }, currentUser.tenantId, ownerDb.id);

            if (onDataChange) onDataChange();
            
            showToast('¡Propiedad registrada exitosamente!');
            setAddPropiedadModalOpen(false);

        } catch (error: any) {
            console.error("Error al guardar:", error);
            showToast('Error al guardar: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setEditModalOpen(true);
    };

    const localHandleUpdate = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
        handleUpdatePropiedad(updatedPropiedad, updatedPropietario);
        if (onDataChange) onDataChange();
        setEditModalOpen(false);
        setSelectedPropiedad(null);
    };

    const handleDeleteClick = (propiedad: Propiedad) => {
        setPropiedadToDelete(propiedad);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (propiedadToDelete) {
            try {
                await deleteContact(propiedadToDelete.propietarioId);
                showToast('Propiedad y Propietario eliminados.', 'success');
                if (onDataChange) onDataChange();
            } catch (error: any) {
                console.error(error);
                showToast('Error al eliminar: ' + error.message, 'error');
            } finally {
                setDeleteModalOpen(false);
                setPropiedadToDelete(null);
            }
        }
    };

    // --- COMPRADORES LOGIC (CLIENTES) ---

    // AGREGADO: Recibe propiedadId Y tipoRelacion
    const handleAddComprador = async (propiedadId?: number, tipoRelacion?: string) => {
        if (!currentUser.tenantId) return;
        
        setIsProcessing(true);
        try {
            // 1. Crear el Contacto
            const newBuyer = await createContact(nuevoCompradorData, currentUser.tenantId, 'comprador');
            
            // 2. Si se seleccionó propiedad, vincularla con el tipo de relación
            if (propiedadId && tipoRelacion) {
                 await assignBuyerToProperty(newBuyer.id, propiedadId, tipoRelacion as any);
            }

            if (onDataChange) onDataChange();
            showToast('Cliente comprador añadido y vinculado con éxito');
            setAddCompradorModalOpen(false);
        } catch (error: any) {
            showToast('Error al guardar comprador: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const openCompradorModal = () => {
        setNuevoCompradorData(initialKycState); 
        setAddCompradorModalOpen(true);
    };

    const handleEditCompradorClick = (comprador: Comprador) => {
        setSelectedComprador(comprador);
        setEditingCompradorData(comprador); 
        setEditCompradorModalOpen(true);
    };

    // AGREGADO: Lógica de actualización con tipoRelacion
    const handleUpdateComprador = async (propiedadId?: number, tipoRelacion?: string) => {
        if (!selectedComprador) return;
        setIsProcessing(true);
        try {
            // 1. Actualizar Datos del Contacto
            await updateContact(selectedComprador.id, editingCompradorData);
            
            // 2. Gestionar Vinculación
            if (propiedadId) {
                // Siempre actualizamos si hay propiedad seleccionada para guardar el nuevo estatus o relación
                // (incluso si es la misma propiedad, el tipo de relación pudo cambiar)
                await assignBuyerToProperty(selectedComprador.id, propiedadId, tipoRelacion as any);
            } else {
                 // Si seleccionó "No vincular" (undefined/null) pero ANTES tenía una, la liberamos
                 if (selectedComprador.propiedadId) {
                     await unassignBuyerFromProperty(selectedComprador.id, selectedComprador.propiedadId);
                 }
            }

            if (onDataChange) onDataChange();
            showToast('Cliente actualizado con éxito');
            setEditCompradorModalOpen(false);
            setSelectedComprador(null);
        } catch (error: any) {
             showToast('Error al actualizar: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCompradorClick = (comprador: Comprador) => {
        setCompradorToDelete(comprador);
        setDeleteCompradorModalOpen(true);
    };

    const handleConfirmDeleteComprador = async () => {
        if (compradorToDelete) {
            try {
                // Primero desvinculamos la propiedad si tiene una para liberarla
                if (compradorToDelete.propiedadId) {
                    await unassignBuyerFromProperty(compradorToDelete.id, compradorToDelete.propiedadId);
                }

                await deleteContact(compradorToDelete.id);
                showToast('Cliente eliminado.', 'success');
                if (onDataChange) onDataChange();
            } catch (error: any) {
                 showToast('Error al eliminar: ' + error.message, 'error');
            } finally {
                setDeleteCompradorModalOpen(false);
                setCompradorToDelete(null);
            }
        }
    };

    useEffect(() => {
        if (initialEditPropId) {
            const propiedadToEdit = propiedades.find(p => p.id === initialEditPropId);
            if (propiedadToEdit) {
                handleEditClick(propiedadToEdit);
            }
            setInitialEditPropId(null);
        }
    }, [initialEditPropId, propiedades, setInitialEditPropId]);

    const renderContent = () => {
        switch (activeTab) {
            case 'Propiedades y Propietarios':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                             <div className="relative flex-grow mr-4">
                                <input
                                    type="text"
                                    placeholder="Buscar por dirección, propietario..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full max-w-md px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900 placeholder-gray-500"
                                />
                            </div>
                            <button onClick={() => setAddPropiedadModalOpen(true)} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 flex-shrink-0">
                                Añadir Propiedad
                            </button>
                        </div>
                        <PropiedadesTable propiedades={filteredPropiedades} propietarios={propietarios} onEdit={handleEditClick} onDelete={handleDeleteClick}/>
                    </div>
                );
            case 'Clientes':
                 return (
                    <div>
                        {/* DISEÑO IDÉNTICO AL TAB ANTERIOR (Barra de búsqueda + Botón) */}
                        <div className="flex justify-between items-center mb-4">
                             <div className="relative flex-grow mr-4">
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={clientSearchTerm}
                                    onChange={e => setClientSearchTerm(e.target.value)}
                                    className="w-full max-w-md px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900 placeholder-gray-500"
                                />
                            </div>
                            <button onClick={openCompradorModal} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 flex-shrink-0">
                                Añadir Comprador
                            </button>
                        </div>
                        <CompradoresTable 
                            compradores={filteredCompradores} 
                            onEdit={handleEditCompradorClick} 
                            onDelete={handleDeleteCompradorClick} 
                            propiedades={propiedades}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    const selectedPropietario = selectedPropiedad ? propietarios.find(p => p.id === selectedPropiedad.propietarioId) : null;

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-iange-dark mb-6">Alta de Clientes</h2>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${
                                activeTab === tab
                                    ? 'border-iange-orange text-iange-orange'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div>
                {renderContent()}
            </div>
            
            {/* Modal Alta Propiedad */}
            <Modal title="Añadir Nueva Propiedad y Propietario" isOpen={isAddPropiedadModalOpen} onClose={() => !isProcessing && setAddPropiedadModalOpen(false)}>
                {isProcessing ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iange-orange mx-auto mb-4"></div>
                        <p className="text-lg font-semibold text-gray-700">Subiendo fotos y guardando...</p>
                        <p className="text-sm text-gray-500">Esto puede tardar unos segundos dependiendo de tu conexión.</p>
                    </div>
                ) : (
                    <AddPropiedadPropietarioForm onSave={handleAddPropiedadPropietario} onCancel={() => setAddPropiedadModalOpen(false)} asesores={asesores} />
                )}
            </Modal>

             {/* Modal Alta Comprador */}
             <Modal 
                title="Añadir Nuevo Cliente Comprador" 
                isOpen={isAddCompradorModalOpen} 
                onClose={() => !isProcessing && setAddCompradorModalOpen(false)}
                maxWidth="max-w-4xl"
            >
                {isProcessing ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iange-orange mx-auto mb-4"></div>
                        <p>Guardando cliente...</p>
                    </div>
                ) : (
                    <KycPldForm 
                        formData={nuevoCompradorData}
                        onFormChange={setNuevoCompradorData}
                        onSave={handleAddComprador}
                        onCancel={() => setAddCompradorModalOpen(false)} 
                        userType="Comprador"
                        propiedades={propiedades}
                    />
                )}
            </Modal>
            
            {/* Modal Editar Comprador */}
            {selectedComprador && (
                 <Modal 
                    title="Editar Cliente Comprador" 
                    isOpen={isEditCompradorModalOpen} 
                    onClose={() => setEditCompradorModalOpen(false)}
                    maxWidth="max-w-4xl"
                >
                    <KycPldForm 
                        formData={editingCompradorData}
                        onFormChange={setEditingCompradorData}
                        onSave={handleUpdateComprador} 
                        onCancel={() => setEditCompradorModalOpen(false)} 
                        userType="Comprador"
                        propiedades={propiedades} 
                    />
                </Modal>
            )}

            {/* Modal Editar Propiedad */}
            {selectedPropiedad && selectedPropietario && (
                <Modal title="Editar Propiedad y Propietario" isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
                    <EditPropiedadForm
                        propiedad={selectedPropiedad}
                        propietario={selectedPropietario}
                        onSave={localHandleUpdate}
                        onCancel={() => setEditModalOpen(false)}
                        asesores={asesores}
                    />
                </Modal>
            )}
            
            {/* Modal Eliminar Propiedad */}
            {propiedadToDelete && (
                 <Modal title="Confirmar Eliminación" isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                    <div className="text-center">
                        <p className="text-lg text-gray-700">
                           ¿Estás seguro de que quieres borrar la propiedad?
                        </p>
                        <p className="text-sm text-gray-500 mt-2">Esta acción también eliminará al propietario asociado.</p>
                        <div className="mt-6 flex justify-center space-x-4">
                            <button 
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmDelete}
                                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Borrar Propiedad
                            </button>
                        </div>
                    </div>
                 </Modal>
            )}

             {/* Modal Eliminar Comprador */}
             {compradorToDelete && (
                 <Modal title="Confirmar Eliminación" isOpen={isDeleteCompradorModalOpen} onClose={() => setDeleteCompradorModalOpen(false)}>
                    <div className="text-center">
                        <p className="text-lg text-gray-700">
                           ¿Estás seguro de que quieres borrar al cliente <span className="font-bold">{compradorToDelete.nombreCompleto}</span>?
                        </p>
                        <div className="mt-6 flex justify-center space-x-4">
                            <button 
                                onClick={() => setDeleteCompradorModalOpen(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmDeleteComprador}
                                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Borrar Cliente
                            </button>
                        </div>
                    </div>
                 </Modal>
            )}
        </div>
    );
};

export default AltaClientes;