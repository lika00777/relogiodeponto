'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciais inválidas. Verifique o e-mail e senha.');
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 bg-grid relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.02] border border-white/10 p-8 rounded-[4px] backdrop-blur-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-accent flex items-center justify-center rounded-[2px] shadow-[0_0_20px_rgba(0,229,255,0.4)] mb-4">
            <Lock className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase">Acesso <span className="text-accent">Chronos</span></h1>
          <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] mt-2">Protocolo de Autenticação Ativo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">ID Corporativo (E-mail)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-[2px] text-sm focus:border-accent outline-none transition-all text-foreground"
                placeholder="exemplo@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Código de Segurança</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-[2px] text-sm focus:border-accent outline-none transition-all text-foreground"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-tight rounded-[2px] flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-black p-4 rounded-[2px] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(0,229,255,0.2)]"
          >
            {loading ? 'Validando...' : (
              <>
                Entrar no Sistema
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-foreground/20 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
          Uso restrito a funcionários autorizados.<br/>Acesso monitorizado sob protocolo de segurança 2.0.
        </p>
      </motion.div>
    </main>
  );
}
