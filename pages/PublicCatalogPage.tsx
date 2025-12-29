import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPinIcon } from '../components/Icons'; 

// CONFIRMADO: Tu bucket se llama 'propiedades'
const BUCKET_NAME = 'propiedades'; 

const PublicCatalogPage = () => {
    const { tenantId } = useParams();
    const [propiedades, setPropiedades] = useState<any[]>([]);
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'todos' | 'venta' | 'renta'>('todos');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!tenantId) return;

            try {
                // 1. OBTENER EMPRESA
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('*') 
                    .eq('id', tenantId)
                    .single();
                
                if (tenantData) setEmpresa(tenantData);

                // 2. OBTENER PROPIEDADES
                const { data: propsData, error } = await supabase
                    .from('propiedades')
                    .select('*') 
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false });

                if (error) console.error("🔥 Error:", error.message);

                if (propsData) {
                    const propsMapeadas = propsData.map((p: any) => {
                        // --- LÓGICA DE IMÁGENES ---
                        let rawImages = p.imagenes || p.images || p.features?.images || [];
                        if (typeof rawImages === 'string') rawImages = [rawImages];
                        if (!Array.isArray(rawImages)) rawImages = [];

                        const cleanImages = rawImages.map((img: string) => {
                            if (!img) return null;
                            if (img.startsWith('http')) return img;
                            const cleanPath = img.replace(`${BUCKET_NAME}/`, '');
                            return supabase.storage.from(BUCKET_NAME).getPublicUrl(cleanPath).data.publicUrl;
                        }).filter(Boolean);

                        return {
                            ...p,
                            imagenes: cleanImages, 
                            recamaras: p.recamaras || p.features?.recamaras || 0,
                            banos: p.banos || p.features?.banos || p.features?.banos_completos || 0,
                            m2Terreno: p.m2Terreno || p.features?.m2Terreno || p.features?.terreno_m2 || 0,
                            titulo: p.titulo || `${p.features?.calle || 'Propiedad'} ${p.features?.numero_exterior || ''}`,
                            municipio: p.municipio || p.features?.municipio || '',
                            estado: p.estado || p.features?.estado || '',
                            tipoOperacion: p.tipoOperacion || p.tipo || 'Venta',
                            precio: p.precio || p.features?.precio || 0
                        };
                    });
                    setPropiedades(propsMapeadas);
                }

            } catch (error) {
                console.error("Error general:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId]);

    const filteredProperties = propiedades.filter(p => {
        const matchesSearch = (p.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.municipio || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'todos' ? true : p.tipoOperacion?.toLowerCase() === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handlePropertyClick = (id: number) => {
        window.open(`/p/${id}`, '_blank');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-10 w-10 border-4 border-orange-500 rounded-full border-t-transparent"></div></div>;

    return (
        // ESTRUCTURA FLEX COL: Asegura que el footer se vaya al fondo
        <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
            
            {/* HEADER */}
            <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {empresa?.logo_url ? (
                            <img src={empresa.logo_url} alt="Logo Empresa" className="h-12 object-contain" />
                        ) : (
                            <div className="text-xl font-bold text-gray-800">
                                {empresa?.name || empresa?.nombre || 'Inmobiliaria'}<span className="text-orange-500">.</span>
                            </div>
                        )}
                    </div>
                    
                    <a href={`tel:${empresa?.telefono || ''}`} className="hidden md:flex items-center gap-2 text-sm font-medium bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-black transition-colors shadow-lg shadow-gray-200">
                        <span>📞</span> {empresa?.telefono || 'Contactar'}
                    </a>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL (flex-grow ocupa todo el espacio disponible) */}
            <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
                
                {/* FILTROS */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar por colonia, municipio o nombre..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                        <button onClick={() => setFilterStatus('todos')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filterStatus === 'todos' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>Todas</button>
                        <button onClick={() => setFilterStatus('venta')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filterStatus === 'venta' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>Venta</button>
                        <button onClick={() => setFilterStatus('renta')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filterStatus === 'renta' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>Renta</button>
                    </div>
                </div>

                {/* GRID */}
                {filteredProperties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProperties.map(prop => (
                            <div 
                                key={prop.id} 
                                onClick={() => handlePropertyClick(prop.id)}
                                className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 group"
                            >
                                <div className="h-64 bg-gray-200 relative overflow-hidden">
                                    {prop.imagenes && prop.imagenes.length > 0 ? (
                                        <img 
                                            src={prop.imagenes[0]} 
                                            alt={prop.titulo} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Sin+Imagen'; }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 bg-gray-100">Sin Imagen</div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                         <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-md ${
                                            prop.tipoOperacion === 'Renta' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                                        }`}>
                                            {prop.tipoOperacion}
                                        </span>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-4 right-4 text-white text-xl font-bold shadow-sm">
                                       {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(prop.precio)}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="font-bold text-gray-900 text-lg mb-2 truncate leading-snug" title={prop.titulo}>{prop.titulo}</h3>
                                    <div className="flex items-center text-gray-500 text-sm mb-5">
                                        <MapPinIcon className="h-4 w-4 mr-1 text-orange-500" />
                                        <span className="truncate">{prop.municipio}{prop.estado ? `, ${prop.estado}` : ''}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center">
                                        <div><span className="block text-xs text-gray-400 uppercase font-semibold tracking-wider">Recámaras</span><span className="font-bold text-gray-700 text-lg">{prop.recamaras}</span></div>
                                        <div className="border-l border-r border-gray-100"><span className="block text-xs text-gray-400 uppercase font-semibold tracking-wider">Baños</span><span className="font-bold text-gray-700 text-lg">{prop.banos}</span></div>
                                        <div><span className="block text-xs text-gray-400 uppercase font-semibold tracking-wider">M²</span><span className="font-bold text-gray-700 text-lg">{prop.m2Terreno}</span></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="text-6xl mb-4">🏠</div>
                        <p className="text-gray-500 text-lg font-medium">No hay propiedades disponibles con estos filtros.</p>
                        <button onClick={() => {setFilterStatus('todos'); setSearchTerm('');}} className="mt-4 text-orange-600 font-bold hover:underline">Ver todas las propiedades</button>
                    </div>
                )}
            </main>
            
            {/* FOOTER */}
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

export default PublicCatalogPage;