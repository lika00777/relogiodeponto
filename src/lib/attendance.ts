'use client';

import { supabase } from '@/lib/supabase';
import * as faceapi from 'face-api.js';

/**
 * Identifica o utilizador procurando o seu rosto na base de dados (Busca 1:N)
 */
export async function identifyUserByFace(descriptor: number[]) {
  // Ensure the descriptor is formatted as a JSON string for pgvector input if needed, 
  // but supabase-js handles array for vector types usually.
  const { data, error } = await supabase.rpc('match_profile_faces', {
    query_embedding: descriptor,
    match_threshold: 0.6, // Slightly relaxed for Euclidean distance
    match_count: 1
  });

  if (error) {
    console.error('RPC Error (match_profile_faces):', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn('No potential match found within threshold.');
    return null;
  }

  // Double check locally with existing verifyFace logic if needed, but RPC should handle it.
  return data[0]; // Retorna o perfil encontrado
}

/**
 * Compara dois descritores faciais (embeddings) e retorna se são um match.
 */
export async function verifyFace(currentDescriptor: number[], savedDescriptor: any) {
  try {
    // Normalização robusta: pgvector pode retornar string {1,2,3...} ou array [1,2,3...]
    let normalizedSaved: number[] = [];
    
    if (typeof savedDescriptor === 'string') {
      normalizedSaved = savedDescriptor
        .replace(/[{}]/g, '')
        .split(',')
        .map(Number);
    } else if (Array.isArray(savedDescriptor)) {
      normalizedSaved = savedDescriptor.map(Number);
    }

    if (!normalizedSaved.length || currentDescriptor.length !== normalizedSaved.length) {
      console.error(`Falha Crítica na Biometria: Divergência de dimensões.`);
      return false;
    }

    const distance = faceapi.euclideanDistance(currentDescriptor, normalizedSaved);
    
    // Log de auditoria (em produção isso iria para uma tabela de logs)
    console.log(`[Audit] Tentativa de Match: Distância=${distance.toFixed(4)}`);

    // 0.45 é mais rígido que o padrão 0.6 do face-api, ideal para segurança
    const THRESHOLD = 0.45;
    const isMatch = distance < THRESHOLD;

    if (!isMatch && distance < 0.6) {
      console.warn(`[Security] Tentativa de match próxima ao limite: ${distance.toFixed(4)}`);
    }

    return isMatch;
  } catch (err) {
    console.error('Erro na validação facial:', err);
    return false;
  }
}

/**
 * Registers a clock-in/out event in the database.
 */
export async function registerAttendance({
  userId,
  locationId,
  type,
  method,
  coords
}: {
  userId: string;
  locationId: string;
  type: 'entry' | 'exit';
  method: 'face' | 'biometric' | 'pin';
  coords: { lat: number, lng: number };
}) {
  const { data, error } = await supabase
    .rpc('register_attendance_log', {
      p_user_id: userId,
      p_location_id: locationId,
      p_type: type,
      p_method: method,
      p_lat: coords.lat,
      p_lng: coords.lng
    });

  return { success: !error, error, data: data ? data[0] : null }; // Return the created log for undo purposes
}

/**
 * Retrieves the last attendance log for a specific user to determine the next action.
 * Uses a SECURITY DEFINER RPC to bypass RLS for the Kiosk.
 */
export async function getLastPunch(userId: string) {
  const { data, error } = await supabase
    .rpc('get_last_user_attendance', { p_user_id: userId });

  if (error) {
    if (Object.keys(error).length > 0) {
      console.error('Error fetching last punch (get_last_user_attendance):', JSON.stringify(error, null, 2));
    }
    return null;
  }

  // RPC returns an array of rows, we took limit 1
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Switches the type (Entry <-> Exit) of a specific attendance log.
 * Used for the "Correct" feature when the Smart Protocol guesses wrong.
 */
export async function switchLastPunch(logId: string) {
  const { data, error } = await supabase
    .rpc('switch_attendance_log_type', { p_log_id: logId });

  if (error) {
    console.error('Error switching log type:', error);
    return { success: false, error };
  }

  return { success: true, newType: data };
}
