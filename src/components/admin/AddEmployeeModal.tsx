import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X } from 'lucide-react';
import NeonButton from '../ui/NeonButton';
import { NewEmployeeData } from '@/types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewEmployeeData) => Promise<void>;
  loading: boolean;
}

export default function AddEmployeeModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading 
}: AddEmployeeModalProps) {
  
  const [formData, setFormData] = useState<NewEmployeeData>({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    work_start: '09:00',
    work_end: '18:00'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    // Reset form on success is handled by parent or manual reset if needed
    // But typically parent closes modal, so state is preserved or reset on next open?
    // React state persists if component is not unmounted. 
    // We should reset form when modal closes or opens.
  };

  // Reset form when opening? No, useEffect maybe. 
  // For now let's keep it simple.

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-[var(--background)] border border-[var(--border)] p-8 rounded-[2px] relative overflow-hidden"
          >
            {/* Decorative Corners */}
            <div className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-accent" />
            <div className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-accent" />

            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-xl font-black uppercase tracking-tighter text-foreground italic flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-accent" />
                Novo Recurso
              </h2>
              <button onClick={onClose} className="text-foreground/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">E-mail Laboral</label>
                <input 
                  type="email"
                  required
                  placeholder="func@empresa.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all placeholder:text-white/10"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Password Temporária</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all placeholder:text-white/10"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Nome Identificador</label>
                <input 
                  required
                  placeholder="Ex: Jose Ferreira"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all placeholder:text-white/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Shift Start</label>
                <input 
                  type="time"
                  value={formData.work_start}
                  onChange={e => setFormData({...formData, work_start: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Nível de Acesso</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as 'admin' | 'employee'})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all"
                >
                  <option value="employee">Colaborador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Shift End</label>
                <input 
                  type="time"
                  value={formData.work_end}
                  onChange={e => setFormData({...formData, work_end: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all"
                />
              </div>

              <div className="col-span-2 flex gap-4 mt-6 pt-6 border-t border-white/5">
                <NeonButton 
                  type="button" 
                  variant="secondary" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </NeonButton>
                
                <NeonButton 
                  type="submit" 
                  variant="primary" 
                  isLoading={loading}
                  className="flex-[2]"
                >
                  Confirmar
                </NeonButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
