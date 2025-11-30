import React, { useState } from 'react';
import { Plan } from '../../types';
import { MOCK_PLANS } from '../../constants';
import Modal from '../../components/ui/Modal';

const PlanCard: React.FC<{ plan: Plan; onEdit: () => void }> = ({ plan, onEdit }) => {
    const isActive = plan.estado === 'Activo';
    return (
        <div className={`border rounded-lg shadow-sm p-6 flex flex-col ${isActive ? 'border-iange-orange' : 'border-gray-300 bg-gray-50'}`}>
            <div className="flex-grow">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-iange-dark">{plan.nombre}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {plan.estado}
                    </span>
                </div>
                <p className="text-3xl font-bold my-4">{plan.precio}</p>
                <ul className="space-y-2 text-sm text-gray-600">
                    <li>✓ Límite de {plan.limiteUsuarios} usuarios</li>
                    <li>✓ Límite de {plan.limitePropiedades} propiedades</li>
                    <li>✓ Soporte por correo</li>
                </ul>
            </div>
            <div className="mt-6">
                <button onClick={onEdit} className="w-full bg-iange-salmon text-iange-dark font-bold py-2 rounded-md hover:bg-orange-200">
                    Editar Plan
                </button>
            </div>
        </div>
    );
};

const AddEditPlanForm: React.FC<{ plan?: Plan, onSave: (planData: Omit<Plan, 'id'>) => void, onCancel: () => void }> = ({ plan, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nombre: plan?.nombre || '',
        precio: plan?.precio || '',
        limiteUsuarios: plan?.limiteUsuarios || '',
        limitePropiedades: plan?.limitePropiedades || '',
        estado: plan?.estado || 'Activo',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { limiteUsuarios, limitePropiedades, ...rest } = formData;
        onSave({
            ...rest,
            limiteUsuarios: isNaN(Number(limiteUsuarios)) ? String(limiteUsuarios) : Number(limiteUsuarios),
            limitePropiedades: isNaN(Number(limitePropiedades)) ? String(limitePropiedades) : Number(limitePropiedades),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre del Plan" required className="w-full p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            <input name="precio" value={formData.precio} onChange={handleChange} placeholder="Precio (ej. $99 / mes)" required className="w-full p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            <input name="limiteUsuarios" value={String(formData.limiteUsuarios)} onChange={handleChange} placeholder="Límite de Usuarios (ej. 25)" required className="w-full p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            <input name="limitePropiedades" value={String(formData.limitePropiedades)} onChange={handleChange} placeholder="Límite de Propiedades (ej. 500 o Ilimitado)" required className="w-full p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            <select name="estado" value={formData.estado} onChange={handleChange} className="w-full p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
            </select>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md">Cancelar</button>
                <button type="submit" className="bg-iange-orange text-white py-2 px-4 rounded-md">Guardar Plan</button>
            </div>
        </form>
    )
}

const SuperAdminPlanes: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>(MOCK_PLANS);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    const handleSave = (planData: Omit<Plan, 'id'>) => {
        if (selectedPlan) {
            setPlans(plans.map(p => p.id === selectedPlan.id ? { ...p, ...planData } : p));
        } else {
            setPlans([...plans, { ...planData, id: Date.now() }]);
        }
        setModalOpen(false);
        setSelectedPlan(null);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-iange-dark">Planes y Facturación</h2>
                <button onClick={() => { setSelectedPlan(null); setModalOpen(true); }} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    + Crear Plan
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map(plan => (
                    <PlanCard key={plan.id} plan={plan} onEdit={() => { setSelectedPlan(plan); setModalOpen(true); }} />
                ))}
            </div>

            {isModalOpen && (
                 <Modal title={selectedPlan ? "Editar Plan" : "Crear Nuevo Plan"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                    <AddEditPlanForm 
                        plan={selectedPlan || undefined}
                        onSave={handleSave} 
                        onCancel={() => { setModalOpen(false); setSelectedPlan(null); }} 
                    />
                </Modal>
            )}
        </div>
    );
};

export default SuperAdminPlanes;
