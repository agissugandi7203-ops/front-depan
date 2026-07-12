import * as React from "react"
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
 
export interface MagicTextProps {
  text: string;
}
 
interface WordProps {
  children: string;
  progress: any;
  range: number[];
}
 
const Word: React.FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
 
  return (
    <span className="relative mt-[4px] mr-2 text-2xl md:text-3xl font-semibold">
      <span className="absolute opacity-10 text-zinc-500">{children}</span>
      <motion.span style={{ opacity: opacity }} className="text-zinc-150">{children}</motion.span>
    </span>
  );
};
 
export const MagicText: React.FC<MagicTextProps> = ({ text }) => {
  const container = useRef(null);
 
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 0.9", "start 0.25"],
  });
  
  const words = text.split(" ");
 
  return (
    <p ref={container} className="flex flex-wrap leading-relaxed py-1 px-0 max-w-4xl mx-auto">
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
 
        return (
          <Word key={i} progress={scrollYProgress} range={[start, end]}>
            {word}
          </Word>
        );
      })}
    </p>
  );
};
