import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { REPORTS_LIST } from '../constants';
import { Propiedad, User } from '../types';

interface ReporteDetalleProps {
    propiedades: Propiedad[];
    asesores: User[];
}

// --- HELPERS ---
const formatCurrency = (value: string | number) => {
    const number = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
    if (isNaN(number)) return 'N/A';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(number);
};
const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};
const getAsesorName = (id: number, asesores: User[]) => asesores.find(a => a.id === id)?.name || 'Desconocido';


// --- MAIN COMPONENTS ---
const ReportHeader: React.FC<{ title: string; onBack: () => void; asesores: User[]; onFilter: (filters: any) => void }> = ({ title, onBack, asesores, onFilter }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [asesorId, setAsesorId] = useState('todos');

    const handleFilterClick = () => {
        onFilter({ startDate, endDate, asesorId });
    };

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button onClick={onBack} className="text-sm font-semibold text-iange-orange hover:text-orange-600 mb-2">
                        &larr; Volver a la Central de Reportes
                    </button>
                    <h2 className="text-3xl font-bold text-iange-dark">{title}</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="px-4 py-2 bg-iange-salmon text-iange-dark font-semibold rounded-md text-sm hover:bg-orange-200">Exportar a PDF</button>
                    <button className="px-4 py-2 bg-iange-salmon text-iange-dark font-semibold rounded-md text-sm hover:bg-orange-200">Exportar a Excel</button>
                </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg">
                <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600">Rango de Fechas</label>
                    <div className="flex items-center space-x-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-iange-orange focus:border-iange-orange text-gray-900"/>
                        <span className="text-gray-500">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-iange-orange focus:border-iange-orange text-gray-900"/>
                    </div>
                </div>
                <div className="flex-1">
                    <label htmlFor="asesor-filter" className="text-xs font-medium text-gray-600">Asesor</label>
                    <select id="asesor-filter" value={asesorId} onChange={e => setAsesorId(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-iange-orange focus:border-iange-orange text-gray-900">
                        <option value="todos">Todos los asesores</option>
                        {asesores.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div className="self-end">
                    <button onClick={handleFilterClick} className="px-6 py-2 bg-iange-orange text-white rounded-md hover:bg-orange-600">Filtrar</button>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-iange-salmon p-4 rounded-lg text-center">
        <p className="text-sm font-semibold text-iange-dark">{title}</p>
        <p className="text-2xl font-bold text-iange-orange">{value}</p>
    </div>
);

const SimpleBarChart: React.FC<{ data: { label: string, value: number }[], title: string }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="p-6 border rounded-lg">
            <h3 className="font-bold text-lg mb-4">{title}</h3>
            <div className="flex items-end justify-around h-64 border-l border-b border-gray-200 pl-4 pb-4">
                {data.map(item => (
                    <div key={item.label} className="flex flex-col items-center w-1/12">
                        <div className="text-sm font-bold">{item.value}</div>
                        <div className="w-full bg-iange-orange hover:bg-orange-600 rounded-t-md mt-1" style={{ height: `${(item.value / maxValue) * 100}%` }}></div>
                        <span className="text-xs font-semibold mt-2">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- REPORT-SPECIFIC CONTENT COMPONENTS ---

const ReporteVentasContent: React.FC<{ propiedades: Propiedad[], asesores: User[] }> = ({ propiedades, asesores }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const propiedadesVendidas = propiedades.filter(p => p.status === 'Vendida' && p.fecha_venta);
    
    const filteredVendidas = useMemo(() => {
        if (!searchTerm) {
            return propiedadesVendidas;
        }
        return propiedadesVendidas.filter(p => {
            const asesorName = getAsesorName(p.asesorId, asesores);
            const searchString = `${p.calle} ${p.numero_exterior} ${asesorName}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });
    }, [propiedadesVendidas, asesores, searchTerm]);
    
    const ingresoTotal = propiedadesVendidas.reduce((sum, p) => sum + parseFloat(p.valor_operacion || '0'), 0);
    const valorPromedio = propiedadesVendidas.length > 0 ? ingresoTotal / propiedadesVendidas.length : 0;
    
    const totalDiasVenta = propiedadesVendidas.reduce((sum, p) => {
        const captacion = new Date(p.fecha_captacion).getTime();
        const venta = new Date(p.fecha_venta!).getTime();
        return sum + (venta - captacion);
    }, 0);
    const tiempoPromedioVenta = propiedadesVendidas.length > 0 
        ? Math.round((totalDiasVenta / propiedadesVendidas.length) / (1000 * 60 * 60 * 24))
        : 0;

    const monthlySalesData = propiedadesVendidas.reduce((acc, p) => {
        const month = new Date(p.fecha_venta!).toLocaleString('es-MX', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const chartData = Object.entries(monthlySalesData).map(([label, value]) => ({ label, value }));

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Ingreso Total" value={formatCurrency(ingresoTotal)} />
                <StatCard title="Propiedades Vendidas" value={String(propiedadesVendidas.length)} />
                <StatCard title="Valor Promedio de Venta" value={formatCurrency(valorPromedio)} />
                <StatCard title="Tiempo Promedio de Venta" value={`${tiempoPromedioVenta} días`} />
            </div>

            <SimpleBarChart data={chartData} title="Ventas Mensuales" />

            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Detalle de Operaciones Cerradas</h3>
                    <input
                        type="text"
                        placeholder="Buscar en resultados..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-xs px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900 placeholder-gray-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asesor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor de Venta</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha de Cierre</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredVendidas.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4">{`${p.calle} ${p.numero_exterior}`}</td>
                                    <td className="px-6 py-4">{getAsesorName(p.asesorId, asesores)}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(p.valor_operacion)}</td>
                                    <td className="px-6 py-4">{formatDate(p.fecha_venta)}</td>
                                </tr>
                            ))}
                            {filteredVendidas.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No hay resultados que coincidan con su búsqueda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ReporteCaptacionContent: React.FC<{ propiedades: Propiedad[], asesores: User[] }> = ({ propiedades, asesores }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredPropiedades = useMemo(() => {
        if (!searchTerm) {
            return propiedades;
        }
        return propiedades.filter(p => {
            const asesorName = getAsesorName(p.asesorId, asesores);
            const searchString = `${p.calle} ${p.numero_exterior} ${asesorName} ${p.fuente_captacion}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });
    }, [propiedades, asesores, searchTerm]);

    const totalCaptadas = propiedades.length;
    const enPromocion = propiedades.filter(p => p.status === 'En Promoción').length;
    const vendidas = propiedades.filter(p => p.status === 'Vendida').length;

    const captacionesPorFuente = propiedades.reduce((acc, p) => {
        acc[p.fuente_captacion] = (acc[p.fuente_captacion] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const chartDataFuente = Object.entries(captacionesPorFuente).map(([label, value]) => ({ label, value }));

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total de Propiedades Captadas" value={String(totalCaptadas)} />
                <StatCard title="Actualmente en Promoción" value={String(enPromocion)} />
                <StatCard title="Total Vendidas" value={String(vendidas)} />
            </div>

            <SimpleBarChart data={chartDataFuente} title="Captaciones por Fuente" />
            
             <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Detalle de Propiedades Captadas</h3>
                     <input
                        type="text"
                        placeholder="Buscar en resultados..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-xs px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900 placeholder-gray-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                         <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asesor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Captación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredPropiedades.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4">{`${p.calle} ${p.numero_exterior}`}</td>
                                    <td className="px-6 py-4">{getAsesorName(p.asesorId, asesores)}</td>
                                    <td className="px-6 py-4">{p.fuente_captacion}</td>
                                    <td className="px-6 py-4">{formatDate(p.fecha_captacion)}</td>
                                </tr>
                            ))}
                             {filteredPropiedades.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No hay resultados que coincidan con su búsqueda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const ReporteAsesorContent: React.FC<{ propiedades: Propiedad[], asesores: User[] }> = ({ propiedades, asesores }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const dataAsesores = asesores.map(asesor => {
        const propsAsesor = propiedades.filter(p => p.asesorId === asesor.id);
        const propsVendidas = propsAsesor.filter(p => p.status === 'Vendida');
        const totalVendido = propsVendidas.reduce((sum, p) => sum + parseFloat(p.valor_operacion || '0'), 0);
        return {
            ...asesor,
            captadas: propsAsesor.length,
            vendidas: propsVendidas.length,
            totalVendido: totalVendido,
            tasaCierre: propsAsesor.length > 0 ? (propsVendidas.length / propsAsesor.length) * 100 : 0
        };
    });
    
    const filteredData = useMemo(() => {
        if (!searchTerm) {
            return dataAsesores;
        }
        return dataAsesores.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [dataAsesores, searchTerm]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Rendimiento por Asesor</h3>
                <input
                    type="text"
                    placeholder="Buscar asesor..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full max-w-xs px-4 py-2 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-iange-orange text-gray-900 placeholder-gray-500"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                     <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asesor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prop. Captadas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prop. Vendidas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa de Cierre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total Vendido</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredData.map(d => (
                            <tr key={d.id}>
                                <td className="px-6 py-4 font-semibold">{d.name}</td>
                                <td className="px-6 py-4">{d.captadas}</td>
                                <td className="px-6 py-4">{d.vendidas}</td>
                                <td className="px-6 py-4">{d.tasaCierre.toFixed(1)}%</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(d.totalVendido)}</td>
                            </tr>
                        ))}
                         {filteredData.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No hay resultados que coincidan con su búsqueda.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PlaceholderContent: React.FC = () => (
    <div className="text-center p-16 border-dashed border-2 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-700">Reporte en Construcción</h3>
        <p className="text-gray-500 mt-2">
            La funcionalidad completa para este reporte estará disponible en una futura actualización.
        </p>
    </div>
);

const ReporteDetalle: React.FC<ReporteDetalleProps> = ({ propiedades, asesores }) => {
    const { reportId } = useParams<{ reportId: string }>();
    const navigate = useNavigate();
    const reportInfo = REPORTS_LIST.find(r => r.id === reportId);
    
    const [filteredProps, setFilteredProps] = useState<Propiedad[]>(propiedades);

    const handleFilter = (filters: { startDate: string, endDate: string, asesorId: string }) => {
        let tempProps = [...propiedades];
        const { startDate, endDate, asesorId } = filters;
        
        if (startDate && endDate) {
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime();
            tempProps = tempProps.filter(p => {
                const propDate = new Date(p.fecha_captacion).getTime();
                return propDate >= start && propDate <= end;
            });
        }
        
        if (asesorId !== 'todos') {
            tempProps = tempProps.filter(p => p.asesorId === Number(asesorId));
        }
        
        setFilteredProps(tempProps);
    };

    const renderContent = () => {
        switch(reportId) {
            case 'ventas':
                return <ReporteVentasContent propiedades={filteredProps} asesores={asesores} />;
            case 'captacion':
                return <ReporteCaptacionContent propiedades={filteredProps} asesores={asesores}/>;
            case 'asesor':
                return <ReporteAsesorContent propiedades={filteredProps} asesores={asesores}/>;
            // Add other cases here as they are implemented
            default:
                return <PlaceholderContent />;
        }
    };

    if (!reportInfo) {
        return (
            <div className="text-center p-16">
                <h2 className="text-2xl font-bold text-red-600">Reporte no encontrado</h2>
                <button onClick={() => navigate('/reportes')} className="mt-4 text-iange-orange font-semibold">
                    Volver a la Central de Reportes
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <ReportHeader title={reportInfo.title} onBack={() => navigate('/reportes')} asesores={asesores} onFilter={handleFilter} />
            {renderContent()}
        </div>
    );
};

export default ReporteDetalle;