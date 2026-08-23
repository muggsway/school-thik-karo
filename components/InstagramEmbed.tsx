"use client";

import { useEffect } from "react";
import { normalizeInstagramUrl } from "@/lib/format";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export default function InstagramEmbed({ url: rawUrl }: { url: string }) {
  const url = normalizeInstagramUrl(rawUrl);

  useEffect(() => {
    function process() {
      window.instgrm?.Embeds.process();
    }
    if (window.instgrm) {
      process();
      return;
    }
    const existing = document.getElementById("instagram-embed-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", process, { once: true });
      return () => existing.removeEventListener("load", process);
    }
    const script = document.createElement("script");
    script.id = "instagram-embed-script";
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = process;
    document.body.appendChild(script);
  }, [url]);

  return (
    <div>
      <blockquote
        key={url}
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ background: "#FFF", border: 0, borderRadius: 8, margin: 0, width: "100%", minWidth: 0 }}
      />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-xs underline mt-2 inline-block"
        style={{ color: "var(--rust)" }}
      >
        Open on Instagram ↗
      </a>
    </div>
  );
}
