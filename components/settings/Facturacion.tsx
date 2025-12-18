import React, { useState, useEffect } from 'react';
import { useAuth } from '../../authContext';
import { stripeService } from '../../Services/stripeService';
import { MOCK_PLANS } from '../../constants';
import { supabase } from '../../supabaseClient';

// --- COMPONENTES INTERNOS ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </section>
);

const Input: React.FC<{ label: string; type?: string; required?: boolean; placeholder?: string; name: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, type = 'text', required, placeholder, name, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <input 
            type={type} 
            name={name} 
            id={name} 
            value={value || ''} // IMPORTANTE: El '||' asegura que si el dato es null, se vea vacío y no rompa el input
            onChange={onChange} 
            placeholder={placeholder} 
            required={required} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900" 
        />
    </div>
);

// --- COMPONENTE PRINCIPAL ---
const Facturacion: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [planActivoId, setPlanActivoId] = useState<number | null>(null);
    
    const [formData, setFormData] = useState({
        razon_social: '',
        rfc: '',
        email_facturacion: '',
        direccion_fiscal: '',
        metodo_pago: 'Transferencia',
        nombre_titular: '',
        banco: '',
        cuenta_bancaria: '',
        clabe: ''
    });

    // 1. CARGA Y SINCRONIZACIÓN
    useEffect(() => {
        if (!user?.tenantId) {
            console.log("Esperando tenantId...");
            return;
        }

        const fetchDatos = async () => {
            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('billing_info, plan_id')
                    .eq('id', user.tenantId)
                    .single();

                if (data) {
                    console.log("📦 Datos recuperados de Supabase:", data.billing_info);
                    // Sincronizamos los datos fiscales si existen dentro del JSON
                    if (data.billing_info) {
                        setFormData(prev => ({
                            ...prev,
                            ...data.billing_info
                        }));
                    }
                    setPlanActivoId(data.plan_id);
                }
            } catch (err) {
                console.error("Error cargando configuración:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDatos();

        // Escucha en tiempo real para cambios externos (ej. Webhook de Stripe)
        const channel = supabase
            .channel(`realtime-billing-${user.tenantId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${user.tenantId}` },
                (payload) => {
                    console.log("⚡ Cambio detectado en DB:", payload.new);
                    if (payload.new.plan_id !== undefined) setPlanActivoId(payload.new.plan_id);
                    if (payload.new.billing_info) setFormData(payload.new.billing_info);
                }
            ).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.tenantId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.tenantId) return alert("Error: No se encontró ID de empresa.");

        // Guardamos TODO el objeto en la columna JSONB
        const { error } = await supabase
            .from('tenants')
            .update({ billing_info: formData })
            .eq('id', user.tenantId);

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            alert("¡Datos guardados con éxito!");
        }
    };

    const handlePayPlan = async (priceId: string) => {
        if (!priceId) return;
        try {
            await stripeService.createCheckoutSession(priceId, user?.tenantId || '', user?.email || '', user?.id?.toString() || '');
        } catch (err) {
            console.error("Error en pago:", err);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Sincronizando datos fiscales...</div>;

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Facturación y Pagos</h2>

            {/* SECCIÓN DE PLANES */}
            <FormSection title="Plan de Suscripción">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    {MOCK_PLANS.filter(p => p.estado === 'Activo').map((plan) => {
                        const esPlanActual = Number(planActivoId) === Number(plan.id);
                        return (
                            <div key={plan.id} className={`border-2 rounded-xl p-5 flex flex-col justify-between transition-all bg-white ${esPlanActual ? 'border-iange-orange ring-1 ring-iange-orange bg-orange-50' : 'hover:border-iange-orange shadow-sm'}`}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-lg font-bold text-iange-dark">{plan.nombre}</h4>
                                        {esPlanActual && <span className="bg-iange-orange text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Actual</span>}
                                    </div>
                                    <p className="text-3xl font-black text-gray-900 my-2">{plan.precio}</p>
                                    <ul className="text-sm text-gray-600 space-y-2 mb-6">
                                        <li>✓ {plan.limiteUsuarios} Usuarios</li>
                                        <li>✓ {plan.limitePropiedades} Propiedades</li>
                                    </ul>
                                </div>
                                <button type="button" disabled={esPlanActual} onClick={() => handlePayPlan(plan.stripePriceId || '')} className={`w-full py-3 font-bold rounded-lg transition-colors ${esPlanActual ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'}`}>
                                    {esPlanActual ? 'Plan Activo' : 'Seleccionar Plan'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </FormSection>

            <form onSubmit={handleSubmit}>
                <FormSection title="Datos fiscales">
                    <Input label="Razón social" name="razon_social" value={formData.razon_social} onChange={handleInputChange} required placeholder="Nombre de la empresa" />
                    <Input label="RFC" name="rfc" value={formData.rfc} onChange={handleInputChange} required placeholder="RFC con homoclave" />
                    <Input label="Correo de facturación" name="email_facturacion" value={formData.email_facturacion} onChange={handleInputChange} type="email" required />
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección fiscal</label>
                        <textarea 
                            name="direccion_fiscal" 
                            value={formData.direccion_fiscal || ''} 
                            onChange={handleInputChange} 
                            rows={3} 
                            required 
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-iange-orange focus:border-iange-orange text-gray-900" 
                        />
                    </div>
                </FormSection>

                <FormSection title="Opciones de pago (Recepción de comisiones)">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago preferido</label>
                        <select 
                            name="metodo_pago" 
                            value={formData.metodo_pago} 
                            onChange={handleInputChange} 
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-iange-orange focus:border-iange-orange text-gray-900"
                        >
                            <option value="Transferencia">Transferencia</option>
                            <option value="Boleta de pago">Boleta de pago</option>
                            <option value="Tarjeta crédito-débito">Tarjeta crédito-débito</option>
                        </select>
                    </div>
                    
                    {formData.metodo_pago === 'Transferencia' && (
                        <>
                            <Input label="Nombre del titular" name="nombre_titular" value={formData.nombre_titular} onChange={handleInputChange} />
                            <Input label="Banco" name="banco" value={formData.banco} onChange={handleInputChange} />
                            <Input label="Cuenta bancaria (Número)" name="cuenta_bancaria" value={formData.cuenta_bancaria} onChange={handleInputChange} />
                            <Input label="CLABE Interbancaria" name="clabe" value={formData.clabe} onChange={handleInputChange} />
                        </>
                    )}
                </FormSection>

                <div className="flex justify-end mt-8 border-t pt-6">
                    <button type="submit" className="bg-iange-orange text-white py-2 px-8 rounded-md hover:bg-orange-600 font-bold shadow-md transition-all">
                        Guardar Datos de Facturación
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Facturacion;