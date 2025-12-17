import React from 'react';

interface CurrencyInputProps {
  value: string | number;
  onChange: (rawValue: string) => void; // Devuelve el valor limpio para el estado
  label?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ 
  value, 
  onChange, 
  label, 
  name, 
  placeholder,
  disabled 
}) => {
  
  // Función para dar formato visual (ej: 15000 -> 15,000)
  const formatDisplayValue = (val: string | number) => {
    if (!val) return '';
    // Convertir a string y eliminar todo lo que no sea número
    const numStr = val.toString().replace(/[^0-9]/g, '');
    if (numStr === '') return '';
    // Parsear a entero para quitar ceros a la izquierda (ej: 015 -> 15)
    const number = parseInt(numStr, 10);
    // Formatear con comas
    return new Intl.NumberFormat('es-MX').format(number);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Obtener el valor crudo del input
    const inputValue = e.target.value;
    
    // 2. Limpiar todo lo que no sea dígito
    const rawValue = inputValue.replace(/[^0-9]/g, '');
    
    // 3. Enviar al padre el valor limpio (sin comas) para la BD
    onChange(rawValue);
  };

  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">$</span>
        </div>
        <input
          type="text" // Usamos text para poder poner comas
          name={name}
          id={name}
          disabled={disabled}
          className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-iange-orange focus:ring-iange-orange sm:text-sm py-2 border shadow-sm"
          placeholder={placeholder || "0.00"}
          value={formatDisplayValue(value)} // Mostramos el valor formateado
          onChange={handleChange}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-gray-500 sm:text-sm">MXN</span>
        </div>
      </div>
    </div>
  );
};