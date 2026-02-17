'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GeofenceStatusProps {
  onStatusChange: (isInRange: boolean, locationId: string | null) => void;
}

export default function GeofenceStatus({ onStatusChange }: GeofenceStatusProps) {
  const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'denied'>('checking');
  const [locationName, setLocationName] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    checkLocation();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const checkLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    // Use watchPosition for real-time tracking
    // But let's add robust error handling and logs
    navigator.geolocation.watchPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setCoords({ lat: userLat, lng: userLng });

        // Fetch valid locations from Supabase
        const { data: locations, error: dataError } = await supabase
          .from('locations')
          .select('*');

        if (dataError || !locations) {
          // Silent fail or minimal log
          return;
        }

        // Check if inside any valid geofence

        // Check if inside any valid geofence
        let foundLocation = null;
        let minDistance = Infinity;
        let debugNearest = null;
        let debugDist = Infinity;

        for (const loc of locations) {
          const dist = calculateDistance(userLat, userLng, loc.latitude, loc.longitude);
          
          if (dist < debugDist) {
            debugDist = dist;
            debugNearest = loc;
          }

          if (dist <= loc.radius_meters) {
            if (dist < minDistance) {
              minDistance = dist;
              foundLocation = loc;
            }
          }
        }

        if (foundLocation) {
          setStatus('success');
          setLocationName(foundLocation.name);
          setDistance(Math.round(minDistance));
          onStatusChange(true, foundLocation.id);
        } else {
          // Providing better debug info
          console.log(`User at [${userLat}, ${userLng}]. Nearest: ${debugNearest?.name} (${Math.round(debugDist)}m). Radius: ${debugNearest?.radius_meters}m`);
          
          setStatus('denied');
          setLocationName(debugNearest ? `Perto de ${debugNearest.name}` : 'Nenhum local próximo');
          setDistance(Math.round(debugDist));
          onStatusChange(false, null);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className={`
      relative overflow-hidden rounded-[2px] border transition-all duration-500
      ${status === 'success' ? 'bg-green-500/5 border-green-500/20' : 
        status === 'denied' ? 'bg-red-500/5 border-red-500/20' : 
        'bg-white/5 border-white/10'}
    `}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            status === 'success' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 
            status === 'denied' ? 'bg-red-500/20 text-red-500' : 
            'bg-white/10 text-white animate-pulse'
          }`}>
            {status === 'checking' ? <Radar className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
          </div>
          
          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest ${
              status === 'success' ? 'text-green-500' : 
              status === 'denied' ? 'text-red-500' : 
              'text-foreground/60'
            }`}>
              {status === 'success' ? 'Perímetro Seguro' : 
               status === 'denied' ? 'Fora de Alcance' : 
               'Triangulando GPS...'}
            </h3>
            <p className="text-[10px] text-foreground/40 font-bold uppercase mt-0.5">
              {locationName || (status === 'checking' ? 'Aguardando satélites...' : 'Localização desconhecida')}
            </p>
            {coords && (
               <p className="text-[8px] font-mono text-accent/50 mt-1">
                 GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
               </p>
            )}
          </div>
        </div>

        {distance !== null && (
          <div className="text-right">
            <span className="block text-xl font-black text-foreground tabular-nums">{distance}m</span>
            <span className="text-[8px] text-foreground/20 font-bold uppercase tracking-widest">Da Base</span>
          </div>
        )}
      </div>

      {/* Progress Line */}
      <div className="h-[2px] w-full bg-white/5 relative overflow-hidden">
        {status === 'checking' && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="absolute inset-0 bg-accent w-1/2 blur-[2px]"
          />
        )}
        {status === 'success' && <div className="absolute inset-0 bg-green-500 w-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />}
        {status === 'denied' && <div className="absolute inset-0 bg-red-500 w-full" />}
      </div>
    </div>
  );
}
