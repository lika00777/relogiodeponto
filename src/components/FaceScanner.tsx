'use client';

import FaceScannerBase from './FaceScannerBase';

interface FaceScannerProps {
  onCapture: (descriptor: number[], imageSrc?: string) => void;
  onCancel: () => void;
}

export default function FaceScanner({ onCapture, onCancel }: FaceScannerProps) {
  return (
    <FaceScannerBase 
      onCapture={onCapture} 
      onCancel={onCancel} 
      variant="modal" 
      title="Autenticação Facial"
    />
  );
}
