import React, { useState } from 'react';
import { useAuth } from '../../authContext';
import { stripeService } from '../../Services/stripeService';
import { MOCK_PLANS } from '../../constants';

// --- COMPONENTES INTERNOS REUTILIZABLES ---

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; type?: string; required?: boolean; placeholder?: string; name: string; }> = ({ label, type = 'text', required, placeholder, name }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input 
            type={type} 
            name={name} 
            id={name} 
            placeholder={placeholder} 
            required={required} 
            className="w-full px-3 py-2 bg-gray-50 placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900" 
        />
    </div>
);

const Textarea: React.FC<{ label: string; required?: boolean; placeholder?: string; name: string; }> = ({ label, required, placeholder, name }) => (
    <div className="md:col-span-2">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea 
            name={name} 
            id={name} 
            placeholder={placeholder} 
            required={required} 
            rows={3} 
            className="w-full px-3 py-2 bg-gray-50 placeholder-gray-500 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900" 
        />
    </div>
);

const Select: React.FC<{ label: string; required?: boolean; name: string; children: React.ReactNode; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = ({ label, required, name, children, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select 
            name={name} 
            id={name} 
            required={required} 
            onChange={onChange} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900"
        >
            {children}
        </select>
    </div>
);

const FileInput: React.FC<{ label: string; name: string, accept?: string }> = ({ label, name, accept }) => (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input 
            type="file" 
            name={name} 
            id={name} 
            accept={accept} 
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-iange-orange hover:file:bg-orange-100"
        />
    </div>
);

// --- COMPONENTE PRINCIPAL ---

const Facturacion: React.FC = () => {
    const [metodoPago, setMetodoPago] = useState('Transferencia');
    const { user } = useAuth(); // Obtenemos el usuario autenticado

    // Función para manejar el clic en pagar
    const handlePayPlan = async (priceId: string) => {
        if (!priceId) {
            alert("Este plan no tiene un ID de Stripe configurado.");
            return;
        }

        // DEPURACIÓN: Verificamos por qué el tenantId llega vacío según tus logs
        console.log("Iniciando pago para el usuario:", user?.email);
        
        // Si el tenantId no existe en el usuario, usamos uno temporal para las pruebas de Stripe
        // OJO: En producción esto debe venir de tu base de datos obligatoriamente
        const currentTenantId = user?.tenantId || 'TEST_TENANT_ID_LOCAL';

        if (!user?.tenantId) {
            console.warn("⚠️ No se encontró tenantId en el contexto. Usando ID de prueba.");
        }

        try {
            await stripeService.createCheckoutSession(
                priceId,
                currentTenantId,
                user?.email || 'test@ejemplo.com',
                user?.id?.toString() || '0'
            );
        } catch (error) {
            console.error("Error al procesar pago:", error);
            alert("Error al conectar con la pasarela de pago.");
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Datos de facturación guardados (simulación)');
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Facturación y Pagos</h2>

            {/* SECCIÓN DE PLANES DE SUSCRIPCIÓN */}
            <FormSection title="Plan de Suscripción">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    {MOCK_PLANS.filter(p => p.estado === 'Activo').map((plan) => (
                        <div 
                            key={plan.id} 
                            className="border-2 rounded-xl p-5 flex flex-col justify-between hover:border-iange-orange transition-all shadow-sm bg-white"
                        >
                            <div>
                                <h4 className="text-lg font-bold text-iange-dark">{plan.nombre}</h4>
                                <p className="text-3xl font-black text-gray-900 my-2">{plan.precio}</p>
                                <ul className="text-sm text-gray-600 space-y-2 mb-6">
                                    <li>✓ {plan.limiteUsuarios} Usuarios</li>
                                    <li>✓ {plan.limitePropiedades} Propiedades</li>
                                    <li>✓ Soporte IANGE</li>
                                </ul>
                            </div>
                            <button 
                                type="button"
                                onClick={() => handlePayPlan(plan.stripePriceId || '')}
                                className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors"
                            >
                                Seleccionar Plan
                            </button>
                        </div>
                    ))}
                </div>
            </FormSection>

            <form onSubmit={handleSubmit}>
                <FormSection title="Datos fiscales">
                    <Input label="Razón social" name="razon_social" required placeholder="Asesores y Casas S.A. de C.V." />
                    <Input label="RFC" name="rfc" required placeholder="AAC920101A12" />
                    <Input label="Correo de facturación" name="email_facturacion" type="email" required placeholder="facturacion@asesoresycasas.com.mx" />
                    <div className="hidden md:block"/> 
                    <Textarea label="Dirección fiscal" name="direccion_fiscal" required placeholder="Av. Fundidora #501, Col. Centro, Monterrey, N.L., 64010" />
                </FormSection>

                <FormSection title="Opciones de pago (Recepción de comisiones)">
                    <Select label="Método de pago preferido" name="metodo_pago" required onChange={(e) => setMetodoPago(e.target.value)}>
                        <option>Transferencia</option>
                        <option>Boleta de pago</option>
                        <option>Tarjeta crédito-débito</option>
                    </Select>
                    
                    {metodoPago === 'Transferencia' && (
                        <>
                            <Input label="Nombre del titular" name="nombre_titular" placeholder="Ej. Juan Pérez" />
                            <Input label="Banco" name="banco" placeholder="Ej. BBVA" />
                            <Input label="Cuenta bancaria (Número)" name="cuenta_bancaria" placeholder="0123456789" type="text" />
                            <Input label="CLABE Interbancaria" name="clabe" placeholder="012345678901234567" type="text" />
                        </>
                    )}
                </FormSection>
                
                <FormSection title="Documentos (opcional)">
                    <FileInput label="Constancia fiscal (PDF)" name="constancia_fiscal" accept=".pdf"/>
                    <FileInput label="Identificación oficial (PDF o imagen)" name="identificacion_oficial" accept=".pdf,.jpg,.png" />
                </FormSection>

                <div className="flex justify-end mt-8 border-t pt-6">
                    <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600 transition-colors shadow-sm font-medium">
                        Guardar Datos de Facturación
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Facturacion;