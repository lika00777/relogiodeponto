'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Info,
  Trash2
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isToday,
  parseISO,
  isAfter,
  isBefore,
  startOfToday
} from 'date-fns';
import { pt } from 'date-fns/locale';

interface VacationEvent {
  id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  type: string;
  full_name: string;
  intensity: string;
  calendar_color?: string;
  is_fixed?: boolean;
  entitlement_label?: string;
  scope?: string;
}

interface AdminVacationCalendarProps {
  events: VacationEvent[];
  onValidate: (id: string, status: 'approved' | 'rejected') => void;
  onDelete?: (id: string) => void;
}

export default function AdminVacationCalendar({ 
  events, 
  onValidate,
  onDelete
}: AdminVacationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helpers
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const start = parseISO(event.start_date);
      const end = parseISO(event.end_date);
      return (isSameDay(day, start) || isSameDay(day, end) || (isAfter(day, start) && isBefore(day, end)));
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--card-bg)] border border-[var(--border)] rounded-[2px] overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-white/[0.02] dark:bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-5 h-5 text-white" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            Gestão de Horários - {format(currentDate, 'MMMM yyyy', { locale: pt })}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/40 hover:text-white transition-colors">
            Hoje
          </button>
          <div className="flex border border-white/10 rounded-[1px] overflow-hidden">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 text-foreground/60 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 text-foreground/60 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* WeekDays */}
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-white/[0.01] dark:bg-white/[0.01]">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-[9px] font-bold uppercase tracking-widest text-foreground/20">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 relative">
        {calendarDays.map((day: Date) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const hasApproved = dayEvents.some(e => e.status === 'approved');
          const hasPending = dayEvents.some(e => e.status === 'pending');

          return (
            <div 
              key={day.toString()}
              className={`min-h-[120px] border-r border-b border-[var(--border)] p-2 transition-all relative group ${
                !isCurrentMonth ? 'bg-white/[0.01] dark:bg-white/[0.01] opacity-20' : 'hover:bg-white/[0.02]'
              }`}
              style={hasApproved ? { 
                backgroundColor: `${dayEvents.find(e => e.status === 'approved')?.calendar_color || '#00E5FF'}08` // 3% opacity
              } : hasPending ? {
                backgroundColor: 'rgba(249, 115, 22, 0.05)'
              } : {}}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold ${
                  isToday(day) ? 'bg-accent text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] px-1.5 py-0.5 rounded-[1px]' : 
                  isCurrentMonth ? 'text-foreground/40' : 'text-foreground/10'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-1">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    className={`px-1.5 py-1 text-[9px] font-black uppercase tracking-tighter rounded-[1px] border truncate relative group/event transition-all ${
                      event.status === 'approved' 
                        ? 'bg-opacity-10 border-opacity-30'
                        : 'bg-orange-500/5 text-orange-500 cursor-pointer hover:bg-orange-500/10'
                    }`}
                    style={event.status === 'approved' ? { 
                      backgroundColor: `${event.calendar_color || '#00E5FF'}1a`,
                      borderColor: event.is_fixed ? 'white' : `${event.calendar_color || '#00E5FF'}40`,
                      borderWidth: event.is_fixed ? '1.5px' : '1px',
                      color: event.calendar_color || '#00E5FF',
                      boxShadow: event.is_fixed ? '0 0 15px rgba(255,255,255,0.2)' : `0 0 10px ${event.calendar_color || '#00E5FF'}1a`,
                      backgroundImage: event.is_fixed 
                        ? `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)`
                        : 'none'
                    } : event.status === 'pending' ? {
                      borderColor: event.calendar_color || '#00E5FF',
                      borderWidth: '1.5px',
                      boxShadow: `inset 0 0 5px orange`
                    } : {}}
                    onClick={() => event.status === 'pending' && onValidate(event.id, 'approved')}
                    title={event.is_fixed ? `DIREITO FIXO (${event.entitlement_label || 'Férias'}): ${event.full_name}` : event.status === 'pending' ? `Clique para Aprovar ${event.full_name}` : event.full_name}
                  >
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        {event.is_fixed && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0" />}
                        {getInitials(event.full_name)}: {event.entitlement_label || (event.type === 'vacation' ? 'FÉRIAS' : 'AUSÊNCIA')}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover/event:opacity-100 transition-opacity">
                        {event.status === 'pending' ? (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onValidate(event.id, 'rejected'); }}
                              className="text-red-500 hover:text-red-400"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onValidate(event.id, 'approved'); }}
                              className="text-green-500 hover:text-green-400"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          onDelete && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                              className="text-red-500/60 hover:text-red-500"
                              title="Eliminar do histórico"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-[var(--border)] bg-black/20 space-y-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {Array.from(new Set(events.map(e => JSON.stringify({ name: e.full_name, color: e.calendar_color }))))
            .map(str => JSON.parse(str))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(({ name, color }) => {
              const initials = getInitials(name);
              return (
                <div key={name} className="flex items-center gap-2">
                  <span 
                    className="w-6 h-6 flex items-center justify-center border text-[8px] font-black rounded-[2px]"
                    style={{ 
                      backgroundColor: `${color || '#00E5FF'}1a`,
                      borderColor: `${color || '#00E5FF'}40`,
                      color: color || '#00E5FF',
                      boxShadow: `0 0 10px ${color || '#00E5FF'}1a`
                    }}
                  >
                    {initials}
                  </span>
                  <span className="text-[9px] font-bold text-foreground/70 uppercase tracking-widest">{name}</span>
                </div>
              );
            })}
        </div>

        <div className="flex items-center gap-8 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,229,255,0.4)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">Aprovado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Direito Fixo</span>
          </div>
          <div className="flex items-center gap-4 text-white/20 italic ml-auto">
            <Info className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em]">Tipo: F = Férias, A = Ausência</span>
          </div>
        </div>
      </div>
    </div>
  );
}
