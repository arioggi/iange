import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Propiedad, User } from '../types';
import { PRIMARY_DASHBOARD_BUTTONS } from '../constants';
import { BanknotesIcon, BuildingOfficeIcon, PresentationChartLineIcon, SparklesIcon } from '../components/Icons';

interface DashboardProps {
  propiedades: Propiedad[];
  asesores: User[];
}

// 1. STAT CARD LIMPIA: Sin border, solo shadow-sm
const StatCard: React.FC<{ title: string; value: string; icon: React.FC<{ className?: string }>; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm flex items-start transition-shadow hover:shadow-md">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm ${color}`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Dashboard: React.FC<DashboardProps> = ({ propiedades, asesores }) => {
  const navigate = useNavigate();

  // KPI Calculations
  const totalCaptadas = propiedades.length;
  const enPromocion = propiedades.filter(p => p.status === 'En Promoción').length;
  
  const hoy = new Date();
  const hace30Dias = new Date(new Date().setDate(hoy.getDate() - 30));

  const vendidasUltimos30Dias = propiedades.filter(p => 
      p.status === 'Vendida' && p.fecha_venta && new Date(p.fecha_venta) >= hace30Dias
  );
  
  const ingresosUltimos30Dias = vendidasUltimos30Dias.reduce((sum, p) => sum + parseFloat(p.valor_operacion || '0'), 0);

  // Chart Data
  const captacionesPorMes: { [key: string]: number } = {};
  for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toLocaleString('es-MX', { month: 'short' });
      captacionesPorMes[monthKey] = 0;
  }
  
  propiedades.forEach(p => {
      const captacionDate = new Date(p.fecha_captacion);
      if (captacionDate > new Date(new Date().setMonth(hoy.getMonth() - 6))) {
          const monthKey = captacionDate.toLocaleString('es-MX', { month: 'short' });
          if(captacionesPorMes[monthKey] !== undefined) {
             captacionesPorMes[monthKey]++;
          }
      }
  });

  const chartData = Object.entries(captacionesPorMes).map(([month, count]) => ({ month, count }));
  const maxCaptaciones = Math.max(...chartData.map(d => d.count), 1);

  // Recent Activity
  const propiedadesRecientes = [...propiedades].sort((a, b) => new Date(b.fecha_captacion).getTime() - new Date(a.fecha_captacion).getTime()).slice(0, 5);
  const getAsesorName = (id: number) => asesores.find(a => a.id === id)?.name || 'N/A';

  return (
    <div className="space-y-8">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total de Propiedades" value={String(totalCaptadas)} icon={BuildingOfficeIcon} color="bg-blue-600" />
          <StatCard title="En Promoción" value={String(enPromocion)} icon={PresentationChartLineIcon} color="bg-iange-orange" />
          <StatCard title="Ventas (Últimos 30 días)" value={String(vendidasUltimos30Dias.length)} icon={SparklesIcon} color="bg-green-600" />
          <StatCard title="Ingresos (Últimos 30 días)" value={formatCurrency(ingresosUltimos30Dias)} icon={BanknotesIcon} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart + Recent Activity */}
        {/* 2. TARJETA PRINCIPAL: bg-white shadow-sm (SIN BORDER) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-lg shadow-sm space-y-8">
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Captaciones por Mes (Últimos 6 meses)</h3>
                <div className="flex items-end justify-around h-64 border-l border-b border-gray-100 pl-4 pb-4">
                    {chartData.map(item => (
                        <div key={item.month} className="flex flex-col items-center w-1/12 group relative">
                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                {item.count} Props
                            </div>
                            <div 
                                className="w-full bg-iange-salmon hover:bg-iange-orange rounded-t-md transition-all duration-300" 
                                style={{ height: `${(item.count / maxCaptaciones) * 100}%` }}
                            ></div>
                            <span className="text-xs font-semibold mt-3 text-gray-400 uppercase">{item.month}</span>
                        </div>
                    ))}
                </div>
            </div>

             <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Actividad Reciente</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg">Propiedad</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asesor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {propiedadesRecientes.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{`${p.calle} ${p.numero_exterior}`}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{getAsesorName(p.asesorId)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(p.fecha_captacion)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(parseFloat(p.valor_operacion))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>

        {/* Quick Actions & Team */}
        <div className="space-y-6">
            
            {/* 3. TARJETAS LATERALES: bg-white shadow-sm (SIN BORDER) */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-2 gap-4">
                    {PRIMARY_DASHBOARD_BUTTONS.map((button) => (
                        <button
                            key={button.label}
                            onClick={() => navigate(button.path)}
                            className="p-4 rounded-lg bg-iange-orange text-white font-medium hover:bg-orange-600 shadow-sm hover:shadow-md transition-all text-sm text-center flex items-center justify-center h-20"
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
            </div>
            
             <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Equipo</h3>
                <ul className="space-y-4">
                    {asesores.map(asesor => (
                         <li key={asesor.id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                             <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-iange-orange font-bold text-sm border border-orange-100">
                                {asesor.photo}
                            </div>
                             <div className="ml-3">
                                <p className="text-sm font-bold text-gray-800">{asesor.name}</p>
                                <p className="text-xs text-gray-500 font-medium">{asesor.role}</p>
                             </div>
                         </li>
                    ))}
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;