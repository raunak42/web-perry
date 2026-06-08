"use client";

import { useMemo, useState } from "react";

type CommandTab = {
  id: string;
  label: string;
  command: string;
};

function deriveTabs(command: string): CommandTab[] {
  const match = command.trim().match(/^npm\s+(?:i|install)\s+(.+)$/i);
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
    <div className="mx-auto mt-[120px] w-full max-w-[36rem] overflow-hidden rounded-none border border-[#dbe3ec] bg-white/96 text-left text-[#0f172a] shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="flex flex-nowrap overflow-x-auto border-b border-[#dbe3ec] bg-[#fcfdff]/90">
        {tabs.map((tab) => {
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
                "min-w-0 flex-1 whitespace-nowrap border-r border-[#dbe3ec] px-3 py-3 text-left text-[12px] uppercase transition",
                "font-medium tracking-[0.18em]",
                isActive
                  ? "bg-white text-[#0f172a] shadow-[inset_0_-2px_0_0_#93c5fd]"
                  : "text-[#94a3b8] hover:bg-[#f8fbff] hover:text-[#64748b]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="shrink-0 font-mono text-[16px] leading-none text-[#94a3b8]">
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
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#dbe3ec] bg-[#fbfdff] text-[#7aa8d4] transition hover:bg-white hover:text-[#5d94ca]"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}
