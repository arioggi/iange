import React, { useState, useEffect, useMemo } from 'react';
import adapter from '../../data/localStorageAdapter';
import { BuildingOfficeIcon, UserGroupIcon, ChartBarIcon, BanknotesIcon, GlobeAltIcon, SparklesIcon } from '../../components/Icons';
import { Tenant } from '../../types';

interface GlobalStats {
    totalCompanies: number;
    totalUsers: number;
    totalProperties: number;
    globalSales: number;
    portfolioValue: number;
    rolesDistribution: Record<string, number>;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.FC<{ className?: string }>; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-start">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const BarChart: React.FC<{ data: { label: string, value: number }[], title: string, isChartVisible: boolean }> = ({ data, title, isChartVisible }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeightPx = 170; // Max height for bars in pixels

    return (
        <div className="p-6 border rounded-lg bg-white shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-800">{title}</h3>
            <div className="flex items-end justify-around h-64 border-l border-b border-gray-200 pl-4 pb-4">
                {data.map(item => (
                    <div key={item.label} className="flex flex-col items-center w-1/12">
                        <div className="text-sm font-bold text-gray-800">{item.value}</div>
                        <div 
                            className="w-full bg-iange-orange rounded-t-md mt-1 transition-[height] duration-700 ease-out" 
                            style={{ 
                                height: isChartVisible ? `${(item.value / maxValue) * chartHeightPx}px` : '0px' 
                            }}>
                        </div>
                        <span className="text-xs font-semibold mt-2 text-gray-500 uppercase">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PieChart: React.FC<{ data: { label: string, value: number, color: string }[], title: string }> = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="p-6 border rounded-lg bg-white shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-gray-800">{title}</h3>
                <div className="flex items-center justify-center h-48">
                    <p className="text-gray-500">No hay datos para mostrar.</p>
                </div>
            </div>
        );
    }
    const gradientParts = [];
    let cumulativePercent = 0;

    for (const item of data) {
        const percent = (item.value / total) * 100;
        gradientParts.push(`${item.color} ${cumulativePercent}% ${cumulativePercent + percent}%`);
        cumulativePercent += percent;
    }

    return (
        <div className="p-6 border rounded-lg bg-white shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-800">{title}</h3>
            <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                <div 
                    className="w-48 h-48 rounded-full" 
                    style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}
                ></div>
                <ul className="space-y-2">
                    {data.map(item => (
                        <li key={item.label} className="flex items-center">
                            <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                            <span className="text-sm font-medium text-gray-700">{item.label}: {item.value} ({(item.value / total * 100).toFixed(1)}%)</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const SuperAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [companies, setCompanies] = useState<Tenant[]>([]);
    const [isChartVisible, setIsChartVisible] = useState(false);

    useEffect(() => {
        setStats(adapter.getGlobalStats());
        setCompanies(adapter.getAllCompanies());
        const timer = setTimeout(() => setIsChartVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // --- Dynamic Chart Data Generation ---
    const chartDataEmpresas = useMemo(() => {
        const today = new Date();
        const monthData: { key: string, label: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace(/\./g, '');
            monthData.push({ key, label });
        }
        
        const counts = new Map<string, number>();
        monthData.forEach(m => counts.set(m.key, 0));

        companies.forEach(empresa => {
            if (empresa.fechaRegistro) {
                const registroDate = new Date(empresa.fechaRegistro);
                const key = `${registroDate.getFullYear()}-${String(registroDate.getMonth() + 1).padStart(2, '0')}`;
                if (counts.has(key)) {
                    counts.set(key, counts.get(key)! + 1);
                }
            }
        });
        
        return monthData.map(m => ({
            label: m.label,
            value: counts.get(m.key) || 0,
        }));
    }, [companies]);

    const pieDataRoles = useMemo(() => {
        if (!stats) return [];
        const { rolesDistribution } = stats;
        return [
            { label: 'Admin Empresa', value: rolesDistribution['adminempresa'] || 0, color: '#FFA75A' },
            { label: 'Asesor', value: rolesDistribution['asesor'] || 0, color: '#FFC7A1' },
            { label: 'Otros', value: (rolesDistribution['empresa'] || 0) + (rolesDistribution['gestor'] || 0) + (rolesDistribution['notaria'] || 0), color: '#FFDDC1' },
        ];
    }, [stats]);
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

    if (!stats) {
        return <div>Cargando...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total de Empresas" value={String(stats.totalCompanies)} icon={BuildingOfficeIcon} color="bg-blue-500" />
                <StatCard title="Total de Usuarios" value={String(stats.totalUsers)} icon={UserGroupIcon} color="bg-green-500" />
                <StatCard title="Propiedades Gestionadas" value={String(stats.totalProperties)} icon={ChartBarIcon} color="bg-purple-500" />
                <StatCard title="Ventas Globales" value={String(stats.globalSales)} icon={SparklesIcon} color="bg-yellow-500" />
                <StatCard title="Ingresos Globales" value={formatCurrency(0)} icon={BanknotesIcon} color="bg-red-500" />
                <StatCard title="Valor de Cartera" value={formatCurrency(stats.portfolioValue)} icon={GlobeAltIcon} color="bg-iange-orange" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <BarChart data={chartDataEmpresas} title="Empresas Creadas por Mes" isChartVisible={isChartVisible} />
                <PieChart data={pieDataRoles} title="Distribución de Roles Globales" />
            </div>
        </div>
    );
};

export default SuperAdminDashboard;