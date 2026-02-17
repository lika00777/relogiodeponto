'use client';

import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

import { loadFaceApiModels, isFaceApiLoaded } from '@/lib/faceApi';

export function useFaceRecognition() {
  const [isModelLoaded, setIsModelLoaded] = useState(isFaceApiLoaded());
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      if (isFaceApiLoaded()) {
        setIsModelLoaded(true);
        return;
      }

      try {
        await loadFaceApiModels();
        if (isMounted) setIsModelLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
        if (isMounted) setError('Falha ao carregar modelos de IA');
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  const startVideo = async () => {
    if (!videoRef.current || streamRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Câmera não acessível ou permissão negada');
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const getFaceDescriptor = async () => {
    if (!videoRef.current || !isModelLoaded) return null;
    
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      return detection ? Array.from(detection.descriptor) : null;
    } catch (err) {
      console.error('Face detection error:', err);
      return null;
    }
  };

  const getSnapshot = () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return null;
  };

  return { isModelLoaded, error, videoRef, startVideo, stopVideo, getFaceDescriptor, getSnapshot };
}
