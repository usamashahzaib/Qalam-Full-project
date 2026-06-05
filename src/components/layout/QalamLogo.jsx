import React from 'react';

export default function QalamLogo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-base' },
    md: { icon: 'w-8 h-8', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl' },
    xl: { icon: 'w-16 h-16', text: 'text-5xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${s.icon} relative flex-shrink-0`}>
        <img
          src="/byqalam-mark-gold.png"
          alt="Qalam"
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <span className={`font-serif font-semibold tracking-tight ${s.text} text-foreground`}>
          Qalam
        </span>
      )}
    </div>
  );
}