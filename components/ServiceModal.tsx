
import React, { useState, useRef, useEffect } from 'react';
import { Vehicle, Employee } from '../types';
import { Camera, X, Trash2, UserCheck, CheckCircle2, ImagePlus, RefreshCw, Smartphone, Loader2, ZoomIn, AlertTriangle, UserX } from 'lucide-react';
import { Button } from './Button';
import { savePreference, getPreference } from '../services/storage';
import { analyzeServicePhoto } from '../services/geminiService';

interface ServiceModalProps {
  vehicle: Vehicle;
  employees: Employee[];
  onConfirm: (employeeId: string, photos: string[]) => void;
  onClose: () => void;
}

interface PhotoAnalysis {
  id: string;
  loading: boolean;
  data?: {
    isVehicle: boolean;
    description: string;
    issues: string[];
  };
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ vehicle, employees, onConfirm, onClose }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoAnalyses, setPhotoAnalyses] = useState<Record<number, PhotoAnalysis>>({});
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  
  // Load saved preference for camera mode (Default to 'environment' - Rear Camera)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(() => {
    return getPreference('cameraFacingMode', 'environment');
  });
  
  const [zoom, setZoom] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{min: number, max: number, step: number} | null>(null);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const processPhotoWithAI = async (photoDataUrl: string, index: number) => {
    setPhotoAnalyses(prev => ({
      ...prev,
      [index]: { id: index.toString(), loading: true }
    }));

    const result = await analyzeServicePhoto(photoDataUrl);

    setPhotoAnalyses(prev => ({
      ...prev,
      [index]: { 
        id: index.toString(), 
        loading: false,
        data: result
      }
    }));
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            const result = ev.target!.result as string;
            setPhotos(prev => {
              const newPhotos = [...prev, result];
              processPhotoWithAI(result, newPhotos.length - 1);
              return newPhotos;
            });
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setZoomCapabilities(null);
    setZoom(1);

    try {
      // Optimization: Use 720p. Easier for mobile browsers to handle continuously without asking permissions repeatedly due to memory pressure
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: mode,
          width: { ideal: 1280 }, 
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      
      // Save preference on success
      setFacingMode(mode);
      savePreference('cameraFacingMode', mode);
      
      setIsCameraOpen(true);
      setTempPhoto(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      
      if (capabilities.zoom) {
        setZoomCapabilities({
          min: capabilities.zoom.min,
          max: capabilities.zoom.max,
          step: capabilities.zoom.step
        });
      }

    } catch (err) {
      console.error("Error accessing camera:", err);
      if (confirm("Não foi possível acessar a câmera integrada. Deseja usar a câmera do sistema?")) {
        nativeCameraInputRef.current?.click();
      }
      setIsCameraOpen(false);
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setTempPhoto(null);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      track.applyConstraints({ advanced: [{ zoom: newZoom } as any] }).catch(err => console.debug("Zoom apply failed", err));
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setTempPhoto(dataUrl);
      }
    }
  };

  const confirmPhoto = () => {
    if (tempPhoto) {
      setPhotos(prev => {
        const newPhotos = [...prev, tempPhoto];
        processPhotoWithAI(tempPhoto, newPhotos.length - 1);
        return newPhotos;
      });
      setTempPhoto(null);
      stopCamera();
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (isSaving) return;
    stopCamera();
    onClose();
  };

  const handleConfirmService = async () => {
    if (!selectedEmployee || photos.length === 0) return;

    setIsSaving(true);
    setIsSuccess(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onConfirm(selectedEmployee, photos);
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="relative bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        
        {isSuccess && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[60] w-[90%] max-w-sm pointer-events-none">
            <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-emerald-500/50">
              <div className="bg-white/20 p-2 rounded-full">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg leading-none">Sucesso!</h4>
                <span className="text-emerald-100 text-sm">Atendimento registrado.</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-gradient-primary text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Atendimento
            </h2>
            <p className="text-xs text-white/80 font-mono mt-0.5">{vehicle.number} • {vehicle.route}</p>
          </div>
          <button onClick={handleClose} disabled={isSaving} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-6 flex-1 relative">
          {isSuccess && <div className="absolute inset-0 bg-white/50 z-40 backdrop-blur-[1px]" />}

          {/* 1. Employee Selection */}
          {!isCameraOpen && (
            <section>
              <label className="text-sm font-bold text-sle-navy uppercase tracking-wider mb-3 block">1. Quem está atendendo?</label>
              {employees.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                   <UserX className="w-8 h-8 text-slate-300 mb-2" />
                   <p className="text-sm font-bold text-slate-500">Nenhum funcionário cadastrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmployee(emp.id)}
                      disabled={isSaving}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col gap-1 disabled:opacity-50 disabled:cursor-not-allowed
                        ${selectedEmployee === emp.id 
                          ? 'border-sle-blue bg-blue-50 shadow-md ring-1 ring-sle-blue' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                    >
                      <span className={`font-bold text-sm line-clamp-1 ${selectedEmployee === emp.id ? 'text-sle-blue' : 'text-slate-700'}`}>
                        {emp.name}
                      </span>
                      {selectedEmployee === emp.id && (
                        <div className="absolute top-2 right-2 text-sle-blue">
                          <UserCheck className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 2. Photo Registration with AI */}
          <section className="flex-1 flex flex-col">
             {!isCameraOpen && <label className="text-sm font-bold text-sle-navy uppercase tracking-wider mb-3 block">2. Registro Fotográfico</label>}
             
             {isCameraOpen ? (
               <div className="relative bg-black rounded-xl overflow-hidden aspect-[3/4] sm:aspect-video flex items-center justify-center shadow-inner">
                 <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${tempPhoto ? 'hidden' : 'block'}`} />
                 {tempPhoto && <img src={tempPhoto} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />}
                 
                 {zoomCapabilities && !tempPhoto && (
                   <div className="absolute bottom-28 inset-x-0 flex justify-center items-center z-20">
                     <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-3 border border-white/10">
                        <ZoomIn className="w-4 h-4 text-white/70" />
                        <input 
                          type="range"
                          min={zoomCapabilities.min}
                          max={zoomCapabilities.max}
                          step={zoomCapabilities.step}
                          value={zoom}
                          onChange={handleZoomChange}
                          className="w-32 h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
                        />
                        <span className="text-xs font-bold text-white">{zoom.toFixed(1)}x</span>
                     </div>
                   </div>
                 )}

                 <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
                   {!tempPhoto ? (
                     <>
                       <button type="button" onClick={stopCamera} className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white"><X className="w-6 h-6" /></button>
                       <button type="button" onClick={capturePhoto} className="bg-white p-1.5 rounded-full shadow-lg transform active:scale-95 transition-all hover:shadow-xl hover:scale-105">
                         <div className="w-16 h-16 rounded-full border-4 border-sle-blue bg-white flex items-center justify-center">
                            <Camera className="w-8 h-8 text-sle-blue" />
                         </div>
                       </button>
                       <button type="button" onClick={switchCamera} className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full text-white"><RefreshCw className="w-6 h-6" /></button>
                     </>
                   ) : (
                     <>
                       <button type="button" onClick={() => setTempPhoto(null)} className="bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2"><RefreshCw className="w-5 h-5" /> Repetir</button>
                       <button type="button" onClick={confirmPhoto} className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Usar Foto</button>
                     </>
                   )}
                 </div>
               </div>
             ) : (
               <div className="space-y-4">
                 {photos.length > 0 && (
                   <div className="grid grid-cols-2 gap-3 mb-4">
                     {photos.map((photo, idx) => {
                       const analysis = photoAnalyses[idx];
                       return (
                         <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm group bg-slate-50">
                           <img src={photo} alt="Proof" className="w-full h-24 object-cover" />
                           <div className="p-2">
                                {analysis?.loading ? (
                                    <div className="flex items-center gap-1 text-sle-blue text-[10px] font-bold animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Analisando...
                                    </div>
                                ) : analysis?.data ? (
                                    <div className={`flex items-center gap-1 text-[10px] font-bold ${analysis.data.isVehicle ? 'text-green-600' : 'text-amber-600'}`}>
                                        {analysis.data.isVehicle ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {analysis.data.isVehicle ? "Veículo OK" : "Duvidoso"}
                                    </div>
                                ) : null}
                           </div>
                           <button type="button" onClick={() => removePhoto(idx)} disabled={isSaving} className="absolute top-2 right-2 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1.5 rounded-full transition-all">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       );
                     })}
                   </div>
                 )}

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button type="button" onClick={() => startCamera(facingMode)} disabled={isSaving} className="h-24 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-sle-blue transition-all flex flex-col items-center justify-center gap-2 group disabled:opacity-50">
                       <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform border border-slate-100"><Camera className="w-6 h-6 text-sle-blue" /></div>
                       <span className="text-sm font-bold text-sle-navy">Câmera Inteligente</span>
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                       <button type="button" onClick={() => nativeCameraInputRef.current?.click()} disabled={isSaving} className="h-24 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-sle-blue transition-all flex flex-col items-center justify-center gap-1 group disabled:opacity-50">
                         <div className="bg-white p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform border border-slate-100"><Smartphone className="w-4 h-4 text-slate-700" /></div>
                         <span className="text-xs font-bold text-slate-600 text-center">Nativa</span>
                      </button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving} className="h-24 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-sle-blue transition-all flex flex-col items-center justify-center gap-1 group disabled:opacity-50">
                         <div className="bg-white p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform border border-slate-100"><ImagePlus className="w-4 h-4 text-slate-700" /></div>
                         <span className="text-xs font-bold text-slate-600 text-center">Galeria</span>
                      </button>
                    </div>
                 </div>
               </div>
             )}
             
             <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handlePhotoCapture} />
             <input type="file" ref={nativeCameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
             <canvas ref={canvasRef} className="hidden" />
          </section>

        </div>

        {!isCameraOpen && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 safe-area-bottom">
            <Button className="w-full h-12 sm:h-14 text-lg shadow-lg" disabled={!selectedEmployee || photos.length === 0 || isSaving} onClick={handleConfirmService} isLoading={isSaving}>
              Confirmar Atendimento
            </Button>
            {(!selectedEmployee || photos.length === 0) && !isSaving && (
               <p className="text-center text-xs text-slate-400 mt-2">Selecione um funcionário e adicione pelo menos uma foto.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
