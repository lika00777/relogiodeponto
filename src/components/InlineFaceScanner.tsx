'use client';

import FaceScannerBase from './FaceScannerBase';

interface InlineFaceScannerProps {
  onCapture: (descriptor: number[], imageSrc?: string) => void;
  onCancel: () => void;
}

export default function InlineFaceScanner({ onCapture, onCancel }: InlineFaceScannerProps) {
  return (
    <FaceScannerBase 
      onCapture={onCapture} 
      onCancel={onCancel} 
      variant="inline" 
      title="Auto-Focus BioMetric V5.0"
    />
  );
}
