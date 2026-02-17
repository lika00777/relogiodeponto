'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { MapPin, Wifi, Plane, UserX, Clock } from 'lucide-react';

interface CoverageData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  last_seen_at: string | null;
  location_name: string | null;
  is_online: boolean;
  vacation_status: string | null;
  vacation_type: string | null;
  calendar_color?: string;
}

export default function TeamCoverageView() {
  const [coverage, setCoverage] = useState<CoverageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoverage();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCoverage, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCoverage = async () => {
    const { data, error } = await supabase.rpc('get_team_coverage');
    if (error) console.error(error);
    if (data) setCoverage(data);
    setLoading(false);
  };

  const getStatusColor = (user: CoverageData) => {
    if (user.vacation_status === 'approved') return ''; // Handled inline now
    if (user.is_online) return 'text-green-500 border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
    return 'text-foreground/20 border-white/5 bg-white/[0.02] grayscale';
  };

  const FormatTime = ({ date }: { date: string }) => {
    const d = new Date(date);
    return (
      <span className="font-mono text-[9px]">
        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-foreground/20 animate-pulse">Carregando Radar...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/[0.02] p-4 border border-white/5 rounded-[2px]">
        <div>
           <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Radar de Equipa</h3>
           <p className="text-[9px] text-foreground/40 font-bold uppercase mt-1">Monitorização em Tempo Real & Geofencing</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse" />
            <span className="text-[9px] font-bold uppercase text-foreground/60">Online ({coverage.filter(u => u.is_online).length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_5px_rgba(0,229,255,0.8)]" />
            <span className="text-[9px] font-bold uppercase text-foreground/60">Férias ({coverage.filter(u => u.vacation_status === 'approved').length})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {coverage.map(user => {
          const isVacation = user.vacation_status === 'approved';
          const isOnline = user.is_online;
          
          return (
            <motion.div 
              key={user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 border rounded-[2px] relative overflow-hidden group transition-all ${getStatusColor(user)}`}
              style={isVacation ? {
                color: user.calendar_color || '#00E5FF',
                borderColor: `${user.calendar_color || '#00E5FF'}80`,
                backgroundColor: `${user.calendar_color || '#00E5FF'}1a`,
                boxShadow: `0 0 15px ${user.calendar_color || '#00E5FF'}1a`
              } : {}}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[2px] border flex items-center justify-center text-lg font-black bg-black/20`}
                    style={isVacation ? { borderColor: `${user.calendar_color || '#00E5FF'}4d`, color: user.calendar_color || '#00E5FF' } : 
                           isOnline ? { borderColor: 'rgba(34,197,94,0.3)', color: 'rgba(34,197,94,1)' } : 
                           { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      user.full_name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-black uppercase leading-tight ${
                       isVacation || isOnline ? 'text-white' : 'text-foreground/40'
                    }`}>{user.full_name}</h4>
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 block mt-0.5">{user.role}</span>
                  </div>
                </div>

                <div className={`p-1.5 rounded-full`}
                  style={isVacation ? { backgroundColor: `${user.calendar_color || '#00E5FF'}33`, color: user.calendar_color || '#00E5FF' } : 
                         isOnline ? { backgroundColor: 'rgba(34,197,94,0.2)', color: 'rgba(34,197,94,1)' } : 
                         { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
                >
                  {isVacation ? <Plane className="w-3.5 h-3.5" /> : 
                   isOnline ? <Wifi className="w-3.5 h-3.5" /> : 
                   <UserX className="w-3.5 h-3.5" />}
                </div>
              </div>
              
              <div className="space-y-2 mt-4 pt-4 border-t border-black/10 dark:border-white/5">
                 {isVacation ? (
                   <div className="flex items-center gap-2 text-accent">
                     <Clock className="w-3 h-3" />
                     <span className="text-[9px] font-bold uppercase tracking-widest">
                       {user.vacation_type === 'vacation' ? 'EM FÉRIAS' : 'AUSÊNCIA'}
                     </span>
                   </div>
                 ) : isOnline ? (
                   <div className="flex items-center gap-2 text-green-500">
                     <MapPin className="w-3 h-3" />
                     <span className="text-[9px] font-bold uppercase tracking-widest truncate">
                       {user.location_name || 'Local Desconhecido'}
                     </span>
                   </div>
                 ) : (
                   <div className="flex items-center gap-2 text-foreground/30">
                     <Clock className="w-3 h-3" />
                     <span className="text-[9px] font-bold uppercase tracking-widest">
                       Visto às {user.last_seen_at ? <FormatTime date={user.last_seen_at} /> : '--:--'}
                     </span>
                   </div>
                 )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
