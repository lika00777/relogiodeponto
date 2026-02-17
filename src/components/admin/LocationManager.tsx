'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Plus, Trash2, Crosshair, Save, Edit, Check } from 'lucide-react';
import NeonButton from '@/components/ui/NeonButton';
import { motion, AnimatePresence } from 'framer-motion';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_default: boolean;
}

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  
  // New/Edit Location Form State
  const [formName, setFormName] = useState('');
  const [formLat, setFormLat] = useState<number | ''>('');
  const [formLng, setFormLng] = useState<number | ''>('');
  const [formRadius, setFormRadius] = useState(100);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    setLoading(true);
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching locations:', error);
    } else {
      setLocations(data || []);
    }
    setLoading(false);
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocalização não suportada pelo navegador.' });
      return;
    }

    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormLat(position.coords.latitude);
        setFormLng(position.coords.longitude);
        setCapturing(false);
        setMessage({ type: 'success', text: 'Localização capturada com precisão!' });
        setTimeout(() => setMessage(null), 3000);
      },
      (error) => {
        console.error('Geo error:', error);
        setCapturing(false);
        setMessage({ type: 'error', text: 'Erro ao obter localização. Verifique as permissões.' });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || formLat === '' || formLng === '') return;

    setLoading(true);
    let error;

    // If setting as default, we MUST ensure all others are unset first
    if (formIsDefault) {
      // We use 'neq' with a dummy ID (or better, just update all rows)
      // Since supabase RLS might restrict updating all rows, we do it safely:
      // We update all locations EXCEPT the one we are editing (if editing)
      // Actually simpler: Update ALL to false, then the current one will become true
      // But efficiently:
      
      const { error: resetError } = await supabase
        .from('locations')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows (hack to match all)
        
      if (resetError) {
         console.error('Error resetting defaults:', resetError);
      }
    }

    const payload = {
      name: formName,
      latitude: Number(formLat),
      longitude: Number(formLng),
      radius_meters: formRadius,
      is_default: formIsDefault
    };

    if (editingLocId) {
       // Update existing
       const { error: updateError } = await supabase
        .from('locations')
        .update(payload)
        .eq('id', editingLocId);
        error = updateError;
    } else {
       // Insert new
       const { error: insertError } = await supabase
        .from('locations')
        .insert([payload]);
        error = insertError;
    }

    if (error) {
      setMessage({ type: 'error', text: `Erro ao salvar: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: editingLocId ? 'Localização atualizada!' : 'Localização adicionada!' });
      resetForm();
      fetchLocations();
    }
    setLoading(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta localização?')) return;

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao deletar: ' + error.message);
    } else {
      fetchLocations();
    }
  };

  const handleSetDefault = async (id: string) => {
    // 1. Reset all others
    await supabase.from('locations').update({ is_default: false }).neq('id', id);
    // 2. Set this one
    await supabase.from('locations').update({ is_default: true }).eq('id', id);
    
    fetchLocations();
    setMessage({ type: 'success', text: 'Localização padrão definida!' });
    setTimeout(() => setMessage(null), 3000);
  }

  const startEdit = (loc: Location) => {
    setEditingLocId(loc.id);
    setFormName(loc.name);
    setFormLat(loc.latitude);
    setFormLng(loc.longitude);
    setFormRadius(loc.radius_meters);
    setFormIsDefault(loc.is_default);
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormLat('');
    setFormLng('');
    setFormRadius(100);
    setFormIsDefault(false);
    setEditingLocId(null);
    setIsAdding(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
            <MapPin className="w-6 h-6 text-accent" />
            Locais Autorizados
          </h2>
          <p className="text-foreground/40 text-[10px] font-bold tracking-widest uppercase mt-1">
            Gestão de Geofencing Multi-Empresa
          </p>
        </div>

        <NeonButton 
          onClick={() => { resetForm(); setIsAdding(!isAdding); }}
          icon={isAdding ? <Check className="w-5 h-5"/> : <Plus className="w-5 h-5" />}
        >
          {isAdding ? 'Fechar Formulário' : 'Novo Local'}
        </NeonButton>
      </div>

      <AnimatePresence mode="popLayout">
        {message && (
          <motion.div 
            key="status-message"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-[2px] border text-sm font-bold uppercase tracking-wide ${
              message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {isAdding && (
          <motion.form 
            key="location-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="bg-white/[0.02] border border-accent/20 p-6 rounded-[2px] overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full mb-2 flex justify-between items-center">
                <span className="text-xs font-black text-accent uppercase tracking-widest border-b border-accent pb-1">
                  {editingLocId ? 'Editar Localização' : 'Adicionar Nova Localização'}
                </span>
                
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 border rounded-[2px] flex items-center justify-center transition-all ${
                    formIsDefault ? 'bg-accent border-accent' : 'border-white/20 group-hover:border-accent'
                  }`}>
                    {formIsDefault && <Check className="w-3 h-3 text-black" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formIsDefault} 
                    onChange={e => setFormIsDefault(e.target.checked)}
                  />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    formIsDefault ? 'text-accent' : 'text-foreground/40 group-hover:text-foreground/80'
                  }`}>
                    Definir como Padrão
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Nome da Sede/Filial</label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Armazém Porto"
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Raio (Metros)</label>
                <input 
                  type="number"
                  required
                  value={formRadius}
                  onChange={e => setFormRadius(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground focus:border-accent outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Coordenadas GPS</label>
                   <button 
                     type="button"
                     onClick={getCurrentLocation}
                     disabled={capturing}
                     className="text-[10px] bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1 rounded-[2px] uppercase font-black tracking-widest flex items-center gap-2 transition-all border border-accent/20"
                   >
                     <Crosshair className={`w-3 h-3 ${capturing ? 'animate-spin' : ''}`} />
                     {capturing ? 'Capturando...' : 'Usar Local Atual'}
                   </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="number"
                    step="any"
                    required
                    placeholder="Latitude"
                    value={formLat}
                    onChange={e => setFormLat(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground font-mono"
                  />
                  <input 
                    type="number"
                    step="any"
                    required
                    placeholder="Longitude"
                    value={formLng}
                    onChange={e => setFormLng(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 p-3 rounded-[2px] text-sm text-foreground font-mono"
                  />
                </div>
                {formLat !== '' && (
                   <p className="text-[9px] text-foreground/30 uppercase tracking-widest">
                     Detectado: {formLat}, {formLng}
                   </p>
                )}
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <NeonButton type="submit" isLoading={loading} icon={<Save className="w-4 h-4" />}>
                  {editingLocId ? 'Atualizar Local' : 'Salvar Local'}
                </NeonButton>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {locations.map((loc, idx) => (
          <div key={loc.id || `loc-${idx}`} className={`bg-white/[0.02] border p-4 rounded-[2px] transition-all group relative overflow-hidden ${
             loc.is_default ? 'border-accent shadow-[0_0_15px_rgba(0,229,255,0.1)]' : 'border-white/5 hover:border-accent/30'
          }`}>
            <div className="absolute top-0 right-0 flex">
              <button 
                onClick={() => startEdit(loc)}
                className="p-2 text-foreground/40 hover:text-white hover:bg-white/5 transition-colors"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(loc.id)}
                className="p-2 text-red-500 hover:bg-red-500/10 transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3 mt-1">
              <div className={`w-10 h-10 flex items-center justify-center rounded-[2px] ${
                loc.is_default ? 'bg-accent text-black' : 'bg-accent/10 text-accent'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  {loc.name}
                  {loc.is_default && <span className="text-[8px] bg-accent/20 text-accent px-1.5 rounded-[1px] uppercase tracking-wider">Padrão</span>}
                </h3>
                <span className="text-[10px] text-foreground/40 font-mono uppercase">Raio: {loc.radius_meters}m</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-foreground/30 bg-black/20 p-2 rounded-[2px] border border-white/5 mb-3">
              <div>LAT: {loc.latitude}</div>
              <div>LNG: {loc.longitude}</div>
            </div>

            {!loc.is_default && (
               <button 
                 onClick={() => handleSetDefault(loc.id)}
                 className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:text-accent hover:bg-accent/5 border border-white/5 hover:border-accent/20 rounded-[2px] transition-all"
               >
                 Definir como Padrão
               </button>
            )}
          </div>
        ))}
        
        {locations.length === 0 && !loading && (
          <div className="col-span-full p-12 text-center text-foreground/20 font-bold uppercase tracking-widest border border-dashed border-white/5">
            Nenhum local configurado
          </div>
        )}
      </div>
    </div>
  );
}
