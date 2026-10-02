"use client";

import { useState } from "react";

export default function CleanerAvailabilityLink({
  path,
}: {
  path: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex rounded-xl border border-[#8f6b2f] px-4 py-2 text-xs font-medium text-[#e3bd74] transition hover:bg-[#151008]"
      >
        {copied ? "Copied" : "Copy weekly availability link"}
      </button>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-xl border border-[#2f291d] px-4 py-2 text-xs text-[#cfc7b7] transition hover:bg-[#111111]"
      >
        Open form
      </a>
    </div>
  );
}
