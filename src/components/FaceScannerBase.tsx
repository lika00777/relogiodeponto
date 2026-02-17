'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FaceScannerBaseProps {
  onCapture: (descriptor: number[], imageSrc?: string) => void;
  onCancel: () => void;
  variant?: 'modal' | 'inline';
  title?: string;
  overlayColor?: string;
}

export default function FaceScannerBase({
  onCapture,
  onCancel,
  variant = 'modal',
  title = 'BioMetric Scan',
  overlayColor = '#00E5FF'
}: FaceScannerBaseProps) {
  const { 
    isModelLoaded, 
    error, 
    videoRef, 
    startVideo, 
    stopVideo, 
    getFaceDescriptor, 
    getSnapshot 
  } = useFaceRecognition();
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    startVideo();
    return () => stopVideo();
  }, []);

  const handleVerify = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const descriptor = await getFaceDescriptor();
      if (descriptor) {
        const snapshot = getSnapshot();
        stopVideo();
        onCapture(descriptor, snapshot || undefined);
      } else {
        alert('Rosto não detectado. Tente manter-se imóvel e centralizado.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Verify error:', err);
      setIsProcessing(false);
    }
  };

  const isModal = variant === 'modal';

  const containerClasses = isModal 
    ? "fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center p-6 backdrop-blur-xl"
    : "absolute inset-0 z-20 bg-black flex flex-col items-center justify-center overflow-hidden";

  const videoWrapperClasses = isModal
    ? "relative aspect-video bg-[var(--card-bg)] border-2 border-[var(--border)] rounded-[2px] overflow-hidden w-full max-w-2xl"
    : "absolute inset-0 w-full h-full object-cover grayscale brightness-90 contrast-125";

  return (
    <div className={containerClasses}>
      {/* Header Info - Only for Inline or as needed */}
      {!isModal && (
        <div className="absolute top-6 left-0 right-0 text-center z-30">
          <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
            {title}
          </span>
        </div>
      )}

      {/* Video Container */}
      <div className={isModal ? videoWrapperClasses : "absolute inset-0"}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover grayscale contrast-125 ${isModal ? 'brightness-75' : 'brightness-90'}`}
        />

        {/* Scanner Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <motion.div 
            className="w-full h-[1px]"
            style={{ 
              backgroundColor: overlayColor, 
              boxShadow: `0 0 10px ${overlayColor}`,
              position: 'absolute' 
            }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Visual Guides */}
          {isModal ? (
            <>
              <div className="absolute inset-0 border-[40px] border-black/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-accent/20 rounded-full" />
            </>
          ) : (
            <>
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-accent/40" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-accent/40" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-accent/40" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-accent/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/5 rounded-full" />
            </>
          )}
        </div>

        {/* Status Overlays */}
        <AnimatePresence>
          {(!isModelLoaded && !error) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-accent z-20 bg-black/80"
            >
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-[8px] font-black tracking-[0.3em] uppercase underline decoration-accent/30 underline-offset-4">Sincronizando IA...</span>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-500 z-20 bg-black/90 p-6 text-center"
            >
              <AlertCircle className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-tight">{error}</span>
              <button onClick={onCancel} className="text-[8px] underline uppercase font-black text-white px-4 py-2 hover:bg-white/5">Fechar</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className={`${isModal ? 'mt-12 w-full max-w-md' : 'absolute bottom-6 inset-x-6'} flex gap-3 z-30`}>
        <button 
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className={`flex-1 py-4 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 rounded-[1px] ${
            isModal 
              ? 'border border-[var(--border)] text-foreground/40 hover:bg-white/5' 
              : 'border border-white/20 bg-black/60 backdrop-blur-md text-white/60 hover:text-white'
          }`}
        >
          {isModal ? 'Cancelar' : 'Sair'}
        </button>
        <button 
          type="button"
          onClick={handleVerify}
          disabled={!isModelLoaded || isProcessing}
          className="flex-[2] py-4 bg-accent text-white font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_rgba(0,229,255,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-[1px]"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            'Confirmar Identidade'
          )}
        </button>
      </div>

      {isModal && (
        <p className="mt-8 text-accent/40 text-[10px] uppercase font-bold tracking-[0.3em]">
          Mantenha-se centralizado para validação biométrica
        </p>
      )}
    </div>
  );
}
