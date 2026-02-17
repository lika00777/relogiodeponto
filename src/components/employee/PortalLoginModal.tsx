'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  full_name: string;
}

export default function PortalLoginModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: (user: any) => void;
}) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      setStep('select');
      setSelectedUser(null);
      setPin('');
      setError(null);
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase.rpc('get_employee_list');
    if (error) {
      console.error('Error fetching employees:', error);
    }
    if (data) setEmployees(data);
  };

  const handleVerifyPin = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setError(null);

    const { data: isValid, error: rpcError } = await supabase.rpc('verify_profile_pin', {
      p_user_id: selectedUser.id,
      p_pin: pin
    });

    if (rpcError) {
      setError('Erro de sistema ao validar PIN.');
    } else if (isValid) {
      // Fetch full user data to pass along via secure RPC
      const { data: userProfile, error: profileError } = await supabase.rpc('get_profile_by_id', {
        p_user_id: selectedUser.id
      });
      
      if (profileError || !userProfile || (Array.isArray(userProfile) && userProfile.length === 0)) {
        setError('Erro ao carregar dados do perfil.');
        setLoading(false);
        return;
      }

      const user = Array.isArray(userProfile) ? userProfile[0] : userProfile;

      // Validar método autorizado
      if (user.punch_method && user.punch_method !== 'both' && user.punch_method !== 'pin') {
        setError('ERRO: Você não tem permissão para picar via PIN. Use o Reconhecimento Facial.');
        setLoading(false);
        return;
      }

      onSuccess(user);
      onClose();
    } else {
      setError('Código PIN incorreto.');
      setPin('');
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] p-8 rounded-[2px] relative overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 -rotate-45 translate-x-16 -translate-y-16" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-foreground italic">Portal Colaborador</h2>
                <p className="text-[9px] text-foreground/40 font-bold uppercase tracking-[0.2em] mt-1">Acesso via PIN Individual</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 -mt-2 text-foreground/20 hover:text-white transition-colors"
              >
                <X className="w-5 h-5 text-foreground/40 group-hover:text-foreground" />
              </button>
            </div>

            <div className="relative z-10">
              {step === 'select' ? (
                <div className="space-y-4">
                   <div className="text-[10px] font-black text-accent uppercase tracking-widest mb-4">Selecione o seu nome:</div>
                   <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                     {employees.map(emp => (
                       <button 
                         key={emp.id}
                         onClick={() => {
                           setSelectedUser(emp);
                           setStep('pin');
                         }}
                          className="w-full text-left p-4 bg-white/[0.03] dark:bg-white/[0.03] border border-[var(--border)] hover:border-accent/40 hover:bg-accent/5 transition-all flex items-center justify-between group"
                       >
                         <span className="text-xs font-bold text-foreground/70 group-hover:text-foreground">{emp.full_name}</span>
                         <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                       </button>
                     ))}
                   </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-white/[0.03] dark:bg-white/[0.03] border border-[var(--border)]">
                    <div className="p-2 bg-accent/20 rounded-full">
                       <User className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-accent uppercase tracking-[0.2em]">Identificado como</span>
                      <span className="text-xs font-bold text-foreground">{selectedUser?.full_name}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block ml-1">Código PIN</label>
                    <input 
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      autoComplete="off"
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && pin.length >= 4 && handleVerifyPin()}
                      className="w-full bg-[var(--card-bg)] border border-[var(--border)] p-5 rounded-[1px] text-center text-2xl font-black tracking-[1em] text-accent focus:border-accent outline-none"
                      placeholder="••••"
                    />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase text-center">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setStep('select')}
                      className="flex-1 py-4 text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-white transition-all border border-white/5"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={handleVerifyPin}
                      disabled={loading || pin.length < 4}
                      className="flex-[2] py-4 bg-accent text-white font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Painel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
