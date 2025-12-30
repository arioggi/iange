import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// CONFIRMADO: Tu bucket se llama 'propiedades'
const BUCKET_NAME = 'propiedades'; 

const FeatureBadge = ({ icon, label }: { icon: string, label: string }) => (
    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 text-sm font-medium text-gray-700">
        <span className="text-lg">{icon}</span> {label}
    </div>
);

const PublicPropertyPage = () => {
    // Capturamos ambos parámetros posibles
    const { token, id } = useParams<{ token?: string; id?: string }>();
    
    const [propiedad, setPropiedad] = useState<any | null>(null);
    const [empresa, setEmpresa] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            // Iniciamos la consulta trayendo TODO para evitar errores
            let query = supabase.from('propiedades').select('*');

            // Lógica inteligente de búsqueda: Prioridad al Token, si no, usa ID
            if (token) {
                query = query.eq('token_publico', token);
            } else if (id) {
                query = query.eq('id', id);
            } else {
                setLoading(false);
                return;
            }

            const { data: propData, error } = await query.single();

            if (!error && propData) {
                // Si encontramos la propiedad, buscamos los datos de la EMPRESA (Tenant)
                if (propData.tenant_id) {
                    const { data: tenantData } = await supabase
                        .from('tenants')
                        .select('*') // Traemos logo, nombre y teléfono
                        .eq('id', propData.tenant_id)
                        .single();
                    setEmpresa(tenantData);
                }

                // --- LÓGICA DE IMÁGENES CORREGIDA ---
                let rawImages = propData.imagenes || propData.images || propData.features?.images || [];
                // Aseguramos que sea array
                if (typeof rawImages === 'string') rawImages = [rawImages];
                if (!Array.isArray(rawImages)) rawImages = [];

                const cleanImages = rawImages.map((img: string) => {
                    if (!img) return null;
                    if (img.startsWith('http')) return img;
                    
                    // FIX: Quitamos el nombre del bucket si ya viene en la ruta para evitar duplicados
                    const cleanPath = img.replace(`${BUCKET_NAME}/`, '');
                    
                    return supabase.storage.from(BUCKET_NAME).getPublicUrl(cleanPath).data.publicUrl;
                }).filter(Boolean);

                // Fallback por si no quedó ninguna imagen válida
                if (cleanImages.length === 0) {
                    cleanImages.push('https://via.placeholder.com/800x600?text=Sin+Imagen');
                }

                // Mapeo seguro de datos para evitar errores si faltan campos
                const features = propData.features || {};
                
                setPropiedad({
                    ...features,
                    id: propData.id,
                    titulo: propData.titulo,
                    // Usamos las imágenes limpias
                    imageUrls: cleanImages,
                    // Formato seguro de moneda MXN
                    valor_operacion: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(propData.precio || 0),
                    
                    // Mapeo de campos con valores por defecto (fallbacks)
                    recamaras: propData.recamaras || features.recamaras || 0,
                    banos_completos: propData.banos || features.banos_completos || 0,
                    terreno_m2: propData.m2Terreno || features.terreno_m2 || 0,
                    construccion_m2: propData.m2Construccion || features.construccion_m2 || 0,
                    
                    descripcion_breve: propData.descripcion || features.descripcion_breve || '',
                    descripcion_general: propData.descripcion || features.descripcion_general || '',
                    
                    tipo_inmueble: propData.tipoOperacion || propData.tipo || 'Propiedad',
                    
                    // Ubicación
                    colonia: propData.colonia || features.colonia || '',
                    municipio: propData.municipio || features.municipio || '',
                    calle: propData.direccion || features.calle || '', 
                    numero_exterior: propData.numero_exterior || features.numero_exterior || '',
                    estado: propData.estado || features.estado || ''
                });
            }
            setLoading(false);
        };
        fetchData();
    }, [token, id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin h-10 w-10 border-4 border-orange-500 rounded-full border-t-transparent"></div>
        </div>
    );
    
    if (!propiedad) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Propiedad no encontrada</h1>
            <p>El enlace podría estar roto o la propiedad ya no está disponible.</p>
        </div>
    );

    const images = propiedad.imageUrls;

    return (
        // FLEX COL para Sticky Footer
        <div className="min-h-screen bg-white font-sans flex flex-col">
            
            {/* --- HEADER PERSONALIZADO --- */}
            <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {empresa?.logo_url ? (
                            <img src={empresa.logo_url} alt="Logo Empresa" className="h-12 object-contain" />
                        ) : (
                            <div className="text-xl font-bold text-gray-800">
                                {empresa?.name || 'Inmobiliaria'}<span className="text-orange-500">.</span>
                            </div>
                        )}
                    </div>
                    
                    <a href={`tel:${empresa?.telefono || ''}`} className="hidden md:flex items-center gap-2 text-sm font-medium bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-black transition-colors">
                        <span>📞</span> {empresa?.telefono || 'Contactar'}
                    </a>
                </div>
            </header>

            {/* MAIN con flex-grow para empujar el footer */}
            <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    
                    {/* GALERÍA DE IMÁGENES */}
                    <div className="space-y-4">
                        <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-100 shadow-md relative group">
                            <img src={images[activeImage]} alt="Vista Propiedad" className="w-full h-full object-cover transition-all duration-300" />
                            
                            {/* Flechas de navegación (solo si hay más de 1 imagen) */}
                            {images.length > 1 && (
                                <>
                                    <button 
                                        onClick={() => setActiveImage(prev => prev === 0 ? images.length -1 : prev - 1)} 
                                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full text-gray-800 shadow-lg hover:scale-110 transition-all active:scale-95"
                                    >
                                        ❮
                                    </button>
                                    <button 
                                        onClick={() => setActiveImage(prev => prev === images.length -1 ? 0 : prev + 1)} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full text-gray-800 shadow-lg hover:scale-110 transition-all active:scale-95"
                                    >
                                        ❯
                                    </button>
                                </>
                            )}
                            
                            {/* Etiqueta Flotante */}
                            <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-md text-xs font-bold shadow-md uppercase tracking-wider">
                                {propiedad.tipo_inmueble}
                            </div>
                        </div>

                        {/* Miniaturas */}
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {images.map((img: string, idx: number) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setActiveImage(idx)}
                                        className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-orange-500 ring-2 ring-orange-200' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    >
                                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* INFORMACIÓN DE LA PROPIEDAD */}
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                            {propiedad.titulo || `${propiedad.calle} ${propiedad.numero_exterior}`}
                        </h1>
                        
                        <div className="flex items-center gap-2 text-gray-500 mb-6 text-lg">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{propiedad.municipio}{propiedad.estado ? `, ${propiedad.estado}` : ''}</span>
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-8 border-b pb-6 border-gray-100">
                            <span className="text-4xl font-extrabold text-gray-900">{propiedad.valor_operacion}</span>
                            <span className="text-lg font-medium text-gray-500">MXN</span>
                        </div>

                        {/* Características */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <FeatureBadge icon="🛏️" label={`${propiedad.recamaras} Recámaras`} />
                            <FeatureBadge icon="🚿" label={`${propiedad.banos_completos} Baños`} />
                            <FeatureBadge icon="📐" label={`${propiedad.terreno_m2} m² Terreno`} />
                            <FeatureBadge icon="🏗️" label={`${propiedad.construccion_m2} m² Const.`} />
                        </div>

                        {/* Descripción */}
                        <div className="prose prose-orange text-gray-600 mb-8">
                            <h3 className="text-gray-900 font-bold mb-3 text-lg">Descripción</h3>
                            <p className="leading-relaxed whitespace-pre-line">
                                {propiedad.descripcion_general || propiedad.descripcion_breve || "Contáctanos para más información sobre esta propiedad."}
                            </p>
                        </div>

                        {/* CTA WhatsApp */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-center text-gray-600 mb-4 font-medium">¿Te interesa esta propiedad? Solicita informes:</p>
                            <a 
                                href={`https://wa.me/${empresa?.telefono ? empresa.telefono.replace(/[^0-9]/g, '') : ''}?text=Hola, estoy viendo la propiedad "${propiedad.titulo}" y me interesa más información.`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2 text-lg"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                </svg>
                                Enviar WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- FOOTER UNIFICADO --- */}
            <footer className="bg-white border-t py-8 text-center text-gray-400 text-sm mt-auto">
                <p>© {new Date().getFullYear()} {empresa?.name || empresa?.nombre || 'Inmobiliaria'}. Todos los derechos reservados.</p>
                
                {/* LOGO IANGE */}
                <div className="mt-4 flex items-center justify-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium text-gray-400">Powered by</span> 
                    <img 
                        src="/logo.svg" 
                        alt="IANGE" 
                        className="h-5 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                    />
                </div>
            </footer>
        </div>
    );
};

export default PublicPropertyPage;