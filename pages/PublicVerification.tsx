import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CameraIcon, CheckCircleIcon, XCircleIcon, ArrowUpTrayIcon, ShieldCheckIcon } from '../components/Icons';

const PublicVerification: React.FC = () => {
    const { token } = useParams<{ token: string }>(); 
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Estados visuales
    const [step, setStep] = useState('loading'); 
    const [clientName, setClientName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [uploadProgress, setUploadProgress] = useState(''); 
    
    // Imágenes en Base64
    const [images, setImages] = useState({
        rostro: '',
        ineFrente: '',
        ineReverso: ''
    });

    // 1. Cargar datos del cliente
    useEffect(() => {
        const fetchClient = async () => {
            if (!token) return;
            const { data, error } = await supabase
                .from('contactos')
                .select('nombre, datos_kyc') 
                .eq('verification_token', token) 
                .single();

            if (error || !data) {
                setStep('error');
                setErrorMsg('El enlace no es válido o ha expirado.');
            } else {
                const kyc = data.datos_kyc || {};
                if (kyc.biometricStatus === 'Verificado') {
                    setClientName(data.nombre);
                    setStep('expired'); 
                    return;
                }
                setClientName(data.nombre);
                setStep('selfie');
                startCamera();
            }
        };
        fetchClient();
    }, [token]);

    // --- CÁMARA & FOTOS (CORREGIDO) ---
    const startCamera = async () => {
        try {
            if (step === 'expired' || step === 'error') return;
            // Pedimos HD (1280x720) para no saturar memoria
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false 
            });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error(err);
            setErrorMsg('No se pudo acceder a la cámara.');
            setStep('error');
        }
    };

    const captureSelfie = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            const video = videoRef.current; // Referencia local

            if (context) {
                canvasRef.current.width = video.videoWidth;
                canvasRef.current.height = video.videoHeight;
                
                // --- FIX: NO USAR SCALE(-1, 1) AQUÍ ---
                // Dibujamos la imagen original. El usuario se ve en espejo por CSS, 
                // pero enviamos la cara "real" para que la IA no falle.
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                
                // Calidad 0.7 para reducir peso y evitar timeout
                const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
                setImages(prev => ({ ...prev, rostro: dataUrl }));
                
                const stream = video.srcObject as MediaStream;
                stream?.getTracks().forEach(track => track.stop());
                
                setStep('ine_front');
            }
        }
    };

    // --- NUEVO: FUNCIÓN PARA COMPRIMIR IMÁGENES ---
    // Esto evita enviar 10MB de foto y causar Error 500
    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxWidth = 1500; // Suficiente para leer datos
                    const scaleSize = maxWidth / img.width;
                    const width = (img.width > maxWidth) ? maxWidth : img.width;
                    const height = (img.width > maxWidth) ? img.height * scaleSize : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // Retorna Base64 ligero
                };
            };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ineFrente' | 'ineReverso') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Usamos la nueva función de resize
            const resizedBase64 = await resizeImage(file);
            
            setImages(prev => ({ ...prev, [type]: resizedBase64 }));
            if (type === 'ineFrente') setStep('ine_back');
            if (type === 'ineReverso') setStep('confirmation'); 
        }
    };

    // --- SUBIDA DE IMÁGENES A STORAGE ---
    const uploadImageToSupabase = async (base64Data: string, fileName: string) => {
        try {
            const base64Content = base64Data.split(',')[1];
            const byteCharacters = atob(base64Content);
            const byteArrays = [];
            for (let i = 0; i < byteCharacters.length; i++) {
                byteArrays.push(byteCharacters.charCodeAt(i));
            }
            const blob = new Blob([new Uint8Array(byteArrays)], { type: 'image/jpeg' });
            const path = `kyc/public_${token}/${Date.now()}_${fileName}`;

            const { error } = await supabase.storage
                .from('documentos-identidad')
                .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

            if (error) throw error;

            const { data } = supabase.storage
                .from('documentos-identidad')
                .getPublicUrl(path);

            return data.publicUrl;
        } catch (error) {
            console.error(`Error subiendo ${fileName}:`, error);
            return null;
        }
    };

    // --- PROCESAMIENTO PRINCIPAL ---
    const processVerification = async () => {
        setStep('processing');
        setUploadProgress('Subiendo evidencias...');

        try {
            // 1. Subir Fotos a Storage
            const [urlSelfie, urlFrente, urlReverso] = await Promise.all([
                uploadImageToSupabase(images.rostro, 'selfie_viva.jpg'),
                uploadImageToSupabase(images.ineFrente, 'ine_frente.jpg'),
                uploadImageToSupabase(images.ineReverso, 'ine_reverso.jpg')
            ]);

            setUploadProgress('Validando biometría...');

            // 2. Validar con NUFI
            const cleanBase64 = (str: string) => str.split(',')[1];
            const nufiPayload = {
                imagen_rostro: cleanBase64(images.rostro),
                credencial_frente: cleanBase64(images.ineFrente),
                credencial_reverso: cleanBase64(images.ineReverso)
            };

            const { data, error } = await supabase.functions.invoke('nufi-proxy', {
                body: { action: 'biometric-match', payload: nufiPayload }
            });

            if (error) throw new Error(error.message);

            // 3. Obtener contacto actual
            const { data: currentContact } = await supabase
                .from('contactos')
                .select('id, tenant_id, tipo, datos_kyc') 
                .eq('verification_token', token)
                .single();

            // 4. INSERTAR LOG
            if (currentContact) {
                const isApiSuccess = data && data.status === 'success';
                
                // ✅ CAMBIO CLAVE: Usar 'biometric_check' para que las tablas y el PDF lo encuentren
                await supabase.from('kyc_validations').insert({
                    tenant_id: currentContact.tenant_id,
                    entity_type: currentContact.tipo === 'propietario' ? 'Propietario' : 'Comprador',
                    entity_id: currentContact.id,
                    validation_type: 'biometric_check', // Antes BIOMETRIC_CHECK
                    status: isApiSuccess ? 'success' : 'error',
                    nufi_transaction_id: data?.uuid || null, 
                    api_response: data || { error: 'No data returned' }, 
                    validation_evidence: {           
                        selfie: urlSelfie, 
                        frente: urlFrente, 
                        reverso: urlReverso 
                    }
                });
            }

            // 5. MANEJO DE RESPUESTA
            if (data && data.status === 'success' && data.data) {
                const nufiResult = data.data; 
                const isMatch = nufiResult.resultado_verificacion_rostro === "True";
                const score = parseFloat(nufiResult.certeza_verificacion_rostro);
                
                const currentKyc = currentContact?.datos_kyc || {};

                await supabase.from('contactos').update({ 
                    datos_kyc: { 
                        ...currentKyc, 
                        biometricStatus: isMatch ? 'Verificado' : 'Rechazado',
                        biometricScore: score,
                        biometricDate: new Date().toISOString(),
                        biometricTransactionId: data.uuid,
                        evidence_urls: { selfie: urlSelfie, frente: urlFrente, reverso: urlReverso },
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
                throw new Error(data.message || 'No se pudo validar (Error de API).');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg('Error: ' + (err.message || 'Error desconocido'));
            setStep('error');
        }
    };

    // --- RENDERIZADO UI ---
    return (
        <div className="min-h-[100dvh] bg-white flex flex-col font-sans text-gray-800">
            
            <div className="w-full pt-8 pb-4 flex flex-col justify-center items-center">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Verificación Segura</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity cursor-default">
                    <span className="text-[8px] font-medium text-gray-300 uppercase tracking-wider">powered by</span>
                    <img src="/logo.svg" alt="IANGE" className="h-5" />
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 w-full max-w-md mx-auto">
                
                {step === 'loading' && (
                    <div className="text-center animate-pulse">
                        <div className="h-12 w-12 border-4 border-gray-200 border-t-iange-orange rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Iniciando sistema...</p>
                    </div>
                )}

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

                {step === 'expired' && (
                    <div className="text-center w-full animate-fade-in-up">
                        <div className="h-24 w-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100 shadow-sm">
                            <ShieldCheckIcon className="h-12 w-12" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enlace Vencido</h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Hola <strong>{clientName.split(' ')[0]}</strong>, tu identidad ya ha sido verificada exitosamente. Por motivos de seguridad, este enlace ya no es válido.
                        </p>
                    </div>
                )}

                {step === 'selfie' && (
                    <div className="w-full flex flex-col h-full justify-between animate-fade-in">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Hola, {clientName.split(' ')[0]}</h2>
                            <p className="text-gray-500 mt-2">Centra tu rostro para la selfie</p>
                        </div>
                        <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl mb-6 ring-4 ring-gray-100">
                            {/* NOTA: Aquí mantenemos scale-x-[-1] solo para efecto VISUAL, el canvas manda la foto real */}
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                            <div className="absolute inset-0 border-2 border-white/30 rounded-3xl pointer-events-none m-6"></div>
                        </div>
                        <button onClick={captureSelfie} className="w-full bg-iange-orange text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <CameraIcon className="h-6 w-6" /> 
                            Tomar Foto
                        </button>
                    </div>
                )}

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
                        <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, step === 'ine_front' ? 'ineFrente' : 'ineReverso')} />
                    </div>
                )}

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
                                <div className="flex-1"><p className="font-bold text-sm text-gray-800">INE Frente</p></div>
                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <img src={images.ineReverso} className="h-16 w-24 rounded-lg object-cover bg-gray-200" alt="Reverso" />
                                <div className="flex-1"><p className="font-bold text-sm text-gray-800">INE Reverso</p></div>
                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            </div>
                        </div>
                        <button onClick={processVerification} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-green-700 transition-transform active:scale-95 flex justify-center items-center gap-2 mb-4">
                            <CheckCircleIcon className="h-6 w-6" />
                            Enviar y Validar
                        </button>
                        <button onClick={() => window.location.reload()} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">Volver a tomar fotos</button>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="text-center animate-fade-in">
                        <div className="relative h-24 w-24 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-iange-orange rounded-full animate-spin"></div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Procesando...</h2>
                        <p className="text-sm text-gray-500 mt-2 max-w-[200px] mx-auto">{uploadProgress}</p>
                    </div>
                )}

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

                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
        </div>
    );
};

export default PublicVerification;