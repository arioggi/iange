import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const FeatureBadge = ({ icon, label }: { icon: string, label: string }) => (
    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 text-sm font-medium text-gray-700">
        <span className="text-lg">{icon}</span> {label}
    </div>
);

const PublicPropertyPage = () => {
    const { token } = useParams<{ token: string }>(); // Recibimos el token, no el ID
    const [propiedad, setPropiedad] = useState<any | null>(null);
    const [empresa, setEmpresa] = useState<any | null>(null); // Datos del Tenant
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;

            // 1. Buscar Propiedad por TOKEN
            const { data: propData, error } = await supabase
                .from('propiedades')
                .select('*')
                .eq('token_publico', token) // <-- Búsqueda por UUID
                .single();

            if (!error && propData) {
                // 2. Si encontramos la propiedad, buscamos la Empresa (Branding)
                if (propData.tenant_id) {
                    const { data: tenantData } = await supabase
                        .from('tenants')
                        .select('nombre, logo_url, telefono, owner_email') // Asume que tienes estos campos
                        .eq('id', propData.tenant_id)
                        .single();
                    setEmpresa(tenantData);
                }

                // Mapeo de datos (igual que antes)
                const features = propData.features || {};
                setPropiedad({
                    ...features,
                    id: propData.id,
                    titulo: propData.titulo,
                    // ... resto de mapeo
                    imageUrls: propData.images || [],
                    valor_operacion: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(propData.precio),
                });
            }
            setLoading(false);
        };
        fetchData();
    }, [token]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-2 border-orange-500 rounded-full border-t-transparent"></div></div>;
    if (!propiedad) return <div className="min-h-screen flex items-center justify-center text-gray-500">Propiedad no disponible.</div>;

    const images = propiedad.imageUrls?.length > 0 ? propiedad.imageUrls : ['https://via.placeholder.com/800x600?text=Sin+Imagen'];

    return (
        <div className="min-h-screen bg-white font-sans">
            {/* --- HEADER PERSONALIZADO (BRANDING DEL TENANT) --- */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    {/* Si tenemos logo de empresa, lo mostramos. Si no, IANGE por defecto */}
                    {empresa?.logo_url ? (
                        <img src={empresa.logo_url} alt={empresa.nombre} className="h-10 object-contain" />
                    ) : (
                        <div className="text-xl font-bold text-gray-900">{empresa?.nombre || 'IANGE'}<span className="text-orange-500">.</span></div>
                    )}
                    
                    <a href={`tel:${empresa?.telefono || ''}`} className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-black transition-colors">
                        📞 {empresa?.telefono || 'Contactar'}
                    </a>
                </div>
            </header>

            {/* ... (Resto del renderizado igual que el anterior, Grid, Galería, etc.) ... */}
             <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    
                    {/* Columna Izquierda: Galería */}
                    <div className="space-y-4">
                        <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm relative group">
                            <img src={images[activeImage]} alt="Propiedad" className="w-full h-full object-cover transition-all duration-300" />
                            {/* Botones de navegación sobre la imagen */}
                            {images.length > 1 && (
                                <>
                                    <button onClick={() => setActiveImage(prev => prev === 0 ? images.length -1 : prev - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">‹</button>
                                    <button onClick={() => setActiveImage(prev => prev === images.length -1 ? 0 : prev + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">›</button>
                                </>
                            )}
                        </div>
                        {/* Miniaturas */}
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {images.map((img: string, idx: number) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setActiveImage(idx)}
                                        className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-orange-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Columna Derecha: Información */}
                    <div>
                        <span className="text-orange-600 font-bold tracking-wider text-xs uppercase mb-2 block">{propiedad.tipo_inmueble || 'PROPIEDAD'} EN VENTA</span>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">{propiedad.calle} {propiedad.numero_exterior}</h1>
                        <p className="text-lg text-gray-500 mb-6 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {propiedad.colonia}, {propiedad.municipio}
                        </p>
                        
                        <div className="text-4xl font-extrabold text-gray-900 mb-8 border-b pb-6 border-gray-100">
                            {propiedad.valor_operacion} <span className="text-lg font-normal text-gray-500">MXN</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {propiedad.recamaras > 0 && <FeatureBadge icon="🛏️" label={`${propiedad.recamaras} Recámaras`} />}
                            {propiedad.banos_completos > 0 && <FeatureBadge icon="🚿" label={`${propiedad.banos_completos} Baños`} />}
                            {propiedad.terreno_m2 && <FeatureBadge icon="📐" label={`${propiedad.terreno_m2} m² Terreno`} />}
                            {propiedad.construccion_m2 && <FeatureBadge icon="🏗️" label={`${propiedad.construccion_m2} m² Const.`} />}
                        </div>

                        <div className="prose text-gray-600 mb-8">
                            <h3 className="text-gray-900 font-bold mb-2">Acerca de esta propiedad</h3>
                            <p className="leading-relaxed">{propiedad.descripcion_breve || propiedad.descripcion_general || "Esta propiedad cuenta con excelente ubicación y acabados de primera..."}</p>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <p className="text-sm text-center text-gray-500 mb-4">¿Te interesa esta propiedad?</p>
                            <a 
                                href={`https://wa.me/${empresa?.telefono ? empresa.telefono.replace(/[^0-9]/g, '') : ''}?text=Hola, vi la propiedad ${propiedad.calle} en IANGE y me interesa más información.`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                Enviar WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicPropertyPage;