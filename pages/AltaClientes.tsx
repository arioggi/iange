import React, { useState, useEffect, useMemo } from 'react';
import { Propietario, Propiedad, Comprador, ChecklistStatus, User, KycData } from '../types';
import Modal from '../components/ui/Modal';
import AddPropiedadPropietarioForm from '../components/clientes/AddPropiedadPropietarioForm';
import PropiedadesTable from '../components/clientes/PropiedadesTable';
import KycPldForm from '../components/clientes/KycPldForm';
import { initialKycState } from '../constants'; 
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';
import { FLUJO_PROGRESO } from '../constants';
import { 
    createContact, 
    createProperty, 
    uploadPropertyImage, 
    compressImage,
    deleteContact // <--- AHORA SÍ FUNCIONARÁ PORQUE YA EXISTE EN API.TS
} from '../Services/api';

const TABS = ['Propiedades y Propietarios', 'Compradores'];

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
    const [isAddPropiedadModalOpen, setAddPropiedadModalOpen] = useState(false);
    const [isAddCompradorModalOpen, setAddCompradorModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);
    const [nuevoCompradorData, setNuevoCompradorData] = useState<KycData>(initialKycState);
    const [propiedadToDelete, setPropiedadToDelete] = useState<Propiedad | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estado para indicar que estamos subiendo/guardando
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

    // --- FUNCIÓN PRINCIPAL DE GUARDADO (CON COMPRESIÓN Y SUBIDA) ---
    const handleAddPropiedadPropietario = async (nuevaPropiedad: any, nuevoPropietario: any) => {
        if (!currentUser.tenantId) {
            showToast('Error: No se identificó la empresa.', 'error');
            return;
        }

        setIsProcessing(true); // Bloquear botón para evitar doble clic
        showToast('Procesando imágenes y guardando...', 'success');

        try {
            // 1. Guardar al Propietario en Supabase
            const ownerDb = await createContact(nuevoPropietario, currentUser.tenantId, 'propietario');
            console.log("Propietario creado:", ownerDb);

            // 2. Procesar y Subir Imágenes
            const uploadedImageUrls: string[] = [];
            
            if (nuevaPropiedad.fotos && nuevaPropiedad.fotos.length > 0) {
                // Procesamos secuencialmente o en paralelo
                for (const file of nuevaPropiedad.fotos) {
                    try {
                        // A. Compresión (Tipo WhatsApp)
                        const compressedFile = await compressImage(file);
                        // B. Subida a Storage
                        const publicUrl = await uploadPropertyImage(compressedFile);
                        uploadedImageUrls.push(publicUrl);
                    } catch (imgError) {
                        console.error("Error con imagen:", imgError);
                        // Continuamos con las siguientes imágenes aunque una falle
                    }
                }
            }

            // 3. Guardar la Propiedad con las URLs y el ID del propietario
            const propertyDb = await createProperty({
                ...nuevaPropiedad,
                imageUrls: uploadedImageUrls // Pasamos las URLs de la nube
            }, currentUser.tenantId, ownerDb.id);

            console.log("Propiedad creada:", propertyDb);

            // 4. Actualizar la vista
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

    const handleAddComprador = async (propiedadId?: number) => {
        if (!currentUser.tenantId) return;
        
        setIsProcessing(true);
        try {
            // 1. Guardar Comprador
            const compradorDb = await createContact(nuevoCompradorData, currentUser.tenantId, 'comprador');
            
            if (onDataChange) onDataChange();
            showToast('Comprador añadido con éxito');
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

    const handleEditClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setEditModalOpen(true);
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
    
    const handleDeleteClick = (propiedad: Propiedad) => {
        setPropiedadToDelete(propiedad);
        setDeleteModalOpen(true);
    };

    // --- CORRECCIÓN CRÍTICA: BORRADO REAL ---
    const handleConfirmDelete = async () => {
        if (propiedadToDelete) {
            try {
                // Borramos al Contacto (Dueño). Por la regla CASCADE de SQL, la propiedad se borra sola.
                await deleteContact(propiedadToDelete.propietarioId);
                
                showToast('Propiedad y Propietario eliminados.', 'success');
                
                // Recargamos los datos de la pantalla
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

    const localHandleUpdate = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
        handleUpdatePropiedad(updatedPropiedad, updatedPropietario);
        if (onDataChange) onDataChange();
        setEditModalOpen(false);
        setSelectedPropiedad(null);
    };

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
            case 'Compradores':
                 return (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button onClick={openCompradorModal} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                                Añadir Comprador
                            </button>
                        </div>
                         <p className="text-center text-gray-500 p-8">La tabla de compradores se visualizará aquí.</p>
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

             <Modal title="Añadir Nuevo Comprador" isOpen={isAddCompradorModalOpen} onClose={() => !isProcessing && setAddCompradorModalOpen(false)}>
                {isProcessing ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iange-orange mx-auto mb-4"></div>
                        <p>Guardando comprador...</p>
                    </div>
                ) : (
                    <KycPldForm 
                        formData={nuevoCompradorData}
                        onFormChange={setNuevoCompradorData}
                        onSave={handleAddComprador}
                        onCancel={() => setAddCompradorModalOpen(false)} 
                        userType="Comprador"
                        propiedades={propiedades.filter(p => !p.compradorId)}
                    />
                )}
            </Modal>

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
            
            {propiedadToDelete && (
                 <Modal title="Confirmar Eliminación" isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                    <div className="text-center">
                        <p className="text-lg text-gray-700">
                           ¿Estás seguro de que quieres borrar la propiedad en <span className="font-bold">{`${propiedadToDelete.calle} ${propiedadToDelete.numero_exterior}`}</span>?
                        </p>
                        <p className="text-sm text-gray-500 mt-2">Esta acción también eliminará al propietario asociado y no se puede deshacer.</p>
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
        </div>
    );
};

export default AltaClientes;