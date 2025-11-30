import React from 'react';

interface ToastProps {
    message: string;
    onClose: () => void;
    type?: 'success' | 'error';
}

const SuccessIcon = () => (
    <svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/></svg>
);

const ErrorIcon = () => (
     <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 5v6h2V5H9zm0 8h2v2H9v-2z"/></svg>
);

const Toast: React.FC<ToastProps> = ({ message, onClose, type = 'success' }) => {
    const isSuccess = type === 'success';

    const baseClasses = "fixed top-6 right-6 p-4 rounded-md shadow-lg flex items-center z-50 animate-fade-in-down";
    const typeClasses = isSuccess
        ? "bg-green-100 border-l-4 border-green-500 text-green-700"
        : "bg-red-100 border-l-4 border-red-500 text-red-700";
    
    const closeButtonClasses = isSuccess ? "text-green-700 hover:text-green-900" : "text-red-700 hover:text-red-900";

    return (
        <div 
            className={`${baseClasses} ${typeClasses}`}
            role="alert"
        >
            <div className="py-1">
                {isSuccess ? <SuccessIcon /> : <ErrorIcon />}
            </div>
            <div>
                <p className="font-bold">{message}</p>
            </div>
            <button onClick={onClose} className={`ml-4 font-semibold ${closeButtonClasses}`}>&times;</button>
        </div>
    );
};

export default Toast;