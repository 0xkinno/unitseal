'use client';

import React from 'react';
import Image from 'next/image';

export function HeroSealVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-xl">
      {/* Ambient backlight glow */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-amber-200/25 via-teal-400/20 to-emerald-200/20 blur-2xl -z-10" />

      {/* Hero Image Container - Shown in Full with NO circle framing */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-stone-300/80 bg-stone-100 shadow-2xl">
        <Image
          src="/hero-seal.jpg"
          alt="UNITSEAL Cryptographic State Seal"
          fill
          sizes="(max-width: 768px) 100vw, 560px"
          className="object-cover object-center transition-transform duration-700 hover:scale-102"
          priority
        />
        {/* Subtle glass reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-stone-950/15 via-transparent to-white/10 pointer-events-none" />
      </div>

      {/* Floating telemetry pills positioned around image */}
      <div className="absolute -top-3 left-4 rounded-md border border-stone-200/90 bg-white/95 px-3 py-1 shadow-md backdrop-blur-xs z-20">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-800 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PARITY: 0 DRIFT</span>
        </div>
      </div>

      <div className="absolute -top-3 right-4 rounded-md border border-stone-200/90 bg-white/95 px-3 py-1 shadow-md backdrop-blur-xs z-20">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-800 font-semibold">
          <span className="h-2 w-2 rounded-full bg-teal-600" />
          <span>EIP-712 ATTESTED</span>
        </div>
      </div>

      {/* State Seal Verified Box */}
      <div className="absolute -bottom-3 -right-2 sm:right-4 z-20 flex flex-col items-center text-center px-4 py-2 bg-stone-950/90 backdrop-blur-md rounded-xl border border-stone-800 shadow-xl text-white">
        <span className="font-mono text-[9px] tracking-widest text-emerald-400 font-bold uppercase">
          STATE SEAL VERIFIED
        </span>
        <div className="my-0.5 h-px w-14 bg-stone-700" />
        <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-stone-100">
          1.0005x
        </span>
        <span className="font-mono text-[8px] text-stone-300 tracking-wider">
          uiMultiplier() · Mainnet 4663
        </span>
      </div>
    </div>
  );
}
