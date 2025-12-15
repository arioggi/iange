import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Propiedad, User, CompanySettings, Propietario, Comprador, UserPermissions } from '../types';
import { PRIMARY_DASHBOARD_BUTTONS, ROLES } from '../constants';
import { BanknotesIcon, BuildingOfficeIcon, PresentationChartLineIcon, SparklesIcon, UsersIcon } from '../components/Icons';

interface OportunidadesDashboardProps {
  propiedades: Propiedad[];
  asesores: User[];
  propietarios: Propietario[];
  compradores: Comprador[];
  companySettings?: CompanySettings | null;
  isLoading?: boolean;
  currentUser: User;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  subTitle?: string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subTitle, subValue }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-start">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-grow">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {subTitle && subValue && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500">{subTitle}</p>
                    <p className="text-lg font-semibold text-gray-700">{subValue}</p>
                </div>
            )}
        </div>
    </div>
);

const WelcomeCard: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="bg-white p-8 rounded-lg shadow-md border-2 border-iange-orange text-center animate-fade-in-down">
            <h2 className="text-2xl font-bold text-iange-dark">¡Bienvenido a IANGE!</h2>
            <p className="mt-2 text-gray-600">Estás a solo unos pasos de optimizar tu gestión inmobiliaria. Comienza por aquí:</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <button onClick={() => navigate('/configuraciones/personal')} className="flex flex-col items-center p-6 bg-iange-salmon rounded-lg hover:bg-orange-200 transition-colors transform hover:-translate-y-1">
                    <UsersIcon className="h-10 w-10 text-iange-orange mb-2" />
                    <span className="font-bold text-iange-dark">1. Añade tu primer usuario</span>
                </button>
                 <button onClick={() => navigate('/clientes')} className="flex flex-col items-center p-6 bg-iange-salmon rounded-lg hover:bg-orange-200 transition-colors transform hover:-translate-y-1">
                    <BuildingOfficeIcon className="h-10 w-10 text-iange-orange mb-2" />
                    <span className="font-bold text-iange-dark">2. Crea tu primera propiedad</span>
                </button>
                 <button onClick={() => navigate('/configuraciones/perfil')} className="flex flex-col items-center p-6 bg-iange-salmon rounded-lg hover:bg-orange-200 transition-colors transform hover:-translate-y-1">
                    <SparklesIcon className="h-10 w-10 text-iange-orange mb-2" />
                    <span className="font-bold text-iange-dark">3. Configura tus preferencias</span>
                </button>
            </div>
        </div>
    );
};


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

// CORRECCIÓN CRÍTICA: Parsing robusto para limpiar comas, signos de pesos y espacios
const parseCurrencyString = (value: string | undefined): number => {
    if (!value) return 0;
    // Eliminamos todo lo que NO sea número, punto o guión
    const sanitized = value.toString().replace(/[^0-9.-]+/g, '');
    return parseFloat(sanitized) || 0;
};

const OportunidadesDashboard: React.FC<OportunidadesDashboardProps> = ({ 
    propiedades, 
    asesores, 
    propietarios, 
    compradores, 
    companySettings,
    isLoading,
    currentUser
}) => {
  const navigate = useNavigate();
  const [isChartVisible, setIsChartVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        setIsChartVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  const visibleButtons = useMemo(() => {
      if (currentUser.role === ROLES.SUPER_ADMIN) return PRIMARY_DASHBOARD_BUTTONS;
      const perms = currentUser.permissions || {} as UserPermissions;
      return PRIMARY_DASHBOARD_BUTTONS.filter(btn => {
          if (!btn.permissionKey) return true;
          return !!perms[btn.permissionKey];
      });
  }, [currentUser]);

  const hasRealActivity = useMemo(() => {
      const hasProperties = propiedades.length > 0;
      const hasTeam = asesores.length > 1; 
      const isOnboardedFlag = companySettings?.onboarded === true;
      return hasProperties || hasTeam || isOnboardedFlag;
  }, [propiedades, asesores, companySettings]);

  if (isLoading) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iange-orange"></div>
          </div>
      );
  }

  if (!hasRealActivity) {
      return <WelcomeCard />;
  }

  const propiedadesActivas = propiedades.filter(p => p.status !== 'Vendida');
  const totalActivas = propiedadesActivas.length;
  // Usamos el nuevo parser robusto
  const valorCarteraActiva = propiedadesActivas.reduce((sum, p) => sum + parseCurrencyString(p.valor_operacion), 0);
  
  const propiedadesVendidas = propiedades.filter(p => p.status === 'Vendida');
  // Usamos el nuevo parser robusto
  const valorVentasTotales = propiedadesVendidas.reduce((sum, p) => sum + parseCurrencyString(p.valor_operacion), 0);

  const ingresosTotales = propiedadesVendidas.reduce((sum, p) => {
    const comisionTotalPropiedad = (p.comisionOficina || 0) + (p.comisionAsesor || 0) + (p.comisionCompartida || 0);
    return sum + comisionTotalPropiedad;
  }, 0);
  const comisionPromedio = propiedadesVendidas.length > 0 ? ingresosTotales / propiedadesVendidas.length : 0;

  const monthData: { key: string, label: string }[] = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace(/\./g, '');
      monthData.push({ key, label });
  }
  
  const counts = new Map<string, number>();
  monthData.forEach(m => counts.set(m.key, 0));

  propiedades.forEach(p => {
      if (p.fecha_captacion) {
          const captacionDate = new Date(p.fecha_captacion);
          const key = `${captacionDate.getFullYear()}-${String(captacionDate.getMonth() + 1).padStart(2, '0')}`;
          
          if (counts.has(key)) {
              counts.set(key, counts.get(key)! + 1);
          }
      }
  });
  
  const chartData = monthData.map(m => ({
      month: m.label,
      count: counts.get(m.key) || 0,
  }));
  
  const maxCaptaciones = Math.max(...chartData.map(d => d.count), 1);

  const propiedadesRecientes = [...propiedades].sort((a, b) => new Date(b.fecha_captacion).getTime() - new Date(a.fecha_captacion).getTime()).slice(0, 5);
  const getAsesorName = (id: number) => asesores.find(a => a.id === id)?.name || 'N/A';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
              title="Propiedades Activas" 
              value={String(totalActivas)} 
              icon={BuildingOfficeIcon} 
              color="bg-blue-500"
              subTitle="Valor Total de Cartera"
              subValue={formatCurrency(valorCarteraActiva)}
          />
          <StatCard 
              title="Ventas" 
              value={String(propiedadesVendidas.length)} 
              icon={SparklesIcon} 
              color="bg-green-500"
              subTitle="Valor Total de Ventas"
              subValue={formatCurrency(valorVentasTotales)}
          />
          <StatCard 
              title="Ingresos por Comisión" 
              value={formatCurrency(ingresosTotales)} 
              icon={BanknotesIcon} 
              color="bg-purple-500"
              subTitle="Comisión Promedio"
              subValue={formatCurrency(comisionPromedio)}
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Captaciones por Mes (Últimos 6 meses)</h3>
            <div className="flex items-end justify-around h-64 border-l border-b border-gray-200 pl-4 pb-4">
                {chartData.map(item => (
                    <div key={item.month} className="flex flex-col items-center w-1/12">
                        <div className="text-sm font-bold text-gray-800">{item.count}</div>
                        <div 
                            className="w-full bg-iange-orange rounded-t-md mt-1 transition-[height] duration-700 ease-out" 
                            style={{ 
                                height: isChartVisible ? `${(item.count / maxCaptaciones) * 170}px` : '0px' 
                            }}>
                        </div>
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
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{getAsesorName(Number(p.asesorId))}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(p.fecha_captacion)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">{formatCurrency(parseCurrencyString(p.valor_operacion))}</td>
                                </tr>
                            ))}
                             {propiedadesRecientes.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No hay actividad reciente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-2 gap-4">
                    {visibleButtons.map((button) => (
                        <button
                            key={button.label}
                            onClick={() => navigate(button.path)}
                            className="p-4 rounded-lg bg-iange-salmon text-iange-dark font-bold hover:bg-orange-200 text-center transition-colors"
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
                {visibleButtons.length === 0 && (
                    <p className="text-center text-gray-500 py-4 text-sm">No tienes accesos directos disponibles.</p>
                )}
            </div>
             <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Equipo</h3>
                <ul className="space-y-3">
                    {asesores.map(asesor => (
                         <li key={asesor.id} className="flex items-center">
                             <div className="w-9 h-9 bg-iange-salmon rounded-full flex items-center justify-center text-iange-orange font-bold text-sm uppercase">
                                {asesor.photo}
                            </div>
                             <div className="ml-3">
                                <p className="text-sm font-medium text-gray-800">{asesor.name}</p>
                                <p className="text-xs text-gray-500">{asesor.role}</p>
                             </div>
                         </li>
                    ))}
                     {asesores.length === 0 && (
                        <li className="text-center text-sm text-gray-500 py-4">No hay usuarios en esta empresa.</li>
                    )}
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OportunidadesDashboard;