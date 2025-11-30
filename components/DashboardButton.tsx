import React from 'react';

interface DashboardButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

const DashboardButton: React.FC<DashboardButtonProps> = ({ label, variant = 'primary', onClick }) => {
  const baseClasses = "w-full h-24 rounded-lg flex flex-col items-center justify-center font-bold shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1 p-4";
  
  const styles = {
    primary: "bg-iange-orange text-white",
    secondary: "bg-iange-salmon text-iange-dark",
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${styles[variant]}`}>
      <span className="text-lg text-center">{label}</span>
    </button>
  );
};

export default DashboardButton;