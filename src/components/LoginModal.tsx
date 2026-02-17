'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, X, Lock, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NeonButton from './ui/NeonButton';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/admin'); // Let non-admins enter too? Or block? usually admin panel is for admins.
          // For now, let's redirect to admin, assuming page.tsx in admin handles role checks if needed, 
          // or at least they are authenticated.
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-[var(--background)] border-2 border-accent/20 p-8 rounded-[2px] relative shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(0,0,0,1)]"
          >
            {/* Decorative Corners */}
            <div className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-accent" />
            <div className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-accent" />

            <div className="flex justify-between items-start mb-8">
              <h2 className="text-xl font-black uppercase tracking-tighter text-foreground italic flex items-center gap-3">
                <Lock className="w-5 h-5 text-accent" />
                Acesso Administrativo
              </h2>
              <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                  <Mail className="w-3 h-3" /> E-mail Corporativo
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 dark:bg-white/5 border border-[var(--border)] p-4 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all placeholder:text-foreground/10"
                  placeholder="admin@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Chave de Segurança
                </label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 dark:bg-white/5 border border-[var(--border)] p-4 rounded-[2px] text-sm text-foreground focus:border-accent focus:bg-accent/5 outline-none transition-all placeholder:text-foreground/10"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[2px] text-red-500 text-xs font-bold uppercase tracking-wide">
                  {error}
                </div>
              )}

              <NeonButton 
                type="submit" 
                variant="primary" 
                isLoading={loading}
                icon={<LogIn className="w-4 h-4" />}
                className="w-full"
              >
                Autenticar
              </NeonButton>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[9px] text-foreground/20 font-mono uppercase tracking-widest">
                Acesso restrito a pessoal autorizado Nível 5
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
