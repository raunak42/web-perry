"use client";

import { useMemo, useState } from "react";

type CommandTab = {
  id: string;
  label: string;
  command: string;
};

function deriveTabs(command: string): CommandTab[] {
  const normalizedCommand = command.trim();

  if (normalizedCommand.includes("@perry-ai/cli")) {
    return [
      { id: "npm", label: "NPM", command: "npm install -g @perry-ai/cli" },
      { id: "pnpm", label: "PNPM", command: "pnpm add -g @perry-ai/cli" },
      { id: "yarn", label: "YARN", command: "yarn dlx -p @perry-ai/cli perry" },
      { id: "bun", label: "BUN", command: "bunx --package @perry-ai/cli perry" },
      { id: "npx", label: "NPX", command: "npx @perry-ai/cli" },
    ];
  }

  const match = normalizedCommand.match(/^npm\s+(?:i|install)\s+(.+)$/i);
  if (!match) {
    return [{ id: "default", label: "Command", command }];
  }

  const packageSpec = match[1].trim();

  return [
    { id: "npm", label: "NPM", command: `npm i ${packageSpec}` },
    { id: "pnpm", label: "PNPM", command: `pnpm add ${packageSpec}` },
    { id: "yarn", label: "YARN", command: `yarn add ${packageSpec}` },
    { id: "bun", label: "BUN", command: `bun add ${packageSpec}` },
    { id: "npx", label: "NPX", command: `npx ${packageSpec}` },
  ];
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M9 9h9v11H9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6 15H5V4h9v1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 12.5 9.2 17 19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CommandDisplay({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const tabs = useMemo(() => deriveTabs(command), [command]);
  const defaultTabId = tabs.find((tab) => tab.command === command)?.id ?? tabs[0].id;
  const [activeTab, setActiveTab] = useState(defaultTabId);

  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedTab.command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto mt-[72px] w-full max-w-[34rem] overflow-hidden rounded-none border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(246,250,255,0.72)_100%)] text-left text-[#0f172a] shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <div className="flex flex-nowrap overflow-x-auto border-b border-white/55 bg-white/26">
        {tabs.map((tab, index) => {
          const isActive = tab.id === selectedTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setCopied(false);
              }}
              className={[
                "min-w-0 flex-1 whitespace-nowrap px-3 py-2 text-left text-[11px] uppercase transition",
                "font-medium tracking-[0.18em]",
                index !== tabs.length - 1 ? "border-r border-white/55" : "",
                isActive
                  ? "bg-white/72 text-[#0f172a] shadow-[inset_0_-2px_0_0_#9dc4ea]"
                  : "text-[#7b8ba5] hover:bg-white/52 hover:text-[#334155]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 bg-white/14 px-4 py-3 sm:px-4 sm:py-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-white/65 bg-white/58 font-mono text-[15px] leading-none text-[#8ba0c1]">
              $
            </span>
            <code className="block min-w-0 overflow-x-auto whitespace-nowrap font-mono text-[16px] leading-[1.35] text-[#0f172a] sm:text-[18px]">
              {selectedTab.command}
            </code>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy command"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-white/65 bg-white/64 text-[#7aa8d4] shadow-[0_6px_14px_rgba(15,23,42,0.05)] transition hover:bg-white hover:text-[#5d94ca]"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}
