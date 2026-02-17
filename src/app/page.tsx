'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Fingerprint, Hash, ArrowRight, Settings, LogOut, LogIn, ShieldCheck, Undo2, Calendar } from 'lucide-react';
import Clock from '@/components/Clock';
import GeofenceStatus from '@/components/GeofenceStatus';
import FaceScanner from '@/components/FaceScanner';
import InlineFaceScanner from '@/components/InlineFaceScanner';
import LoginModal from '@/components/LoginModal';
import EmployeePortal from '@/components/employee/EmployeePortal';
import PortalLoginModal from '@/components/employee/PortalLoginModal';
import { identifyUserByFace, registerAttendance, getLastPunch, switchLastPunch } from '@/lib/attendance';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function Home() {
  const router = useRouter();
  const [isInRange, setIsInRange] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [method, setMethod] = useState<'face' | 'biometric' | 'pin' | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPunch, setLastPunch] = useState<{ id: string, name: string, type: string } | null>(null);
  const [showPortalLogin, setShowPortalLogin] = useState(false);
  const [isPunchingViaPin, setIsPunchingViaPin] = useState(false);
  const [showEmployeePortal, setShowEmployeePortal] = useState(false);
  const [identifiedUser, setIdentifiedUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handlePinPunch = async (user: any) => {
    setIsProcessing(true);
    try {
      // Validar método autorizado
      if (user.punch_method && user.punch_method !== 'both' && user.punch_method !== 'pin') {
        alert('ERRO: Você não tem permissão para picar via PIN. Use o Reconhecimento Facial.');
        return;
      }

      // Geofencing
      if (!isInRange) {
        alert('Erro: Fora do perímetro autorizado para picagem.');
        return;
      }

      const lastLog = await getLastPunch(user.id);
      let nextType: 'entry' | 'exit' = 'entry';
      if (lastLog && lastLog.type === 'entry') {
        nextType = 'exit';
      }

      const { success, data } = await registerAttendance({
        userId: user.id,
        locationId: locationId || '00000000-0000-0000-0000-000000000001',
        type: nextType,
        method: 'pin',
        coords: { lat: 41.377976, lng: -8.304065 }
      });

      if (success && data) {
        setLastPunch({ id: data.id, name: user.full_name, type: nextType });
        setIdentifiedUser(user);
        setTimeout(() => setLastPunch(prev => prev?.id === data.id ? null : prev), 8000);
      } else {
        alert('Erro ao registrar ponto via PIN.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado no processamento PIN.');
    } finally {
      setIsProcessing(false);
      setIsPunchingViaPin(false);
    }
  };

  const handleIdentification = async (descriptor: number[]) => {
    setIsProcessing(true);
    try {
      // Pilar 1: Identificação Facial (Quem é você?)
      const identifiedUser = await identifyUserByFace(descriptor);

      if (!identifiedUser) {
        alert('Rosto não identificado. Verifique se possui cadastro ou tente novamente.');
        return;
      }

      // Validar método autorizado
      if (identifiedUser.punch_method && identifiedUser.punch_method !== 'both' && identifiedUser.punch_method !== 'face') {
        alert('ERRO: Você não tem permissão para picar via Reconhecimento Facial. Use o seu PIN.');
        return;
      }

      // Pilar 2: Geofencing (Onde você está?)
      if (!isInRange) {
        alert('Erro: Fora do perímetro autorizado.');
        return;
      }

      // Pilar 3: Protocolo Inteligente (O que você vai fazer?)
      const lastLog = await getLastPunch(identifiedUser.id);
      
      // Lógica Auto-Switch: Se o último foi entrada, agora é saída. Se não existe ou foi saída, é entrada.
      let nextType: 'entry' | 'exit' = 'entry';
      if (lastLog && lastLog.type === 'entry') {
        nextType = 'exit';
      }

      const { success, data } = await registerAttendance({
        userId: identifiedUser.id,
        locationId: locationId || '00000000-0000-0000-0000-000000000001',
        type: nextType,
        method: 'face',
        coords: { lat: 41.377976, lng: -8.304065 } 
      });

      if (success && data) {
        // Alerta de Atraso automático
        if (nextType === 'entry' && identifiedUser.work_start) {
          const now = new Date();
          const [h, m] = identifiedUser.work_start.split(':');
          const workStart = new Date();
          workStart.setHours(parseInt(h), parseInt(m), 0);

          if (now > workStart) {
            await supabase.from('notifications').insert({
              user_id: identifiedUser.id,
              title: 'Alerta de Atraso',
              message: `${identifiedUser.full_name} registrou entrada com atraso (${identifiedUser.work_start}).`,
              type: 'warning'
            });
          }
        }
        
        setLastPunch({ id: data.id, name: identifiedUser.full_name, type: nextType });
        setIdentifiedUser(identifiedUser); // Stock for portal access
        // Auto-hide after 8 seconds (give time to undo)
        setTimeout(() => setLastPunch(prev => prev?.id === data.id ? null : prev), 8000);
      } else {
        alert('Erro ao registrar ponto no servidor.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado no processamento.');
    } finally {
      setIsProcessing(false);
      setShowScanner(false);
    }
  };

  const handleUndo = async () => {
    if (!lastPunch) return;

    if (confirm(`O sistema registou ${lastPunch.type === 'entry' ? 'ENTRADA' : 'SAÍDA'}. Pretende ALTERAR para ${lastPunch.type === 'entry' ? 'SAÍDA' : 'ENTRADA'}?`)) {
       const { success, newType } = await switchLastPunch(lastPunch.id);
       
       if (success && newType) {
         setLastPunch(prev => prev ? { ...prev, type: newType } : null);
         alert(`Registo corrigido com sucesso para ${newType === 'entry' ? 'ENTRADA' : 'SAÍDA'}.`);
       } else {
         alert('Erro ao tentar corrigir o registo.');
       }
    }
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 bg-grid">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-accent/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

      {/* App Header - Responsive */}
      <div className="absolute top-4 md:top-8 left-4 md:left-8 right-4 md:right-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-accent flex items-center justify-center rounded-[2px] shadow-[0_0_20px_rgba(0,229,255,0.4)]">
            <span className="font-black text-black text-lg md:text-xl">P</span>
          </div>
          <span className="font-bold tracking-tighter text-lg md:text-xl text-foreground text-glow">CHRONOS <span className="text-accent underline decoration-accent/30 underline-offset-4">PRO</span></span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => identifiedUser ? setShowEmployeePortal(true) : setShowPortalLogin(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/30 rounded-[1px] text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-black transition-all shadow-[0_0_15px_rgba(0,229,255,0.1)]"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Meu Painel</span>
          </button>

          <div className="hidden sm:flex flex-col items-end">
             <span className="text-[8px] md:text-[9px] font-black text-accent tracking-[0.3em] uppercase">Status</span>
             <span className="text-[9px] md:text-[10px] font-bold text-foreground/40 uppercase">Terminal Ativo</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="p-3 bg-white/[0.03] border border-white/10 hover:border-accent/40 rounded-full transition-all group scale-90 md:scale-100"
              title="Acessar Admin"
            >
              <Settings className="w-5 h-5 text-foreground group-hover:text-accent group-hover:rotate-45 transition-all duration-300" />
            </button>
          </div>
        </div>
      </div>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      <PortalLoginModal 
        isOpen={showPortalLogin}
        onClose={() => {
          setShowPortalLogin(false);
          setIsPunchingViaPin(false);
        }}
        onSuccess={(user) => {
          if (isPunchingViaPin) {
            handlePinPunch(user);
          } else {
            setIdentifiedUser(user);
            setShowEmployeePortal(true);
          }
        }}
      />

      <AnimatePresence>
        {showEmployeePortal && identifiedUser && (
          <EmployeePortal 
            user={identifiedUser} 
            onBack={() => {
              setShowEmployeePortal(false);
              setIdentifiedUser(null);
            }} 
            currentLocationId={locationId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastPunch && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 rounded-full shadow-2xl z-50 border backdrop-blur-md ${
              lastPunch.type === 'entry' 
                ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]' 
                : 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.3)]'
            }`}
          >
            <div className={`p-4 rounded-full ${lastPunch.type === 'entry' ? 'bg-green-500' : 'bg-orange-500'} text-black`}>
              {lastPunch.type === 'entry' ? <LogIn className="w-8 h-8" /> : <LogOut className="w-8 h-8" />}
            </div>
            
            <div className="flex flex-col">
              <span className={`text-xl uppercase font-black tracking-widest ${lastPunch.type === 'entry' ? 'text-green-500' : 'text-orange-500'}`}>
                {lastPunch.type === 'entry' ? 'ENTRADA' : 'SAÍDA'} REGISTADA
              </span>
              <span className="text-white text-lg font-bold">{lastPunch.name}</span>
            </div>

            <div className="h-12 w-[1px] bg-white/10 mx-4" />

            <button 
              onClick={handleUndo}
              className="flex flex-col items-center justify-center group pr-2"
            >
              <div className="flex items-center gap-1 text-white/40 group-hover:text-accent transition-colors">
                <Undo2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Errei? Corrigir</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-14 items-center z-10 pt-20 md:pt-0">
        {/* Left Section: Status and Clock */}
        <div className="space-y-6 md:space-y-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="flex justify-center lg:justify-start"
          >
            <Clock />
          </motion.div>

          <div className="space-y-4 md:space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GeofenceStatus onStatusChange={(range, locId) => {
                setIsInRange(range);
                setLocationId(locId);
              }} />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="p-5 md:p-6 border border-accent/20 bg-accent/5 rounded-[2px] shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                 <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Protocolo Inteligente Ativo</span>
              </div>
              
              <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-medium">
                O sistema deteta automaticamente <span className="text-accent font-bold">Entrada</span> ou <span className="text-orange-500 font-bold">Saída</span> baseada no seu último registo.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right Section: Interaction Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2px] p-6 md:p-10 backdrop-blur-xl relative shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 -rotate-45 translate-x-16 -translate-y-16 group-hover:bg-accent/10 transition-all duration-700" />
          <div className="absolute -top-[1px] -left-[1px] w-16 h-16 border-t-[2px] border-l-[2px] border-accent shadow-[0_0_15px_rgba(0,229,255,0.4)]" />
          <div className="absolute -bottom-[1px] -right-[1px] w-16 h-16 border-b-[2px] border-r-[2px] border-accent shadow-[0_0_15px_rgba(0,229,255,0.4)]" />
          
          <div className="mb-8 md:mb-12">
            <h2 className="text-xl md:text-2xl font-black tracking-tighter text-foreground uppercase italic underline decoration-accent/20 decoration-4">Terminal Biométrico</h2>
            <p className="text-[9px] md:text-[10px] text-foreground/40 font-bold uppercase tracking-[0.2em] mt-2">Aproxime-se para identificação AI</p>
          </div>
          
          <div className="grid gap-6 md:gap-8">
            <div
              onClick={() => {
                if (isInRange && !isProcessing && !showScanner) {
                  setMethod('face');
                  setShowScanner(true);
                }
              }}
              role="button"
              tabIndex={isInRange && !isProcessing ? 0 : -1}
              className={`group flex flex-col items-center gap-6 md:gap-10 p-10 md:p-16 border-2 transition-all duration-500 relative overflow-hidden h-[400px] md:h-[500px] justify-center ${
                !isInRange ? 'opacity-20 grayscale cursor-not-allowed border-white/5 bg-transparent' :
                'bg-accent/5 border-accent/30 hover:border-accent hover:bg-accent/15 hover:shadow-[0_0_40px_rgba(0,229,255,0.2)] cursor-pointer'
              }`}
            >
              <AnimatePresence mode="wait">
                {showScanner && method === 'face' ? (
                  <motion.div 
                    key="scanner-inline"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20"
                  >
                    <InlineFaceScanner 
                      onCapture={handleIdentification}
                      onCancel={() => setShowScanner(false)}
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="button-static"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-6 md:gap-10"
                  >
                    <div className={`p-8 md:p-10 rounded-full transition-all duration-500 relative z-10 ${
                      isInRange 
                        ? 'bg-accent text-black shadow-[0_0_50px_rgba(0,229,255,0.4)] group-hover:scale-110 group-hover:rotate-6' 
                        : 'bg-white/10 text-white/20'
                    }`}>
                      <Camera className="w-12 h-12 md:w-16 md:h-16" />
                      {isInRange && <div className="absolute inset-0 rounded-full animate-ping bg-accent/20" />}
                    </div>
                    <div className="text-center relative z-10">
                      <span className={`block font-black uppercase tracking-[0.3em] text-sm md:text-lg ${isInRange ? 'text-accent' : 'text-white/20'}`}>
                        {isProcessing ? 'PROCESSANDO...' : 'RECONHECIMENTO FACIAL'}
                      </span>
                      <span className="text-[8px] md:text-[10px] text-foreground/40 font-bold uppercase mt-3 block">Inicia Scanner de Profundidade 3D</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <AltMethod icon={<Fingerprint className="w-5 h-5" />} label="Digital" disabled={true} />
               <AltMethod 
                 icon={<Hash className="w-5 h-5" />} 
                 label="PIN Code" 
                 disabled={!isInRange || isProcessing}
                 onClick={() => {
                   setIsPunchingViaPin(true);
                   setShowPortalLogin(true);
                 }}
               />
            </div>
          </div>

          {!isInRange && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 md:mt-10 p-5 bg-red-500/10 border border-red-500/30 rounded-[2px] flex items-center gap-4 border-dashed"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-red-500/20 rounded-full">
                <ShieldCheck className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Bloqueio Ativo</span>
                <span className="text-[9px] text-red-500/60 font-bold uppercase">Procedimento de Geofencing falhou</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <footer className="mt-12 md:absolute md:bottom-8 text-foreground/20 text-[8px] md:text-[10px] font-bold tracking-[0.4em] uppercase text-center w-full px-4">
        Chronos Pro <span className="mx-2 md:mx-4">•</span> Protocolo 1:N Alpha <span className="mx-2 md:mx-4">•</span> Base Vizela HQ
      </footer>
    </main>
  );
}

function AltMethod({ icon, label, disabled, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 p-3 border rounded-[2px] transition-all ${
        disabled 
          ? 'opacity-20 cursor-not-allowed border-white/5' 
          : 'bg-white/5 border-white/10 hover:border-accent/40 text-foreground/60 hover:text-white cursor-pointer active:scale-95'
      }`}
    >
      {icon}
      <span className="text-[9px] font-black uppercase">{label}</span>
    </button>
  );
}
