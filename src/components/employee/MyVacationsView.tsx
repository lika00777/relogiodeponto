'use client';

import { useState } from 'react';
import VacationCalendar from './VacationCalendar';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, Clock3, AlertCircle, Trash2, CalendarCheck, History, ChevronRight } from 'lucide-react';
import VacationStatsDashboard from '../vacation/VacationStatsDashboard';
import { format, parseISO, isAfter, isBefore, startOfDay, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

export default function MyVacationsView({ 
  user, 
  requests, 
  stats,
  onRefresh 
}: { 
  user: { id: string, full_name?: string }, 
  requests: any[], 
  stats: any,
  onRefresh: () => void 
}) {
  const [selection, setSelection] = useState<{ start: Date, end: Date } | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [intensity, setIntensity] = useState<'full' | 'morning' | 'afternoon' | 'partial'>('full');
  const [type, setType] = useState<'vacation' | 'absence'>('vacation');

  const handleSelectRange = (start: Date, end: Date) => {
    setSelection({ start, end });
  };

  const handleSubmit = async () => {
    if (!selection && selectedDates.length === 0) return;
    setIsSubmitting(true);
    
    try {
      if (selection) {
        const { error } = await supabase.rpc('request_vacation', {
          p_user_id: user.id,
          p_start_date: format(selection.start, 'yyyy-MM-dd'),
          p_end_date: format(selection.end, 'yyyy-MM-dd'),
          p_type: type,
          p_intensity: intensity,
          p_start_time: intensity === 'morning' ? '09:00' : (intensity === 'afternoon' ? '14:00' : null),
          p_end_time: intensity === 'morning' ? '13:00' : (intensity === 'afternoon' ? '18:00' : null)
        });
        if (error) throw error;
      } else {
        // Intercalated - loop calls
        for (const date of selectedDates) {
          const { error } = await supabase.rpc('request_vacation', {
            p_user_id: user.id,
            p_start_date: format(date, 'yyyy-MM-dd'),
            p_end_date: format(date, 'yyyy-MM-dd'),
            p_type: type,
            p_intensity: intensity,
            p_start_time: intensity === 'morning' ? '09:00' : (intensity === 'afternoon' ? '14:00' : null),
            p_end_time: intensity === 'morning' ? '13:00' : (intensity === 'afternoon' ? '18:00' : null)
          });
          if (error) throw error;
        }
      }

      setSelection(null);
      setSelectedDates([]);
      onRefresh();
    } catch (error: any) {
      alert('Erro ao submeter: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem a certeza que deseja anular este pedido?')) return;
    try {
      const { error } = await supabase.rpc('cancel_vacation', { p_request_id: id });
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      alert('Erro ao anular: ' + error.message);
    }
  };

  const today = startOfDay(new Date());

  const scheduledVacations = requests
    .filter(r => r.is_own && r.status === 'approved' && (isAfter(parseISO(r.start_date), today) || isSameDay(parseISO(r.start_date), today)))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const takenVacations = requests
    .filter(r => r.is_own && r.status === 'approved' && isBefore(parseISO(r.start_date), today))
    .sort((a, b) => b.start_date.localeCompare(a.start_date)); // Most recent first

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tighter italic text-foreground">Centro de <span className="text-accent underline decoration-accent/20">Férias & Equipa</span></h2>
          <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest mt-1">Gere as tuas férias e visualiza a disponibilidade da equipa</p>
        </div>
      </div>

      <VacationStatsDashboard stats={stats} />

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        {/* Sidebar: Scheduled & Taken List */}
        <div className="w-full lg:w-72 flex flex-col gap-6 shrink-0">
          {/* Scheduled Section */}
          <div className="flex-1 flex flex-col min-h-[250px] bg-white/[0.02] border border-white/5 p-4 rounded-[2px] backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2 mb-4">
              <CalendarCheck className="w-4 h-4" /> Férias Agendadas
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {scheduledVacations.length > 0 ? (
                scheduledVacations.map((v, i) => (
                  <div key={i} className="group relative bg-white/[0.03] border border-white/5 p-3 rounded-[1px] hover:border-accent/40 transition-all">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{v.entitlement_label || 'Período'}</span>
                        <ChevronRight className="w-3 h-3 text-accent/40 group-hover:text-accent transition-colors" />
                      </div>
                      <div className="text-[11px] font-black text-white uppercase tracking-tight">
                        {format(parseISO(v.start_date), 'dd MMM', { locale: pt })} 
                        {v.start_date !== v.end_date && <span className="mx-1 text-white/20">/</span>}
                        {v.start_date !== v.end_date && format(parseISO(v.end_date), 'dd MMM', { locale: pt })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-[1px] p-6 text-center">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/10 italic">Nenhum agendamento futuro</span>
                </div>
              )}
            </div>
          </div>

          {/* Taken Section */}
          <div className="flex-1 flex flex-col min-h-[250px] bg-white/[0.02] border border-white/5 p-4 rounded-[2px] backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2 mb-4">
              <History className="w-4 h-4" /> Férias Gozadas
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {takenVacations.length > 0 ? (
                takenVacations.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                        {format(parseISO(v.start_date), 'dd MMM')}
                        {v.start_date !== v.end_date && ` - ${format(parseISO(v.end_date), 'dd MMM')}`}
                      </span>
                      <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">{v.entitlement_label || 'FÉRIAS'}</span>
                    </div>
                    {/* Optional: mark as finished */}
                    <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center">
                      <Check className="w-2 h-2 text-white/20" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-[1px] p-6 text-center">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/10 italic">Sem histórico este ano</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area (Calendar) */}
        <div className="flex-1 min-h-[500px] border border-white/5 rounded-[2px] overflow-hidden bg-white/[0.01]">
          <VacationCalendar 
            events={requests} 
            onSelectRange={handleSelectRange}
            selectedDates={selectedDates}
            onSelectIntercalated={setSelectedDates}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Selection Modal/Overlay */}
      <AnimatePresence>
        {(selection || selectedDates.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-8 right-8 w-80 bg-[var(--background)] border border-accent/30 backdrop-blur-xl p-6 rounded-[2px] shadow-[0_0_50px_rgba(0,229,255,0.15)] z-[60]"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Novo Pedido</span>
                <span className="text-xs font-bold text-foreground mt-1">
                  {selection ? (
                    `${format(selection.start, 'd MMM', { locale: pt })} — ${format(selection.end, 'd MMM', { locale: pt })}`
                  ) : (
                    `${selectedDates.length} dias selecionados`
                  )}
                </span>
              </div>
              <button onClick={() => { setSelection(null); setSelectedDates([]); }} className="p-1 hover:bg-foreground/10 rounded-full transition-colors">
                <X className="w-4 h-4 text-foreground/40" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-foreground/40 text-glow-none">Tipo de Ausência</label>
                <div className="grid grid-cols-2 gap-2">
                  {['vacation', 'absence'].map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t as any)}
                      className={`py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                        type === t ? 'bg-accent text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] border-accent' : 'bg-[var(--card-bg)] border-[var(--border)] text-foreground/40'
                      }`}
                    >
                      {t === 'vacation' ? 'Férias' : 'Ausência'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-foreground/40 text-glow-none">Período / Intensidade</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'full', label: 'Inteiro' },
                    { id: 'morning', label: 'Manhã' },
                    { id: 'afternoon', label: 'Tarde' },
                    { id: 'partial', label: 'Horas' }
                  ].map(i => (
                    <button
                      key={i.id}
                      onClick={() => setIntensity(i.id as any)}
                      className={`py-2 text-[9px] font-bold uppercase tracking-widest border transition-all ${
                        intensity === i.id ? 'bg-accent text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] border-accent shadow-[0_0_10px_rgba(0,229,255,0.2)]' : 'bg-[var(--card-bg)] border-[var(--border)] text-foreground/40'
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-accent text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] font-bold text-[11px] uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50"
              >
                {isSubmitting ? 'A PROCESSAR...' : 'SUBMETER PEDIDO'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 mt-6 pt-6 border-t border-white/5">
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {/* Dynamic Team Legend */}
          {Array.from(new Set(requests.map(e => JSON.stringify({ id: e.user_id, name: e.full_name, color: e.calendar_color, is_own: e.is_own }))))
            .map(str => JSON.parse(str))
            .sort((a, b) => (a.is_own ? -1 : b.is_own ? 1 : a.name.localeCompare(b.name)))
            .map(({ id, name, color, is_own }) => (
              <div key={id} className="flex items-center gap-2">
                <span 
                  className={`w-6 h-6 flex items-center justify-center border text-[8px] font-black rounded-[2px] ${
                    is_own ? 'shadow-[0_0_10px_rgba(255,255,255,0.2)]' : ''
                  }`}
                  style={{ 
                    backgroundColor: `${color || '#00E5FF'}1a`,
                    borderColor: `${color || '#00E5FF'}40`,
                    color: color || '#00E5FF'
                  }}
                >
                  {name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${is_own ? 'text-accent' : 'text-foreground/40'}`}>
                  {is_own ? 'As Minhas Férias' : name}
                </span>
              </div>
            ))}
        </div>

        <div className="flex items-center gap-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
            <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Aguardando Aprovação (Teu)</span>
          </div>
        </div>
      </div>

      {/* Pending Requests List */}
      {requests.filter(r => r.status === 'pending').length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
            <Clock3 className="w-3 h-3" /> Pedidos Aguardando Aprovação
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {requests.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-[2px] flex items-center justify-between group hover:border-orange-500/20 transition-all">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-foreground uppercase truncate">
                    {format(parseISO(req.start_date), 'd MMM', { locale: pt })}
                    {req.start_date !== req.end_date && ` - ${format(parseISO(req.end_date), 'd MMM', { locale: pt })}`}
                  </div>
                  <div className="text-[8px] font-bold text-accent uppercase tracking-wider">
                    {req.type === 'vacation' ? 'Férias' : 'Ausência'} ({req.intensity === 'full' ? 'Inteiro' : (req.intensity === 'morning' ? 'Manhã' : (req.intensity === 'afternoon' ? 'Tarde' : 'Horas'))})
                  </div>
                </div>
                <button 
                  onClick={() => handleCancel(req.id)}
                  className="p-2 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                  title="Anular Pedido"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
