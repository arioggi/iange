import React, { useState, useEffect, useMemo } from 'react';
import { Propietario, Propiedad, Comprador, ChecklistStatus, User, KycData } from '../types';
import Modal from '../components/ui/Modal';
import AddPropiedadPropietarioForm from '../components/clientes/AddPropiedadPropietarioForm';
import PropiedadesTable from '../components/clientes/PropiedadesTable';
import KycPldForm, { initialKycState } from '../components/clientes/KycPldForm';
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';
import { FLUJO_PROGRESO } from '../constants';
import adapter from '../data/localStorageAdapter';

const TABS = ['Propiedades y Propietarios', 'Compradores'];

const totalChecklistItems = FLUJO_PROGRESO.reduce((acc, etapa) => acc + etapa.items.length, 0);

const calculateProgress = (checklist: ChecklistStatus): number => {
    if (totalChecklistItems === 0) return 0;
    const checkedCount = Object.values(checklist).filter(value => value === true).length;
    return Math.round((checkedCount / totalChecklistItems) * 100);
};

const getStatusFromChecklist = (checklist: ChecklistStatus, compradorId: number | null | undefined): Propiedad['status'] => {
    if (checklist.ventaConcluida) return 'Vendida';
    if (checklist.propiedadSeparada || compradorId) return 'Separada';
    if (checklist.propiedadVerificada) return 'En Promoción';
    return 'Validación Pendiente';
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
    onDataChange?: () => void; // <--- 1. NUEVA PROP AÑADIDA
}

const AltaClientes: React.FC<AltaClientesProps> = ({ 
    showToast, 
    propiedades, setPropiedades, 
    propietarios, setPropietarios, 
    compradores, setCompradores,
    handleUpdatePropiedad,
    handleDeletePropiedad,
    initialEditPropId,
    setInitialEditPropId,
    asesores,
    currentUser,
    onDataChange, // <--- 2. DESESTRUCTURACIÓN
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

    const handleAddPropiedadPropietario = (nuevaPropiedad: Omit<Propiedad, 'id' | 'propietarioId' | 'fecha_captacion' | 'progreso' | 'checklist' | 'status' | 'fecha_venta'>, nuevoPropietario: Omit<Propietario, 'id'>) => {
        if (!currentUser.tenantId) return;

        const propietarioId = Date.now();
        const newPropietarioConId = { ...nuevoPropietario, id: propietarioId };
        
        const initialChecklist: ChecklistStatus = {
            propiedadRegistrada: true, propietarioRegistrado: true, documentacionCompleta: false, entrevistaPLD: false, propiedadVerificada: false,
            fichaTecnicaGenerada: false, publicadaEnPortales: false, campanasMarketing: false, seguimientoEnCurso: false,
            compradorInteresado: false, documentosCompradorCompletos: false, propiedadSeparada: false, checklistTramitesIniciado: false,
            contratoGenerado: false, firmaCompletada: false, ventaConcluida: false, seguimientoPostventa: false,
        };

        const newPropiedadConId: Propiedad = { 
            ...nuevaPropiedad, 
            id: Date.now() + 1, 
            propietarioId,
            fecha_captacion: new Date().toISOString(),
            fecha_venta: null,
            compradorId: null,
            progreso: calculateProgress(initialChecklist),
            checklist: initialChecklist,
            status: getStatusFromChecklist(initialChecklist, null),
            visitas: [],
        };

        const updatedPropietarios = [...propietarios, newPropietarioConId];
        const updatedPropiedades = [...propiedades, newPropiedadConId];
        
        setPropietarios(updatedPropietarios);
        setPropiedades(updatedPropiedades);

        adapter.setContacts(currentUser.tenantId, { propietarios: updatedPropietarios, compradores });
        adapter.setProperties(currentUser.tenantId, updatedPropiedades);
        if (currentUser.tenantId) {
             adapter.updateTenantSettings(currentUser.tenantId, { onboarded: true });
        }
        
        // <--- 3. LLAMADA A LA FUNCIÓN DE RECARGA
        if (onDataChange) onDataChange();

        showToast('Propiedad y Propietario añadidos con éxito');
        setAddPropiedadModalOpen(false);
    };

    const handleAddComprador = (propiedadId?: number) => {
        if (!currentUser.tenantId) return;

        const compradorId = Date.now();
        const nuevoCompradorConId: Comprador = { 
            ...nuevoCompradorData, 
            id: compradorId,
            propiedadId: propiedadId || null,
        };
        
        const updatedCompradores = [...compradores, nuevoCompradorConId];
        setCompradores(updatedCompradores);
        
        let updatedPropiedades = propiedades;
        if (propiedadId) {
            updatedPropiedades = propiedades.map(p => {
                if (p.id === propiedadId) {
                    const updatedChecklist: ChecklistStatus = { ...p.checklist, compradorInteresado: true, documentosCompradorCompletos: true, propiedadSeparada: true };
                    return { ...p, compradorId: compradorId, checklist: updatedChecklist, progreso: calculateProgress(updatedChecklist), status: getStatusFromChecklist(updatedChecklist, compradorId) };
                }
                return p;
            });
            setPropiedades(updatedPropiedades);
            adapter.setProperties(currentUser.tenantId, updatedPropiedades);
        }

        adapter.setContacts(currentUser.tenantId, { propietarios, compradores: updatedCompradores });
        
        // <--- RECARGA TAMBIÉN AL AÑADIR COMPRADOR
        if (onDataChange) onDataChange();

        showToast('Comprador añadido con éxito');
        setAddCompradorModalOpen(false);
    };

    const openCompradorModal = () => {
        setNuevoCompradorData(initialKycState); // Resetea el formulario a su estado inicial
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
            setInitialEditPropId(null); // Reset after use to avoid re-triggering
        }
    }, [initialEditPropId, propiedades, setInitialEditPropId]);
    
    const handleDeleteClick = (propiedad: Propiedad) => {
        setPropiedadToDelete(propiedad);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (propiedadToDelete) {
            handleDeletePropiedad(propiedadToDelete);
            
            // <--- RECARGA AL ELIMINAR
            if (onDataChange) onDataChange();

            setDeleteModalOpen(false);
            setPropiedadToDelete(null);
        }
    };

    const localHandleUpdate = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
        handleUpdatePropiedad(updatedPropiedad, updatedPropietario);
        
        // <--- RECARGA AL EDITAR
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
                        {/* Aquí iría la tabla de compradores */}
                         <p className="text-center text-gray-500 p-8">La tabla de compradores está en construcción.</p>
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
            
            <Modal title="Añadir Nueva Propiedad y Propietario" isOpen={isAddPropiedadModalOpen} onClose={() => setAddPropiedadModalOpen(false)}>
                <AddPropiedadPropietarioForm onSave={handleAddPropiedadPropietario} onCancel={() => setAddPropiedadModalOpen(false)} asesores={asesores} />
            </Modal>
             <Modal title="Añadir Nuevo Comprador" isOpen={isAddCompradorModalOpen} onClose={() => setAddCompradorModalOpen(false)}>
                <KycPldForm 
                    formData={nuevoCompradorData}
                    onFormChange={setNuevoCompradorData}
                    onSave={handleAddComprador}
                    onCancel={() => setAddCompradorModalOpen(false)} 
                    userType="Comprador"
                    propiedades={propiedades.filter(p => !p.compradorId)}
                />
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