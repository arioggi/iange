import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CameraIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon, ArrowUpTrayIcon } from '../components/Icons';

const PublicVerification: React.FC = () => {
    const { token } = useParams<{ token: string }>(); 
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Estados visuales
    const [step, setStep] = useState('loading'); // loading, selfie, ine_front, ine_back, confirmation, processing, success, error
    const [clientName, setClientName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    
    // Imágenes en Base64
    const [images, setImages] = useState({
        rostro: '',
        ineFrente: '',
        ineReverso: ''
    });

    // 1. Cargar datos del cliente usando el TOKEN seguro
    useEffect(() => {
        const fetchClient = async () => {
            if (!token) return;
            const { data, error } = await supabase
                .from('contactos')
                .select('nombre') 
                .eq('verification_token', token) // <--- Búsqueda segura por UUID
                .single();

            if (error || !data) {
                setStep('error');
                setErrorMsg('El enlace no es válido o ha expirado.');
            } else {
                setClientName(data.nombre);
                setStep('selfie'); // Arrancamos directo en la selfie
                startCamera();
            }
        };
        fetchClient();
    }, [token]);

    // --- CÁMARA & FOTOS ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' },
                audio: false 
            });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error(err);
            setErrorMsg('Por favor permite el acceso a la cámara para continuar.');
        }
    };

    const captureSelfie = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                // Dibujar imagen (invertida horizontalmente si es selfie para efecto espejo)
                context.save();
                context.scale(-1, 1);
                context.drawImage(videoRef.current, -canvasRef.current.width, 0);
                context.restore();
                
                const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setImages(prev => ({ ...prev, rostro: dataUrl }));
                
                // Detener video
                const stream = videoRef.current.srcObject as MediaStream;
                stream?.getTracks().forEach(track => track.stop());
                
                setStep('ine_front');
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'ineFrente' | 'ineReverso') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => ({ ...prev, [type]: reader.result as string }));
                if (type === 'ineFrente') setStep('ine_back');
                if (type === 'ineReverso') setStep('confirmation'); 
            };
            reader.readAsDataURL(file);
        }
    };

    // --- PROCESAMIENTO (LLAMADA A NUFI-PROXY) ---
    const processVerification = async () => {
        setStep('processing');
        try {
            const cleanBase64 = (str: string) => str.split(',')[1];

            // Preparamos payload para NUFI
            const nufiPayload = {
                imagen_rostro: cleanBase64(images.rostro),
                credencial_frente: cleanBase64(images.ineFrente),
                credencial_reverso: cleanBase64(images.ineReverso)
            };

            // Llamada a la Edge Function 'nufi-proxy'
            const { data, error } = await supabase.functions.invoke('nufi-proxy', {
                body: {
                    action: 'biometric-match', // Acción específica para biometría
                    payload: nufiPayload
                }
            });

            if (error) throw new Error(error.message);

            // Analizar respuesta de NUFI
            if (data && data.status === 'success' && data.data) {
                const nufiResult = data.data;
                const isMatch = nufiResult.resultado_verificacion_rostro === "True";
                const score = parseFloat(nufiResult.certeza_verificacion_rostro);
                
                // Guardar resultado en Supabase usando el TOKEN
                await supabase.from('contactos').update({ 
                    datos_kyc: { 
                        biometricStatus: isMatch ? 'Verificado' : 'Rechazado',
                        biometricScore: score,
                        biometricDate: new Date().toISOString(),
                        // Guardamos datos extra de la credencial
                        ineVerificationData: {
                            tipoFrente: nufiResult.tipo_credencial_frente,
                            tipoReverso: nufiResult.tipo_credencial_reverso
                        }
                    } 
                }).eq('verification_token', token);

                if (isMatch) {
                    setStep('success');
                } else {
                    const porcentaje = (score * 100).toFixed(1);
                    setErrorMsg(`El rostro no coincide. Similitud: ${porcentaje}%`);
                    setStep('error');
                }
            } else {
                throw new Error(data.message || 'No se pudo validar las imágenes. Intenta de nuevo.');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg('Error de conexión o validación: ' + (err.message || 'Error desconocido'));
            setStep('error');
        }
    };

    // --- RENDERIZADO UI (Responsive & Clean) ---
    return (
        <div className="min-h-[100dvh] bg-white flex flex-col font-sans text-gray-800">
            
            {/* Header Flotante */}
            <div className="w-full p-6 flex justify-center items-center">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-iange-orange rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">I</div>
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Verificación Segura</span>
                </div>
            </div>

            {/* Contenedor Principal */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 w-full max-w-md mx-auto">
                
                {/* 1. LOADING */}
                {step === 'loading' && (
                    <div className="text-center animate-pulse">
                        <div className="h-12 w-12 border-4 border-gray-200 border-t-iange-orange rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Iniciando sistema...</p>
                    </div>
                )}

                {/* 2. ERROR */}
                {step === 'error' && (
                    <div className="text-center w-full animate-fade-in-up">
                        <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircleIcon className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hubo un problema</h2>
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-8 border border-red-100">
                            {errorMsg}
                        </div>
                        <button onClick={() => window.location.reload()} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-black transition-transform active:scale-95">
                            Intentar de Nuevo
                        </button>
                    </div>
                )}

                {/* 3. SELFIE (Cámara) */}
                {step === 'selfie' && (
                    <div className="w-full flex flex-col h-full justify-between animate-fade-in">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Hola, {clientName.split(' ')[0]}</h2>
                            <p className="text-gray-500 mt-2">Centra tu rostro para la selfie</p>
                        </div>
                        
                        <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl mb-6 ring-4 ring-gray-100">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                            <div className="absolute inset-0 border-2 border-white/30 rounded-3xl pointer-events-none m-6"></div>
                        </div>

                        <button onClick={captureSelfie} className="w-full bg-iange-orange text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <CameraIcon className="h-6 w-6" /> 
                            Tomar Foto
                        </button>
                    </div>
                )}

                {/* 4. INE (Upload/Capture) */}
                {(step === 'ine_front' || step === 'ine_back') && (
                    <div className="w-full text-center animate-fade-in-up">
                        <div className="mb-8">
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase mb-4 inline-block">
                                Paso {step === 'ine_front' ? '2' : '3'} de 3
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900">Identificación Oficial</h2>
                            <p className="text-gray-500 mt-2">
                                Foto del <strong className="text-iange-orange">{step === 'ine_front' ? 'FRENTE' : 'REVERSO'}</strong> de tu INE.
                            </p>
                        </div>

                        <div 
                            className="w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-3xl bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-iange-orange transition-all group relative overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="absolute inset-0 bg-iange-orange/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 z-10 group-hover:scale-110 transition-transform">
                                <ArrowUpTrayIcon className="h-8 w-8 text-iange-orange" />
                            </div>
                            <span className="text-sm font-bold text-gray-600 z-10">Toca para abrir cámara</span>
                            <span className="text-xs text-gray-400 mt-1 z-10">o selecciona un archivo</span>
                        </div>

                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            capture="environment" // Abre la cámara trasera por defecto
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, step === 'ine_front' ? 'ineFrente' : 'ineReverso')} 
                        />
                    </div>
                )}

                {/* 5. CONFIRMACIÓN */}
                {step === 'confirmation' && (
                    <div className="w-full animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Revisa tus fotos</h2>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <img src={images.rostro} className="h-16 w-16 rounded-lg object-cover bg-gray-200" alt="Rostro" />
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-800">Tu Selfie</p>
                                    <p className="text-xs text-gray-500">Asegúrate que sea clara</p>
                                </div>
                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <img src={images.ineFrente} className="h-16 w-24 rounded-lg object-cover bg-gray-200" alt="Frente" />
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-800">INE Frente</p>
                                </div>
                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <img src={images.ineReverso} className="h-16 w-24 rounded-lg object-cover bg-gray-200" alt="Reverso" />
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-800">INE Reverso</p>
                                </div>
                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            </div>
                        </div>

                        <button onClick={processVerification} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-green-700 transition-transform active:scale-95 flex justify-center items-center gap-2 mb-4">
                            <CheckCircleIcon className="h-6 w-6" />
                            Enviar y Validar
                        </button>
                        
                        <button onClick={() => window.location.reload()} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
                            Volver a tomar fotos
                        </button>
                    </div>
                )}

                {/* 6. PROCESANDO */}
                {step === 'processing' && (
                    <div className="text-center animate-fade-in">
                        <div className="relative h-24 w-24 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-iange-orange rounded-full animate-spin"></div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Verificando...</h2>
                        <p className="text-sm text-gray-500 mt-2 max-w-[200px] mx-auto">Estamos analizando la biometría de tu rostro con la INE.</p>
                    </div>
                )}

                {/* 7. ÉXITO */}
                {step === 'success' && (
                    <div className="text-center animate-bounce-short">
                        <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <CheckCircleIcon className="h-12 w-12" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">¡Todo Listo!</h2>
                        <p className="text-gray-600">Tu identidad ha sido verificada correctamente.</p>
                        <div className="mt-8 pt-8 border-t border-gray-100">
                            <p className="text-xs text-gray-400">Puedes cerrar esta ventana.</p>
                        </div>
                    </div>
                )}

                {/* Canvas oculto */}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
        </div>
    );
};

export default PublicVerification;