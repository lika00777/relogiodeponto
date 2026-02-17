'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, AlertTriangle, Info, Check, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  is_read: boolean;
  created_at: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 border border-white/10 rounded-[2px] text-foreground/40 hover:text-white transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-[#0D0D0D] border border-white/10 rounded-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Central de Alertas</span>
                <span className="text-[10px] font-bold text-foreground/20 uppercase">{unreadCount} Pendentes</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-foreground/20 text-[10px] font-bold uppercase tracking-widest">
                    Nenhuma notificação estratégica
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => markAsRead(n.id)}
                      className={`p-4 border-b border-white/[0.02] cursor-pointer transition-all hover:bg-white/[0.02] group ${!n.is_read ? 'bg-accent/[0.02]' : 'opacity-60'}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 ${
                          n.type === 'alert' ? 'text-red-500' : 
                          n.type === 'warning' ? 'text-orange-500' : 'text-accent'
                        }`}>
                          {n.type === 'alert' ? <ShieldAlert className="w-4 h-4" /> : 
                           n.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-bold leading-tight ${!n.is_read ? 'text-foreground' : 'text-foreground/60'}`}>
                            {n.title}
                          </p>
                          <p className="text-[10px] text-foreground/40 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[8px] text-foreground/20 mt-2 font-mono uppercase">
                            {new Date(n.created_at).toLocaleTimeString('pt-PT')}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div className="w-1.5 h-1.5 bg-accent rounded-full shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="w-full p-3 border-t border-white/5 text-[9px] font-black uppercase tracking-widest text-foreground/20 hover:text-accent transition-colors">
                Ver Todo o Histórico
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
