import React, { useState, useMemo } from 'react';
import { MOCK_LOGS } from '../../constants';
import { Log } from '../../types';

const Logs: React.FC = () => {
    const [logs] = useState<Log[]>(MOCK_LOGS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('todos');
    const [filterResultado, setFilterResultado] = useState('todos');

    const uniqueRoles = useMemo(() => {
        const roles = new Set(logs.map(log => log.rol));
        return Array.from(roles);
    }, [logs]);
    
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const searchMatch = (
                log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.accion.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const roleMatch = filterRole === 'todos' || log.rol === filterRole;
            const resultadoMatch = filterResultado === 'todos' || log.resultado === filterResultado;

            return searchMatch && roleMatch && resultadoMatch;
        });
    }, [logs, searchTerm, filterRole, filterResultado]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-iange-dark mb-6">Logs y Auditoría del Sistema</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                <input
                    type="text"
                    placeholder="Buscar por usuario o acción..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-iange-orange focus:border-iange-orange bg-white text-gray-900 placeholder-gray-500"
                />
                <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white focus:ring-iange-orange focus:border-iange-orange text-gray-900"
                >
                    <option value="todos">Todos los Roles</option>
                    {uniqueRoles.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
                <select
                     value={filterResultado}
                    onChange={e => setFilterResultado(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white focus:ring-iange-orange focus:border-iange-orange text-gray-900"
                >
                    <option value="todos">Todos los Resultados</option>
                    <option value="Éxito">Éxito</option>
                    <option value="Error">Error</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha y Hora</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción Realizada</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-600">{log.fecha}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.usuario}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.rol}</td>
                                <td className="px-6 py-4 text-sm text-gray-800">{log.accion}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.resultado === 'Éxito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {log.resultado}
                                    </span>
                                </td>
                            </tr>
                        ))}
                         {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    No se encontraron logs que coincidan con los filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Logs;