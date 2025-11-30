

import React from 'react';

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="flex items-center justify-center min-h-[20rem] bg-white rounded-lg shadow-sm p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="mt-2 text-gray-500">Esta sección está en construcción.</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;