import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users as UsersIcon, 
  FileText, 
  LayoutDashboard, 
  LogOut, 
  X,
  Menu,
  MapPin,
  Calendar
} from 'lucide-react';

export function SidebarLink({ active, onClick, icon, label, static: isStatic }: { active?: boolean, onClick?: () => void, icon: React.ReactNode, label: string, static?: boolean }) {
  if (isStatic) {
    return (
      <div className="flex items-center gap-4 px-4 py-3 text-foreground/20 font-bold text-xs uppercase tracking-widest cursor-default">
        <div className="text-foreground/20">{icon}</div>
        {label}
        <span className="ml-auto text-[8px] bg-white/5 px-1.5 rounded-full">Soon</span>
      </div>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 w-full transition-all group rounded-[2px] ${
        active 
        ? 'bg-accent/10 border-l-2 border-accent text-accent' 
        : 'text-foreground/40 hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5 font-bold hover:pl-5'
      } text-xs uppercase tracking-widest`}
    >
      <div className={active ? 'text-accent' : 'text-foreground/40 group-hover:text-foreground transition-colors'}>
        {icon}
      </div>
      {label}
    </button>
  );
}

interface AdminSidebarProps {
  activeTab: 'employees' | 'reports' | 'locations' | 'schedules';
  setActiveTab: (tab: 'employees' | 'reports' | 'locations' | 'schedules') => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isMounted: boolean;
}

export default function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  isSidebarOpen, 
  setIsSidebarOpen,
  isMounted 
}: AdminSidebarProps) {

  return (
    <AnimatePresence>
      {(isSidebarOpen || (isMounted && typeof window !== 'undefined' && window.innerWidth >= 768)) && (
        <motion.aside 
          initial={isMounted && typeof window !== 'undefined' && window.innerWidth < 768 ? { x: -300 } : {}}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`
            fixed md:relative top-0 left-0 bottom-0 w-64 border-r border-[var(--border)] bg-[var(--background)] shadow-2xl md:shadow-none
            flex flex-col p-6 z-50 transition-transform h-full
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Mobile Close Button */}
          <div className="md:hidden absolute top-4 right-4">
            <button onClick={() => setIsSidebarOpen(false)} className="text-foreground/40 hover:text-foreground">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 mb-10">
            <div className="w-8 h-8 bg-accent flex items-center justify-center rounded-[2px] shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <span className="font-black text-black text-sm">P</span>
            </div>
            <span className="font-black tracking-tighter text-lg text-foreground">CHRONOS <span className="text-accent text-xs">PRO</span></span>
          </div>

          <nav className="flex-1 space-y-1 mt-8 md:mt-0">
            <div className="text-[10px] uppercase font-black tracking-[0.3em] text-foreground/20 mb-4 px-4">Menu Principal</div>
            <SidebarLink 
              active={activeTab === 'employees'} 
              onClick={() => { setActiveTab('employees'); setIsSidebarOpen(false); }}
              icon={<UsersIcon className="w-4 h-4" />}
              label="Recursos"
            />
            <SidebarLink 
              active={activeTab === 'schedules'} 
              onClick={() => { setActiveTab('schedules'); setIsSidebarOpen(false); }}
              icon={<Calendar className="w-4 h-4" />}
              label="ESCALAS & FÉRIAS"
            />
            <SidebarLink 
              active={activeTab === 'locations'} 
              onClick={() => { setActiveTab('locations'); setIsSidebarOpen(false); }}
              icon={<MapPin className="w-4 h-4" />}
              label="GEOLOCALIZAÇÃO"
            />
            <SidebarLink 
              active={activeTab === 'reports'} 
              onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
              icon={<FileText className="w-4 h-4" />}
              label="Relatórios"
            />
            <SidebarLink 
              static
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Analytics"
            />
          </nav>

          <div className="pt-6 border-t border-[var(--border)] space-y-4">
            <div className="p-3 bg-accent/5 border border-accent/10 rounded-[2px]">
               <p className="text-[8px] font-black text-accent uppercase tracking-[0.2em] mb-1">Status do Sistema</p>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-foreground/60 font-medium">Supabase Online</span>
               </div>
            </div>
            <button 
              onClick={async () => {
                const { supabase } = await import('@/lib/supabase');
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="flex items-center gap-3 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all font-black text-[10px] uppercase tracking-widest px-4 py-3 w-full border border-transparent hover:border-red-500/20 rounded-[2px]"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
