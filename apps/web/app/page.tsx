"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import ExtensionSimulator from "./components/ExtensionSimulator";
import FeatureGrid from "./components/FeatureGrid";
import Footer from "./components/Footer";

const EXTENSION_META_SELECTOR =
  'meta[name="cognitivemode-extension"][content="installed"]';
const EXTENSION_READY_EVENT = "cognitivemode:ready";
const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/cognitive-mode/hlflicjdpooonfjaciliblnmhkdmakgh";

type ExtensionInstallState = "checking" | "installed" | "missing";

function isExtensionInstalled(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector(EXTENSION_META_SELECTOR) !== null;
}

export default function Home() {
  const [installState, setInstallState] =
    useState<ExtensionInstallState>("checking");

  useEffect(() => {
    const markInstalled = () => setInstallState("installed");
    const markMissing = () =>
      setInstallState((current) =>
        current === "checking" ? "missing" : current,
      );

    if (isExtensionInstalled()) {
      markInstalled();
    } else {
      queueMicrotask(markMissing);
    }

    window.addEventListener(EXTENSION_READY_EVENT, markInstalled);

    return () => {
      window.removeEventListener(EXTENSION_READY_EVENT, markInstalled);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col justify-center">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-6 pt-32 pb-20 text-center sm:items-start sm:text-left">
        <div
          className={
            installState === "installed"
              ? "inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(20,83,45,0.12))] px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.22em] text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
              : "inline-flex items-center gap-2 rounded-full border border-border/70 bg-[rgba(24,24,27,0.85)] px-4 py-1 text-[11px] font-mono uppercase tracking-[0.22em] text-muted shadow-[0_0_0_1px_rgba(24,24,27,0.6)] backdrop-blur-md"
          }
        >
          {installState === "installed" ? (
            <>
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,1)]" />
              extension installed
            </>
          ) : (
            <>
              <Image
                src="/icon.svg"
                alt="Cognitive Mode logo"
                width={18}
                height={18}
                priority
                className="h-4.5 w-4.5 rounded-[5px]"
              />
              cognitive&nbsp;mode:{" "}
              <span className="font-semibold text-foreground">on</span>
            </>
          )}
        </div>

        <div className="space-y-6">
          <h1 className="max-w-3xl font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Your AI is doing the thinking.
            <br />
            <span className="text-muted">
              You&apos;re just doing the typing.
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Break the cycle of mindless prompt-engineering. Introduce intentional
            friction into your development workflow to rebuild your cognitive
            problem-solving muscles.
          </p>
        </div>

        <div className="flex w-full max-w-xl flex-col items-center gap-4 sm:items-start">
          {installState === "checking" ? (
            <button
              type="button"
              disabled
              aria-busy="true"
              className="inline-flex h-11 cursor-default items-center justify-center gap-2 rounded-full border border-border/80 bg-[rgba(24,24,27,0.85)] px-6 text-sm font-medium text-muted shadow-[0_0_24px_rgba(250,250,250,0.08)] backdrop-blur-md disabled:opacity-100"
            >
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border border-muted/30 border-t-muted"
              />
              Checking extension
            </button>
          ) : installState === "installed" ? (
            <>
              <div className="w-full rounded-2xl border border-emerald-400/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(20,83,45,0.08))] px-5 py-4 text-left shadow-[0_0_28px_rgba(16,185,129,0.15)]">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs">
                    ✓
                  </span>
                  Extension installed
                </p>
                <p className="mt-2 text-xs leading-relaxed text-emerald-200/70">
                  Pin Cognitive Mode to your toolbar to open your Knowledge Base
                  and stats.
                </p>
              </div>
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-400/60 bg-[rgba(16,185,129,0.08)] px-6 text-sm font-medium text-foreground shadow-[0_0_24px_rgba(16,185,129,0.35)] backdrop-blur-md transition hover:border-emerald-300 hover:bg-[rgba(16,185,129,0.15)]"
                >
                  Open ChatGPT
                  <ExternalLink
                    className="h-3.5 w-3.5 opacity-70"
                    aria-hidden
                  />
                </a>
                <Link
                  href="/welcome"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border/80 bg-[rgba(24,24,27,0.85)] px-5 text-sm font-medium text-muted transition hover:border-foreground/70 hover:text-foreground"
                >
                  Setup guide
                </Link>
              </div>
            </>
          ) : installState === "missing" ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
              <a
                href={CHROME_WEB_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-400/60 bg-[rgba(16,185,129,0.08)] px-6 text-sm font-medium text-foreground shadow-[0_0_24px_rgba(16,185,129,0.4)] backdrop-blur-md transition hover:border-emerald-300 hover:bg-[rgba(16,185,129,0.15)]"
              >
                Add to Chrome — It&apos;s Free
              </a>
              <a
                href="#extension-simulator"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border/80 bg-[rgba(24,24,27,0.85)] px-5 text-sm font-medium text-muted transition hover:border-foreground/70 hover:text-foreground"
              >
                Try the friction demo
              </a>
            </div>
          ) : null}
        </div>

        <p className="text-[11px] text-muted/80">
          100% Local. Zero Servers. Your thoughts stay yours.
        </p>
      </section>

      <ExtensionSimulator />
      <FeatureGrid />
      <Footer />
    </main>
  );
}
