'use client';

export default function GlobalAuraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-500 opacity-100" aria-hidden="true">
      <div className="absolute top-[-6%] left-[-4%] h-[62%] w-[62%] rounded-full bg-emerald-500/20 blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
      <div
        className="absolute top-[8%] right-[-10%] h-[52%] w-[52%] rounded-full bg-red-600/20 blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute bottom-[-8%] left-[14%] h-[72%] w-[72%] rounded-full bg-blue-600/25 blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]"
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
}
