import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Propiedad } from '../types';
import { MapPinIcon } from '../components/Icons'; 

const PublicCatalogPage = () => {
    const { tenantId } = useParams();
    const [propiedades, setPropiedades] = useState<any[]>([]); // Usamos any para flexibilidad con features
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'todos' | 'venta' | 'renta'>('todos');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!tenantId) return;

            try {
                // 1. Obtener datos de la empresa (Traemos TODO para evitar error 400)
                const { data: tenantData, error: tenantError } = await supabase
                    .from('tenants')
                    .select('*') 
                    .eq('id', tenantId)
                    .single();
                
                if (tenantError) console.error("Error empresa:", tenantError);
                if (tenantData) setEmpresa(tenantData);

                // 2. Obtener propiedades (Traemos TODO para evitar error de columnas faltantes)
                const { data: propsData, error: propsError } = await supabase
                    .from('propiedades')
                    .select('*') 
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false });

                if (propsError) console.error("Error propiedades:", propsError);

                if (propsData) {
                    // Mapeo seguro: Si el dato no está afuera, lo busca adentro de 'features'
                    const propsMapeadas = propsData.map((p: any) => ({
                        ...p,
                        // Prioridad: Columna directa -> Features -> Default
                        recamaras: p.recamaras || p.features?.recamaras || 0,
                        banos: p.banos || p.features?.banos || p.features?.banos_completos || 0,
                        m2Terreno: p.m2Terreno || p.features?.m2Terreno || p.features?.terreno_m2 || 0,
                        // Aseguramos que titulo y ubicacion existan
                        titulo: p.titulo || `${p.features?.calle || 'Propiedad'} ${p.features?.numero_exterior || ''}`,
                        municipio: p.municipio || p.features?.municipio || '',
                        estado: p.estado || p.features?.estado || '',
                        tipoOperacion: p.tipoOperacion || p.tipo || 'Venta'
                    }));
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
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* --- HEADER DE LA EMPRESA --- */}
            <header className="bg-white shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        {empresa?.logo_url ? (
                            <img src={empresa.logo_url} alt="Logo" className="h-12 object-contain" />
                        ) : (
                            // Fallback inteligente para el nombre
                            <h1 className="text-2xl font-bold text-gray-800">{empresa?.name || empresa?.nombre || 'Inmobiliaria'}</h1>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {empresa?.telefono && (
                            <a href={`https://wa.me/${empresa.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-colors">
                                WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* --- CONTENIDO --- */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                
                {/* BUSCADOR Y FILTROS */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center">
                    <input 
                        type="text" 
                        placeholder="Buscar propiedad..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setFilterStatus('todos')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'todos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Todas</button>
                        <button onClick={() => setFilterStatus('venta')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'venta' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>Venta</button>
                        <button onClick={() => setFilterStatus('renta')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'renta' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>Renta</button>
                    </div>
                </div>

                {/* GRID DE PROPIEDADES */}
                {filteredProperties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProperties.map(prop => (
                            <div 
                                key={prop.id} 
                                onClick={() => handlePropertyClick(prop.id)}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border border-gray-100 group"
                            >
                                <div className="h-56 bg-gray-200 relative overflow-hidden">
                                    {prop.imagenes && prop.imagenes.length > 0 ? (
                                        <img src={prop.imagenes[0]} alt={prop.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">Sin Imagen</div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                         <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase shadow-sm ${
                                            prop.tipoOperacion === 'Renta' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                                        }`}>
                                            {prop.tipoOperacion}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-bold text-gray-900 shadow-sm">
                                       {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(prop.precio || 0)}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{prop.titulo}</h3>
                                    <div className="flex items-center text-gray-500 text-sm mb-4">
                                        <MapPinIcon className="h-4 w-4 mr-1" />
                                        {prop.municipio}, {prop.estado}
                                    </div>
                                    <div className="flex justify-between border-t pt-4 text-sm text-gray-600">
                                        <span>🛏️ {prop.recamaras} Rec.</span>
                                        <span>🚿 {prop.banos} Baños</span>
                                        <span>📐 {prop.m2Terreno} m²</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">No hay propiedades disponibles en este momento.</p>
                    </div>
                )}
            </main>

            <footer className="bg-white border-t mt-12 py-8 text-center text-gray-400 text-sm">
                <p>© {new Date().getFullYear()} {empresa?.name || empresa?.nombre || 'Inmobiliaria'}. Todos los derechos reservados.</p>
                <p className="mt-1 text-xs">Powered by IANGE</p>
            </footer>
        </div>
    );
};

export default PublicCatalogPage;