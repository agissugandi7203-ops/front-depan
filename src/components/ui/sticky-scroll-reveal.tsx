/**
 * StickyScroll — Responsive Split-Layout Scroll Component.
 * 
 * - Mobile: Renders a clean vertical stack of card components that scroll naturally.
 * - Desktop (lg): Renders the full sticky viewport frame locking the screen, with
 *   smooth vertical parallax text transitions and sticky image cross-fades.
 */

import React, { useRef, useState } from "react"
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StickyScrollItem {
  title: string
  description: string
  content?: React.ReactNode
}

interface StickyScrollProps {
  content: StickyScrollItem[]
  contentClassName?: string
}

// ─── Progress dots (Desktop) ──────────────────────────────────────────────────
function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === active ? 20 : 5,
            opacity: i === active ? 1 : 0.3,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-[2.5px] rounded-full bg-white"
        />
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const StickyScroll = ({ content, contentClassName }: StickyScrollProps) => {
  const [activeCard, setActiveCard] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardLength = content.length

  // Link scroll progress of the tall parent wrapper (Desktop only)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // Desktop text scrolling translation
  const textY = useTransform(
    scrollYProgress,
    [0, 1],
    ["0vh", `-${(cardLength - 1) * 75}vh`]
  )

  // Track active card index (Desktop only)
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const idx = Math.min(Math.floor(latest * cardLength), cardLength - 1)
    setActiveCard(idx)
  })

  return (
    <>
      {/* ── MOBILE LAYOUT (lg:hidden) ────────────────────────────────────────── */}
      <div className="block lg:hidden w-full px-5 md:px-10 pb-16 space-y-6">
        {content.map((item, index) => (
          <div 
            key={index} 
            className="flex flex-col space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm p-5 shadow-lg"
          >
            {/* Image frame */}
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-950">
              <div className="absolute inset-0 w-full h-full">
                {item.content}
              </div>
              <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.04] pointer-events-none" />
            </div>

            {/* Content info */}
            <div className="space-y-2.5">
              {/* Eyebrow */}
              <div className="flex items-center gap-2">
                <div className="h-px w-5 bg-indigo-500/70" />
                <span className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">
                  Layanan {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              {/* Title */}
              <h3 className="text-lg font-bold text-zinc-100 leading-tight">
                {item.title}
              </h3>
              {/* Description */}
              <p className="text-[13px] text-zinc-400 leading-relaxed font-light">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP LAYOUT (hidden lg:block) ─────────────────────────────────── */}
      <div
        ref={containerRef}
        className="hidden lg:block relative w-full"
        style={{ height: `${cardLength * 110}vh` }}
      >
        {/* Sticky viewport frame */}
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-dot-pattern">

          {/* Centered full-width container (constrained 75vh height) */}
          <div className="w-full h-[75vh] border-y border-zinc-800/80 bg-zinc-950/90 lg:bg-zinc-900/60 lg:backdrop-blur-md overflow-hidden shadow-2xl relative z-10">
            <div className="h-full grid grid-cols-2">

              {/* Left: Image panel (Sticky/Static cross-fade) */}
              <div className="relative w-full h-full overflow-hidden">
                <AnimatePresence>
                  <motion.div
                    key={`img-${activeCard}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className={cn("absolute inset-0 w-full h-full", contentClassName)}
                  >
                    {content[activeCard]?.content}
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.04] pointer-events-none" />

                {/* Progress dots */}
                <div className="absolute bottom-4 left-6 z-10">
                  <ProgressDots count={cardLength} active={activeCard} />
                </div>
              </div>

              {/* Right: Text panel (Smooth Parallax Scroll) */}
              <div className="relative h-full overflow-hidden border-l border-zinc-800 bg-zinc-950/20">
                
                {/* Vertically animated text wrapper */}
                <motion.div
                  style={{ y: textY }}
                  className="absolute inset-x-0 top-0 flex flex-col"
                >
                  {content.map((item, index) => (
                    <div
                      key={index}
                      className="h-[75vh] flex flex-col justify-center px-16 space-y-4"
                    >
                      {/* Eyebrow */}
                      <motion.div 
                        animate={{ opacity: activeCard === index ? 1 : 0.25 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-2"
                      >
                        <div className="h-px w-6 bg-indigo-500/70" />
                        <span className="text-[10.5px] font-semibold tracking-[0.16em] text-indigo-400 uppercase">
                          Layanan {String(index + 1).padStart(2, "0")}
                        </span>
                      </motion.div>

                      {/* Title */}
                      <motion.h2 
                        animate={{ opacity: activeCard === index ? 1 : 0.25 }}
                        transition={{ duration: 0.3 }}
                        className="text-[1.75rem] font-semibold text-zinc-100 tracking-[-0.025em] leading-[1.2]"
                      >
                        {item.title}
                      </motion.h2>

                      {/* Description */}
                      <motion.p 
                        animate={{ opacity: activeCard === index ? 1 : 0.25 }}
                        transition={{ duration: 0.3 }}
                        className="text-[13.5px] text-zinc-400 leading-relaxed font-light max-w-lg"
                      >
                        {item.description}
                      </motion.p>

                      {/* Decorative rule */}
                      <motion.div 
                        animate={{ opacity: activeCard === index ? 1 : 0.25 }}
                        transition={{ duration: 0.3 }}
                        className="h-px w-10 bg-gradient-to-r from-indigo-500/60 to-transparent" 
                      />
                    </div>
                  ))}
                </motion.div>

                {/* Card counter */}
                <div className="absolute bottom-6 right-8 flex items-center gap-2 z-10">
                  <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                    {String(activeCard + 1).padStart(2, "0")}
                  </span>
                  <div className="h-px w-6 bg-zinc-800" />
                  <span className="font-mono text-[11px] text-zinc-700 tabular-nums">
                    {String(cardLength).padStart(2, "0")}
                  </span>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  )
}
