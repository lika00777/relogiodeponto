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
    const loadModels = async () => {
      try {
        await loadFaceApiModels();
        setIsModelLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Falha ao carregar modelos de IA');
      }
    };
    loadModels();

    // Cleanup on hook unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideo = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Câmera não acessível');
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const getFaceDescriptor = async () => {
    if (!videoRef.current || !isModelLoaded) return null;
    
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection ? Array.from(detection.descriptor) : null;
  };

  const getSnapshot = () => {
    if (!videoRef.current) return null;
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
