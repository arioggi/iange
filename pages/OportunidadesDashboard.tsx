import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Propiedad, User, CompanySettings, Propietario, Comprador, UserPermissions } from '../types';
import { PRIMARY_DASHBOARD_BUTTONS, ROLES } from '../constants';
import { BanknotesIcon, BuildingOfficeIcon, SparklesIcon, UsersIcon } from '../components/Icons';
import Avatar from '../components/ui/Avatar'; 

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

const parseCurrencyString = (value: string | undefined): number => {
    if (!value) return 0;
    const sanitized = value.toString().replace(/[^0-9.-]+/g, '');
    return parseFloat(sanitized) || 0;
};

const OportunidadesDashboard: React.FC<OportunidadesDashboardProps> = ({ 
    propiedades, 
    asesores, 
    companySettings,
    isLoading,
    currentUser
}) => {
  const navigate = useNavigate();
  const [isChartVisible, setIsChartVisible] = useState(false);

  // ✅ 1. LÓGICA DE ACTIVIDAD REAL (El "Candado")
  const hasRealActivity = useMemo(() => {
      // Validamos que los arrays existan antes de medir longitud
      const propsCount = propiedades?.length || 0;
      const teamCount = asesores?.length || 0;
      
      const hasProperties = propsCount > 0;
      const hasTeam = teamCount > 1; // >1 porque el usuario logueado cuenta como 1
      
      // Solo cuenta si hay una URL válida (ignoramos onboarded: true de la BD)
      const hasLogo = Boolean(companySettings?.logo_url && companySettings.logo_url.trim() !== '');
      
      // LOG DE DEPURACIÓN (Míralo en Consola F12 si algo falla)
      console.log("🔍 [Dashboard Check] Activity:", { hasProperties, hasTeam, hasLogo, propsCount, teamCount, logo: companySettings?.logo_url });
      
      return hasProperties || hasTeam || hasLogo;
  }, [propiedades, asesores, companySettings]);

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

  if (isLoading) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-iange-orange"></div>
          </div>
      );
  }

  // ✅ 2. BLOQUEO DE PANTALLA (SI NO HAY ACTIVIDAD)
  // Si hasRealActivity es FALSE, retornamos los banners Y NO el dashboard.
  if (!hasRealActivity) {
      
      // --- ESCENARIO A: NO TIENE PLAN (Banner Naranja) ---
      if (!currentUser.planId) {
          return (
              <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in px-4">
                  <div className="bg-white p-10 rounded-2xl shadow-xl border-2 border-orange-100 max-w-3xl w-full text-center">
                      <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                         <span className="text-4xl">👋</span>
                      </div>
                      <h2 className="text-3xl font-extrabold text-gray-900 mb-4">¡Bienvenido a IANGE!</h2>
                      <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
                          Estás a un paso de digitalizar tu inmobiliaria. Para comenzar a gestionar propiedades y equipo, primero <strong>activa tu cuenta</strong>.
                          <br/><br/>
                          <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-bold border border-orange-200">
                             🎁 ¡Te regalamos los primeros 30 días!
                          </span>
                      </p>
                      <button 
                          onClick={() => navigate('/configuraciones/facturacion')}
                          className="bg-orange-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-orange-700 transition shadow-lg hover:shadow-orange-500/30 transform hover:-translate-y-1"
                      >
                          Ver Planes y Comenzar
                      </button>
                  </div>
              </div>
          );
      }

      // --- ESCENARIO B: TIENE PLAN PERO NO ACTIVIDAD (Banner Verde) ---
      return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in px-4">
               <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-green-50 max-w-5xl w-full text-center">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <SparklesIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-2">¡Todo listo para arrancar! 🚀</h2>
                  <p className="text-gray-600 mb-10 max-w-2xl mx-auto text-lg">
                      Tienes <strong>30 días de regalo</strong>. Completa al menos una de estas acciones para desbloquear tu Dashboard:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <button onClick={() => navigate('/configuraciones/personal')} className="flex flex-col items-center p-6 bg-gray-50 rounded-xl hover:bg-green-50 border-2 border-transparent hover:border-green-200 transition-all group duration-300">
                          <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                              <UsersIcon className="h-8 w-8 text-green-600" />
                          </div>
                          <span className="text-lg font-bold text-gray-800 group-hover:text-green-700">1. Añade tu equipo</span>
                          <span className="text-sm text-gray-500 mt-1">Invita a tus asesores</span>
                      </button>

                       <button onClick={() => navigate('/clientes')} className="flex flex-col items-center p-6 bg-gray-50 rounded-xl hover:bg-green-50 border-2 border-transparent hover:border-green-200 transition-all group duration-300">
                          <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                              <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
                          </div>
                          <span className="text-lg font-bold text-gray-800 group-hover:text-green-700">2. Crea una propiedad</span>
                          <span className="text-sm text-gray-500 mt-1">Sube tu primer inmueble</span>
                      </button>

                       <button onClick={() => navigate('/configuraciones/perfil')} className="flex flex-col items-center p-6 bg-gray-50 rounded-xl hover:bg-green-50 border-2 border-transparent hover:border-green-200 transition-all group duration-300">
                          <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                              <SparklesIcon className="h-8 w-8 text-green-600" />
                          </div>
                          <span className="text-lg font-bold text-gray-800 group-hover:text-green-700">3. Sube tu Logo</span>
                          <span className="text-sm text-gray-500 mt-1">Personaliza tu marca</span>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // ✅ 3. DASHBOARD COMPLETO (Solo llega aquí si hasRealActivity es TRUE)
  const propiedadesActivas = propiedades.filter(p => p.status !== 'Vendida');
  const totalActivas = propiedadesActivas.length;
  const valorCarteraActiva = propiedadesActivas.reduce((sum, p) => sum + parseCurrencyString(p.valor_operacion), 0);
  
  const propiedadesVendidas = propiedades.filter(p => p.status === 'Vendida');
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
          if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
      }
  });
  
  const chartData = monthData.map(m => ({ month: m.label, count: counts.get(m.key) || 0 }));
  const maxCaptaciones = Math.max(...chartData.map(d => d.count), 1);

  const propiedadesRecientes = [...propiedades].sort((a, b) => new Date(b.fecha_captacion).getTime() - new Date(a.fecha_captacion).getTime()).slice(0, 5);
  const getAsesorName = (id: number) => asesores.find(a => a.id === id)?.name || 'N/A';

  return (
    <div className="space-y-8 animate-fade-in">
        {/* --- HEADER --- */}
        <div className="flex items-center space-x-5 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="relative">
                <Avatar src={currentUser.photo} name={currentUser.name} size="xl" border={true} />
                <div className="absolute bottom-1 right-1 h-5 w-5 bg-green-400 border-2 border-white rounded-full"></div>
            </div>

            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Hola, {currentUser.name.split(' ')[0]} 👋
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Aquí tienes el resumen de tu actividad inmobiliaria de hoy.
                </p>
            </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Propiedades Activas" value={String(totalActivas)} icon={BuildingOfficeIcon} color="bg-blue-500" subTitle="Valor Total de Cartera" subValue={formatCurrency(valorCarteraActiva)} />
          <StatCard title="Ventas" value={String(propiedadesVendidas.length)} icon={SparklesIcon} color="bg-green-500" subTitle="Valor Total de Ventas" subValue={formatCurrency(valorVentasTotales)} />
          <StatCard title="Ingresos por Comisión" value={formatCurrency(ingresosTotales)} icon={BanknotesIcon} color="bg-purple-500" subTitle="Comisión Promedio" subValue={formatCurrency(comisionPromedio)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Captaciones por Mes (Últimos 6 meses)</h3>
            <div className="flex items-end justify-around h-64 border-l border-b border-gray-200 pl-4 pb-4">
                {chartData.map(item => (
                    <div key={item.month} className="flex flex-col items-center w-1/12">
                        <div className="text-sm font-bold text-gray-800">{item.count}</div>
                        <div className="w-full bg-iange-orange rounded-t-md mt-1 transition-[height] duration-700 ease-out" style={{ height: isChartVisible ? `${(item.count / maxCaptaciones) * 170}px` : '0px' }}></div>
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
                        <button key={button.label} onClick={() => navigate(button.path)} className="p-4 rounded-lg bg-iange-salmon text-iange-dark font-bold hover:bg-orange-200 text-center transition-colors">
                            {button.label}
                        </button>
                    ))}
                </div>
                {visibleButtons.length === 0 && <p className="text-center text-gray-500 py-4 text-sm">No tienes accesos directos disponibles.</p>}
            </div>
             
             <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Equipo</h3>
                <ul className="space-y-3">
                    {asesores.map(asesor => {
                         const isMe = String(asesor.id) === String(currentUser.id) || asesor.email === currentUser.email;
                         const realPhoto = isMe ? currentUser.photo : asesor.photo;

                         return (
                            <li key={asesor.id} className="flex items-center">
                                <Avatar 
                                    src={realPhoto} 
                                    name={asesor.name} 
                                    size="sm" 
                                    className="w-9 h-9" 
                                />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-800">{asesor.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{asesor.role}</p>
                                </div>
                            </li>
                         );
                    })}
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