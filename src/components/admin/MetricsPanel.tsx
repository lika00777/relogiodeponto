import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface MetricsPanelProps {
  totalActive: number;
  totalWithFace: number;
  apiLatency: string;
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.03]">
      <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider">{label}</span>
      <span className="text-lg font-bold text-foreground tracking-tighter tabular-nums text-right">{value}</span>
    </div>
  );
}

export default function MetricsPanel({ totalActive, totalWithFace, apiLatency }: MetricsPanelProps) {
  return (
    <div className="w-full xl:w-80 space-y-6">
      
      {/* Principal Metrics Card */}
      <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[2px] shadow-xl relative overflow-hidden group hover:border-accent/10 transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
        
        <h2 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          Métricas Operacionais
        </h2>
        
        <div className="space-y-6 relative z-10">
          <StatItem label="Total Ativos" value={totalActive.toString()} />
          <StatItem label="Segurança Facial" value={totalWithFace.toString()} />
          <StatItem label="Latência API" value={apiLatency} />
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="bg-accent/5 border border-accent/20 p-6 rounded-[2px] relative overflow-hidden group shadow-lg hover:bg-accent/10 transition-colors">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 -rotate-45 translate-x-12 -translate-y-12 group-hover:bg-accent/10 transition-colors" />
        
        <h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
          <ShieldCheck className="w-4 h-4" /> 
          Protocolo Alpha
        </h3>
        
        <p className="text-[10px] text-accent/60 font-medium leading-loose relative z-10">
          Reconhecimento 1:N configurado com limite euclidiano de 0.5. Vetores normalizados para compatibilidade pgvector.
        </p>
      </div>
    </div>
  );
}
