import React from 'react';
import Image from 'next/image';

export default function BlueChromeWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex justify-center items-center ${className}`}>
      {/* Sized to match the horizontal span of the 64-char glowing line.
          Height adjusted to 250px to let the chrome 'pop' without clipping.
      */}
      <div className="relative w-[320px] h-[120px] md:w-[600px] md:h-[250px]">
        <Image 
          src="/removebg.png" 
          alt="ZIP-IT 'N SHIP-IT" 
          fill 
          priority
          unoptimized // Keeps the metallic chrome texture sharp
          className="object-contain drop-shadow-[0_0_35px_rgba(0,242,255,0.5)]"
        />
      </div>
    </div>
  );
}