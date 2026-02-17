'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  Clock3,
  X 
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
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO,
  isAfter,
  isBefore,
  startOfToday,
  startOfYear,
  endOfYear,
  eachMonthOfInterval
} from 'date-fns';
import { pt } from 'date-fns/locale';

interface VacationEvent {
  id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  type: string;
  user_name?: string;
  intensity: string;
  calendar_color?: string;
  is_own?: boolean;
  is_fixed?: boolean;
  entitlement_label?: string;
}

interface VacationCalendarProps {
  events: VacationEvent[];
  onSelectRange?: (start: Date, end: Date) => void;
  selectedDates?: Date[];
  onSelectIntercalated?: (dates: Date[]) => void;
  viewMode?: 'month' | 'year';
  readOnly?: boolean;
  onCancel?: (id: string) => void;
  showInitials?: boolean;
}

export default function VacationCalendar({ 
  events, 
  onSelectRange, 
  selectedDates = [],
  onSelectIntercalated,
  viewMode = 'month',
  readOnly = false,
  onCancel,
  showInitials = false
}: VacationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Event Matching
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const start = parseISO(event.start_date);
      const end = parseISO(event.end_date);
      return (isSameDay(day, start) || isSameDay(day, end) || (isAfter(day, start) && isBefore(day, end)));
    });
  };

  // Drag Handling
  const handleMouseDown = (day: Date) => {
    if (readOnly) return;
    setSelectionStart(day);
    setSelectionEnd(day);
    setIsDragging(true);
  };

  const handleMouseEnter = (day: Date) => {
    if (isDragging && selectionStart) {
      setSelectionEnd(day);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && selectionStart && selectionEnd) {
      const start = isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
      const end = isAfter(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
      
      if (isSameDay(start, end)) {
        // Multi-select or Intercalated logic could go here
        const alreadySelected = selectedDates.find(d => isSameDay(d, start));
        if (alreadySelected) {
          onSelectIntercalated?.(selectedDates.filter(d => !isSameDay(d, start)));
        } else {
          onSelectIntercalated?.([...selectedDates, start]);
        }
      } else {
        onSelectRange?.(start, end);
      }
    }
    setIsDragging(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const isDateSelected = (day: Date) => {
    if (selectionStart && selectionEnd) {
      const start = isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
      const end = isAfter(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
      return (isSameDay(day, start) || isSameDay(day, end) || (isAfter(day, start) && isBefore(day, end)));
    }
    return selectedDates.some(d => isSameDay(d, day));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--card-bg)] border border-[var(--border)] rounded-[2px] overflow-hidden backdrop-blur-md">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-white/[0.02] dark:bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <CalendarIcon className="w-5 h-5 text-white" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            {format(currentDate, 'MMMM yyyy', { locale: pt })}
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

      {/* Scrollable Calendar Body */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-[900px] flex flex-col h-full">
          {/* WeekDays Header */}
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-white/[0.01] dark:bg-white/[0.01]">
            {weekDays.map(day => (
              <div key={day} className="py-2 text-center text-[9px] font-bold uppercase tracking-widest text-foreground/20">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div 
            className="flex-1 grid grid-cols-7 relative select-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isDragging) handleMouseUp();
            }}
          >
            {calendarDays.map((day: Date, idx: number) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isDateSelected(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const approvedEvents = dayEvents.filter(e => e.status === 'approved');
              const hasApproved = approvedEvents.length > 0;
              const hasPending = dayEvents.some(e => e.status === 'pending');
              
              const cellBgColor = approvedEvents.find(e => e.is_own)?.calendar_color || approvedEvents[0]?.calendar_color || '#00E5FF';

              return (
                <div 
                  key={day.toString()}
                  onMouseDown={() => handleMouseDown(day)}
                  onMouseEnter={() => handleMouseEnter(day)}
                  className={`min-h-[100px] border-r border-b border-[var(--border)] p-2 transition-all relative group overflow-hidden ${
                    !isCurrentMonth ? 'bg-white/[0.01] dark:bg-white/[0.01] opacity-20' : 'hover:bg-white/[0.02] dark:hover:bg-white/[0.02]'
                  } ${isSelected ? 'bg-accent/5' : ''}`}
                  style={hasApproved ? { 
                    backgroundColor: `${cellBgColor}08` 
                  } : hasPending ? {
                    backgroundColor: 'rgba(249, 115, 22, 0.05)'
                  } : {}}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold ${
                      isToday(day) ? 'bg-accent text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] px-1.5 py-0.5 rounded-[1px]' : 
                      isCurrentMonth ? 'text-foreground/40' : 'text-foreground/10'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Selection Overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-accent/10 border border-accent/30 pointer-events-none" />
                  )}

                  <div className="space-y-1">
                    {dayEvents.map(event => (
                      <div 
                        key={event.id}
                        className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-[1px] border truncate relative z-10 flex justify-between items-center group/event transition-all ${
                          event.status === 'approved' 
                            ? 'bg-accent/10 border-opacity-30'
                            : 'bg-orange-500/5 text-orange-500'
                        }`}
                        style={event.status === 'approved' && event.calendar_color ? { 
                          backgroundColor: `${event.calendar_color}1a`,
                          borderColor: event.is_fixed ? 'white' : `${event.calendar_color}40`,
                          borderWidth: event.is_fixed ? '1.5px' : '1px',
                          color: event.calendar_color,
                          boxShadow: event.is_fixed ? '0 0 10px rgba(255,255,255,0.2)' : (event.is_own ? `0 0 10px ${event.calendar_color}33` : 'none'),
                          backgroundImage: event.is_fixed 
                            ? `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)`
                            : 'none'
                        } : event.status === 'pending' ? {
                          backgroundColor: `${event.calendar_color || '#00E5FF'}1a`,
                          borderColor: '#F97316',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          color: event.calendar_color || '#00E5FF',
                          boxShadow: '0 0 15px rgba(249, 115, 22, 0.3)',
                        } : {}}
                      >
                        <span className="truncate flex-1 flex items-center gap-1">
                          {event.is_fixed && <div className="w-1 h-1 bg-white rounded-full animate-pulse shrink-0" />}
                          {showInitials ? (
                            <span>
                              {getInitials(event.user_name || '')}: {event.entitlement_label || (event.type === 'vacation' ? 'F' : 'A')}
                            </span>
                          ) : (
                            <>
                            {event.user_name ? `${event.user_name.split(' ')[0]}: ` : ''}
                            {event.entitlement_label || (event.type === 'vacation' ? 'Férias' : 'Ausência')}
                            {event.intensity !== 'full' && ' (1/2)'}
                            </>
                          )}
                        </span>
                        {event.status === 'pending' && onCancel && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onCancel(event.id); }}
                            className="opacity-0 group-hover/event:opacity-100 transition-opacity ml-1 p-0.5 hover:bg-orange-500/20 rounded-full"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactivity Legend/Clear */}
      {selectedDates.length > 0 && (
        <div className="p-3 bg-accent/10 border-t border-accent/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-accent tracking-widest">
              {selectedDates.length} dias intercalares selecionados
            </span>
          </div>
          <button 
            onClick={() => onSelectIntercalated?.([])}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-accent" />
          </button>
        </div>
      )}
    </div>
  );
}
