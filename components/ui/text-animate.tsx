"use client";

import { useMemo, useRef } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "motion/react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AnimationType = "text" | "word" | "character" | "line";
type AnimationVariant =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";

const motionElements = {
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  p: motion.p,
  span: motion.span,
} as const;

type MotionElementType = keyof typeof motionElements;

type TextAnimateProps = {
  children: string;
  className?: string;
  segmentClassName?: string;
  delay?: number;
  duration?: number;
  variants?: Variants;
  as?: MotionElementType;
  by?: AnimationType;
  startOnView?: boolean;
  once?: boolean;
  animation?: AnimationVariant;
  accessible?: boolean;
};

const animationVariants: Record<AnimationVariant, Variants> = {
  fadeIn: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  },
  blurIn: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    show: { opacity: 1, filter: "blur(0px)" },
  },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
    show: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  blurInDown: {
    hidden: { opacity: 0, filter: "blur(10px)", y: -20 },
    show: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    show: { opacity: 1, y: 0 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.5 },
    show: { opacity: 1, scale: 1 },
  },
  scaleDown: {
    hidden: { opacity: 0, scale: 1.4 },
    show: { opacity: 1, scale: 1 },
  },
};

function splitText(text: string, by: AnimationType) {
  if (by === "text") return [text];
  if (by === "character") return Array.from(text);
  if (by === "line") return text.split(/(\n+)/);
  return text.split(/(\s+)/);
}

export function TextAnimate({
  children,
  className,
  segmentClassName,
  delay = 0,
  duration = 0.3,
  variants,
  as: Component = "p",
  by = "word",
  startOnView = true,
  once = false,
  animation = "fadeIn",
  accessible = true,
}: TextAnimateProps) {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { amount: 0.35, once });
  const shouldReduceMotion = useReducedMotion();
  const segments = useMemo(() => splitText(children, by), [by, children]);
  const shouldAnimate = !startOnView || isInView;
  const itemVariants = variants ?? animationVariants[animation];
  const stagger = by === "character" ? 0.024 : by === "word" ? 0.055 : 0.08;
  const MotionComponent = motionElements[Component];

  if (shouldReduceMotion) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <MotionComponent ref={ref} className={className} aria-label={accessible ? children : undefined}>
      {accessible ? <span className="sr-only">{children}</span> : null}
      <motion.span
        aria-hidden={accessible ? "true" : undefined}
        className="inline-block"
        initial="hidden"
        animate={shouldAnimate ? "show" : "hidden"}
        variants={{
          hidden: {},
          show: {
            transition: {
              delayChildren: delay,
              staggerChildren: stagger,
            },
          },
        }}
      >
        {segments.map((segment, index) => {
          if (/^\s+$/.test(segment)) {
            return segment;
          }

          return (
            <motion.span
              key={`${segment}-${index}`}
              className={cn("inline-block", segmentClassName)}
              variants={itemVariants}
              transition={{ duration }}
            >
              {segment}
            </motion.span>
          );
        })}
      </motion.span>
    </MotionComponent>
  );
}
