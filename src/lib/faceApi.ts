import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export const loadFaceApiModels = async () => {
  if (modelsLoaded) return;
  
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
        console.log('FaceAPI Models Loaded');
      } catch (err) {
        console.error('Error loading FaceAPI models:', err);
        throw err;
      }
    })();
  }
  
  return loadPromise;
};

export const isFaceApiLoaded = () => modelsLoaded;
