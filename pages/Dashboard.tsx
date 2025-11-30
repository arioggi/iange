import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Propiedad, User } from '../types';
import { PRIMARY_DASHBOARD_BUTTONS } from '../constants';
import { BanknotesIcon, BuildingOfficeIcon, PresentationChartLineIcon, SparklesIcon } from '../components/Icons';

interface DashboardProps {
  propiedades: Propiedad[];
  asesores: User[];
}

const StatCard: React.FC<{ title: string; value: string; icon: React.FC<{ className?: string }>; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-start">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
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
          <StatCard title="Total de Propiedades" value={String(totalCaptadas)} icon={BuildingOfficeIcon} color="bg-blue-500" />
          <StatCard title="En Promoción" value={String(enPromocion)} icon={PresentationChartLineIcon} color="bg-iange-orange" />
          <StatCard title="Ventas (Últimos 30 días)" value={String(vendidasUltimos30Dias.length)} icon={SparklesIcon} color="bg-green-500" />
          <StatCard title="Ingresos (Últimos 30 días)" value={formatCurrency(ingresosUltimos30Dias)} icon={BanknotesIcon} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart + Recent Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Captaciones por Mes (Últimos 6 meses)</h3>
            <div className="flex items-end justify-around h-64 border-l border-b border-gray-200 pl-4 pb-4">
                {chartData.map(item => (
                    <div key={item.month} className="flex flex-col items-center w-1/12">
                        <div className="text-sm font-bold">{item.count}</div>
                        <div className="w-full bg-iange-salmon hover:bg-orange-200 rounded-t-md mt-1" style={{ height: `${(item.count / maxCaptaciones) * 100}%` }}></div>
                        <span className="text-xs font-semibold mt-2 text-gray-500 uppercase">{item.month}</span>
                    </div>
                ))}
            </div>
             <h3 className="text-lg font-bold text-gray-800 pt-4 border-t">Actividad Reciente</h3>
              <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asesor</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Captación</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {propiedadesRecientes.map(p => (
                                <tr key={p.id}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{`${p.calle} ${p.numero_exterior}`}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{getAsesorName(p.asesorId)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(p.fecha_captacion)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">{formatCurrency(parseFloat(p.valor_operacion))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-2 gap-4">
                    {PRIMARY_DASHBOARD_BUTTONS.map((button) => (
                        <button
                            key={button.label}
                            onClick={() => navigate(button.path)}
                            className="p-4 rounded-lg bg-iange-salmon text-iange-dark font-bold hover:bg-orange-200 text-center transition-colors"
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Equipo</h3>
                <ul className="space-y-3">
                    {asesores.map(asesor => (
                         <li key={asesor.id} className="flex items-center">
                             <div className="w-9 h-9 bg-iange-salmon rounded-full flex items-center justify-center text-iange-orange font-bold">
                                {asesor.photo}
                            </div>
                             <div className="ml-3">
                                <p className="text-sm font-medium text-gray-800">{asesor.name}</p>
                                <p className="text-xs text-gray-500">{asesor.role}</p>
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