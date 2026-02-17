'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Menu,
  X
} from 'lucide-react';
import FaceScanner from '@/components/FaceScanner';
import AttendanceReports from '@/components/AttendanceReports';
import NotificationCenter from '@/components/NotificationCenter';
import { motion, AnimatePresence } from 'framer-motion';

import AdminSidebar from '@/components/admin/AdminSidebar';
import EmployeeGrid from '@/components/admin/EmployeeGrid';
import MetricsPanel from '@/components/admin/MetricsPanel';
import AddEmployeeModal from '@/components/admin/AddEmployeeModal';
import NeonButton from '@/components/ui/NeonButton';
import LocationManager from '@/components/admin/LocationManager';
import ScheduleManager from '@/components/admin/ScheduleManager';
import { Profile, NewEmployeeData } from '@/types';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'employees' | 'reports' | 'locations' | 'schedules'>('employees');
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initial fetch
  useEffect(() => {
    setIsMounted(true);
    fetchEmployees();
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Falha ao carregar funcionários (Bruto):', JSON.stringify(error, null, 2));
        setMessage({ 
          type: 'error', 
          text: `Erro de Acesso: ${error.message} (${error.code})` 
        });
      } else {
        setEmployees(data || []);
      }
    } catch (err: any) {
      console.error('Erro inesperado em fetchEmployees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFaceEnrollment = async (descriptor: number[], imageSrc?: string) => {
    if (!selectedUser) return;

    setLoading(true);
    // Convert Float32Array to regular array for Supabase (pgvector compatible)
    const vectorArray = Array.from(descriptor);

    let photoUrl = null;

    // Handle Image Upload if captured
    if (imageSrc) {
      try {
        const res = await fetch(imageSrc);
        const blob = await res.blob();
        const fileName = `${selectedUser.id}-${Date.now()}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { upsert: true });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      } catch (e) {
        console.error('Error processing image:', e);
      }
    }

    // Use RPC to bypass RLS recursion issues
    const { error } = await supabase.rpc('update_biometrics', {
      user_id: selectedUser.id,
      embedding: vectorArray,
      photo_url: photoUrl
    });

    if (error) {
      console.error('Erro no Supabase (Biometria):', JSON.stringify(error, null, 2));
      setMessage({ 
        type: 'error', 
        text: `Erro ao salvar: ${error.message} (${error.code})` 
      });
    } else {
      setMessage({ type: 'success', text: `Biometria de ${selectedUser.full_name} cadastrada com sucesso!` });
      await fetchEmployees();
    }
    
    setShowEnrollment(false);
    setSelectedUser(null);
    setLoading(false);
    
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddEmployee = async (newEmployeeData: NewEmployeeData) => {
    setLoading(true);

    try {
      // 1. Criar o utilizador no Supabase Auth
      // O Perfil será criado automaticamente pelo TRIGGER no Postgres
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmployeeData.email,
        password: newEmployeeData.password,
        options: {
          data: {
            full_name: newEmployeeData.full_name,
            role: newEmployeeData.role,
            work_start: newEmployeeData.work_start,
            work_end: newEmployeeData.work_end
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        setMessage({ type: 'success', text: 'Recurso registado com sucesso via Automático!' });
        setShowAddModal(false);
        
        // Pequeno delay para o trigger terminar antes de atualizar a lista
        setTimeout(() => fetchEmployees(), 1000);
      }
      
    } catch (error: any) {
      console.error('Erro no registro:', error);
      setMessage({ type: 'error', text: `Erro: ${error.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'locations':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full"
          >
            <LocationManager />
          </motion.div>
        );
      case 'reports':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full"
          >
            <AttendanceReports />
          </motion.div>
        );
      case 'schedules':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full"
          >
            <ScheduleManager />
          </motion.div>
        );
      case 'employees':
      default:
        return (
          <div className="flex flex-col xl:flex-row gap-8">
            <div className="flex-1 space-y-6">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                  <input 
                    type="text" 
                    placeholder="Filtrar base de dados..." 
                    className="w-full bg-white/[0.03] border border-white/10 p-4 pl-12 rounded-[2px] text-sm focus:border-accent outline-none transition-all placeholder:text-foreground/20 text-foreground"
                  />
                </div>
                
                <NeonButton 
                  onClick={() => setShowAddModal(true)}
                  icon={<UserPlus className="w-5 h-5" />}
                >
                  Novo Recurso
                </NeonButton>
              </div>

              {/* Employee Grid */}
              <EmployeeGrid 
                employees={employees} 
                loading={loading} 
                selectedUserId={selectedUser?.id}
                onSelectUser={(user) => {
                  setSelectedUser(user);
                  setShowEnrollment(true);
                }}
              />
            </div>

            {/* Right Metrics Panel */}
            <MetricsPanel 
              totalActive={employees.length}
              totalWithFace={employees.filter(e => e.face_embedding).length}
              apiLatency="24ms"
            />
          </div>
        );
    }
  };
  
  const getPageTitle = () => {
    switch(activeTab) {
      case 'locations': return 'Geolocalização & Perímetros';
      case 'reports': return 'Relatórios de Ciclo';
      case 'schedules': return 'Escalas & Gestão de Férias';
      case 'employees': return 'Gestão de Recursos';
      default: return 'Gestão de Recursos';
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#0A0A0A] bg-grid" />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row bg-grid relative overflow-x-hidden text-foreground">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background/80 backdrop-blur-md z-40 sticky top-0">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 bg-accent flex items-center justify-center rounded-[2px]">
             <span className="font-black text-black text-[10px]">P</span>
           </div>
           <span className="font-black tracking-tighter text-xs text-foreground uppercase">Chronos <span className="text-accent underline decoration-accent/20">Pro</span></span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-white/5 border border-white/10 rounded-[2px] text-accent active:scale-95 transition-all"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        isMounted={isMounted}
      />

      {/* Main Content */}
      <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all ${isSidebarOpen ? 'blur-sm md:blur-0' : ''}`}>
        
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground uppercase italic underline decoration-accent/30 decoration-4 underline-offset-8">
              {getPageTitle()}
            </h1>
            <div className="flex items-center gap-2 mt-4 md:mt-6">
              <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_#00E5FF] animate-pulse" />
              <p className="text-foreground/40 text-[9px] md:text-[10px] font-black tracking-[0.3em] uppercase">Setor Administrativo • Vizela HQ</p>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-4 bg-white/[0.02] md:bg-transparent p-3 md:p-0 border border-white/5 md:border-0 rounded-[2px]">
            <NotificationCenter />
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            
            <div className="flex items-center gap-3">
              <div className="text-right flex flex-col items-end">
                <p className="text-[10px] md:text-sm font-black text-foreground tracking-tight underline-offset-2">Admin Executivo</p>
                <span className="text-[8px] md:text-[10px] text-accent font-black uppercase tracking-[0.2em] bg-accent/10 px-1.5 py-0.5 mt-1">Nível 5 Pass</span>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-[2px] border-2 border-accent/40 bg-accent/5 flex items-center justify-center text-accent font-black text-sm md:text-lg shadow-[inset_0_0_10px_rgba(0,229,255,0.2)]">
                RH
              </div>
            </div>
          </div>
        </div>

        {/* Global Message Banner */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-8 p-4 rounded-[2px] border flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span className="text-sm font-bold uppercase tracking-tight">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {renderContent()}

      </main>

      {/* Modals */}
      <AnimatePresence>
        {showEnrollment && selectedUser && (
          <FaceScanner 
            onCapture={(descriptor, snapshot) => handleFaceEnrollment(descriptor, snapshot)}
            onCancel={() => setShowEnrollment(false)}
          />
        )}
      </AnimatePresence>

      <AddEmployeeModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddEmployee}
        loading={loading}
      />
    </div>
  );
}
