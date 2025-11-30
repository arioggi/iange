import React, { useState, useMemo } from 'react';
import { Propiedad, Propietario, User } from '../types';
import ProgresoCard from '../components/progreso/ProgresoCard';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import EditPropiedadForm from '../components/clientes/EditPropiedadForm';

// --- Types and constants for sorting ---
type SortKeys = keyof Propiedad | 'valor_operacion';

interface SortConfig {
    key: SortKeys;
    direction: 'ascending' | 'descending';
}

const SORT_OPTIONS = [
    { label: 'Más Recientes', key: 'fecha_captacion', direction: 'descending' },
    { label: 'Mayor Valor', key: 'valor_operacion', direction: 'descending' },
    { label: 'Menor Valor', key: 'valor_operacion', direction: 'ascending' },
    { label: 'Tipo de Inmueble', key: 'tipo_inmueble', direction: 'ascending' },
] as const;
// --- End sorting section ---

interface ProgresoProps {
    propiedades: Propiedad[];
    propietarios: Propietario[];
    onUpdatePropiedad: (propiedad: Propiedad, propietario: Propietario) => void;
    onNavigateAndEdit: (propiedadId: number) => void;
    asesores: User[];
}

const Progreso: React.FC<ProgresoProps> = ({ propiedades, propietarios, onUpdatePropiedad, onNavigateAndEdit, asesores }) => {
    const navigate = useNavigate();
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSort, setActiveSort] = useState<(typeof SORT_OPTIONS)[number]['label']>('Más Recientes');

    const sortConfig = useMemo<SortConfig>(() => {
        const option = SORT_OPTIONS.find(opt => opt.label === activeSort);
        return { key: (option?.key || 'fecha_captacion') as SortKeys, direction: option?.direction || 'descending' };
    }, [activeSort]);

    const sortedAndFilteredPropiedades = useMemo(() => {
        let filteredItems = [...propiedades];
        
        // 1. Filter by search term
        if (searchTerm) {
            filteredItems = filteredItems.filter(prop => {
                const propietario = propietarios.find(p => p.id === prop.propietarioId);
                const searchString = `${prop.calle} ${prop.colonia} ${prop.municipio} ${propietario?.nombreCompleto || ''}`.toLowerCase();
                return searchString.includes(searchTerm.toLowerCase());
            });
        }
        
        // 2. Sort the filtered items
        if (sortConfig) {
            filteredItems.sort((a, b) => {
                let aValue: any, bValue: any;

                if (sortConfig.key === 'valor_operacion') {
                    aValue = parseFloat((a.valor_operacion || '0').replace(/[^0-9.-]+/g, ""));
                    bValue = parseFloat((b.valor_operacion || '0').replace(/[^0-9.-]+/g, ""));
                } else if (sortConfig.key === 'fecha_captacion') {
                    aValue = new Date(a.fecha_captacion).getTime();
                    bValue = new Date(b.fecha_captacion).getTime();
                } else {
                    aValue = a[sortConfig.key as keyof Propiedad];
                    bValue = b[sortConfig.key as keyof Propiedad];
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filteredItems;
    }, [searchTerm, propiedades, propietarios, sortConfig]);

    const handleCardClick = (propiedad: Propiedad) => {
        setSelectedPropiedad(propiedad);
        setEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditModalOpen(false);
        setSelectedPropiedad(null);
    };

    const handleSave = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
        onUpdatePropiedad(updatedPropiedad, updatedPropietario);
        handleCloseModal();
    };

    const handleNavigateToFullEdit = () => {
        if (selectedPropiedad) {
            handleCloseModal();
            onNavigateAndEdit(selectedPropiedad.id);
        }
    };
    
    const selectedPropietario = selectedPropiedad ? propietarios.find(p => p.id === selectedPropiedad.propietarioId) : null;


    return (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-6">
                     <div>
                        <h2 className="text-2xl font-bold text-iange-dark">Progreso de Ventas</h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por dirección o propietario..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full max-w-xs px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900 placeholder-gray-500"
                            />
                        </div>
                        <button
                            onClick={() => navigate('/clientes')}
                            className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 flex-shrink-0"
                        >
                            Añadir Propiedad
                        </button>
                    </div>
                </div>
                
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex items-center space-x-8 overflow-x-auto pb-2" aria-label="Tabs">
                        <span className="whitespace-nowrap py-4 px-1 font-medium text-sm text-gray-500">Ordenar por:</span>
                        {SORT_OPTIONS.map((option) => (
                            <button
                                key={option.label}
                                onClick={() => setActiveSort(option.label)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${
                                    activeSort === option.label
                                        ? 'border-iange-orange text-iange-orange'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {sortedAndFilteredPropiedades.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedAndFilteredPropiedades.map(propiedad => {
                            const propietario = propietarios.find(p => p.id === propiedad.propietarioId);
                            return (
                                <ProgresoCard 
                                    key={propiedad.id} 
                                    propiedad={propiedad} 
                                    propietario={propietario}
                                    onClick={() => handleCardClick(propiedad)}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 border-dashed border-2 rounded-lg">
                        <h3 className="text-xl font-semibold text-gray-700">No se encontraron propiedades</h3>
                        <p className="text-gray-500 mt-2">Intenta con otro término de búsqueda o añade una nueva propiedad.</p>
                    </div>
                )}
            </div>

            {selectedPropiedad && selectedPropietario && (
                <Modal title="Actualizar Progreso de Venta" isOpen={isEditModalOpen} onClose={handleCloseModal}>
                    <EditPropiedadForm
                        propiedad={selectedPropiedad}
                        propietario={selectedPropietario}
                        onSave={handleSave}
                        onCancel={handleCloseModal}
                        viewMode="progressOnly"
                        onNavigateToEdit={handleNavigateToFullEdit}
                        asesores={asesores}
                    />
                </Modal>
            )}
        </div>
    );
};

export default Progreso;