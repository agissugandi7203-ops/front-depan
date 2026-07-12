import React, { useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode | any;
  }[];
  contentClassName?: string;
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  
  // Track scroll position of the nested container
  const { scrollYProgress } = useScroll({
    container: ref,
  });
  
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0
    );
    setActiveCard(closestBreakpointIndex);
  });

  const backgroundColors = [
    "rgb(9 9 11)", // zinc-950
    "rgb(4 4 4)", // black
    "rgb(24 24 27)", // zinc-900
  ];

  return (
    <motion.div
      animate={{
        backgroundColor: backgroundColors[activeCard % backgroundColors.length],
      }}
      className="relative w-full rounded-2xl border border-zinc-800/80 shadow-2xl bg-zinc-950 p-6 md:p-10 flex flex-col lg:flex-row justify-between items-center gap-10 transition-colors duration-500"
    >
      {/* Left Column: Scrollable text container of fixed height */}
      <div 
        ref={ref}
        className="relative w-full lg:w-1/2 h-[22rem] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        style={{ 
          scrollbarWidth: 'thin', 
          scrollSnapType: 'y mandatory',
          scrollbarColor: '#27272a transparent'
        }}
      >
        {content.map((item, index) => (
          <div 
            key={item.title + index} 
            className="h-[22rem] flex flex-col justify-center"
            style={{ scrollSnapAlign: 'start' }}
          >
            <motion.h2
              initial={{ opacity: 0.3 }}
              animate={{ opacity: activeCard === index ? 1 : 0.25 }}
              transition={{ duration: 0.3 }}
              className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight"
            >
              {item.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0.3 }}
              animate={{ opacity: activeCard === index ? 1 : 0.25 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-zinc-400 mt-5 leading-relaxed font-normal max-w-md"
            >
              {item.description}
            </motion.p>
          </div>
        ))}
      </div>

      {/* Right Column: Static preview frame */}
      <div className="hidden lg:block lg:w-1/2 h-[22rem] w-full max-w-md ml-auto shrink-0 select-none relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-emerald-500/5 rounded-2xl blur-3xl opacity-50 pointer-events-none" />
        <div
          className={cn(
            "relative h-full w-full rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl bg-zinc-950 p-0 flex items-center justify-center",
            contentClassName
          )}
        >
          {content[activeCard].content ?? null}
        </div>
      </div>
    </motion.div>
  );
};
