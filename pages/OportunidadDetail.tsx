
import React, { useState, useCallback, useMemo } from 'react';
import { MOCK_OPORTUNIDAD, ETAPAS_FLUJO } from '../constants';
import { Documento, DocumentoStatus, Oportunidad } from '../types';
import StatusBadge from '../components/StatusBadge';

const Stepper: React.FC<{ etapas: string[], etapaActual: number }> = ({ etapas, etapaActual }) => {
    return (
        <nav className="flex items-center text-sm font-medium text-gray-500 mb-8 overflow-x-auto pb-2">
            {etapas.map((etapa, index) => (
                <React.Fragment key={etapa}>
                    <div className={`whitespace-nowrap ${index + 1 === etapaActual ? 'text-iange-orange font-bold' : ''} ${index + 1 < etapaActual ? 'text-green-600' : ''}`}>
                        {etapa}
                    </div>
                    {index < etapas.length - 1 && <span className="mx-2 text-gray-400 font-bold">&gt;</span>}
                </React.Fragment>
            ))}
        </nav>
    );
};

const DocumentoItem: React.FC<{ doc: Documento, onStatusChange: (id: number, status: DocumentoStatus) => void, onFileChange: (id: number, files: FileList | null) => void }> = ({ doc, onStatusChange, onFileChange }) => {
    return (
        <div className="border p-4 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div>
                <p className="font-semibold text-gray-800">{doc.nombre}</p>
                <p className="text-sm text-gray-500">{doc.categoria}</p>
            </div>
            <div className="flex items-center space-x-4">
                <StatusBadge status={doc.status} />
                <input type="file" multiple className="text-sm" onChange={(e) => onFileChange(doc.id, e.target.files)} />
                {doc.status === DocumentoStatus.PENDIENTE && (
                     <button onClick={() => onStatusChange(doc.id, DocumentoStatus.VALIDADO)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Validar</button>
                )}
                 {doc.status === DocumentoStatus.VALIDADO && (
                     <button onClick={() => onStatusChange(doc.id, DocumentoStatus.RECHAZADO)} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Rechazar</button>
                )}
            </div>
        </div>
    );
};

const ValidacionItem: React.FC<{ label: string, validado: boolean, onValidate: () => void }> = ({ label, validado, onValidate }) => {
    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <p className="font-semibold">{label}</p>
            {validado ? 
                <span className="flex items-center font-semibold text-green-600">✓ Verificado</span> :
                <button onClick={onValidate} className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Verificar</button>
            }
        </div>
    );
};

const OportunidadDetail: React.FC = () => {
  const [oportunidad, setOportunidad] = useState<Oportunidad>(MOCK_OPORTUNIDAD);

  const handleDocumentStatusChange = useCallback((id: number, status: DocumentoStatus) => {
    setOportunidad(prev => ({
      ...prev,
      documentosVendedor: prev.documentosVendedor.map(d => d.id === id ? { ...d, status } : d),
    }));
  }, []);

  const handleFileChange = useCallback((id: number, files: FileList | null) => {
     if (!files) return;
      setOportunidad(prev => ({
      ...prev,
      documentosVendedor: prev.documentosVendedor.map(d => d.id === id ? { ...d, archivos: Array.from(files) } : d),
    }));
  }, []);
  
  const handleValidation = useCallback((key: keyof Oportunidad['validacionVendedor']) => {
    setTimeout(() => { // Simula llamada a API externa
        setOportunidad(prev => ({...prev, validacionVendedor: { ...prev.validacionVendedor, [key]: true }}));
    }, 500);
  }, []);

  const allDocsValidated = useMemo(() => oportunidad.documentosVendedor.every(d => d.status === DocumentoStatus.VALIDADO), [oportunidad.documentosVendedor]);
  const allChecksValidated = useMemo(() => Object.values(oportunidad.validacionVendedor).every(v => v), [oportunidad.validacionVendedor]);

  const avanzarEtapa = () => {
      setOportunidad(prev => ({...prev, etapa: Math.min(prev.etapa + 1, ETAPAS_FLUJO.length)}));
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-iange-dark">{oportunidad.nombrePropiedad}</h2>
        <p className="text-gray-600">Vendedor: {oportunidad.vendedor.nombre}</p>
      </div>

      <Stepper etapas={ETAPAS_FLUJO} etapaActual={oportunidad.etapa} />

      {oportunidad.etapa === 2 && (
          <div className="space-y-4">
              <h3 className="font-bold text-xl">Documentos Requeridos del Vendedor</h3>
              {oportunidad.documentosVendedor.map(doc => 
                <DocumentoItem key={doc.id} doc={doc} onStatusChange={handleDocumentStatusChange} onFileChange={handleFileChange} />
              )}
               <button onClick={avanzarEtapa} disabled={!allDocsValidated} className="w-full mt-4 bg-iange-orange text-white py-2 px-4 rounded-md disabled:bg-gray-400 hover:bg-orange-600 transition-colors">
                   Continuar a Validación
               </button>
          </div>
      )}

      {oportunidad.etapa === 3 && (
          <div className="space-y-4">
              <h3 className="font-bold text-xl">Validación Automática de Vendedor</h3>
              <ValidacionItem label="Validación CURP" validado={oportunidad.validacionVendedor.curp} onValidate={() => handleValidation('curp')} />
              <ValidacionItem label="Validación RFC" validado={oportunidad.validacionVendedor.rfc} onValidate={() => handleValidation('rfc')} />
              <ValidacionItem label="Búsqueda en Listas Negras (PLD)" validado={oportunidad.validacionVendedor.listasNegras} onValidate={() => handleValidation('listasNegras')} />
               <button onClick={avanzarEtapa} disabled={!allChecksValidated} className="w-full mt-4 bg-iange-orange text-white py-2 px-4 rounded-md disabled:bg-gray-400 hover:bg-orange-600 transition-colors">
                   Agendar Visita y Análisis
               </button>
          </div>
      )}

      {oportunidad.etapa > 3 && (
          <div className="text-center p-10 border-dashed border-2 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-700">Etapa: {ETAPAS_FLUJO[oportunidad.etapa - 1]}</h3>
              <p className="text-gray-500 mt-2">Esta sección está en desarrollo.</p>
          </div>
      )}
      
    </div>
  );
};

export default OportunidadDetail;