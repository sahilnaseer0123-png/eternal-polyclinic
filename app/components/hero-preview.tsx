"use client";

import { motion, useReducedMotion } from "framer-motion";

const cardClass = "tech-card absolute w-[min(88vw,310px)] rounded-2xl border border-cyan-500/30 bg-black/40 p-4 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.03] hover:border-cyan-300/80 hover:shadow-[0_0_42px_rgba(34,211,238,0.18)]";

export function HeroPreview() {
  const reducedMotion = useReducedMotion();
  const float = (distance: number) => reducedMotion ? { y: 0 } : { y: [-distance, distance, -distance] };

  return (
    <div className="relative min-h-[580px] lg:min-h-[600px]" aria-label="Eternal Polyclinic platform preview">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 size-[270px] rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-10 rounded-[40px] border border-white/[0.04] bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

      <motion.div className={`${cardClass} right-0 top-2 z-30`} animate={float(7)} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} whileHover={{ scale: 1.03 }}>
        <div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><span className="text-xl">⌁</span></span><div><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Ultrasound Diagnostics</p><p className="mt-1 text-sm font-semibold text-white">Scans & Reports</p></div></div><span className="mt-1 size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_3px_rgba(110,231,183,.45)]" /></div>
        <p className="mt-3 text-xs text-white/55">managed by Dr. Haneef</p><div className="mt-5 flex h-10 items-center gap-1 overflow-hidden rounded-lg bg-black/20 px-3"><span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-200 to-transparent" /><span className="text-[10px] font-medium text-cyan-100/70">∿ ∿ ∿</span><span className="h-px flex-1 bg-gradient-to-r from-cyan-200 via-transparent to-transparent" /></div><p className="mt-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] text-emerald-100">Ultrasound Scan Ready · Dr. Haneef</p>
      </motion.div>

      <motion.div className={`${cardClass} left-0 top-[190px] z-20`} animate={float(5)} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} whileHover={{ scale: 1.03 }}>
        <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Multi-Doctor Practice</p><p className="mt-1 text-sm font-semibold text-white">Slots Available Today</p></div><span className="text-xs text-emerald-200">12 open</span></div>
        <div className="mt-4 space-y-2">{[["Dr. Amjid", "Consultant Physician", "AA"], ["Dr. Suhail", "General Medicine / Specialist", "DS"], ["Dr. Rakshanda", "Specialist", "DR"], ["Dr. Haneef", "Ultrasound Specialist", "DH"]].map(([name, specialty, initials]) => <div key={name} className="flex items-center gap-2"><span className="relative grid size-7 place-items-center rounded-full bg-[#d9ebe0] text-[9px] font-bold text-[#172321]">{initials}<span className="absolute bottom-0 right-0 size-2 rounded-full border-2 border-[#182522] bg-emerald-300" /></span><span className="flex-1 text-[11px] text-white/85">{name} <small className="ml-1 text-white/40">{specialty}</small></span></div>)}</div>
        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[10px] text-cyan-100/70"><span className="text-lg">⌁</span><span>Echo & Cardiac Imaging · Dr. Adil Lankar</span><span className="ml-auto text-emerald-200">72 bpm</span></div>
      </motion.div>

      <motion.div className={`${cardClass} bottom-4 right-4 z-10`} animate={float(6)} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.6 }} whileHover={{ scale: 1.03 }}>
        <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-300/10 text-lg text-emerald-200">✓</span><div><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Polyclinic Diagnostic Lab</p><p className="mt-1 text-xs leading-5 text-white/60">Lab work & Blood reports processed by Musadiq</p><p className="mt-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] text-emerald-100">Lab Report Verified by Musadiq</p><p className="mt-2 text-xs font-semibold leading-5 text-white">Prescription #4092 sent to in-house pharmacy</p></div></div>
      </motion.div>
    </div>
  );
}
