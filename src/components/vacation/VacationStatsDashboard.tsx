'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PieChart 
} from 'lucide-react';

interface VacationStats {
  entitlement: number;
  scheduled: number;
  taken: number;
  pending: number;
  fixed: number;
  available: number;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function StatCard({ label, value, icon, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/[0.03] border border-white/5 p-4 rounded-[2px] flex flex-col gap-3 relative overflow-hidden group"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 transition-transform group-hover:scale-110 text-white`}>
        {icon}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-full bg-white/5 text-white">
          {icon}
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">{label}</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black italic tracking-tighter text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
          {value}
        </span>
        <span className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">Dias</span>
      </div>

    </motion.div>
  );
}

export default function VacationStatsDashboard({ stats }: { stats: VacationStats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      <StatCard 
        label="Direito Total" 
        value={stats.entitlement} 
        icon={<PieChart size={16} />} 
        color="#FFFFFF" 
        delay={0.1}
      />
      <StatCard 
        label="Férias Fixas" 
        value={stats.fixed} 
        icon={<CheckCircle2 size={16} />} 
        color="#FFFFFF" 
        delay={0.2}
      />
      <StatCard 
        label="Pendentes" 
        value={stats.pending} 
        icon={<Clock size={16} />} 
        color="#F97316" 
        delay={0.3}
      />
      <StatCard 
        label="Agendados" 
        value={stats.scheduled} 
        icon={<CalendarIcon size={16} />} 
        color="#00E5FF" 
        delay={0.4}
      />
      <StatCard 
        label="Gozados" 
        value={stats.taken} 
        icon={<CheckCircle2 size={16} />} 
        color="#22C55E" 
        delay={0.5}
      />
      <StatCard 
        label="Disponíveis" 
        value={stats.available} 
        icon={<AlertCircle size={16} />} 
        color="#00E5FF" 
        delay={0.6}
      />
    </div>
  );
}
