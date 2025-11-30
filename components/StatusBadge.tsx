
import React from 'react';
import { DocumentoStatus } from '../types';

interface StatusBadgeProps {
  status: DocumentoStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: { [key in DocumentoStatus]: string } = {
    [DocumentoStatus.PENDIENTE]: 'bg-yellow-100 text-yellow-800',
    [DocumentoStatus.VALIDADO]: 'bg-green-100 text-green-800',
    [DocumentoStatus.RECHAZADO]: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
