'use client';

import { useState } from 'react';
import { AlertCircle, Trash2, Check, X, Pencil, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AttendanceLog {
  id: string;
  user_id: string;
  type: 'entry' | 'exit';
  timestamp: string;
  verification_method: string;
  is_valid: boolean;
  metadata?: { edited_manual?: boolean };
  profiles: {
    full_name: string;
    role: string;
  };
}

interface TimesheetRow {
  date: string;
  userId: string;
  employee: string;
  slots: SlotData[]; // 8 slots: [E1, S1, E2, S2, E3, S3, E4, S4]
  totalHours: string;
  status: 'ok' | 'missing_punch' | 'absent' | 'vacation';
}

interface SlotData {
  logId: string | null;
  time: string | null;
  isManual: boolean;
}

const SLOT_LABELS = ['Ent 1','Sai 1','Ent 2','Sai 2','Ent 3','Sai 3','Ent 4','Sai 4'];
const SLOT_TYPES  = ['entry','exit','entry','exit','entry','exit','entry','exit'];

function calcTotal(slots: SlotData[]): string {
  let totalMin = 0;
  for (let i = 0; i < slots.length; i += 2) {
    const ent = slots[i]?.time;
    const sai = slots[i+1]?.time;
    if (!ent || !sai) continue;
    const a = new Date(`2000-01-01T${ent}`);
    const b = new Date(`2000-01-01T${sai}`);
    totalMin += (b.getTime() - a.getTime()) / 60000;
  }
  if (totalMin <= 0) return '--:--';
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function processLogs(logs: AttendanceLog[], vacations: any[], schedules: any[]): TimesheetRow[] {
  const grouped: Record<string, AttendanceLog[]> = {};
 
  // Get unique pairs of (user, date) from logs OR vacations
  const userDates = new Set<string>();
  
  logs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleDateString('en-CA');
    userDates.add(`${log.user_id}_${date}`);
    const key = `${log.user_id}_${date}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  });

  // Also consider vacation days as "rows" even if no logs
  vacations.forEach(vac => {
    const start = new Date(vac.start_date);
    const end = new Date(vac.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toLocaleDateString('en-CA');
      userDates.add(`${vac.user_id}_${dateStr}`);
    }
  });
 
  return Array.from(userDates).map(key => {
    const [userId, date] = key.split('_');
    const daily = (grouped[key] || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const employee = daily[0]?.profiles?.full_name || 'Recurso';
 
    const slots: SlotData[] = Array.from({ length: 8 }, () => ({ logId: null, time: null, isManual: false }));
 
    let currentPairIdx = 0;
    daily.forEach((log) => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const data = { logId: log.id, time: timeStr, isManual: !!(log.metadata?.edited_manual) };
 
      if (log.type === 'entry') {
        if (slots[currentPairIdx * 2]?.time !== null) currentPairIdx++;
        if (currentPairIdx < 4) slots[currentPairIdx * 2] = data;
      } else {
        if (currentPairIdx < 4) {
          slots[currentPairIdx * 2 + 1] = data;
          currentPairIdx++;
        }
      }
    });
 
    let status: TimesheetRow['status'] = 'ok';
    
    // Check if it's a vacation day
    const isVacation = vacations.some(v => 
      v.user_id === userId && 
      date >= v.start_date && 
      date <= v.end_date
    );

    if (isVacation) status = 'vacation';
    else {
      for (let i = 0; i < 8; i += 2) {
        if ((slots[i].time && !slots[i+1].time) || (!slots[i].time && slots[i+1].time)) {
          status = 'missing_punch';
          break;
        }
      }
    }
 
    return { date, userId, employee, slots, totalHours: calcTotal(slots), status };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- EDITABLE CELL COMPONENT ----------
function EditableCell({ 
  slot, slotIndex, row, onSave 
}: { 
  slot: SlotData; slotIndex: number; row: TimesheetRow; onSave: () => void 
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slot.time || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.match(/^\d{2}:\d{2}$/)) { alert('Formato inválido. Use HH:MM'); return; }
    setSaving(true);

    const dateStr = row.date; // YYYY-MM-DD
    const newTimestamp = `${dateStr}T${value}:00`;

    if (slot.logId) {
      // Update existing log
      await supabase.rpc('update_attendance_log', {
        p_log_id: slot.logId,
        p_new_timestamp: newTimestamp
      });
    } else {
      // Insert new manual log
      const type = SLOT_TYPES[slotIndex];
      await supabase.rpc('insert_manual_log', {
        p_user_id: row.userId,
        p_timestamp: newTimestamp,
        p_type: type
      });
    }

    setSaving(false);
    setEditing(false);
    onSave(); // Refresh data
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="HH:MM"
          maxLength={5}
          className="w-14 bg-transparent border border-accent/40 text-center text-xs font-mono text-white px-1 py-0.5 rounded-sm focus:outline-none focus:border-accent"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        />
        <button onClick={handleSave} disabled={saving} className="text-green-500 hover:text-green-400"><Check className="w-3 h-3" /></button>
        <button onClick={() => setEditing(false)} className="text-red-500 hover:text-red-400"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => { setValue(slot.time || ''); setEditing(true); }}
      className={`group/cell inline-flex items-center gap-1 cursor-pointer transition-colors ${
        slot.isManual ? 'text-green-400 font-bold' : 'text-foreground/70'
      } hover:text-accent`}
      title="Clique para editar"
    >
      <span className="font-mono text-xs">{slot.time || '--:--'}</span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/cell:opacity-60 transition-opacity" />
    </button>
  );
}

// ---------- MAIN TABLE COMPONENT ----------
export default function TimesheetTable({ 
  logs, vacations, schedules, loading, onRefresh 
}: { 
  logs: AttendanceLog[]; vacations: any[]; schedules: any[]; loading: boolean; onRefresh?: () => void 
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteRow = async (row: TimesheetRow) => {
    if (!confirm(`Deseja APAGAR todas as picagens de ${row.employee} no dia ${new Date(row.date).toLocaleDateString('pt-PT')}?`)) return;
    setDeleting(`${row.userId}_${row.date}`);

    const { error } = await supabase.rpc('delete_user_daily_logs', {
      p_user_id: row.userId,
      p_date: row.date
    });

    if (error) {
      console.error('Erro ao eliminar linha:', error);
      alert('Erro ao eliminar registos: ' + (error.message || 'Erro desconhecido'));
    } else {
      onRefresh?.();
    }

    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-foreground/20 font-bold uppercase tracking-widest animate-pulse">
        Gerando Espelho de Ponto...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-12 text-center text-foreground/20 font-bold uppercase tracking-widest">
        Nenhum dado para o período selecionado
      </div>
    );
  }

  const rows = processLogs(logs, vacations, schedules);

  return (
    <div className="overflow-x-auto bg-[#0a0a0a] border border-white/5 rounded-[2px]">
      <table className="w-full text-left border-collapse text-xs min-w-[900px]">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            <th className="p-3 text-[9px] font-black uppercase tracking-widest text-foreground/40 w-28">Data</th>
            <th className="p-3 text-[9px] font-black uppercase tracking-widest text-foreground/40">Funcionário</th>
            {SLOT_LABELS.map((label, i) => (
              <th key={i} className={`p-3 w-16 text-center text-[9px] font-black uppercase tracking-widest ${i % 2 === 0 ? 'text-accent/70' : 'text-orange-500/70'}`}>
                {label}
              </th>
            ))}
            <th className="p-3 w-16 text-right text-[9px] font-black uppercase tracking-widest text-foreground/40">Total</th>
            <th className="p-3 w-20 text-right text-[9px] font-black uppercase tracking-widest text-foreground/40">Status</th>
            <th className="p-3 w-10 text-center text-[9px] font-black uppercase tracking-widest text-foreground/40"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((row, idx) => {
            const dayOfWeek = new Date(row.date).toLocaleDateString('pt-PT', { weekday: 'short' }).toUpperCase();
            const isOdd = idx % 2 !== 0;
            const isDeleting = deleting === `${row.userId}_${row.date}`;

            return (
              <tr key={`${row.userId}-${row.date}-${idx}`} className={`${isOdd ? 'bg-white/[0.02]' : ''} ${isDeleting ? 'opacity-30' : ''} ${row.status === 'vacation' ? 'bg-accent/5' : ''} hover:bg-white/[0.05] transition-all`}>
                <td className="p-3 font-mono text-foreground/50 border-r border-white/5">
                  <span className="text-[9px] mr-1.5 text-foreground/30">{dayOfWeek}</span>
                  <span className="text-foreground/60">{new Date(row.date).toLocaleDateString('pt-PT')}</span>
                </td>
                <td className="p-3 font-bold text-foreground/90 border-r border-white/5 text-xs">
                  {row.employee}
                </td>

                {row.slots.map((slot, i) => (
                  <td key={i} className="p-2 text-center border-r border-white/5">
                    <EditableCell slot={slot} slotIndex={i} row={row} onSave={() => onRefresh?.()} />
                  </td>
                ))}

                <td className="p-3 text-right font-black font-mono tracking-tighter text-foreground/80 border-r border-white/5">
                  {row.totalHours}
                </td>

                <td className="p-3 text-right">
                  {row.status === 'missing_punch' && (
                    <span className="flex items-center justify-end gap-1 text-orange-500 text-[9px] font-bold uppercase">
                      <AlertCircle className="w-3 h-3" /> Incomp.
                    </span>
                  )}
                  {row.status === 'vacation' && (
                    <span className="flex items-center justify-end gap-1 text-accent text-[9px] font-black uppercase tracking-widest">
                      <CalendarIcon className="w-3 h-3" /> Férias
                    </span>
                  )}
                </td>

                <td className="p-2 text-center">
                  <button
                    onClick={() => handleDeleteRow(row)}
                    disabled={isDeleting}
                    className="p-1.5 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                    title="Eliminar dia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
