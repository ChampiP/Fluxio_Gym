import React, { useState, useRef, useEffect } from 'react';
import { AttendanceLog, Client } from '../types';
import { ArrowRight, CheckCircle, XCircle, Clock, AlertTriangle, Search, X, QrCode, Camera } from 'lucide-react';
import { api } from '../services/api-supabase';
import QrScanner from 'qr-scanner';

interface CheckInProps {
  onCheckIn: (id: string) => Promise<{ success: boolean; message: string; client?: any; isWarning?: boolean }>;
  logs: AttendanceLog[];
  primaryColor: string;
}

export const CheckIn: React.FC<CheckInProps> = ({ onCheckIn, logs, primaryColor }) => {
  const [inputId, setInputId] = useState('');
  const [lastStatus, setLastStatus] = useState<{ success: boolean; message: string; clientName?: string; isWarning?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // QR Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Recover Code State
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoverDni, setRecoverDni] = useState('');
  const [foundClient, setFoundClient] = useState<Client | null>(null);

  useEffect(() => {
    // Configurar el worker de QR Scanner
    QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';
    
    if (!isRecoverOpen) {
      inputRef.current?.focus();
    }
  }, [lastStatus, isRecoverOpen]);

  // Cleanup QR Scanner on component unmount
  useEffect(() => {
    return () => {
      if (qrScanner) {
        qrScanner.stop();
        qrScanner.destroy();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [qrScanner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim()) return;

    setIsLoading(true);
    const result = await onCheckIn(inputId.trim());
    setLastStatus({
      success: result.success,
      message: result.message,
      clientName: result.client ? `${result.client.firstName} ${result.client.lastName}` : undefined,
      isWarning: result.isWarning
    });
    setIsLoading(false);
    setInputId('');
    
    // Clear status after 4 seconds
    setTimeout(() => {
      setLastStatus(null);
    }, 4000);
  };

  const handleSearchClient = async () => {
    if (!recoverDni.trim()) return;
    
    try {
      const clients = await api.getClients();
      console.log('Clients found:', clients.length);
      console.log('Searching for DNI:', recoverDni);
      
      // Buscar por DNI exacto primero, luego por coincidencia parcial
      const client = clients.find(c => 
        c.dni === recoverDni.trim() || 
        c.dni.includes(recoverDni.trim()) ||
        c.firstName.toLowerCase().includes(recoverDni.toLowerCase()) ||
        c.lastName.toLowerCase().includes(recoverDni.toLowerCase())
      );
      
      console.log('Found client:', client);
      setFoundClient(client || null);
    } catch (error) {
      console.error('Error searching client:', error);
      setFoundClient(null);
    }
  };

  // QR Scanner Functions
  const startQrScanner = async () => {
    try {
      console.log('1. Iniciando proceso de escáner QR...');
      setIsScanning(true);
      
      // Esperar a que el modal y el video se rendericen
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!videoRef.current) {
        console.error('2. Error: elemento video no encontrado');
        throw new Error('Video element not found');
      }
      
      console.log('2. Elemento video encontrado:', videoRef.current);
      console.log('3. Verificando cámaras disponibles...');
      
      // Verificar si hay cámaras disponibles
      const cameras = await QrScanner.listCameras(true);
      console.log('4. Cámaras disponibles:', cameras);
      
      if (cameras.length === 0) {
        throw new Error('No se encontraron cámaras disponibles');
      }

      console.log('5. Creando instancia de QR Scanner...');
      
      // Crear el scanner - QrScanner manejará el stream automáticamente
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('✅ QR detectado:', result);
          handleQrResult(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          preferredCamera: 'environment',
        }
      );
      
      console.log('6. Iniciando scanner...');
      
      // Iniciar el scanner - esto pedirá permisos y abrirá la cámara automáticamente
      await scanner.start();
      console.log('✅ QR Scanner iniciado exitosamente!');
      
      // Verificar que el video efectivamente está reproduciendo
      if (videoRef.current.srcObject) {
        console.log('✅ Stream de video asignado correctamente');
      } else {
        console.warn('⚠️ Video no tiene srcObject asignado');
      }
      
      setQrScanner(scanner);
      
    } catch (error) {
      console.error('❌ Error starting QR scanner:', error);
      setIsScanning(false);
      
      let errorMessage = 'Error al iniciar el escáner QR';
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permisos de cámara denegados. Por favor, autoriza el acceso a la cámara.';
        } else if (error.name === 'NotFoundError' || error.message.includes('cámaras')) {
          errorMessage = 'No se encontró una cámara disponible en tu dispositivo.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'La cámara está siendo usada por otra aplicación.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'No se pudo acceder a la cámara con la configuración solicitada.';
        }
      }
      
      setLastStatus({
        success: false,
        message: errorMessage
      });
      
      setTimeout(() => {
        setLastStatus(null);
      }, 5000);
    }
  };

  const stopQrScanner = () => {
    if (qrScanner) {
      qrScanner.stop();
      qrScanner.destroy();
      setQrScanner(null);
    }
    
    // Limpiar el stream de la cámara si existe
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsScanning(false);
  };

  const handleQrResult = async (data: string) => {
    console.log('QR scanned:', data);
    
    // Check if it's our format: FLUXGYM:1005
    if (data.startsWith('FLUXGYM:')) {
      const clientId = data.replace('FLUXGYM:', '');
      stopQrScanner();
      
      // Process check-in with the scanned ID
      setIsLoading(true);
      const result = await onCheckIn(clientId);
      setLastStatus({
        success: result.success,
        message: result.message,
        clientName: result.client ? `${result.client.firstName} ${result.client.lastName}` : undefined,
        isWarning: result.isWarning
      });
      setIsLoading(false);
      
      // Clear status after 4 seconds
      setTimeout(() => {
        setLastStatus(null);
      }, 4000);
    } else {
      // Show error for invalid QR format
      setLastStatus({
        success: false,
        message: 'QR no válido. Solo códigos FLUXGYM son aceptados.',
      });
      
      setTimeout(() => {
        setLastStatus(null);
      }, 3000);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-8">
      {/* Input Section */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 relative">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Registro de Asistencia</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Ingresa tu código de acceso</p>

        <form onSubmit={handleSubmit} className="w-full max-w-sm relative z-10">
          <div className="relative">
             <input 
              ref={inputRef}
              type="text" 
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 text-center text-5xl font-mono tracking-widest p-6 border-4 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-opacity-20 outline-none transition-all uppercase text-slate-900 dark:text-white font-bold placeholder-slate-300 dark:placeholder-slate-600"
              style={{ borderColor: inputId ? primaryColor : undefined, ['--tw-ring-color' as any]: primaryColor }}
              placeholder="1000a"
              disabled={isLoading}
             />
             <button 
               type="submit"
               disabled={isLoading}
               className="absolute right-3 top-3 bottom-3 aspect-square rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 transition-colors"
             >
               <ArrowRight size={28} />
             </button>
          </div>
          
          {/* QR Scanner Button */}
          <button 
            type="button"
            onClick={startQrScanner}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <QrCode size={20} /> Escanear QR
          </button>
          
          <button 
            type="button"
            onClick={() => setIsRecoverOpen(true)}
            className="w-full mt-3 text-sm text-slate-400 hover:text-blue-500 underline text-center"
          >
            ¿Olvidaste tu código? Recupéralo aquí
          </button>
        </form>

        <div className="mt-12 w-full max-w-sm h-32 flex items-center justify-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-slate-900 dark:border-white"></div>
          ) : lastStatus ? (
             <div className={`text-center p-6 rounded-2xl w-full animate-fade-in border-2 ${
               lastStatus.isWarning ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
               lastStatus.success ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' : 
               'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
             }`}>
                {lastStatus.isWarning ? (
                  <AlertTriangle className="mx-auto mb-2 text-yellow-600 dark:text-yellow-400" size={48} />
                ) : lastStatus.success ? (
                  <CheckCircle className="mx-auto mb-2 text-green-600 dark:text-green-400" size={48} /> 
                ) : (
                  <XCircle className="mx-auto mb-2 text-red-600 dark:text-red-400" size={48} />
                )}
                <h3 className="font-bold text-xl">{lastStatus.message}</h3>
                {lastStatus.clientName && <p className="text-base opacity-90 font-medium mt-1">{lastStatus.clientName}</p>}
             </div>
          ) : (
            <div className="text-center text-slate-300 dark:text-slate-600">
               <Clock size={48} className="mx-auto mb-3" />
               <p className="font-medium text-lg">Esperando ingreso...</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs Section */}
      <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-lg">Últimos Ingresos</h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {logs.slice(0, 15).map(log => (
            <div key={log.id} className={`bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm text-sm border-l-4 ${log.isWarning ? 'border-yellow-400' : log.success ? 'border-green-500' : 'border-red-500'}`}>
              <div className="flex justify-between items-start">
                 <span className="font-bold text-slate-800 dark:text-white">{log.clientName}</span>
                 <span className="text-xs text-slate-400 font-medium">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className={`text-xs mt-1 font-medium ${log.isWarning ? 'text-yellow-600' : 'text-slate-500 dark:text-slate-400'}`}>{log.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recover Modal */}
      {isRecoverOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => { setIsRecoverOpen(false); setFoundClient(null); setRecoverDni(''); }}
        >
           <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
           >
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recuperar Código</h3>
                 <button onClick={() => { setIsRecoverOpen(false); setFoundClient(null); setRecoverDni(''); }} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                 </button>
              </div>
              <div className="space-y-4">
                 <div className="flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="DNI o Nombre" 
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none"
                      value={recoverDni}
                      onChange={e => setRecoverDni(e.target.value)}
                    />
                    <button onClick={handleSearchClient} className="bg-blue-600 text-white px-3 rounded-lg">
                      <Search size={20} />
                    </button>
                 </div>
                 {foundClient ? (
                   <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 text-center">
                      <p className="text-sm text-green-800 dark:text-green-300 font-bold mb-1">{foundClient.firstName} {foundClient.lastName}</p>
                      {foundClient.humanId ? (
                        <>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Tu código es:</p>
                          <p className="text-3xl font-mono font-bold text-slate-900 dark:text-white tracking-widest">{foundClient.humanId}</p>
                        </>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-red-600 dark:text-red-400 mb-2">⚠️ Este cliente no tiene código asignado</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Contacta al administrador para generar su código</p>
                          <details className="mt-2 text-xs text-left">
                            <summary className="cursor-pointer text-slate-400">Ver datos técnicos</summary>
                            <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs overflow-x-auto">
                              {JSON.stringify(foundClient, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                   </div>
                 ) : recoverDni && (
                    <p className="text-sm text-center text-slate-400">No se encontró el cliente.</p>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {isScanning && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera size={20} /> Escanear Credencial QR
              </h3>
              <button onClick={stopQrScanner} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="relative">
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                width="640"
                height="480"
                className="w-full h-64 rounded-lg bg-black object-cover"
                style={{ maxWidth: '100%' }}
              />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-4">
              Apunta la cámara hacia el código QR de la credencial
            </p>
          </div>
        </div>
      )}
    </div>
  );
};