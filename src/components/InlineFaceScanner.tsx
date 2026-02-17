'use client';

import { useEffect, useState } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { RefreshCw, AlertCircle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InlineFaceScannerProps {
  onCapture: (descriptor: number[], imageSrc?: string) => void;
  onCancel: () => void;
}

export default function InlineFaceScanner({ onCapture, onCancel }: InlineFaceScannerProps) {
  const { isModelLoaded, error, videoRef, startVideo, stopVideo, getFaceDescriptor, getSnapshot } = useFaceRecognition();
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    startVideo();
    return () => stopVideo();
  }, []);

  const handleVerify = async () => {
    setIsScanning(true);
    const descriptor = await getFaceDescriptor();
    if (descriptor) {
      const snapshot = getSnapshot();
      stopVideo();
      onCapture(descriptor, snapshot || undefined);
    } else {
      alert('Rosto não detectado. Tente manter-se imóvel e centralizado.');
      setIsScanning(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover grayscale brightness-90 contrast-125"
      />

      {/* Scanner Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Scanning Line */}
        <motion.div 
          className="w-full h-[1px] bg-accent/50 shadow-[0_0_10px_#00E5FF]"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute' }}
        />
        
        {/* Corner Brackets */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-accent/40" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-accent/40" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-accent/40" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-accent/40" />

        {/* Circular Guide */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/5 rounded-full" />
      </div>

      {/* Loading State */}
      {!isModelLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-accent z-20 bg-black/80">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-[8px] font-black tracking-[0.3em] uppercase">Iniciando IA...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-500 z-20 bg-black/90 p-6 text-center">
          <AlertCircle className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{error}</span>
          <button onClick={onCancel} className="text-[8px] underline uppercase font-black text-white px-4 py-2 hover:bg-white/5">Fechar</button>
        </div>
      )}

      {/* Action Controls */}
      <div className="absolute bottom-6 inset-x-6 flex gap-3 z-30">
        <button 
          type="button"
          onClick={onCancel}
          disabled={isScanning}
          className="flex-1 py-4 border border-white/20 bg-black/60 backdrop-blur-md text-white/60 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all disabled:opacity-50 rounded-[1px]"
        >
          Sair
        </button>
        <button 
          type="button"
          onClick={handleVerify}
          disabled={!isModelLoaded || isScanning}
          className="flex-[2] py-4 bg-accent text-white font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:bg-accent/80 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-[1px]"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processando
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Confirmar Identificação
            </>
          )}
        </button>
      </div>

      {/* Scanning status text */}
      <div className="absolute top-6 left-0 right-0 text-center z-30">
          <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
            Auto-Focus BioMetric V4.0
          </span>
      </div>
    </div>
  );
}
