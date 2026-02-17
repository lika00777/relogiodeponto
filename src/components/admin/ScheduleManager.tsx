'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Save, 
  Filter,
  ArrowRight,
  Info,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NeonButton from '@/components/ui/NeonButton';
import AdminVacationCalendar from './AdminVacationCalendar';
import TeamCoverageView from './TeamCoverageView';
import VacationStatsDashboard from '../vacation/VacationStatsDashboard';
import { pt } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

interface EntitlementItem {
  id?: string;
  label: string;
  days: number;
  usage_type: 'requested' | 'fixed';
  fixed_date: string | null;
  scope: 'individual' | 'collective';
}

interface Profile {
  id: string;
  full_name: string;
  vacation_entitlement?: number;
  entitlement_breakdown?: EntitlementItem[];
}

interface VacationRequest {
  id: string;
  user_id: string;
  full_name: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  intensity: string;
  start_time: string | null;
  end_time: string | null;
  admin_notes: string;
  calendar_color?: string;
}

export default function ScheduleManager() {
  const [view, setView] = useState<'requests' | 'schedules' | 'team'>('requests');
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    setLoading(true);
    const { data: empData } = await supabase.from('profiles').select('id, full_name, vacation_entitlement');
    const { data: entitlementData } = await supabase.from('employee_entitlements').select('*');
    const { data: reqData } = await supabase.rpc('get_admin_vacations');

    if (empData) {
      const mappedEmps = empData.map(emp => ({
        ...emp,
        entitlement_breakdown: entitlementData?.filter(e => e.user_id === emp.id || e.scope === 'collective') || []
      }));
      setEmployees(mappedEmps);
    }
    if (reqData) setRequests(reqData);
    setLoading(false);
  };

  const handleValidate = async (id: string, status: 'approved' | 'rejected') => {
    const notes = prompt('Notas administrativas (opcional):') || '';
    const { error } = await supabase.rpc('validate_vacation', {
      p_request_id: id,
      p_status: status,
      p_notes: notes
    });
    if (error) alert(error.message);
    else fetchBaseData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este registo de histórico?')) return;
    const { error } = await supabase.rpc('delete_vacation_admin', { p_request_id: id });
    if (error) alert(error.message);
    else fetchBaseData();
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Sub-Header Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-px">
        <button 
          onClick={() => setView('requests')}
          className={`pb-4 px-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
            view === 'requests' ? 'text-accent' : 'text-foreground/40 hover:text-foreground/60'
          }`}
        >
          Pedidos Pendentes
          {view === 'requests' && <motion.div layoutId="adm-tab" className="absolute bottom-0 inset-x-0 h-1 bg-accent" />}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <span className="ml-2 bg-red-500 text-white px-1.5 rounded-full text-[8px]">{requests.filter(r => r.status === 'pending').length}</span>
          )}
        </button>
        <button 
          onClick={() => setView('schedules')}
          className={`pb-4 px-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
            view === 'schedules' ? 'text-accent' : 'text-foreground/40 hover:text-foreground/60'
          }`}
        >
          Matriz de Horários
          {view === 'schedules' && <motion.div layoutId="adm-tab" className="absolute bottom-0 inset-x-0 h-1 bg-accent" />}
        </button>
        <button 
          onClick={() => setView('team')}
          className={`pb-4 px-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
            view === 'team' ? 'text-accent' : 'text-foreground/40 hover:text-foreground/60'
          }`}
        >
          Calendário de Equipa
          {view === 'team' && <motion.div layoutId="adm-tab" className="absolute bottom-0 inset-x-0 h-1 bg-accent" />}
        </button>
      </div>

      <main>
        {view === 'requests' && <RequestsView requests={requests} employees={employees} onValidate={handleValidate} onDelete={handleDelete} onRefresh={fetchBaseData} />}
        {view === 'schedules' && <ScheduleEditor employees={employees} onRefresh={fetchBaseData} />}
        {view === 'team' && <TeamCoverageView />}
      </main>
    </div>
  );
}

function RequestsView({ requests, employees, onValidate, onDelete, onRefresh }: { requests: VacationRequest[], employees: Profile[], onValidate: any, onDelete: any, onRefresh: () => void }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [empStats, setEmpStats] = useState<any>(null);
  const [isEditingEntitlement, setIsEditingEntitlement] = useState(false);
  const [breakdown, setBreakdown] = useState<EntitlementItem[]>([]);

  useEffect(() => {
    fetchStats(selectedEmpId);
    if (selectedEmpId && employees.length > 0) {
      const emp = employees.find(e => e.id === selectedEmpId);
      let currentBreakdown = [...(emp?.entitlement_breakdown || [])] as EntitlementItem[];
      
      // Garantir que o "Direito Base" aparece sempre se não houver um item explícito com esse nome
      const hasBase = currentBreakdown.some(i => i.label.toLowerCase().includes('base'));
      if (!hasBase && emp?.vacation_entitlement) {
        currentBreakdown = [
          { label: 'Direito Base', days: emp.vacation_entitlement, usage_type: 'requested', fixed_date: null, scope: 'collective' },
          ...currentBreakdown
        ];
      }
      
      setBreakdown(currentBreakdown);
    }
  }, [selectedEmpId, employees]);

  const fetchStats = async (id: string | null) => {
    const { data } = await supabase.rpc('get_vacation_stats', { p_user_id: id });
    if (data?.[0]) setEmpStats(data[0]);
  };

  const filteredRequests = selectedEmpId 
    ? requests.filter(r => r.user_id === selectedEmpId)
    : requests;

  const pending = filteredRequests.filter(r => r.status === 'pending');
  const history = requests.filter(r => r.status !== 'pending' && (!selectedEmpId || r.user_id === selectedEmpId)).slice(0, 20);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Top Controls: Filter & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 bg-white/[0.02] p-4 border border-white/5 rounded-[2px]">
          <div className="flex-1">
             <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Filtrar por Colaborador</label>
             <select 
               className="w-full md:w-64 bg-black/20 border border-white/10 p-2 text-xs font-bold text-white focus:border-accent/40 outline-none rounded-[2px]"
               value={selectedEmpId || ''}
               onChange={(e) => setSelectedEmpId(e.target.value || null)}
             >
               <option value="" className="bg-zinc-900 text-white">Todos os Colaboradores</option>
               {employees.map(emp => (
                 <option key={emp.id} value={emp.id} className="bg-zinc-900 text-white">{emp.full_name}</option>
               ))}
             </select>
          </div>
          
                  <div className="flex flex-col gap-1 group/ent relative text-white">
                    <AnimatePresence>
                    {isEditingEntitlement && selectedEmpId && (
                      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="w-full max-w-4xl bg-[#0A0A0A] border border-white/10 p-8 rounded-[2px] shadow-2xl space-y-6 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
                          
                          <div className="flex items-center justify-between border-b border-white/5 pb-6">
                             <div>
                               <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Gestão Avançada de Direitos</h2>
                               <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">Configuração de férias individuais e coletivas para {employees.find(e => e.id === selectedEmpId)?.full_name}</p>
                             </div>
                             <button onClick={() => setIsEditingEntitlement(false)} className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-[1px]">
                               <XCircle className="w-4 h-4 text-white/40 group-hover:text-red-500 transition-colors" />
                               <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Fechar</span>
                             </button>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
                            {breakdown.map((item, idx) => (
                              <div key={idx} className="bg-white/[0.02] p-5 rounded-[2px] space-y-4 border border-white/5 relative group/item hover:border-white/20 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1.5 block">Discriminação do Item</label>
                                    <input 
                                      type="text" 
                                      placeholder="Ex: Férias Base, Carnaval, Tolerância..."
                                      className="w-full bg-black/40 border border-white/10 p-3 text-[11px] font-black text-white uppercase tracking-wider outline-none focus:border-accent/40 rounded-[1px]"
                                      value={item.label}
                                      onChange={(e) => {
                                        const newB = [...breakdown];
                                        newB[idx].label = e.target.value;
                                        setBreakdown(newB);
                                      }}
                                    />
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      if (item.id) {
                                        const { error } = await supabase.from('employee_entitlements').delete().eq('id', item.id);
                                        if (error) alert(`Erro ao eliminar: ${error.message}`);
                                      }
                                      setBreakdown(breakdown.filter((_, i) => i !== idx));
                                    }}
                                    className="mt-6 p-3 bg-red-500/5 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all rounded-[1px]"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Dias</label>
                                    <input 
                                      type="number" 
                                      className="w-full bg-black/40 border border-white/10 p-3 text-xs font-black text-white text-center outline-none rounded-[1px] focus:border-white/20 transition-all"
                                      value={item.days}
                                      onChange={(e) => {
                                        const newB = [...breakdown];
                                        newB[idx].days = parseInt(e.target.value) || 0;
                                        setBreakdown(newB);
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Âmbito</label>
                                    <select 
                                      className="w-full bg-black/40 border border-white/10 p-3 text-[10px] font-black text-white outline-none rounded-[1px] focus:border-white/20 transition-all appearance-none cursor-pointer"
                                      value={item.scope || 'individual'}
                                      onChange={(e) => {
                                        const newB = [...breakdown];
                                        newB[idx].scope = e.target.value as 'individual' | 'collective';
                                        setBreakdown(newB);
                                      }}
                                    >
                                      <option value="individual" className="bg-zinc-900">Individual</option>
                                      <option value="collective" className="bg-zinc-900 text-accent">Coletivo</option>
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Tipo</label>
                                    <select 
                                      className="w-full bg-black/40 border border-white/10 p-3 text-[10px] font-black text-white outline-none rounded-[1px] focus:border-white/20 transition-all"
                                      value={item.usage_type}
                                      onChange={(e) => {
                                        const newB = [...breakdown];
                                        newB[idx].usage_type = e.target.value as 'requested' | 'fixed';
                                        if (e.target.value === 'requested') newB[idx].fixed_date = null;
                                        setBreakdown(newB);
                                      }}
                                    >
                                      <option value="requested" className="bg-zinc-900">Pedido</option>
                                      <option value="fixed" className="bg-zinc-900">Fixo</option>
                                    </select>
                                  </div>
                                </div>

                                {item.usage_type === 'fixed' && (
                                  <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Data de Agendamento Automático</label>
                                    <input 
                                      type="date" 
                                      className="w-full bg-black/40 border border-white/10 p-3 text-[10px] font-black text-white outline-none rounded-[1px] focus:border-white/20 transition-all font-sans"
                                      value={item.fixed_date || ''}
                                      onChange={(e) => {
                                        const newB = [...breakdown];
                                        newB[idx].fixed_date = e.target.value;
                                        setBreakdown(newB);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="pt-6 flex flex-col sm:flex-row gap-4">
                            <button 
                              onClick={() => setBreakdown([...breakdown, { label: 'Novo Direito', days: 1, usage_type: 'requested', fixed_date: null, scope: 'individual' }])}
                              className="flex-1 py-4 border border-dashed border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:border-accent hover:text-accent transition-all rounded-[1px] flex items-center justify-center gap-2"
                            >
                              + Adicionar Novo Componente de Férias
                            </button>

                            <button 
                              onClick={async () => {
                                for (const item of breakdown) {
                                const payload = {
                                  id: (item.id && item.id.length > 5) ? item.id : undefined,
                                  user_id: item.scope === 'collective' ? null : (selectedEmpId || null), 
                                  label: item.label,
                                  days: Math.round(item.days),
                                  year: new Date().getFullYear(),
                                  usage_type: item.usage_type,
                                  fixed_date: item.fixed_date || null,
                                  scope: item.scope || 'individual',
                                  notes: null
                                };

                                const { error: upsertError } = await supabase
                                  .from('employee_entitlements')
                                  .upsert(payload);

                                if (upsertError) {
                                  console.error('Erro detalhado Supabase:', upsertError);
                                  const errorMsg = upsertError.message || upsertError.details || JSON.stringify(upsertError);
                                  alert(`Erro no item "${item.label}":\n\n${errorMsg}\n\nCódigo: ${upsertError.code || 'N/A'}`);
                                  return; // Interromper se um falhar
                                }
                              }
                              setIsEditingEntitlement(false);
                              await onRefresh();
                              if (selectedEmpId) await fetchStats(selectedEmpId);
                            }}
                              className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent transition-all flex items-center justify-center gap-3 rounded-[2px] shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            >
                              <Save className="w-5 h-5" /> Guardar Todas as Configurações
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                    </AnimatePresence>

                    {!isEditingEntitlement && (
                      <div 
                        className={`flex flex-col items-end gap-1 ${selectedEmpId ? 'cursor-pointer hover:bg-white/5 px-3 py-2 -mr-3 rounded-[2px] transition-all' : ''}`}
                        onClick={() => {
                          if (selectedEmpId) {
                            setIsEditingEntitlement(true);
                          }
                        }}
                      >
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                          {selectedEmpId ? 'Direito Individual' : 'Direito Global (Equipa)'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-white italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                            {empStats?.entitlement || 0}
                          </span>
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Dias</span>
                        </div>
                        {selectedEmpId && (
                           <div className="flex flex-wrap gap-1 justify-end mt-1.5 max-w-[240px]">
                              {(employees.find(e => e.id === selectedEmpId)?.entitlement_breakdown || []).map((item, idx) => (
                                <span key={idx} className={`text-[7px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-[1px] border flex items-center gap-1 ${
                                  item.usage_type === 'fixed' 
                                    ? 'bg-accent/10 border-accent/20 text-accent' 
                                    : 'bg-white/5 border-white/5 text-white/40'
                                }`}>
                                   {item.scope === 'collective' && <Users className="w-2 h-2 text-white" />}
                                   <span className="truncate max-w-[80px] text-white">{item.label}</span>: {item.days}D
                                </span>
                              ))}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
        </div>

        {/* Stats Dashboard */}
        <AnimatePresence>
          {empStats && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <VacationStatsDashboard stats={empStats} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 flex-1 min-h-0">
        <div className="flex-1 space-y-4 flex flex-col min-h-[500px]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-accent" /> Calendário de Aprovações {selectedEmpId ? '(Filtrado)' : '(Geral)'}
          </h3>
          <div className="flex-1 border border-white/5 rounded-[2px] overflow-hidden">
            <AdminVacationCalendar 
              events={filteredRequests as any} 
              onValidate={onValidate}
              onDelete={onDelete} 
            />
          </div>
        </div>
        
        <div className="w-full xl:w-80 flex flex-col gap-6 overflow-hidden text-white">
          {/* Pending List */}
          <div className="flex-1 flex flex-col min-h-[300px] overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2 mb-4 shrink-0">
              <Info className="w-4 h-4" /> Pendentes {selectedEmpId ? '(Filtrado)' : ''}
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {pending.map(req => (
                <div key={req.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-[2px] flex flex-col gap-3 group hover:border-accent/40 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white uppercase tracking-tight">{req.full_name}</div>
                      <div className="text-[9px] font-bold text-accent uppercase tracking-[0.2em]">
                        {req.type === 'vacation' ? 'Férias' : 'Ausência'}
                      </div>
                    </div>
                    {req.status === 'pending' && (
                       <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="text-[10px] text-white/40 font-mono bg-black/20 p-1.5 rounded-[1px]">
                    {format(parseISO(req.start_date), 'dd MMM')} &rarr; {format(parseISO(req.end_date), 'dd MMM')}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button 
                      onClick={() => onValidate(req.id, 'rejected')}
                      className="py-1.5 bg-red-500/10 text-red-500 border border-red-500/10 rounded-[2px] hover:bg-red-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider"
                    >
                      Recusar
                    </button>
                    <button 
                      onClick={() => onValidate(req.id, 'approved')}
                      className="py-1.5 bg-green-500/10 text-green-500 border border-green-500/10 rounded-[2px] hover:bg-green-500 hover:text-white transition-all shadow-[0_0_10px_rgba(34,197,94,0.1)] text-[9px] font-black uppercase tracking-wider"
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (
                <div className="p-8 border border-dashed border-white/5 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/20 italic">
                  Sem pendentes
                </div>
              )}
            </div>
          </div>

          {/* Recent History (Compact) */}
          <div className="shrink-0 max-h-[300px] flex flex-col overflow-hidden pt-4 border-t border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2 mb-4 shrink-0">
              <Clock className="w-4 h-4" /> Histórico
            </h3>
            <div className="overflow-y-auto pr-2 custom-scrollbar space-y-1">
              {history.map(req => (
                <div key={req.id} className="text-[10px] py-2 border-b border-white/5 last:border-0 flex justify-between items-center group">
                  <span className="text-white/60 truncate max-w-[120px]" title={req.full_name}>{req.full_name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-[1px] font-bold uppercase tracking-wider text-[8px] ${
                       req.status === 'approved' ? 'text-green-500 bg-green-500/5' : 'text-red-500 bg-red-500/5'
                    }`}>
                      {req.status === 'approved' ? 'OK' : 'X'}
                    </span>
                    <button onClick={() => onDelete(req.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleEditor({ employees, onRefresh }: { employees: Profile[], onRefresh: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<any[]>(Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    pair_1_start: '', pair_1_end: '',
    pair_2_start: '', pair_2_end: '',
    pair_3_start: '', pair_3_end: '',
    pair_4_start: '', pair_4_end: ''
  })));
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [empStats, setEmpStats] = useState<any>(null);

  useEffect(() => {
    if (selectedId) {
      fetchSchedule(selectedId);
      fetchStats(selectedId);
    }
  }, [selectedId]);

  const fetchStats = async (id: string) => {
    const { data } = await supabase.rpc('get_vacation_stats', { p_user_id: id });
    if (data?.[0]) setEmpStats(data[0]);
  };

  const fetchSchedule = async (id: string) => {
    const { data } = await supabase.from('work_schedules').select('*').eq('user_id', id);
    
    // Matriz base limpa para todos os dias da semana (0-6)
    const baseMatrix = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      pair_1_start: '', pair_1_end: '',
      pair_2_start: '', pair_2_end: '',
      pair_3_start: '', pair_3_end: '',
      pair_4_start: '', pair_4_end: ''
    }));

    if (data && data.length > 0) {
      data.forEach((row: any) => {
        baseMatrix[row.day_of_week] = {
          ...row,
          pair_1_start: row.pair_1_start?.slice(0, 5) || '',
          pair_1_end: row.pair_1_end?.slice(0, 5) || '',
          pair_2_start: row.pair_2_start?.slice(0, 5) || '',
          pair_2_end: row.pair_2_end?.slice(0, 5) || '',
          pair_3_start: row.pair_3_start?.slice(0, 5) || '',
          pair_3_end: row.pair_3_end?.slice(0, 5) || '',
          pair_4_start: row.pair_4_start?.slice(0, 5) || '',
          pair_4_end: row.pair_4_end?.slice(0, 5) || ''
        };
      });
    }
    setMatrix(baseMatrix);
  };

  const handleInputChange = (dayIdx: number, field: string, value: string) => {
    const newMatrix = [...matrix];
    newMatrix[dayIdx] = { ...newMatrix[dayIdx], [field]: value };
    setMatrix(newMatrix);
  };

  const handleCopyMonday = () => {
    const monday = matrix[1];
    const newMatrix = [...matrix];
    selectedDays.forEach(dayIdx => {
      newMatrix[dayIdx] = { 
        ...monday, 
        day_of_week: dayIdx 
      };
    });
    setMatrix(newMatrix);
  };

  const toggleDaySelection = (dayIdx: number) => {
    if (selectedDays.includes(dayIdx)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIdx));
    } else {
      setSelectedDays([...selectedDays, dayIdx]);
    }
  };

  const handleSaveMatrix = async () => {
    if (!selectedId) return;
    setSaving(true);
    
    try {
      // Loop sequencial para garantir que cada dia é processado
      for (const row of matrix) {
        const { error } = await supabase.rpc('upsert_work_schedule', {
          p_user_id: selectedId,
          p_day_of_week: row.day_of_week,
          p_p1_start: row.pair_1_start || null,
          p_p1_end: row.pair_1_end || null,
          p_p2_start: row.pair_2_start || null,
          p_p2_end: row.pair_2_end || null,
          p_p3_start: row.pair_3_start || null,
          p_p3_end: row.pair_3_end || null,
          p_p4_start: row.pair_4_start || null,
          p_p4_end: row.pair_4_end || null
        });
        
        if (error) throw error;
      }
      
      alert('Matriz de horários guardada com sucesso!');
      await fetchSchedule(selectedId); // Forçar refresh para garantir persistência visual
    } catch (err: any) {
      console.error('Erro ao guardar matriz:', err);
      alert('Erro ao guardar matriz: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const daysLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="flex gap-8">
      <div className="w-64 shrink-0 space-y-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4 px-2">Colaboradores</h3>
        {employees.map(emp => (
          <button 
            key={emp.id}
            onClick={() => setSelectedId(emp.id)}
            className={`w-full text-left p-3 rounded-[2px] text-xs font-bold uppercase tracking-tight border transition-all ${
              selectedId === emp.id ? 'bg-accent/10 border-accent text-accent' : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20'
            }`}
          >
            {emp.full_name}
          </button>
        ))}

        {selectedId && (
          <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-[2px] space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Direito Anual (Dias)</span>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={employees.find(e => e.id === selectedId)?.vacation_entitlement || 22}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value);
                    const { error } = await supabase.rpc('update_vacation_entitlement', { p_user_id: selectedId, p_days: val });
                    if (!error) onRefresh();
                  }}
                  className="w-full bg-black/40 border border-white/5 p-2 text-xs font-bold text-accent focus:border-accent/40 outline-none"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 space-y-4">
               {empStats && (
                 <div className="grid grid-cols-1 gap-2">
                    {[
                      { label: 'Direito', value: empStats.entitlement, color: 'text-white' },
                      { label: 'Pendentes', value: empStats.pending, color: 'text-orange-500' },
                      { label: 'Agendados', value: empStats.scheduled, color: 'text-accent' },
                      { label: 'Gozados', value: empStats.taken, color: 'text-green-500' },
                      { label: 'Disponíveis', value: empStats.available, color: 'text-accent' },
                    ].map(s => (
                      <div key={s.label} className="flex justify-between items-center bg-white/[0.01] p-2 rounded-[1px]">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{s.label}</span>
                        <span className={`text-xs font-black italic ${s.color}`}>{s.value}d</span>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        {selectedId ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white/[0.02] p-4 border border-white/5 rounded-[2px]">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Definição de Turnos</h3>
                <p className="text-[9px] text-white/60 font-bold uppercase mt-1">Configure a matriz semanal de 4 turnos</p>
              </div>
              <div className="flex items-center gap-4">
                {selectedDays.length > 0 && (
                  <button 
                    onClick={handleCopyMonday}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-accent hover:bg-accent hover:text-black transition-all"
                  >
                    Copiar de Segunda ({selectedDays.length})
                  </button>
                )}
                <NeonButton onClick={handleSaveMatrix} isLoading={saving}>
                  Guardar Matriz
                </NeonButton>
              </div>
            </div>

            <div className="grid gap-2 text-white">
              {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                const day = daysLabels[i];
                const row = matrix[i];
                const isSelected = selectedDays.includes(i);
                const isMonday = i === 1;

                return (
                  <div key={i} className={`bg-white/[0.02] border transition-all p-4 rounded-[2px] flex items-center gap-6 group ${
                    isSelected ? 'border-accent/40 bg-accent/[0.02]' : 'border-white/5 hover:bg-white/[0.04]'
                  }`}>
                    <div className="flex items-center gap-3 w-28">
                      {!isMonday && (
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleDaySelection(i)}
                          className="w-3 h-3 rounded-none border-white/20 bg-transparent text-accent focus:ring-0"
                        />
                      )}
                      <span className={`text-[10px] font-black uppercase ${isMonday ? 'text-accent' : 'text-white'}`}>
                        {day}
                      </span>
                    </div>

                    <div className="flex-1 grid grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map(p => (
                        <div key={p} className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Par {p}</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              placeholder="00:00" 
                              value={row[`pair_${p}_start`] || ''}
                              onChange={(e) => handleInputChange(i, `pair_${p}_start`, e.target.value)}
                              className="w-full bg-black/40 border border-white/5 p-1.5 text-xs text-center font-mono text-white focus:border-accent/40 outline-none" 
                            />
                            <span className="text-white/40">-</span>
                            <input 
                              type="text" 
                              placeholder="00:00" 
                              value={row[`pair_${p}_end`] || ''}
                              onChange={(e) => handleInputChange(i, `pair_${p}_end`, e.target.value)}
                              className="w-full bg-black/40 border border-white/5 p-1.5 text-xs text-center font-mono text-white focus:border-accent/40 outline-none" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 border border-dashed border-white/5 rounded-[2px] flex items-center justify-center text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
            Selecione um recurso para gerir escala
          </div>
        )}
      </div>
    </div>
  );
}
