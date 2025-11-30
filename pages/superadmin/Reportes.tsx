import React from 'react';
import { Link } from 'react-router-dom';
import { SUPERADMIN_REPORTS_LIST } from '../../constants';
import PlaceholderPage from '../PlaceholderPage';

const SuperAdminReportes: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-iange-dark">Reportes Globales</h2>
                    <p className="mt-2 text-md text-gray-600">
                        Visualiza métricas y análisis de todo el sistema IANGE.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SUPERADMIN_REPORTS_LIST.map((report) => {
                        const Icon = report.icon;
                        return (
                            <div
                                key={report.id}
                                // Reemplazar con Link to={`/superadmin/reportes-globales/${report.id}`} cuando las páginas de detalle estén listas
                                className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:border-iange-orange/50 transform hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                            >
                                <div className="flex items-center justify-center w-12 h-12 bg-iange-salmon rounded-lg mb-4">
                                    <Icon className="h-6 w-6 text-iange-orange" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-iange-orange transition-colors">
                                    {report.title}
                                </h3>
                                <p className="mt-2 text-sm text-gray-600">
                                    {report.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
                 <div className="mt-8">
                    <PlaceholderPage title="Detalle de Reportes en Desarrollo"/>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminReportes;