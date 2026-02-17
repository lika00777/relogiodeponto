'use client';

import { useEffect } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface FaceScannerProps {
  onCapture: (descriptor: number[], imageSrc?: string) => void;
  onCancel: () => void;
}

export default function FaceScanner({ onCapture, onCancel }: FaceScannerProps) {
  const { isModelLoaded, error, videoRef, startVideo, stopVideo, getFaceDescriptor, getSnapshot } = useFaceRecognition();

  useEffect(() => {
    startVideo();
    return () => stopVideo();
  }, []);

  const handleVerify = async () => {
    const descriptor = await getFaceDescriptor();
    if (descriptor) {
      const snapshot = getSnapshot(); // Capture the frame
      stopVideo(); // Desliga a câmera antes de fechar o modal
      onCapture(descriptor, snapshot || undefined);
    } else {
      alert('Rosto não detectado. Tente manter-se imóvel e centralizado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center p-6 backdrop-blur-xl">
      <div className="relative aspect-video bg-[var(--card-bg)] border-2 border-[var(--border)] rounded-[2px] overflow-hidden">
        {/* Scanner Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <motion.div 
            className="w-full h-[2px] bg-accent shadow-[0_0_15px_#00E5FF]"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute' }}
          />
          <div className="absolute inset-0 border-[40px] border-black/40 dark:border-black/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-accent/20 rounded-full" />
        </div>

        {!isModelLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm z-20">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-3 py-1">Inicializando Biometria...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-red-500 z-20 px-12 text-center">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
            <button onClick={onCancel} className="mt-4 text-xs underline uppercase font-bold text-foreground hover:text-accent">Voltar</button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover grayscale brightness-75 contrast-125"
        />
      </div>

      <div className="mt-12 flex gap-4 w-full max-w-md">
        <button 
          onClick={onCancel}
          className="flex-1 py-4 border border-[var(--border)] text-foreground/40 font-bold uppercase tracking-widest hover:bg-white/5 dark:hover:bg-white/5 transition-all"
        >
          Cancelar
        </button>
        <button 
          onClick={handleVerify}
          disabled={!isModelLoaded}
          className="flex-1 py-4 bg-accent text-white font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          Verificar Face
        </button>
      </div>
      
      <p className="mt-8 text-accent/40 text-[10px] uppercase font-bold tracking-[0.3em]">
        Mantenha-se centralizado e evite movimentos bruscos
      </p>
    </div>
  );
}
