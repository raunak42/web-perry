"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ElementType,
} from "react";
import {
  useAnimate,
  type AnimationOptions,
  type ValueAnimationTransition,
} from "motion/react";

type StaggerFrom = "first" | "last" | "center" | number | "random";
type RotateDirection = "top" | "right" | "bottom" | "left";

type Text3DFlipProps = {
  children: React.ReactNode;
  as?: ElementType;
  className?: string;
  textClassName?: string;
  flipTextClassName?: string;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  transition?: ValueAnimationTransition | AnimationOptions;
  rotateDirection?: RotateDirection;
};

type CharBoxProps = {
  char: string;
  textClassName?: string;
  flipTextClassName?: string;
  rotateDirection: RotateDirection;
};

const HAS_SEGMENTER = typeof Intl !== "undefined" && "Segmenter" in Intl;

const ROTATION_MAP = {
  top: "rotateX(90deg)",
  right: "rotateY(90deg)",
  bottom: "rotateX(-90deg)",
  left: "rotateY(-90deg)",
} as const;

const SECOND_FACE_TRANSFORMS = {
  top: "rotateX(-90deg) translateZ(0.5lh)",
  right:
    "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)",
  bottom: "rotateX(90deg) translateZ(0.5lh)",
  left:
    "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(50%) rotateY(-90deg) translateX(50%)",
} as const;

const FRONT_FACE_TRANSFORMS = {
  top: "translateZ(0.5lh)",
  bottom: "translateZ(0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
  right: "rotateY(-90deg) translateX(50%) rotateY(90deg)",
} as const;

const CONTAINER_TRANSFORMS = {
  top: "translateZ(-0.5lh)",
  bottom: "translateZ(-0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
} as const;

const DEFAULT_TRANSITION: ValueAnimationTransition = {
  type: "spring",
  damping: 30,
  stiffness: 300,
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function splitIntoCharacters(text: string) {
  if (HAS_SEGMENTER) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }

  return Array.from(text);
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (children == null) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);

  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join("");
  }

  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    if (props.children != null) {
      return extractTextFromChildren(props.children);
    }
  }

  return "";
}

const CharBox = memo(function CharBox({
  char,
  textClassName,
  flipTextClassName,
  rotateDirection,
}: CharBoxProps) {
  return (
    <span
      className="text-3d-flip-char inline [transform-style:preserve-3d]"
      style={{ transform: CONTAINER_TRANSFORMS[rotateDirection] }}
    >
      <span
        className={cn(
          "relative inline-block h-[1lh] [backface-visibility:hidden]",
          textClassName,
        )}
        style={{ transform: FRONT_FACE_TRANSFORMS[rotateDirection] }}
      >
        {char}
      </span>
      <span
        className={cn(
          "absolute top-0 left-0 inline-block h-[1lh] [backface-visibility:hidden]",
          flipTextClassName,
        )}
        style={{ transform: SECOND_FACE_TRANSFORMS[rotateDirection] }}
      >
        {char}
      </span>
    </span>
  );
});

export default function Text3DFlip({
  children,
  as: ElementTag = "p",
  className,
  textClassName,
  flipTextClassName,
  staggerDuration = 0.05,
  staggerFrom = "first",
  transition = DEFAULT_TRANSITION,
  rotateDirection = "right",
  ...props
}: Text3DFlipProps) {
  const isAnimatingRef = useRef(false);
  const isMountedRef = useRef(false);
  const [scope, animate] = useAnimate();

  const rotationTransform = ROTATION_MAP[rotateDirection];

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      isAnimatingRef.current = false;
    };
  }, []);

  const text = useMemo(() => {
    try {
      return extractTextFromChildren(children);
    } catch {
      return "";
    }
  }, [children]);

  const characters = useMemo(() => {
    const words = text.split(" ");

    return words.map((word, index) => ({
      characters: splitIntoCharacters(word),
      needsSpace: index !== words.length - 1,
    }));
  }, [text]);

  const charOffsets = useMemo(() => {
    const offsets = [0];

    for (const word of characters) {
      offsets.push(offsets.at(-1)! + word.characters.length);
    }

    return offsets;
  }, [characters]);

  const getStaggerDelay = useCallback(
    (index: number, totalChars: number) => {
      if (staggerFrom === "first") return index * staggerDuration;
      if (staggerFrom === "last") {
        return (totalChars - 1 - index) * staggerDuration;
      }
      if (staggerFrom === "center") {
        const center = Math.floor(totalChars / 2);
        return Math.abs(center - index) * staggerDuration;
      }
      if (staggerFrom === "random") {
        const randomIndex = Math.floor(Math.random() * totalChars);
        return Math.abs(randomIndex - index) * staggerDuration;
      }

      return Math.abs(staggerFrom - index) * staggerDuration;
    },
    [staggerDuration, staggerFrom],
  );

  const handleHoverStart = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    try {
      const totalChars = characters.reduce(
        (sum, word) => sum + word.characters.length,
        0,
      );

      const delays = Array.from({ length: totalChars }, (_, index) =>
        getStaggerDelay(index, totalChars),
      );

      await animate(
        ".text-3d-flip-char",
        { transform: rotationTransform },
        {
          ...transition,
          delay: (index: number) => delays[index],
        },
      );

      if (!isMountedRef.current) return;

      await animate(
        ".text-3d-flip-char",
        { transform: "rotateX(0deg) rotateY(0deg)" },
        { duration: 0 },
      );
    } finally {
      if (isMountedRef.current) {
        isAnimatingRef.current = false;
      }
    }
  }, [animate, characters, getStaggerDelay, rotationTransform, transition]);

  return (
    <ElementTag
      ref={scope}
      onMouseEnter={handleHoverStart}
      className={cn("relative flex flex-wrap", className)}
      {...props}
    >
      <span className="sr-only">{text}</span>

      {characters.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-flex">
          {word.characters.map((char, charIndex) => (
            <CharBox
              key={charOffsets[wordIndex] + charIndex}
              char={char}
              textClassName={textClassName}
              flipTextClassName={flipTextClassName}
              rotateDirection={rotateDirection}
            />
          ))}
          {word.needsSpace ? <span className="whitespace-pre"> </span> : null}
        </span>
      ))}
    </ElementTag>
  );
}
