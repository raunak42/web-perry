"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import CommandDisplay from "@/components/ui/command-display";
import CastPlayer from "@/components/ui/cast-player";
import HeroLensingShader from "@/components/ui/hero-lensing-shader";
import PixelRevealImage from "@/components/ui/pixel-reveal-image";

const INITIAL_TERMINAL_PEEK = 46;
const TERMINAL_MIN_TOP = 48;
const TERMINAL_CENTER_DROP = 48;
const TERMINAL_RAIL_OVERLAP = 352;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function TerminalStack({ withCommand = true }: { withCommand?: boolean }) {
  return (
    <div className="w-[min(100vw-3rem,42rem)] lg:w-[42rem]">
      {withCommand ? <CommandDisplay command="npm i perry" /> : null}

      <CastPlayer
        src="/perry-session.cast"
        className={withCommand ? "mt-6" : undefined}
      />
    </div>
  );
}

const navItems = [
  { href: "#why", label: "Why" },
  { href: "#models", label: "Models" },
  { href: "#mcp", label: "MCP" },
  { href: "#subagents", label: "Subagents" },
  { href: "#resume", label: "Resume" },
];

const sections = [
  {
    id: "why",
    eyebrow: "Why Perry?",
    title: "A terminal agent that stays out of the way until you need it.",
    body: "Perry is a minimal coding agent for people who already live in the terminal. It keeps normal scrollback, keeps output copyable and selectable, and keeps the prompt available while work is still running so you can guide the session without fighting the interface.",
    points: [
      "Normal terminal flow and scrollback, not an alternate-screen app",
      "A persistent prompt and live tool traces while the agent works",
      "Readable output you can copy, inspect, and keep in your shell history",
    ],
  },
  {
    id: "control",
    eyebrow: "Controlled autonomy",
    title: "Choose how much Perry can do before it touches the repo.",
    body: "Some tasks need freedom. Others need guardrails. Perry lets you move between ask, read-only, workspace-write, and full-access modes, and it treats sensitive files differently from everyday inspection. When a task needs deliberation first, plan mode lets Perry inspect, ask focused questions, and wait for approval before starting work.",
    points: [
      "Permission modes: ask, read-only, workspace-write, full-access",
      "Sensitive files like .env, keys, and tokens get extra protection",
      "Plan mode adds an approval step before implementation begins",
    ],
  },
  {
    id: "models",
    eyebrow: "Model control",
    title:
      "Switch models for the same session instead of restarting your workflow.",
    body: "Perry lets you choose from the models available for your current provider, change reasoning level, and keep working in the same thread. If you want a faster pass, a deeper pass, or a different model entirely, use /model and continue without resetting the conversation.",
    points: [
      "Choose model and reasoning level from the TUI",
      "Save provider-specific defaults for future sessions",
      "Change the model mid-session without losing your place",
    ],
  },
  {
    id: "context",
    eyebrow: "Context engineering",
    title:
      "Load the repo's instructions, skills, and history without bloating the loop.",
    body: "Perry automatically picks up AGENTS.md or CLAUDE.md from the directory tree, can load reusable SKILL.md workflows on demand, and supports context handling plus compaction for longer sessions. The goal is simple: give the model the right context, not just more context.",
    points: [
      "Project instructions auto-load from parent directories and the current repo",
      "Skills are loaded on demand instead of stuffed into every prompt",
      "Context handling and /compact help long sessions stay usable",
    ],
  },
  {
    id: "mcp",
    eyebrow: "MCP support",
    title:
      "Bring external tools into Perry without leaving its permission model behind.",
    body: "Perry supports stdio MCP servers, loads them from local config files, initializes them at startup, and exposes their tools directly inside the same agent loop. That means you can add new capabilities while still keeping approval flow, current working directory, and session behavior consistent.",
    points: [
      "Loads MCP config from ~/.perry/mcp.json, .perry/mcp.json, and .mcp.json",
      "Exposes server tools directly to the agent once connected",
      "Routes MCP calls through Perry's existing permission system",
    ],
  },
  {
    id: "subagents",
    eyebrow: "Subagents",
    title:
      "Delegate a task to an isolated helper without losing control of the main session.",
    body: "Perry can spawn generic subagents for focused side tasks such as investigation, repo inspection, or implementation support. Subagents inherit the same working directory, permissions, plan-mode rules, and tool access, then return a concise report back to the main agent instead of forking your workflow into chaos.",
    points: [
      "Subagents run in their own model-and-tool loop",
      "They inherit cwd, permission mode, and plan-mode restrictions",
      "Subagent thinking level can be configured separately",
    ],
  },
  {
    id: "resume",
    eyebrow: "Local session history",
    title: "Stop now, continue tomorrow, and keep the thread intact.",
    body: "Perry stores local JSONL sessions per working directory so real development can survive interruptions. Continue the latest session, resume an older one, start fresh, or compact a long thread while preserving the decisions that matter.",
    points: [
      "/continue, /resume, /new, and /compact are built in",
      "Model, reasoning, and context settings can be restored with the session",
      "Sessions stay local by default instead of living in a hosted dashboard",
    ],
  },
];

function HeroNavbar() {
  const navRef = useRef<HTMLElement | null>(null);
  const [isOverLightBackground, setIsOverLightBackground] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const updateNavbarState = () => {
      const nav = navRef.current;
      const navRect = nav?.getBoundingClientRect();
      if (!nav || !navRect) return;

      const sampleXs = [0.18, 0.34, 0.5, 0.66, 0.82].map(
        (ratio) => navRect.left + navRect.width * ratio,
      );

      const countLightHits = (sampleY: number) =>
        sampleXs.reduce((count, sampleX) => {
          const surface = document
            .elementsFromPoint(sampleX, sampleY)
            .find(
              (element) =>
                element instanceof HTMLElement && !nav.contains(element),
            )
            ?.closest<HTMLElement>("[data-nav-surface]")?.dataset.navSurface;

          return count + (surface === "light" ? 1 : 0);
        }, 0);

      const navLightHits = countLightHits(navRect.top + navRect.height / 2);
      const viewportLightHits = countLightHits(window.innerHeight * 0.42);

      setIsOverLightBackground(navLightHits >= 3 || viewportLightHits >= 3);
      setScrollOffset(Math.min(window.scrollY, 18));
    };

    const onChange = () => {
      window.requestAnimationFrame(updateNavbarState);
    };

    updateNavbarState();
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);

    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[36px] z-40 hidden justify-center lg:flex">
      <nav
        ref={navRef}
        className={[
          "pointer-events-auto flex items-center gap-[5px] rounded-[15px] p-[7px] text-[12px] shadow-[0_8px_22px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-colors",
          isOverLightBackground
            ? "border border-[#dbe3ec] bg-white/78 text-[#0f172a]"
            : "border border-white/30 bg-white/12 text-white",
        ].join(" ")}
        style={{ transform: `translateY(${-scrollOffset}px)` }}
      >
        <a
          href="#top"
          className={[
            "rounded-[12px] px-[13px] py-[7px] font-medium tracking-[-0.02em] transition",
            isOverLightBackground
              ? "bg-black/[0.035] text-[#0f172a] hover:bg-black/[0.05]"
              : "bg-white/14 text-white/95 hover:bg-white/20",
          ].join(" ")}
        >
          Perry
        </a>

        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={[
              "rounded-[12px] px-[13px] py-[7px] font-medium tracking-[-0.02em] transition",
              isOverLightBackground
                ? "text-[#64748b] hover:bg-black/[0.04] hover:text-[#0f172a]"
                : "text-white/84 hover:bg-white/12 hover:text-white",
            ].join(" ")}
          >
            {item.label}
          </a>
        ))}

        <a
          href="#install"
          className={[
            "ml-1 rounded-[12px] px-[15px] py-[7px] font-medium tracking-[-0.02em] transition",
            isOverLightBackground
              ? "bg-[#0f172a] text-white hover:bg-black"
              : "bg-[#0f172a]/90 text-white hover:bg-[#0f172a]",
          ].join(" ")}
        >
          Get Perry
        </a>
      </nav>
    </div>
  );
}

function StoryCard({
  id,
  eyebrow,
  title,
  body,
  points,
  isActive,
  eyebrowRef,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points?: string[];
  isActive: boolean;
  eyebrowRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <section id={id} className="flex min-h-[78vh] scroll-mt-28 items-center">
      <div
        className={[
          "w-full transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-35",
        ].join(" ")}
      >
        <div
          ref={eyebrowRef}
          className="mb-5 text-[12px] font-medium tracking-[0.16em] text-[#64748b] uppercase"
        >
          {eyebrow}
        </div>
        <h2
          className={[
            "max-w-[13ch] text-5xl text-[#09111f] leading-[1.3] tracking-[-0.05em]",
          ].join(" ")}
        >
          {title}
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[#475569]">{body}</p>

        {points?.length ? (
          <ul className="mt-7 space-y-3 text-[15px] leading-6 text-[#334155]">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[#0f172a]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function HowPerryWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-36 pt-20 lg:px-10 lg:pb-56 lg:pt-28">
      <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20 xl:gap-24">
        <div className="flex justify-center">
          <div className="relative w-full max-w-[28rem] overflow-hidden xl:max-w-[30rem]">
            <PixelRevealImage
              src="/perry-how-it-works.png"
              alt="Pixel-art platypus standing among sunflowers under a bright blue sky"
              columns={40}
              rows={40}
              maxDelayMs={3000}
              tileDurationMs={520}
              initialVisibleFraction={0.2}
              sizes="(max-width: 1279px) 28rem, 30rem"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="max-w-[35rem] text-left">
            <div className="mb-5 text-[10px] font-medium tracking-[0.18em] text-[#64748b] uppercase">
              How Perry works
            </div>
            <p className="max-w-[31rem] text-[14px] leading-6 text-[#475569]">
              Start with a request. Perry reads the repo, makes precise changes,
              and runs the right commands in the same terminal loop.
            </p>
            <h2 className="mt-10 max-w-[17ch] text-[2.15rem] leading-[1.32] tracking-[-0.002em] text-[#09111f] xl:text-[2.45rem]">
              From prompt to patch, Perry stays close to the work.
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}

const perryAutomationExamples = [
  "bug hunts",
  "precise patches",
  "repo spelunking",
  "MCP workflows",
];

function PerryAutomationTypedExamples() {
  const [displayedText, setDisplayedText] = useState("");
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const activeExample = perryAutomationExamples[activeExampleIndex] ?? "";
    let timeoutId: number;

    if (!isDeleting && displayedText.length < activeExample.length) {
      timeoutId = window.setTimeout(() => {
        setDisplayedText(activeExample.slice(0, displayedText.length + 1));
      }, 58);
    } else if (!isDeleting) {
      timeoutId = window.setTimeout(() => setIsDeleting(true), 1350);
    } else if (displayedText.length > 0) {
      timeoutId = window.setTimeout(() => {
        setDisplayedText(activeExample.slice(0, displayedText.length - 1));
      }, 28);
    } else {
      timeoutId = window.setTimeout(() => {
        setIsDeleting(false);
        setActiveExampleIndex(
          (currentIndex) => (currentIndex + 1) % perryAutomationExamples.length,
        );
      }, 180);
    }

    return () => window.clearTimeout(timeoutId);
  }, [activeExampleIndex, displayedText, isDeleting, prefersReducedMotion]);

  const visibleText = prefersReducedMotion
    ? (perryAutomationExamples[0] ?? "")
    : displayedText;

  return (
    <>
      <span className="sr-only">{perryAutomationExamples.join(", ")}</span>
      <span
        aria-hidden="true"
        className="inline-flex min-w-[14ch] items-baseline"
      >
        <span className="inline-block min-h-[1em]">
          {" "}
          {visibleText ? `${visibleText}.` : "\u00a0"}
        </span>
      </span>
    </>
  );
}

function PerryAutomationSection() {
  return (
    <section
      className="px-6 pb-28 pt-4 lg:px-10 lg:pb-44"
      data-nav-surface="hero"
    >
      <div className="relative min-h-[52rem] overflow-hidden rounded-[30px] border border-[#dbe3ec] text-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:min-h-[56rem] lg:min-h-0 lg:aspect-[16/9]">
        <div className="absolute inset-0 overflow-hidden">
          <HeroLensingShader
            src="/perry-meadow-terminal.png"
            imageWidth={1672}
            imageHeight={941}
            lensScale={1.5}
            className="h-full w-full"
          />
        </div>

        <div className="relative z-10 flex h-full flex-col px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16">
          <div className="relative mt-10 grid flex-1 lg:grid-cols-[minmax(0,36rem)_1fr]">
            <div className="max-w-[36rem]  pt-6">
              <h2 className="mt-7 w-[28ch] leading-[1.32] tracking-[-0.03em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18),0_0_12px_rgba(255,255,255,0.96),0_0_28px_rgba(255,255,255,0.9),0_0_52px_rgba(255,255,255,0.62)] text-[2.35rem]">
                Perry helps you automate terminal work with natural language
              </h2>
              <p className="mt-4 max-w-[36rem] text-sm leading-7 text-white [text-shadow:0_1px_10px_rgba(15,23,42,0.14)] sm:text-[15px] lg:text-base">
                Perry can help you with things like{" "}
                <PerryAutomationTypedExamples />
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#install"
                  className="inline-flex items-center gap-2 rounded-[8px] bg-white/10 px-5 py-2 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl transition hover:bg-white/14"
                >
                  <span>Get Perry</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/16">
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        d="M5 10h10M11 6l4 4-4 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </a>
              </div>
            </div>

            <div className="hidden lg:block" />
          </div>
        </div>

        <div className="absolute right-8 bottom-8 z-20 hidden max-w-[34rem] overflow-hidden rounded-[20px] border border-white/22 bg-white/10 text-white shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:block xl:right-10 xl:bottom-10">
          {/* <div className="pointer-events-none absolute inset-y-4 left-[62%] w-20 rounded-full bg-white/14 blur-xl" /> */}
          <div className="relative px-7 py-5">
            <h3 className="max-w-[15ch] text-[2rem] leading-[1.24] tracking-[-0.03em] text-white">
              Perry stays close to the repo.
            </h3>
            <p className="mt-4 max-w-[26rem] text-[14px] leading-6 text-white/90">
              Read the code, make a patch, run the command, inspect the output,
              and keep the whole loop in one place.
            </p>
            <a
              href="#why"
              className="mt-6 inline-flex items-center gap-2 text-[14px] text-white/95 underline decoration-white/55 underline-offset-4 transition hover:text-white"
            >
              <span>See why</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/12">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
                  <path
                    d="M5 10h10M11 6l4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function PerryClosingSection() {
  return (
    <section
      className="relative h-[190svh] lg:h-[168svh]"
      aria-label="Perry closing reveal"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden" data-nav-surface="hero">
        <Image
          src="/perry-outro-window.png"
          alt="Retro computer on a desk overlooking a bright coastal town through an open window"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="absolute inset-x-0 top-0 z-10 bg-white" data-nav-surface="light">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[21px]">
          <div className="absolute inset-x-0 bottom-[16px] h-[5px] bg-[#d7f5f8]" />
          <div className="absolute inset-x-0 bottom-[8px] h-[5px] bg-[#b5eaf0]" />
          <div className="absolute inset-x-0 bottom-0 h-[5px] bg-[#8edee4]" />
        </div>

        <div className="mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-between px-6 pb-24 pt-8 lg:px-10 lg:pb-28 lg:pt-6">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center text-[#0f172a]">
              <Image
                src="/perry-closing-icon.png"
                alt="Perry icon"
                width={42}
                height={42}
                className="object-contain"
              />
            </div>

            <h2 className="mt-8 max-w-[30ch] text-[2.3rem] leading-[1.42] tracking-[-0.02em] text-[#09111f] sm:text-[2.6rem]">
              We&apos;re building a terminal agent for people who&apos;d rather stay in the shell.
            </h2>

            <p className="mt-8 text-[15px] leading-7 text-[#475569] sm:text-base">
              If that sounds like your workflow,{" "}
              <a
                href="#install"
                className="inline-flex items-center gap-2 text-[#09111f] underline decoration-[#cbd5e1] underline-offset-4 transition hover:decoration-[#0f172a]"
              >
                <span>try Perry</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe3ec] text-[#09111f]">
                  <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
                    <path
                      d="M5 10h10M11 6l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </a>
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-5 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[14px] text-[#334155] lg:justify-start">
              <a href="#top" className="transition hover:text-[#09111f]">
                Home
              </a>
              <a href="#why" className="transition hover:text-[#09111f]">
                Why
              </a>
              <a href="#models" className="transition hover:text-[#09111f]">
                Models
              </a>
              <a href="#mcp" className="transition hover:text-[#09111f]">
                MCP
              </a>
              <a href="#resume" className="transition hover:text-[#09111f]">
                Resume
              </a>
            </div>

            <div className="flex items-center justify-center gap-3 lg:justify-end">
              <a
                href="#install"
                className="inline-flex items-center gap-3 rounded-[12px] border border-[#dbe3ec] bg-white px-5 py-3 text-[15px] text-[#09111f] shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:bg-[#f8fbff]"
              >
                <span>Install Perry</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe3ec]">
                  <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
                    <path
                      d="M5 10h10M11 6l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileLayout({ activeSectionId }: { activeSectionId: string }) {
  return (
    <div className="bg-white lg:hidden">
      <div className="p-[18px]">
        <section className="relative flex w-full items-start justify-center overflow-x-hidden rounded-[24px]">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.82)_100%)]" />

          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-24 text-center">
            <h1 className="text-[42px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18),0_0_12px_rgba(255,255,255,0.96),0_0_28px_rgba(255,255,255,0.9),0_0_52px_rgba(255,255,255,0.62)]">
              The Terminal Agent <br /> Built for Simplicity
            </h1>
            <p className="mt-4 max-w-[34rem] text-sm leading-6 text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.18)] sm:text-base">
              Perry is a minimal agent harness. Adapt Perry to your workflows,
              not the other way around.
            </p>

            <div className="mt-6 flex justify-center">
              <TerminalStack />
            </div>
          </div>

          <HeroLensingShader
            src="/her-new.png"
            imageWidth={1672}
            imageHeight={941}
            className="w-[150%]"
          />
        </section>
      </div>

      <div className="mx-auto max-w-2xl space-y-16 px-6 pb-24 pt-20 text-left">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-28">
            <div
              className={[
                "transition-opacity duration-300",
                activeSectionId === section.id ? "opacity-100" : "opacity-35",
              ].join(" ")}
            >
              <div className="mb-4 text-[12px] font-medium tracking-[0.16em] text-[#64748b] uppercase">
                {section.eyebrow}
              </div>
              <h2 className="max-w-[14ch] text-3xl leading-tight tracking-[-0.04em] text-[#09111f]">
                {section.title}
              </h2>
              <p className="mt-5 text-base leading-7 text-[#475569]">
                {section.body}
              </p>

              {section.points?.length ? (
                <ul className="mt-6 space-y-3 text-sm leading-6 text-[#334155]">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[#0f172a]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <section className="px-6 pb-28 pt-10">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto max-w-[24rem] overflow-hidden">
            <PixelRevealImage
              src="/perry-how-it-works.png"
              alt="Pixel-art platypus standing among sunflowers under a bright blue sky"
              columns={36}
              rows={36}
              maxDelayMs={2800}
              tileDurationMs={500}
              initialVisibleFraction={0.2}
              sizes="24rem"
            />
          </div>

          <div className="mx-auto mt-10 max-w-[28rem] text-left">
            <div className="mb-4 text-[10px] font-medium tracking-[0.18em] text-[#64748b] uppercase">
              How Perry works
            </div>
            <p className="text-[13px] leading-6 text-[#475569]">
              Start with a request. Perry reads the repo, makes precise changes,
              and runs the right commands in the same terminal loop.
            </p>
            <h2 className="mt-8 max-w-[15ch] text-[1.95rem] leading-[1.02] tracking-[-0.05em] text-[#09111f]">
              From prompt to patch, Perry stays close to the work.
            </h2>
          </div>
        </div>
      </section>

      <PerryAutomationSection />
      <PerryClosingSection />
    </div>
  );
}

export default function HeroScrollShowcase() {
  const terminalRailRef = useRef<HTMLDivElement | null>(null);
  const terminalSpacerRef = useRef<HTMLDivElement | null>(null);
  const terminalStickyRef = useRef<HTMLDivElement | null>(null);
  const terminalMotionRef = useRef<HTMLDivElement | null>(null);
  const storySectionsRef = useRef<HTMLDivElement | null>(null);
  const releaseEyebrowRef = useRef<HTMLDivElement | null>(null);

  const motionStateRef = useRef({
    stickyTop: 0,
    spacerHeight: 0,
    startX: 0,
    pinScrollY: 1,
    ready: false,
  });

  const frameRef = useRef<number | null>(null);

  const [desktop, setDesktop] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const updateDesktop = () => setDesktop(window.innerWidth >= 1024);
    updateDesktop();
    window.addEventListener("resize", updateDesktop);
    return () => window.removeEventListener("resize", updateDesktop);
  }, []);

  useEffect(() => {
    const updateActiveSection = () => {
      const sampleY = window.innerHeight * 0.45;

      const closestSection = sections
        .map((section) => {
          const element = document.getElementById(section.id);
          if (!element) return null;

          const rect = element.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;

          return {
            id: section.id,
            distance: Math.abs(centerY - sampleY),
          };
        })
        .filter(
          (section): section is { id: string; distance: number } => !!section,
        )
        .sort((left, right) => left.distance - right.distance)[0];

      if (closestSection) {
        setActiveSectionId((current) =>
          current === closestSection.id ? current : closestSection.id,
        );
      }
    };

    const onChange = () => {
      window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);

    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [desktop]);

  const applyTerminalMotion = () => {
    const terminal = terminalMotionRef.current;
    const state = motionStateRef.current;
    if (!terminal || !state.ready) return;

    const progress = clamp(window.scrollY / state.pinScrollY, 0, 1);
    const x = state.startX * (1 - progress);

    terminal.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  useLayoutEffect(() => {
    if (!desktop) return;

    const measure = () => {
      const railElement = terminalRailRef.current;
      const spacer = terminalSpacerRef.current;
      const sticky = terminalStickyRef.current;
      const terminal = terminalMotionRef.current;

      if (!railElement || !spacer || !sticky || !terminal) return;

      railElement.style.marginTop = `-${TERMINAL_RAIL_OVERLAP}px`;

      const startTop = window.innerHeight - INITIAL_TERMINAL_PEEK;
      const baseRailPageTop =
        railElement.getBoundingClientRect().top + window.scrollY;
      const extraLift = Math.max(0, baseRailPageTop - startTop);

      railElement.style.marginTop = `-${TERMINAL_RAIL_OVERLAP + extraLift}px`;

      const rail = railElement.getBoundingClientRect();
      const previousTransform = terminal.style.transform;
      terminal.style.transform = "none";
      const terminalRect = terminal.getBoundingClientRect();
      terminal.style.transform = previousTransform;

      const stickyTop = Math.max(
        TERMINAL_MIN_TOP,
        (window.innerHeight - terminalRect.height) / 2 + TERMINAL_CENTER_DROP,
      );
      sticky.style.top = `${stickyTop}px`;

      const railPageTop = rail.top + window.scrollY;
      const spacerHeight = Math.max(0, startTop - railPageTop);
      spacer.style.height = `${spacerHeight}px`;

      const railLeft = terminalRect.left;
      const centeredLeft = (window.innerWidth - terminalRect.width) / 2;
      const startX = centeredLeft - railLeft;
      const pinScrollY = Math.max(1, startTop - stickyTop);

      motionStateRef.current = {
        stickyTop,
        spacerHeight,
        startX,
        pinScrollY,
        ready: true,
      };

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = window.requestAnimationFrame(applyTerminalMotion);
    };

    const onResize = () => measure();
    const resizeObserver = new ResizeObserver(() => measure());

    if (terminalRailRef.current)
      resizeObserver.observe(terminalRailRef.current);
    if (terminalStickyRef.current)
      resizeObserver.observe(terminalStickyRef.current);
    if (terminalMotionRef.current)
      resizeObserver.observe(terminalMotionRef.current);

    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", onResize);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;

    const onScroll = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = window.requestAnimationFrame(applyTerminalMotion);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [desktop]);

  if (!desktop) {
    return <MobileLayout activeSectionId={activeSectionId} />;
  }

  return (
    <div className="hidden bg-white lg:block" data-nav-surface="light">
      <div className="p-[18px]">
        <section
          id="top"
          data-nav-surface="hero"
          className="relative flex w-full items-start justify-center overflow-x-hidden rounded-[24px]"
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_42%,rgba(255,255,255,0.88)_100%)]" />
          <HeroNavbar />

          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-24 text-center">
            <h1 className="text-[42px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18),0_0_12px_rgba(255,255,255,0.96),0_0_28px_rgba(255,255,255,0.9),0_0_52px_rgba(255,255,255,0.62)]">
              The Terminal Agent <br /> Built for Simplicity
            </h1>
            <p className="mt-4 max-w-[36rem] text-base leading-7 text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.18)]">
              Perry is a minimal agent harness. Adapt Perry to your workflows,
              not the other way around.
            </p>

            <div
              id="install"
              data-nav-surface="light"
              className="w-[42rem] max-w-[calc(100vw-3rem)]"
            >
              <CommandDisplay command="npm i perry" />
            </div>
          </div>

          <HeroLensingShader
            src="/her-new.png"
            imageWidth={1672}
            imageHeight={941}
            className="w-[150%]"
          />
        </section>
      </div>

      <section
        className="mx-auto max-w-7xl px-6 pb-32 pt-24 lg:px-10"
        data-nav-surface="light"
      >
        <div className="grid grid-cols-[42rem_minmax(0,1fr)] gap-16">
          <div ref={terminalRailRef} className="relative min-w-0">
            <div ref={terminalSpacerRef} aria-hidden className="h-0" />

            <div ref={terminalStickyRef} className="sticky">
              <div
                ref={terminalMotionRef}
                className="[will-change:transform]"
                style={{ transform: "translate3d(0,0,0)" }}
              >
                <TerminalStack withCommand={false} />
              </div>
            </div>
          </div>

          <div ref={storySectionsRef} className="space-y-28 text-left">
            {sections.map((section, index) => (
              <StoryCard
                key={section.id}
                {...section}
                isActive={activeSectionId === section.id}
                eyebrowRef={
                  index === sections.length - 1 ? releaseEyebrowRef : undefined
                }
              />
            ))}
          </div>
        </div>
      </section>

      <HowPerryWorksSection />
      <PerryAutomationSection />
      <PerryClosingSection />
    </div>
  );
}
