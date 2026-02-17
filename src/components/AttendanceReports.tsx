'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import TimesheetTable from './admin/TimesheetTable';

interface AttendanceLog {
  id: string;
  user_id: string;
  type: 'entry' | 'exit';
  timestamp: string;
  verification_method: string;
  is_valid: boolean;
  latitude: number;
  longitude: number;
  metadata?: { edited_manual?: boolean };
  profiles: {
    full_name: string;
    role: string;
  };
  locations: {
    name: string;
  };
}

export default function AttendanceReports() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all');
  const [showExportOptions, setShowExportOptions] = useState(false);

  /* New State for Filters */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<{id: string, full_name: string}[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  const getExportData = () => {
    return logs.map(log => ({
      full_name: log.profiles?.full_name || 'N/A',
      type: log.type === 'entry' ? 'Entrada' : 'Saída',
      timestamp: log.timestamp,
      location: log.locations?.name || 'Localização HQ',
      method: log.verification_method,
      status: log.is_valid ? 'Válido' : 'Inválido'
    }));
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const data = getExportData();
    const filename = `Relatorio_${currentDate.toISOString().slice(0,7)}`;
    if (format === 'excel') exportToExcel(data, filename);
    else exportToPDF(data, filename);
    setShowExportOptions(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterType, currentDate, selectedEmpId]);

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) {
        console.error('Error fetching employees:', error);
      } else if (data) {
        setEmployees(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching employees:', err);
    }
  }
 
  async function fetchData() {
    setLoading(true);
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // 1. Fetch Logs (Filtered)
    let logQuery = supabase
      .from('attendance_logs')
      .select(`
        *,
        profiles (full_name, role),
        locations (name)
      `)
      .gte('timestamp', startOfMonth)
      .lte('timestamp', endOfMonth)
      .order('timestamp', { ascending: false });
 
    if (filterType !== 'all') {
      logQuery = logQuery.eq('type', filterType);
    }

    if (selectedEmpId) {
      logQuery = logQuery.eq('user_id', selectedEmpId);
    }
 
    const { data: logData, error: logError } = await logQuery;

    if (logError) {
      console.error('Erro ao carregar picagens:', logError);
      alert(`ERRO: ${logError.message}`);
    }
    
    // 2. Fetch Vacations (Filtered)
    let vacQuery = supabase
      .from('vacation_requests')
      .select('*')
      .eq('status', 'approved')
      .or(`start_date.lte.${endOfMonth},end_date.gte.${startOfMonth}`); // Overlap logic

    if (selectedEmpId) {
      vacQuery = vacQuery.eq('user_id', selectedEmpId);
    }

    const { data: vacData } = await vacQuery;

    // 3. Fetch Schedules
    const { data: schData } = await supabase
      .from('work_schedules')
      .select('*');

    setLogs((logData as any) || []);
    setVacations(vacData || []);
    setSchedules(schData || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Espelho de Ponto</h2>
          <p className="text-foreground/40 text-[10px] font-bold tracking-widest uppercase mt-1">
            Clique numa célula para editar • Valores manuais a <span className="text-green-400">verde</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          
           {/* Month Picker */}
           <div className="flex items-center bg-white/5 rounded-[2px] border border-white/5">
              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setMonth(d.getMonth() - 1);
                  setCurrentDate(d);
                }}
                className="p-2 hover:bg-white/5 text-foreground/40 hover:text-white transition-colors"
                title="Mês Anterior"
              >
                <ArrowDownLeft className="w-4 h-4 rotate-45" />
              </button>
              <div className="px-4 py-1.5 text-xs font-black uppercase tracking-widest min-w-[140px] text-center bg-black/20 border-x border-white/5">
                {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </div>
              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setMonth(d.getMonth() + 1);
                  setCurrentDate(d);
                }}
                className="p-2 hover:bg-white/5 text-foreground/40 hover:text-white transition-colors"
                title="Próximo Mês"
              >
                <ArrowUpRight className="w-4 h-4 rotate-45" />
              </button>
           </div>

           {/* Employee Selector */}
           <select 
             className="bg-black/20 border border-white/10 p-2 text-xs font-bold text-foreground focus:border-accent/40 outline-none rounded-[2px] w-48"
             value={selectedEmpId || ''}
             onChange={(e) => setSelectedEmpId(e.target.value || null)}
           >
             <option value="" className="text-black">Todos os Colaboradores</option>
             {employees.map(emp => (
               <option key={emp.id} value={emp.id} className="text-black">{emp.full_name}</option>
             ))}
           </select>

           <div className="h-6 w-px bg-white/10 mx-2 hidden lg:block" />

           {/* Type Filters */}
           <div className="flex bg-white/5 p-1 rounded-[2px] border border-white/5">
            <FilterButton 
              active={filterType === 'all'} 
              onClick={() => setFilterType('all')}
              label="Todos"
            />
            <FilterButton 
              active={filterType === 'entry'} 
              onClick={() => setFilterType('entry')}
              label="Ent"
            />
            <FilterButton 
              active={filterType === 'exit'} 
              onClick={() => setFilterType('exit')}
              label="Sai"
            />
          </div>
          
          {/* Export Button */}
          <div className="relative">
            <button 
              onClick={() => setShowExportOptions(!showExportOptions)}
              className={`p-2 border transition-all rounded-[2px] ${
                showExportOptions ? 'bg-accent border-accent text-black' : 'border-white/10 text-foreground/60 hover:bg-white/5'
              }`}
              title="Exportar"
            >
              <Download className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showExportOptions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-[#111] border border-white/10 p-1 rounded-[2px] shadow-2xl z-30"
                >
                  <button 
                    onClick={() => handleExport('excel')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-accent hover:bg-white/5 transition-all text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Exportar Excel
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-accent hover:bg-white/5 transition-all text-left border-t border-white/5"
                  >
                    <FileText className="w-4 h-4" />
                    Exportar PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2px] overflow-hidden">
        <TimesheetTable 
          logs={logs} 
          vacations={vacations} 
          schedules={schedules}
          loading={loading} 
          onRefresh={fetchData} 
        />
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-[1px] transition-all ${
        active ? 'bg-accent text-black shadow-[0_0_10px_rgba(0,229,255,0.2)]' : 'text-foreground/40 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
