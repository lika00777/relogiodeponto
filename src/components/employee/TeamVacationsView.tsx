'use client';

import VacationCalendar from './VacationCalendar';
import { Users } from 'lucide-react';

export default function TeamVacationsView({ vacations }: { vacations: any[] }) {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter italic text-foreground">Férias da <span className="text-accent underline decoration-accent/20">Equipa</span></h2>
          <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest mt-1">Monitorização de ausências validadas pela base</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-[1px]">
          <Users className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-black text-accent uppercase tracking-widest">{vacations.length} Ativos em Descanso</span>
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        <VacationCalendar 
          events={vacations.map(v => ({ ...v, status: 'approved', user_name: v.full_name }))} 
          readOnly={true}
          showInitials={true}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-[1px]">
        <div>
          <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" /> Legenda de Equipa
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Array.from(new Set(vacations.map(v => v.full_name))).sort().map(name => {
              const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-accent/20 border border-accent/30 text-accent text-[8px] font-black rounded-[2px]">{initials}</span>
                  <span className="text-[9px] font-bold text-foreground/60 uppercase tracking-wider">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col justify-end">
          <div className="flex items-center gap-4 text-foreground/40 text-[8px] font-bold uppercase tracking-[0.2em] mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>F = Férias</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent/40" />
              <span>A = Ausência</span>
            </div>
          </div>
          <p className="text-[8px] text-foreground/20 leading-relaxed italic">
            * Apenas férias aprovadas são visíveis. Dados sincronizados com a base em tempo real.
          </p>
        </div>
      </div>
    </div>
  );
}
