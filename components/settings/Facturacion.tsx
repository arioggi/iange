import React, { useState, useEffect } from 'react';
import { useAuth } from '../../authContext';
import { stripeService } from '../../Services/stripeService';
import { MOCK_PLANS } from '../../constants';
import { supabase } from '../../supabaseClient';
import Toast from '../ui/Toast'; // ✅ IMPORTACIÓN DEL TOAST

// --- COMPONENTES REUTILIZABLES ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; type?: string; required?: boolean; placeholder?: string; name: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, type = 'text', required, placeholder, name, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input 
            type={type} 
            name={name} 
            id={name} 
            value={value || ''} 
            onChange={onChange}
            placeholder={placeholder} 
            required={required} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900" 
        />
    </div>
);

const Textarea: React.FC<{ label: string; required?: boolean; placeholder?: string; name: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }> = ({ label, required, placeholder, name, value, onChange }) => (
    <div className="md:col-span-2">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea 
            name={name} 
            id={name} 
            value={value || ''} 
            onChange={onChange}
            placeholder={placeholder} 
            required={required} 
            rows={3} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900" 
        />
    </div>
);

const Select: React.FC<{ label: string; required?: boolean; name: string; value?: string; children: React.ReactNode; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = ({ label, required, name, value, children, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select 
            name={name} 
            id={name} 
            value={value || ''} 
            required={required} 
            onChange={onChange} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900"
        >
            {children}
        </select>
    </div>
);

const Facturacion: React.FC = () => {
    const { appUser } = useAuth(); 
    const [loading, setLoading] = useState(true);
    const [planActivoId, setPlanActivoId] = useState<number | null>(null);
    
    // ✅ ESTADO PARA EL TOAST
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const [formData, setFormData] = useState({
        razon_social: '',
        rfc: '',
        email_facturacion: '',
        direccion_fiscal: '',
        metodo_pago: 'Tarjeta crédito-débito', 
        nombre_titular: '',
        banco: '',
        cuenta_bancaria: '',
        clabe: ''
    });

    useEffect(() => {
        const fetchDatosTenant = async () => {
            if (!appUser?.tenantId) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('billing_info, plan_id, subscription_status') 
                    .eq('id', appUser.tenantId)
                    .maybeSingle();

                if (error) {
                    console.error("❌ Error Supabase:", error.message);
                    return;
                }

                if (data) {
                    if (data.plan_id) {
                        setPlanActivoId(Number(data.plan_id));
                    }
                    if (data.billing_info) {
                        setFormData(prev => ({ ...prev, ...data.billing_info }));
                    }
                }
            } catch (err) {
                console.error("💥 Error inesperado:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDatosTenant();
    }, [appUser?.tenantId]);

    // ✅ EFECTO PARA AUTO-CERRAR EL TOAST DESPUÉS DE 3 SEGUNDOS
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePayPlan = async (priceId: string, planId: number) => {
        // 🔄 REEMPLAZO DE ALERT
        if (!priceId) {
            setToast({ message: "Este plan no tiene un ID de Stripe configurado.", type: 'error' });
            return;
        }
        try {
            await stripeService.createCheckoutSession(
                priceId,
                appUser?.tenantId || '',
                appUser?.email || '',
                appUser?.id?.toString() || '',
                planId 
            );
        } catch (error) {
            console.error("Error Stripe:", error);
            // 🔄 REEMPLAZO DE ALERT
            setToast({ message: "Error al conectar con la pasarela de pago.", type: 'error' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // 🔄 REEMPLAZO DE ALERT
        if (!appUser?.tenantId) {
            setToast({ message: "No hay empresa vinculada.", type: 'error' });
            return;
        }

        try {
            const { error } = await supabase
                .from('tenants')
                .update({ billing_info: formData }) 
                .eq('id', appUser.tenantId);

            if (error) throw error;
            // 🔄 REEMPLAZO DE ALERT (Éxito)
            setToast({ message: "¡Datos actualizados con éxito!", type: 'success' });
        } catch (error: any) {
            // 🔄 REEMPLAZO DE ALERT
            setToast({ message: "Error al guardar: " + error.message, type: 'error' });
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Cargando información...</div>;

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm relative"> 
            {/* ✅ RENDERIZADO DEL TOAST */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Facturación y Planes</h2>

            {appUser?.subscriptionStatus === 'trialing' && (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md">
                    <p className="font-bold">✨ Estás en periodo de prueba</p>
                    <p className="text-sm">Tu acceso actual es cortesía de IANGE. Selecciona un plan abajo para asegurar tu continuidad después del regalo.</p>
                </div>
            )}

            <FormSection title="Planes de Suscripción">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {MOCK_PLANS.filter(p => p.estado === 'Activo').map((plan) => {
                        const esPlanActual = Number(planActivoId) === Number(plan.id);
                        return (
                            <div key={plan.id} className={`border-2 rounded-xl p-5 flex flex-col justify-between transition-all bg-white ${esPlanActual ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50' : 'hover:border-orange-300 shadow-sm'}`}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-lg font-bold text-gray-900">{plan.nombre}</h4>
                                        {esPlanActual && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Actual</span>}
                                    </div>
                                    <p className="text-3xl font-black text-gray-900 my-2">{plan.precio}</p>
                                    <ul className="text-sm text-gray-600 space-y-2 mb-6">
                                        <li>✓ {plan.limiteUsuarios} Usuarios</li>
                                        <li>✓ {plan.limitePropiedades} Propiedades</li>
                                    </ul>
                                </div>
                                <button 
                                    type="button" 
                                    disabled={esPlanActual} 
                                    onClick={() => handlePayPlan(plan.stripePriceId || '', plan.id)} 
                                    className={`w-full py-3 font-bold rounded-lg transition-colors ${esPlanActual ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'}`}
                                >
                                    {esPlanActual ? 'Plan Activo' : 'Seleccionar Plan'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </FormSection>

            <form onSubmit={handleSubmit}>
                <FormSection title="Datos Fiscales">
                    <Input label="Razón social" name="razon_social" value={formData.razon_social} onChange={handleInputChange} required />
                    <Input label="RFC" name="rfc" value={formData.rfc} onChange={handleInputChange} required />
                    <Input label="Correo electrónico" name="email_facturacion" value={formData.email_facturacion} onChange={handleInputChange} type="email" required />
                    <Textarea label="Dirección fiscal" name="direccion_fiscal" value={formData.direccion_fiscal} onChange={handleInputChange} required />
                </FormSection>

                <FormSection title="Forma de pago">
                    <Select label="Selecciona tu método" name="metodo_pago" value={formData.metodo_pago} required onChange={handleInputChange}>
                        <option value="Tarjeta crédito-débito">Tarjeta crédito-débito</option>
                    </Select>
                </FormSection>
                
                <div className="flex justify-end mt-8 border-t pt-6">
                    <button type="submit" className="bg-orange-600 text-white py-2 px-8 rounded-md hover:bg-orange-700 font-bold shadow-sm transition-all">
                        Guardar Configuración
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Facturacion;