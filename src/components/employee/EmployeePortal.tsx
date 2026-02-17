'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  LogOut,
  Infinity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MyVacationsView from './MyVacationsView';
import TeamVacationsView from './TeamVacationsView';
import { ThemeToggle } from '../ui/ThemeToggle';

export default function EmployeePortal({ 
  user, 
  onBack,
  currentLocationId
}: { 
  user: any, 
  onBack: () => void,
  currentLocationId?: string | null 
}) {
  const [vacations, setVacations] = useState<any[]>([]);
  const [vacationStats, setVacationStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Heartbeat Effect
  useEffect(() => {
    if (!currentLocationId) return;

    const sendHeartbeat = async () => {
      await supabase.rpc('update_location_status', { 
        p_user_id: user.id, 
        p_location_id: currentLocationId 
      });
    };

    sendHeartbeat(); // Immediate
    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000); // Every 5 min

    return () => clearInterval(interval);
  }, [user.id, currentLocationId]);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all relevant vacations for the portal (own + approved team + colors)
    const { data: vData, error: vError } = await supabase.rpc('get_employee_portal_data', { p_user_id: user.id });
    
    if (vError) {
      console.error('Error fetching portal vacations:', vError);
    }

    // Fetch vacation stats
    const { data: sData, error: sError } = await supabase.rpc('get_vacation_stats', { p_user_id: user.id });
    
    if (sError) {
      console.error('Error fetching vacation stats:', sError);
    }

    if (vData) {
      // Map full_name to user_name for VacationCalendar compliance and ensure fields exist
      const mappedVacations = vData.map((v: any) => ({
        ...v,
        user_name: v.full_name || v.user_name || 'Desconhecido',
        calendar_color: v.calendar_color || '#00E5FF',
        is_own: v.is_own ?? (v.user_id === user.id)
      }));
      setVacations(mappedVacations);
    }
    if (sData?.[0]) setVacationStats(sData[0]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-[var(--background)] z-50 flex flex-col font-sans">
      {/* Premium Hexagon Grid Background */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 border-b border-[var(--border)] flex items-center justify-between backdrop-blur-md bg-[var(--card-bg)]">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 -ml-2 text-foreground/40 hover:text-accent transition-colors group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <div className="flex flex-col">
            <span className="font-bold text-[10px] uppercase tracking-[0.4em] text-accent/60">Colaborador</span>
            <span className="font-bold text-sm text-white tracking-tight">{user.full_name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-accent/5 border border-accent/20 rounded-[2px]">
          <CalendarIcon className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Centro de Férias & Ausências</span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button 
            onClick={onBack}
            className="p-2 text-foreground/40 hover:text-red-500 transition-colors"
            title="Sair do Portal"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-x-auto flex flex-col p-6 max-w-7xl mx-auto w-full custom-scrollbar">
        <div className="flex-1">
          <MyVacationsView user={user} requests={vacations} stats={vacationStats} onRefresh={fetchData} />
        </div>
      </main>

      {/* Footer / Info */}
      <footer className="relative z-10 px-6 py-3 border-t border-[var(--border)] flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] text-foreground/20">
        <div className="flex gap-4">
          <span>CHRONOS PRO v2.0</span>
          <span>•</span>
          <span>SISTEMA DE GESTÃO LISDIK</span>
        </div>
        <div className="flex items-center gap-2 text-accent/40">
           <Infinity className="w-3 h-3" />
           <span>PROTOCOLO DE SINCRONIZAÇÃO ATIVO</span>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 transition-all rounded-[1px] relative ${
        active ? 'bg-accent text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] shadow-[0_0_15px_rgba(0,229,255,0.3)]' : 'text-foreground/30 hover:text-foreground/60'
      }`}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div 
          layoutId="tab-pill" 
          className="absolute inset-0 bg-accent rounded-[1px] -z-10" 
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}
