"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import CommandDisplay from "@/components/ui/command-display";
import CastPlayer from "@/components/ui/cast-player";
import HeroLensingShader from "@/components/ui/hero-lensing-shader";
import PixelRevealImage from "@/components/ui/pixel-reveal-image";
import Text3DFlip from "@/components/ui/text-3d-flip";

const DEFAULT_CAST_SOURCE = "/what_is_perry.cast";
const SCROLL_TITLE = "SCROLL TO CONTINUE";
const INITIAL_TERMINAL_PEEK = 46;
const TERMINAL_MIN_TOP = 48;
const TERMINAL_CENTER_DROP = 48;
const TERMINAL_RAIL_OVERLAP = 352;
const TERMINAL_FINAL_LEFT_SHIFT = 48;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function TerminalStack({
  withCommand = true,
  title,
  description,
  src = DEFAULT_CAST_SOURCE,
  preloadSources,
  sourceStartTimes,
}: {
  withCommand?: boolean;
  title?: string;
  description?: string[];
  src?: string;
  preloadSources?: string[];
  sourceStartTimes?: Record<string, number>;
}) {
  return (
    <div className="w-[min(100vw-3rem,42rem)] lg:w-[42rem]">
      {withCommand ? <CommandDisplay command="npm install -g @perry-ai/cli" /> : null}

      <CastPlayer
        src={src}
        title={title}
        description={description}
        preloadSources={preloadSources}
        sourceStartTimes={sourceStartTimes}
        className={withCommand ? "mt-6" : undefined}
      />
    </div>
  );
}

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#automation", label: "Automation" },
  { href: "#shell", label: "Shell" },
];

const sectionCastSources: Partial<Record<string, string>> = {
  tools: "/perry_tool_use.cast",
  plan: "/perry_plan_mode.cast",
  subagents: "/perry_sub_agents.cast",
  permissions: "/perry_permissions.cast",
  compaction: "/perry_compaction.cast",
  resume: "/perry_resume.cast",
};

const featureCastStartTimes: Record<string, number> = {
  [DEFAULT_CAST_SOURCE]: 0,
  "/perry_tool_use.cast": 19,
  "/perry_plan_mode.cast": 1.5,
  "/perry_sub_agents.cast": 16.5,
  "/perry_permissions.cast": 20.6,
  "/perry_compaction.cast": 4.5,
  "/perry_resume.cast": 1.3,
};

const MOBILE_CAST_ROOT_MARGIN = "900px 0px";

function getSectionCastSource(sectionId: string) {
  return sectionCastSources[sectionId] ?? DEFAULT_CAST_SOURCE;
}

const sections = [
  {
    id: "intro",
    eyebrow: "What is Perry?",
    title: "Meet Perry, an agent harness for the terminal.",
    body: "Perry is an AI agent harness for coding work: the shell-native layer around a model that gives it tools, repo context, permissions, and session memory. It is built for people who want agentic help without leaving the terminal or giving up control of the workflow.",
    points: [
      "Wraps models with tools and context",
      "Runs inside your normal terminal flow",
      "Keeps control, permissions, and sessions local",
    ],
    terminalTitle: "perry: who are you",
    terminalLead:
      "Perry is the harness around the model, not just another chat box.",
    terminalSummary:
      "An agent harness gives the model tools, state, context, and guardrails.",
    terminalPoints: [
      "tool use in the same shell",
      "repo context without switching apps",
      "permissions and sessions you can control",
    ],
    terminalFooter: "A terminal-native harness for agentic coding.",
  },
  {
    id: "tools",
    eyebrow: "Tool use",
    title: "Let Perry inspect, run, and edit.",
    body: "Perry can read files, inspect images, run commands, search when needed, and make precise edits. It uses tools when the answer needs more than guessing.",
    points: [
      "Read files before answering",
      "Run commands and tests",
      "Edit code with clear traces",
    ],
    terminalTitle: "perry: use tools",
    terminalLead: "Perry can use the same tools you would use in the repo.",
    terminalSummary:
      "A single session can inspect code, run checks, and apply changes.",
    terminalPoints: [
      "read the right files",
      "run the right commands",
      "show what changed",
    ],
    terminalFooter: "Less guessing. More real work.",
  },
  {
    id: "plan",
    eyebrow: "Plan mode",
    title: "Plan it with Perry before changing code.",
    body: "Use plan mode when you want Perry to think with you first. Perry can inspect the repo, ask clear multiple-choice questions, and turn your answers into a simple plan. Nothing gets edited until you approve it.",
    points: [
      "Explore the repo before deciding",
      "Answer simple planning questions",
      "Start work only after you approve",
    ],
    terminalTitle: "perry: plan it with me",
    terminalLead: "Plan mode slows the work down before risky changes begin.",
    terminalSummary:
      "Perry asks, plans, and waits for your approval before editing.",
    terminalPoints: [
      "inspect the codebase first",
      "choose from simple options",
      "approve the plan before work starts",
    ],
    terminalFooter: "A safer way to start bigger changes.",
  },
  {
    id: "subagents",
    eyebrow: "Sub-agents",
    title: "Let Perry send out helpers.",
    body: "Turn on sub-agents when a task needs extra investigation. Perry can start a focused helper, give it a job, and bring the result back into the main session.",
    points: [
      "Delegate side investigations",
      "Use the same repo and permissions",
      "Get a short report back",
    ],
    terminalTitle: "perry: use a helper",
    terminalLead: "Perry can hand a focused task to a sub-agent.",
    terminalSummary:
      "The helper works separately, then reports back to the main thread.",
    terminalPoints: [
      "inspect another part of the repo",
      "research a focused question",
      "return only the useful result",
    ],
    terminalFooter: "Extra help without losing the main thread.",
  },
  {
    id: "permissions",
    eyebrow: "Permissions",
    title: "Control what Perry is allowed to do.",
    body: "Perry can ask before risky actions, stay read-only, write only inside the workspace, or run in full-access mode when you want speed. You choose how much trust each session gets.",
    points: [
      "Ask before risky actions",
      "Protect sensitive files",
      "Switch to full access when ready",
    ],
    terminalTitle: "perry: permissions",
    terminalLead: "You decide how much access Perry gets.",
    terminalSummary:
      "Permission modes make the agent safer without slowing every task down.",
    terminalPoints: [
      "use read-only for exploration",
      "allow one action at a time",
      "enable full access when you mean it",
    ],
    terminalFooter: "Control first. Speed when you want it.",
  },
  {
    id: "compaction",
    eyebrow: "Compaction",
    title: "Keep long sessions manageable.",
    body: "Long sessions can get heavy. Compaction keeps the important decisions, trims repeated context, and helps Perry continue without making you restart the conversation.",
    points: [
      "Keep the important context",
      "Trim repeated back-and-forth",
      "Continue without starting over",
    ],
    terminalTitle: "perry: compact session",
    terminalLead: "When the thread gets long, compact it.",
    terminalSummary:
      "Compaction keeps the useful parts and clears out the noise.",
    terminalPoints: [
      "save key decisions",
      "remove repeated details",
      "keep the next steps clear",
    ],
    terminalFooter: "A cleaner session, without losing the thread.",
  },
  {
    id: "resume",
    eyebrow: "Resume session",
    title: "Come back to the work later.",
    body: "Perry saves local sessions so you can stop and return later. Resume the current repo, pick an older session, or show all sessions when you need to find something else.",
    points: [
      "Resume sessions for this repo",
      "Show all sessions when needed",
      "Keep past traces and decisions",
    ],
    terminalTitle: "perry: resume work",
    terminalLead: "Real work gets interrupted. Perry can pick it back up.",
    terminalSummary: "Resume brings back the conversation and the tool traces.",
    terminalPoints: [
      "continue the latest session",
      "open an older session",
      "keep useful history visible",
    ],
    terminalFooter: "Stop now. Continue later.",
  },
];

type StorySection = (typeof sections)[number];

function MobileSectionCast({ section }: { section: StorySection }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const source = getSectionCastSource(section.id);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => {
        setShouldMount(true);
        setShouldPlay(true);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isNearViewport = entry?.isIntersecting ?? false;

        setShouldMount(isNearViewport);
        setShouldPlay(isNearViewport);
      },
      {
        rootMargin: MOBILE_CAST_ROOT_MARGIN,
        threshold: 0,
      },
    );

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="mt-6 sm:mt-7">
      {shouldMount ? (
        <CastPlayer
          src={source}
          title={section.terminalTitle}
          description={[section.terminalLead, section.terminalFooter]}
          sourceStartTimes={featureCastStartTimes}
          play={shouldPlay}
        />
      ) : (
        <div className="cast-player-shell min-h-[15rem] sm:min-h-[20rem]" aria-hidden="true">
          <div className="cast-player-chrome">
            <div className="cast-player-dots">
              <span className="cast-player-dot bg-rose-300" />
              <span className="cast-player-dot bg-amber-300" />
              <span className="cast-player-dot bg-emerald-300" />
            </div>
            <div className="cast-player-title">{section.terminalTitle}</div>
          </div>
          <div className="flex min-h-[12rem] items-center justify-center bg-[#f7fbff] px-4 text-center font-mono text-[11px] tracking-[0.14em] text-[#8ca0b8] uppercase sm:min-h-[17rem]">
            Loading terminal cast
          </div>
        </div>
      )}
    </div>
  );
}

function MobileNavbar() {
  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!href.startsWith("#")) return;

    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", href);
  };

  const mobileNavItems = [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How" },
    { href: "#automation", label: "Auto" },
    { href: "#shell", label: "Shell" },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-3 sm:top-[36px] lg:hidden">
      <nav className="pointer-events-auto flex max-w-full items-center gap-[4px] overflow-x-auto rounded-[12px] border border-white/30 bg-white/62 p-[6px] text-[11px] text-[#0f172a] shadow-[0_8px_22px_rgba(15,23,42,0.10)] backdrop-blur-md">
        {mobileNavItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(event) => handleNavClick(event, item.href)}
            className="shrink-0 rounded-[10px] px-[10px] py-[7px] font-medium tracking-[-0.02em] text-[#334155] transition hover:bg-black/5 hover:text-[#0f172a] active:bg-black/5"
          >
            {item.label}
          </a>
        ))}

        <a
          href="#install"
          onClick={(event) => handleNavClick(event, "#install")}
          className="shrink-0 rounded-[9px] bg-[#0f172a] px-[12px] py-[7px] font-medium tracking-[-0.02em] text-white transition hover:bg-black"
        >
          Get Perry
        </a>
      </nav>
    </div>
  );
}

function HeroNavbar() {
  const navRef = useRef<HTMLElement | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const updateNavbarState = () => {
      setScrollOffset(Math.min(window.scrollY, 18));
    };

    const onChange = () => {
      window.requestAnimationFrame(updateNavbarState);
    };

    updateNavbarState();
    window.addEventListener("scroll", onChange, { passive: true });

    return () => {
      window.removeEventListener("scroll", onChange);
    };
  }, []);

  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!href.startsWith("#")) return;

    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", href);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[36px] z-40 hidden justify-center lg:flex">
      <nav
        ref={navRef}
        className="pointer-events-auto flex items-center gap-[5px] rounded-[10px]  bg-white/80 p-[7px] text-[12px] text-[#0f172a] shadow-[0_8px_22px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-transform"
        style={{ transform: `translateY(${-scrollOffset}px)` }}
      >
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(event) => handleNavClick(event, item.href)}
            className="rounded-[12px] px-[13px] py-[7px] font-medium tracking-[-0.02em] text-[#334155] transition hover:bg-black/5 hover:text-[#0f172a] active:bg-black/5"
          >
            {item.label}
          </a>
        ))}

        <a
          href="#install"
          onClick={(event) => handleNavClick(event, "#install")}
          className="ml-1 rounded-[8px] bg-[#0f172a] px-[15px] py-[7px] font-medium tracking-[-0.02em] text-white transition hover:bg-black"
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
  isLast = false,
  titleRef,
  bodyRef,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points?: string[];
  isActive: boolean;
  isLast?: boolean;
  titleRef?: (node: HTMLHeadingElement | null) => void;
  bodyRef?: (node: HTMLParagraphElement | null) => void;
}) {
  return (
    <section
      id={id}
      className={[
        "flex min-h-[86vh] scroll-mt-28",
        isLast ? "items-end" : "items-center",
      ].join(" ")}
    >
      <div
        className={[
          "w-full transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-35",
        ].join(" ")}
      >
        <div className="mb-5 text-[12px] font-medium tracking-[0.16em] text-[#64748b] uppercase">
          {eyebrow}
        </div>
        <h2
          ref={titleRef}
          className={[
            "max-w-[13ch] text-5xl text-[#09111f] leading-[1.3] tracking-[-0.065em] [word-spacing:0.12em]",
          ].join(" ")}
        >
          {title}
        </h2>
        <p
          ref={bodyRef}
          className="mt-6 max-w-xl text-[16px] leading-8 text-[#475569] [word-spacing:0.08em]"
        >
          {body}
        </p>

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
    <section
      id="how"
      className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-36 pt-20 lg:px-10 lg:pb-56 lg:pt-28"
    >
      <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20 xl:gap-24">
        <div className="flex justify-center">
          <div className="relative w-full max-w-[28rem] overflow-hidden xl:max-w-[30rem]">
            <PixelRevealImage
              src="/perry-how-it-works.webp"
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
      id="automation"
      className="scroll-mt-28 px-6 pb-28 pt-4 lg:px-10 lg:pb-44"
      data-nav-surface="hero"
    >
      <div className="relative min-h-[52rem] overflow-hidden rounded-[16px] border border-[#dbe3ec] text-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:min-h-[56rem] lg:min-h-0 lg:aspect-[16/9] lg:rounded-[24px]">
        <div
          className="absolute inset-0 overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: "url(/perry-meadow-terminal.webp)" }}
        >
          <HeroLensingShader
            src="/perry-meadow-terminal.webp"
            imageWidth={1672}
            imageHeight={941}
            lensScale={1.5}
            className="h-full w-full"
          />
        </div>

        <div className="relative z-10 flex h-full flex-col px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16">
          <div className="relative mt-10 grid flex-1 lg:grid-cols-[minmax(0,36rem)_1fr]">
            <div className="max-w-[36rem]  pt-6">
              <h2 className="mt-7 max-w-[18ch] text-[22px] leading-8 tracking-[-0.05em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18),0_0_12px_rgba(255,255,255,0.96),0_0_28px_rgba(255,255,255,0.9),0_0_52px_rgba(255,255,255,0.62)] sm:text-[2.65rem] sm:leading-[1.4] lg:w-[28ch] lg:max-w-none lg:text-[42px] lg:leading-normal lg:tracking-tighter">
                Perry helps you automate terminal work with natural language
              </h2>
              <p className="mt-4 max-w-[34rem] text-[12px] leading-6 text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.18)] sm:text-base sm:leading-6 lg:max-w-[36rem] lg:leading-7">
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

        <div className="absolute bottom-8 left-8 z-20 hidden max-w-[34rem] overflow-hidden rounded-[20px] border border-white/22 bg-white/10 text-white shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:block 2xl:right-10 2xl:left-auto 2xl:bottom-10">
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
              href="#features"
              className="mt-6 inline-flex items-center gap-2 text-[14px] text-white/95 underline decoration-white/55 underline-offset-4 transition hover:text-white"
            >
              <span>See why</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/12">
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
      </div>
    </section>
  );
}

function PerryClosingSection() {
  return (
    <section
      id="shell"
      className="relative h-[calc(100svh+56.3vw)] scroll-mt-28 lg:h-[168svh]"
      aria-label="Perry closing reveal"
    >
      <div
        className="sticky top-0 h-[100svh] overflow-hidden bg-white"
        data-nav-surface="hero"
      >
        <div
          className="absolute inset-0 hidden overflow-hidden bg-cover bg-center lg:block"
          style={{ backgroundImage: "url(/perry-outro-window.webp)" }}
        >
          <HeroLensingShader
            src="/perry-outro-window.webp"
            imageWidth={1672}
            imageHeight={941}
            lensScale={1.5}
            className="h-full w-full"
          />
        </div>

        <Image
          src="/perry-outro-window.webp"
          alt=""
          width={1672}
          height={941}
          sizes="100vw"
          className="absolute inset-x-0 bottom-0 block h-auto w-full lg:hidden"
        />
      </div>

      <div
        className="absolute inset-x-0 top-0 z-10 bg-white"
        data-nav-surface="light"
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[21px]">
          <div className="absolute inset-x-0 bottom-[16px] h-[5px] bg-[#d7f5f8]" />
          <div className="absolute inset-x-0 bottom-[8px] h-[5px] bg-[#b5eaf0]" />
          <div className="absolute inset-x-0 bottom-0 h-[5px] bg-[#8edee4]" />
        </div>

        <div className="mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-between px-6 pb-24 pt-8 lg:px-10 lg:pb-28 lg:pt-6">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center text-[#0f172a]">
              <Image
                src="/perry-closing-icon.webp"
                alt="Perry icon"
                width={42}
                height={42}
                className="object-contain"
              />
            </div>

            <Text3DFlip
              as="div"
              className="mx-auto mt-8 max-w-[30ch] justify-center text-[1.5rem] leading-[1.42] tracking-[-0.02em] text-[#09111f] sm:text-[2.6rem]"
              textClassName="bg-white text-[#09111f]"
              flipTextClassName="bg-white text-[#09111f]"
              rotateDirection="top"
              staggerDuration={0.03}
              staggerFrom="first"
              transition={{ type: "spring", damping: 25, stiffness: 160 }}
            >
              We&apos;re building a terminal agent for people who&apos;d rather
              stay in the shell.
            </Text3DFlip>

            <p className="mt-8 text-[15px] leading-7 text-[#475569] sm:text-base">
              If that sounds like your workflow,{" "}
              <a
                href="#install"
                className="inline-flex items-center gap-2 text-[#09111f] underline decoration-[#cbd5e1] underline-offset-4 transition hover:decoration-[#0f172a]"
              >
                <span>try Perry</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe3ec] text-[#09111f]">
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
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-5 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[14px] text-[#334155] lg:justify-start">
              <a href="#top" className="transition hover:text-[#09111f]">
                Home
              </a>
              <a href="#features" className="transition hover:text-[#09111f]">
                Features
              </a>
              <a href="#how" className="transition hover:text-[#09111f]">
                How it works
              </a>
              <a href="#automation" className="transition hover:text-[#09111f]">
                Automation
              </a>
              <a href="#shell" className="transition hover:text-[#09111f]">
                Shell
              </a>
            </div>

            <div className="flex items-center justify-center gap-3 lg:justify-end">
              <a
                href="#install"
                className="inline-flex items-center gap-3 rounded-[12px] border border-[#dbe3ec] bg-white px-5 py-3 text-[15px] text-[#09111f] shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:bg-[#f8fbff]"
              >
                <span>Install Perry</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe3ec]">
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
        </div>
      </div>
    </section>
  );
}

function MobileLayout() {
  return (
    <div className="bg-white lg:hidden">
      <MobileNavbar />
      <div className="p-3 sm:p-[18px]">
        <section
          id="top"
          className="relative h-[min(39rem,max(29rem,calc(100svh-18rem)))] w-full overflow-hidden rounded-[16px] sm:h-[min(43rem,max(36rem,calc(100svh-18rem)))]"
        >
          <div className="absolute inset-0">
            <HeroLensingShader
              src="/her-new.webp"
              placeholderSrc="/her-new-blur.webp"
              imageWidth={1672}
              imageHeight={941}
              className="h-full w-full"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0)_42%,rgba(15,23,42,0)_100%)]" />

          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center px-4 pt-28 text-center sm:px-6 sm:pt-24">
            <h1 className=" text-[22px] leading-8 sm:leading-[1.4] tracking-[-0.05em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18),0_0_12px_rgba(255,255,255,0.96),0_0_28px_rgba(255,255,255,0.9),0_0_52px_rgba(255,255,255,0.62)] sm:max-w-[18ch] sm:text-[2.65rem]">
              Meet Perry, the customizable harness for your agent.
            </h1>
            <p className="mt-4 max-w-[34rem] text-[12px] leading-6 sm:leading-6 text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.18)] sm:text-base">
              Perry is a minimal agent harness. Adapt Perry to your workflows,
              not the other way around.
            </p>

            <div id="install" className="w-full max-w-[34rem]">
              <CommandDisplay
                command="npm install -g @perry-ai/cli"
                topSpacing="compact"
              />
            </div>
          </div>
        </section>
      </div>

      <div
        id="features"
        className="mx-auto max-w-3xl scroll-mt-24 space-y-20 px-4 pb-24 pt-10 text-left sm:space-y-24 sm:px-6 sm:pt-12"
      >
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-20 border-t border-[#e7edf4] pt-12 first:border-t-0 first:pt-0"
          >
            <div className="mb-4 text-[12px] font-medium tracking-[0.16em] text-[#64748b] uppercase">
              {section.eyebrow}
            </div>
            <h2 className="max-w-[16ch] text-[clamp(2rem,8.5vw,2.6rem)] leading-[1.12] tracking-[-0.055em] text-[#09111f] [word-spacing:0.1em]">
              {section.title}
            </h2>

            <MobileSectionCast section={section} />

            <p className="mt-6 text-[15px] leading-7 text-[#475569] [word-spacing:0.07em] sm:text-base sm:leading-8">
              {section.body}
            </p>

            {section.points?.length ? (
              <ul className="mt-6 space-y-3 text-sm leading-6 text-[#334155] sm:text-[15px]">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[#0f172a]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <section id="how" className="scroll-mt-24 px-6 pb-28 pt-10">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto max-w-[24rem] overflow-hidden">
            <PixelRevealImage
              src="/perry-how-it-works.webp"
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
  const sectionTitleRefs = useRef<Record<string, HTMLHeadingElement | null>>(
    {},
  );
  const sectionBodyRefs = useRef<Record<string, HTMLParagraphElement | null>>(
    {},
  );

  const motionStateRef = useRef({
    stickyTop: 0,
    spacerHeight: 0,
    startX: 0,
    finalX: 0,
    pinScrollY: 1,
    ready: false,
  });

  const frameRef = useRef<number | null>(null);

  const [desktop, setDesktop] = useState(false);
  const [activeStorySectionId, setActiveStorySectionId] = useState(
    sections[0]?.id ?? "",
  );
  const [terminalTitle, setTerminalTitle] = useState(SCROLL_TITLE);

  useLayoutEffect(() => {
    const updateDesktop = () => setDesktop(window.innerWidth >= 1024);
    updateDesktop();
    window.addEventListener("resize", updateDesktop);
    return () => window.removeEventListener("resize", updateDesktop);
  }, []);

  useEffect(() => {
    const updateActiveSection = () => {
      if (desktop) {
        const fullyEnteredSection = sections
          .filter((section) => {
            const title = sectionTitleRefs.current[section.id];
            const body = sectionBodyRefs.current[section.id];
            if (!title || !body) return false;

            const titleRect = title.getBoundingClientRect();
            const bodyRect = body.getBoundingClientRect();

            return titleRect.top >= 0 && bodyRect.bottom <= window.innerHeight;
          })
          .at(-1);

        if (fullyEnteredSection) {
          const nextTitle =
            window.scrollY <= 0 && fullyEnteredSection.id === sections[0]?.id
              ? SCROLL_TITLE
              : fullyEnteredSection.terminalTitle;

          setActiveStorySectionId((current) =>
            current === fullyEnteredSection.id
              ? current
              : fullyEnteredSection.id,
          );
          setTerminalTitle((current) =>
            current === nextTitle ? current : nextTitle,
          );
        } else {
          setTerminalTitle((current) => {
            if (window.scrollY <= 0) return SCROLL_TITLE;

            return current === SCROLL_TITLE
              ? (sections[0]?.terminalTitle ?? current)
              : current;
          });
        }

        return;
      }

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
        const nextSection =
          sections.find((section) => section.id === closestSection.id) ??
          sections[0];

        setActiveStorySectionId((current) =>
          current === closestSection.id ? current : closestSection.id,
        );

        if (nextSection) {
          setTerminalTitle((current) =>
            current === nextSection.terminalTitle
              ? current
              : nextSection.terminalTitle,
          );
        }
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
    const x = state.finalX + (state.startX - state.finalX) * (1 - progress);

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
      const finalX =
        window.innerWidth >= 1400 ? -TERMINAL_FINAL_LEFT_SHIFT : 0;
      const pinScrollY = Math.max(1, startTop - stickyTop);

      motionStateRef.current = {
        stickyTop,
        spacerHeight,
        startX,
        finalX,
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
    return <MobileLayout />;
  }

  const activeTerminalSection =
    sections.find((section) => section.id === activeStorySectionId) ??
    sections[0];
  const terminalDescription =
    terminalTitle === SCROLL_TITLE
      ? [
          "Scroll to see Perry's core features.",
          "The terminal title updates as each section reaches the top edge.",
        ]
      : [
          activeTerminalSection?.terminalLead ?? "",
          activeTerminalSection?.terminalFooter ?? "",
        ];
  const terminalCastSrc =
    sectionCastSources[activeStorySectionId] ?? DEFAULT_CAST_SOURCE;
  const mountedCastSources = [terminalCastSrc];

  return (
    <div className="hidden bg-white lg:block" data-nav-surface="light">
      <div className="p-[18px]">
        <section
          id="top"
          data-nav-surface="hero"
          className="relative flex w-full items-start justify-center overflow-hidden rounded-[24px]"
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_42%,rgba(255,255,255,0.88)_100%)]" />
          <HeroNavbar />

          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-38 text-center">
            <h1 className="text-[42px] tracking-tighter text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18),0_0_12px_rgba(255,255,255,0.96),0_0_28px_rgba(255,255,255,0.9),0_0_52px_rgba(255,255,255,0.62)]">
              Meet Perry, the customizable <br/> harness for your agent.
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
              <CommandDisplay command="npm install -g @perry-ai/cli" />
            </div>
          </div>

          <HeroLensingShader
            src="/her-new.webp"
            placeholderSrc="/her-new-blur.webp"
            imageWidth={1672}
            imageHeight={941}
            className="w-[150%]"
          />
        </section>
      </div>

      <section
        id="features"
        className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-32 pt-24 lg:px-10"
        data-nav-surface="light"
      >
        <div className="grid grid-cols-[42rem_minmax(0,1fr)] gap-8">
          <div ref={terminalRailRef} className="relative min-w-0">
            <div ref={terminalSpacerRef} aria-hidden className="h-0" />

            <div ref={terminalStickyRef} className="sticky">
              <div
                ref={terminalMotionRef}
                className="[will-change:transform]"
                style={{ transform: "translate3d(0,0,0)" }}
              >
                <TerminalStack
                  withCommand={false}
                  title={terminalTitle}
                  description={terminalDescription}
                  src={terminalCastSrc}
                  preloadSources={mountedCastSources}
                  sourceStartTimes={featureCastStartTimes}
                />
              </div>
            </div>
          </div>

          <div ref={storySectionsRef} className="space-y-0 text-left">
            {sections.map((section, index) => (
              <StoryCard
                key={section.id}
                {...section}
                isActive={activeStorySectionId === section.id}
                isLast={index === sections.length - 1}
                titleRef={(node) => {
                  sectionTitleRefs.current[section.id] = node;
                }}
                bodyRef={(node) => {
                  sectionBodyRefs.current[section.id] = node;
                }}
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
