

import React from 'react';
import { Outlet } from 'react-router-dom';

// Fix: Removed React.FC to avoid potential issues with implicit children prop type in some TypeScript configurations.
const Configuraciones = () => {
    return (
        <div>
            {/* Nested routes from App.tsx will render their components here */}
            <Outlet />
        </div>
    );
};

export default Configuraciones;