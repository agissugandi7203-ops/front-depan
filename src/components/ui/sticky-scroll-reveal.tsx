import React, { useRef } from "react";
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
  const [activeCard, setActiveCard] = React.useState(0);
  const containerRef = useRef<any>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
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
      ref={containerRef}
      animate={{
        backgroundColor: backgroundColors[activeCard % backgroundColors.length],
      }}
      className="relative w-full transition-colors duration-500 py-16"
    >
      <div className="max-w-5xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row justify-between items-start gap-12">
        {/* Left Column: Scrolling text contents */}
        <div className="relative w-full lg:w-1/2 flex flex-col">
          {content.map((item, index) => (
            <div 
              key={item.title + index} 
              className="min-h-[75vh] flex flex-col justify-center py-10"
            >
              <motion.h2
                initial={{ opacity: 0.3 }}
                animate={{ opacity: activeCard === index ? 1 : 0.25 }}
                transition={{ duration: 0.3 }}
                className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight"
              >
                {item.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0.3 }}
                animate={{ opacity: activeCard === index ? 1 : 0.25 }}
                transition={{ duration: 0.3 }}
                className="text-sm md:text-[14.5px] text-zinc-400 mt-6 leading-relaxed font-normal max-w-md"
              >
                {item.description}
              </motion.p>
            </div>
          ))}
        </div>

        {/* Right Column: Sticky preview frame */}
        <div className="hidden lg:block lg:w-1/2 sticky top-36 h-[24rem] w-full max-w-md ml-auto shrink-0 select-none">
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
      </div>
    </motion.div>
  );
};
