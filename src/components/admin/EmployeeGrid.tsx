import React from 'react';
import { User, ShieldCheck, Mail, ShieldAlert, KeyRound, Save, Camera, Palette } from 'lucide-react';
import { Profile } from '@/types';

interface EmployeeGridProps {
  employees: Profile[];
  loading: boolean;
  selectedUserId?: string;
  onSelectUser: (user: Profile) => void;
}

export default function EmployeeGrid({ 
  employees, 
  loading, 
  selectedUserId, 
  onSelectUser 
}: EmployeeGridProps) {

  if (loading) {
    return (
      <div className="col-span-full p-12 text-center text-foreground/20 uppercase font-black tracking-[0.5em] animate-pulse border border-dashed border-white/5 py-20 rounded-[2px] bg-white/[0.02]">
        Sincronizando Base de Dados...
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="col-span-full p-12 text-center text-foreground/40 font-bold tracking-widest border border-dashed border-white/5 py-20 rounded-[2px]">
        Nenhum funcionário encontrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
      {employees.map((emp, idx) => (
        <div 
          key={emp.id || `emp-${idx}`}
          className={`
            p-4 border group transition-all rounded-[2px] flex items-center justify-between
            ${selectedUserId === emp.id 
              ? 'bg-accent/10 border-accent shadow-[0_0_20px_rgba(0,229,255,0.1)] translate-x-1' 
              : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
            }
          `}
        >
          <div className="flex items-center gap-4">
            <div className={`
              w-12 h-12 rounded-[2px] border flex items-center justify-center font-black text-lg transition-colors overflow-hidden relative
              ${emp.face_embedding 
                ? 'bg-green-500/10 border-green-500/30 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                : 'bg-white/5 border-white/10 text-foreground/20'
              }
            `}>
              {emp.avatar_url ? (
                <img 
                  src={emp.avatar_url} 
                  alt={emp.full_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                emp.full_name.charAt(0)
              )}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 group/name-input">
                <input 
                  type="text"
                  defaultValue={emp.full_name}
                  className="font-black text-sm text-foreground tracking-tight bg-transparent border-b border-white/5 focus:border-accent outline-none w-full transition-colors hover:bg-white/5 px-1 -ml-1 rounded-[2px]"
                  id={`name-${emp.id}`}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const newName = (e.currentTarget as HTMLInputElement).value;
                      const { error } = await (await import('@/lib/supabase')).supabase.rpc('update_employee_name', {
                        p_user_id: emp.id,
                        p_new_name: newName
                      });
                      if (error) {
                        alert(`Erro: ${error.message}`);
                      } else {
                        alert('Nome atualizado!');
                        window.location.reload();
                      }
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const input = document.getElementById(`name-${emp.id}`) as HTMLInputElement;
                    const newName = input.value;
                    const { error } = await (await import('@/lib/supabase')).supabase.rpc('update_employee_name', {
                      p_user_id: emp.id,
                      p_new_name: newName
                    });
                    if (error) {
                      alert(`Erro: ${error.message}`);
                    } else {
                      alert('Nome atualizado!');
                      window.location.reload();
                    }
                  }}
                  className="transition-all p-1.5 text-white hover:text-accent bg-white/5 hover:bg-white/10 rounded-[2px] border border-white/10 hover:border-accent/40"
                  title="Guardar Nome"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <select
                  value={emp.role}
                  onChange={async (e) => {
                    const newRole = e.target.value as 'admin' | 'employee';
                    const { error } = await (await import('@/lib/supabase')).supabase.rpc('update_employee_role', {
                      p_user_id: emp.id,
                      p_new_role: newRole
                    });
                    if (error) {
                      alert(`Erro: ${error.message}`);
                    } else {
                      window.location.reload();
                    }
                  }}
                  className={`
                    text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] border cursor-pointer
                    ${emp.role === 'admin' 
                      ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                      : 'bg-accent/10 border-accent/30 text-accent'
                    }
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="employee" className="text-black">employee</option>
                  <option value="admin" className="text-black">admin</option>
                </select>

                <select
                  value={emp.punch_method || 'face'}
                  onChange={async (e) => {
                    const newMethod = e.target.value;
                    const { error } = await (await import('@/lib/supabase')).supabase.rpc('update_punch_method', {
                      p_user_id: emp.id,
                      p_method: newMethod
                    });
                    if (error) {
                      alert(`Erro: ${error.message}`);
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] border cursor-pointer bg-white/5 border-white/10 text-foreground/60 hover:border-accent/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="face" className="text-black">Facial</option>
                  <option value="pin" className="text-black">PIN</option>
                  <option value="both" className="text-black">Ambos</option>
                </select>
                
                <div className="flex items-center gap-1 group/pin-container">
                  <div className="relative group/pin">
                    <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40 group-focus-within/pin:text-accent transition-colors" />
                    <input 
                      type="password"
                      id={`pin-${emp.id}`}
                      defaultValue={emp.pin_code || ''}
                      placeholder="PIN"
                      maxLength={6}
                      className="pl-7 pr-2 py-0.5 w-20 bg-white/5 border border-white/10 rounded-[2px] text-[10px] font-bold text-accent outline-none focus:border-accent/40"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const newPin = (e.currentTarget as HTMLInputElement).value;
                          const { error } = await (await import('@/lib/supabase')).supabase.rpc('update_employee_pin', {
                            p_user_id: emp.id,
                            p_pin: newPin
                          });
                          if (error) {
                            alert(`Erro: ${error.message}`);
                          } else {
                            alert('PIN atualizado!');
                            window.location.reload();
                          }
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      const input = document.getElementById(`pin-${emp.id}`) as HTMLInputElement;
                      const newPin = input.value;
                      const { error } = await (await import('@/lib/supabase')).supabase.rpc('update_employee_pin', {
                        p_user_id: emp.id,
                        p_pin: newPin
                      });
                      if (error) {
                        alert(`Erro: ${error.message}`);
                      } else {
                        alert('PIN atualizado!');
                        window.location.reload();
                      }
                    }}
                    className="transition-all p-1.5 text-white hover:text-accent bg-white/5 hover:bg-white/10 rounded-[2px] border border-white/10 hover:border-accent/40"
                    title="Guardar PIN"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 group/color-container">
                  <div className="relative group/color">
                    <Palette className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40 group-focus-within/color:text-accent transition-colors" />
                    <input 
                      type="color"
                      id={`color-${emp.id}`}
                      defaultValue={emp.calendar_color || '#00E5FF'}
                      className="pl-7 pr-0.5 py-0 w-12 h-6 bg-white/5 border border-white/10 rounded-[2px] cursor-pointer outline-none focus:border-accent/40"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      const input = document.getElementById(`color-${emp.id}`) as HTMLInputElement;
                      const newColor = input.value;
                      const { error } = await (await import('@/lib/supabase')).supabase.rpc('update_employee_color', {
                        p_user_id: emp.id,
                        p_color: newColor
                      });
                      if (error) {
                        alert(`Erro: ${error.message}`);
                      } else {
                        alert('Cor atualizada!');
                        window.location.reload();
                      }
                    }}
                    className="transition-all p-1.5 text-white hover:text-accent bg-white/5 hover:bg-white/10 rounded-[2px] border border-white/10 hover:border-accent/40"
                    title="Guardar Cor"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>

                {emp.face_embedding && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-1 shadow-[0_0_8px_rgba(34,197,94,0.1)]">
                    <ShieldCheck className="w-3 h-3" /> 
                    Biometria OK
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
            <button 
              onClick={() => onSelectUser(emp)}
              className="p-3 bg-white/5 border border-white/10 rounded-[2px] text-foreground/60 hover:text-accent hover:border-accent hover:bg-accent/10 transition-all active:scale-95"
              title="Cadastrar Rosto"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
