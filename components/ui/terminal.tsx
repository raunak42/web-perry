"use client";

import {
  Children,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefAttributes,
} from "react";
import {
  motion,
  useInView,
  type DOMMotionComponents,
  type HTMLMotionProps,
} from "motion/react";
import type { MotionProps } from "motion/react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const motionElements = {
  article: motion.article,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  li: motion.li,
  p: motion.p,
  section: motion.section,
  span: motion.span,
} as const;

type MotionElementType = Extract<
  keyof DOMMotionComponents,
  keyof typeof motionElements
>;

type TerminalTypingMotionComponent = ComponentType<
  Omit<HTMLMotionProps<"span">, "ref"> & RefAttributes<HTMLElement>
>;

interface SequenceContextValue {
  completeItem: (index: number) => void;
  activeIndex: number;
  sequenceStarted: boolean;
}

const SequenceContext = createContext<SequenceContextValue | null>(null);
const ItemIndexContext = createContext<number | null>(null);

function useSequence() {
  return useContext(SequenceContext);
}

function useItemIndex() {
  return useContext(ItemIndexContext);
}

interface AnimatedSpanProps extends MotionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  startOnView?: boolean;
}

export function AnimatedSpan({
  children,
  delay = 0,
  className,
  startOnView = false,
  ...props
}: AnimatedSpanProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(elementRef, {
    amount: 0.3,
    once: true,
  });

  const sequence = useSequence();
  const itemIndex = useItemIndex();
  const hasSequence = sequence !== null;
  const sequenceStarted = sequence?.sequenceStarted ?? false;
  const sequenceActiveIndex = sequence?.activeIndex ?? null;
  const sequenceCompleteItemRef = useRef<SequenceContextValue["completeItem"] | null>(
    null,
  );
  const sequenceItemIndexRef = useRef<number | null>(null);

  useEffect(() => {
    sequenceCompleteItemRef.current = sequence?.completeItem ?? null;
    sequenceItemIndexRef.current = itemIndex;
  }, [sequence?.completeItem, itemIndex]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (hasSequence && itemIndex !== null) {
      if (sequenceStarted && sequenceActiveIndex === itemIndex) {
        timeoutId = setTimeout(() => setIsVisible(true), delay);
      }
    } else if (!startOnView || isInView) {
      timeoutId = setTimeout(() => setIsVisible(true), delay);
    }

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    delay,
    hasSequence,
    isInView,
    itemIndex,
    sequenceActiveIndex,
    sequenceStarted,
    startOnView,
  ]);

  return (
    <motion.span
      ref={elementRef}
      initial={{ opacity: 0, y: 10 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={() => {
        const completeItem = sequenceCompleteItemRef.current;
        const currentItemIndex = sequenceItemIndexRef.current;

        if (isVisible && completeItem && currentItemIndex !== null) {
          completeItem(currentItemIndex);
        }
      }}
      className={cn("text-sm font-normal tracking-tight", className)}
      {...props}
    >
      {children}
    </motion.span>
  );
}

interface TypingAnimationProps extends Omit<MotionProps, "children"> {
  children: string;
  className?: string;
  duration?: number;
  delay?: number;
  as?: MotionElementType;
  startOnView?: boolean;
}

export function TypingAnimation({
  children,
  className,
  duration = 60,
  delay = 0,
  as: Component = "span",
  startOnView = true,
  ...props
}: TypingAnimationProps) {
  if (typeof children !== "string") {
    throw new Error("TypingAnimation: children must be a string.");
  }

  const MotionComponent = motionElements[
    Component
  ] as TerminalTypingMotionComponent;

  const [displayedText, setDisplayedText] = useState("");
  const elementRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(elementRef, {
    amount: 0.3,
    once: true,
  });

  const sequence = useSequence();
  const itemIndex = useItemIndex();
  const hasSequence = sequence !== null;
  const sequenceStarted = sequence?.sequenceStarted ?? false;
  const sequenceActiveIndex = sequence?.activeIndex ?? null;
  const sequenceCompleteItemRef = useRef<SequenceContextValue["completeItem"] | null>(
    null,
  );
  const sequenceItemIndexRef = useRef<number | null>(null);

  useEffect(() => {
    sequenceCompleteItemRef.current = sequence?.completeItem ?? null;
    sequenceItemIndexRef.current = itemIndex;
  }, [sequence?.completeItem, itemIndex]);

  const shouldStart = hasSequence
    ? itemIndex !== null && sequenceStarted && sequenceActiveIndex === itemIndex
    : !startOnView || isInView;

  useEffect(() => {
    let startDelayTimeout: ReturnType<typeof setTimeout> | null = null;
    let typingEffect: ReturnType<typeof setInterval> | null = null;

    if (shouldStart) {
      startDelayTimeout = setTimeout(() => {
        let i = 0;
        typingEffect = setInterval(() => {
          if (i < children.length) {
            setDisplayedText(children.substring(0, i + 1));
            i += 1;
          } else {
            if (typingEffect !== null) {
              clearInterval(typingEffect);
            }
            const completeItem = sequenceCompleteItemRef.current;
            const currentItemIndex = sequenceItemIndexRef.current;
            if (completeItem && currentItemIndex !== null) {
              completeItem(currentItemIndex);
            }
          }
        }, duration);
      }, delay);
    }

    return () => {
      if (startDelayTimeout !== null) {
        clearTimeout(startDelayTimeout);
      }
      if (typingEffect !== null) {
        clearInterval(typingEffect);
      }
    };
  }, [children, delay, duration, shouldStart]);

  return (
    <MotionComponent
      ref={elementRef}
      className={cn("text-sm font-normal tracking-tight", className)}
      {...props}
    >
      {displayedText}
    </MotionComponent>
  );
}

interface TerminalProps {
  children: ReactNode;
  className?: string;
  sequence?: boolean;
  startOnView?: boolean;
}

export function Terminal({
  children,
  className,
  sequence = true,
  startOnView = true,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, {
    amount: 0.3,
    once: true,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const sequenceHasStarted = sequence ? !startOnView || isInView : false;

  const contextValue = useMemo<SequenceContextValue | null>(() => {
    if (!sequence) return null;

    return {
      completeItem: (index: number) => {
        setActiveIndex((current) => (index === current ? current + 1 : current));
      },
      activeIndex,
      sequenceStarted: sequenceHasStarted,
    };
  }, [activeIndex, sequence, sequenceHasStarted]);

  const wrappedChildren = useMemo(() => {
    if (!sequence) return children;

    return Children.toArray(children).map((child, index) => (
      <ItemIndexContext.Provider key={index} value={index}>
        {child as ReactNode}
      </ItemIndexContext.Provider>
    ));
  }, [children, sequence]);

  const content = (
    <div
      ref={containerRef}
      className={cn(
        "z-0 flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/85 bg-white/90 text-[#0f172a] shadow-[0_24px_80px_rgba(255,255,255,0.44),0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-x-2 border-b border-[#e6eef5] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,253,0.88))] px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-2 text-xs text-[#64748b]">perry — terminal</span>
      </div>

      <pre className="flex-1 overflow-auto p-4 font-mono text-sm leading-6 whitespace-pre-wrap">
        <code className="grid gap-y-1">{wrappedChildren}</code>
      </pre>
    </div>
  );

  if (!sequence) return content;

  return (
    <SequenceContext.Provider value={contextValue}>
      {content}
    </SequenceContext.Provider>
  );
}
