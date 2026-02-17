import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function NeonButton({ 
  children, 
  variant = 'primary', 
  isLoading = false,
  icon,
  className = '',
  ...props 
}: NeonButtonProps) {
  
  const variants = {
    primary: "bg-[#00E5FF] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] shadow-[0_0_30px_rgba(0,229,255,0.3)] hover:scale-[1.05] active:scale-95 hover:brightness-110",
    secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-95",
    danger: "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 active:scale-95"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      disabled={isLoading || props.disabled}
      className={`
        relative overflow-hidden flex items-center justify-center gap-2 
        px-6 py-3 rounded-[2px] font-black text-xs uppercase tracking-widest 
        transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      
      <span>{isLoading ? 'Aguarde...' : children}</span>
    </motion.button>
  );
}
