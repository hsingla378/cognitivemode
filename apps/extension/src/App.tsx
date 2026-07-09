import { useEffect, useState } from 'react'
import {
  countSelfSolvedOnDate,
  getCognitiveLogs,
  getSelfSolvedStats,
  getSettings,
  getStats,
  saveSettings,
  type SelfSolvedStats,
  type Stats,
} from './content/storage'
import type { CognitiveEntry } from './content/types'
import './App.css'

const HYPOTHESIS_SNIPPET_LENGTH = 72
const FRICTION_DELAY_MIN = 5
const FRICTION_DELAY_MAX = 60
const FRICTION_DELAY_DEFAULT = 15

function truncateHypothesis(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= HYPOTHESIS_SNIPPET_LENGTH) return trimmed
  return `${trimmed.slice(0, HYPOTHESIS_SNIPPET_LENGTH).trimEnd()}…`
}

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function buildShareTweetUrl(stats: Stats): string {
  const text = `I just saved ${stats.timeSavedThinking} of mindless AI prompting and preserved my engineering intuition using cognitivemode.app. Current streak: ${stats.activeStreak} mindful prompts.`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

function App() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [selfSolvedStats, setSelfSolvedStats] = useState<SelfSolvedStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<CognitiveEntry[]>([])
  const [frictionDelay, setFrictionDelay] = useState(FRICTION_DELAY_DEFAULT)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      const [nextStats, nextSelfSolvedStats, logs, settings] = await Promise.all([
        getStats(),
        getSelfSolvedStats(),
        getCognitiveLogs(),
        getSettings(),
      ])
      if (cancelled) return

      setStats(nextStats)
      setSelfSolvedStats(nextSelfSolvedStats)
      setRecentLogs(logs.slice(-3).reverse())
      setFrictionDelay(
        Math.min(FRICTION_DELAY_MAX, Math.max(FRICTION_DELAY_MIN, settings.countdownDuration)),
      )
      setEnabled(settings.enabled)
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleFrictionDelayChange(value: number) {
    const clamped = Math.min(FRICTION_DELAY_MAX, Math.max(FRICTION_DELAY_MIN, value))
    setFrictionDelay(clamped)
    await saveSettings({ countdownDuration: clamped })
  }

  async function handleEnabledToggle() {
    const next = !enabled
    setEnabled(next)
    await saveSettings({ enabled: next })
  }

  function handleShareProgress() {
    if (!stats) return
    chrome.tabs.create({ url: buildShareTweetUrl(stats) })
  }

  const selfSolvedToday = selfSolvedStats ? countSelfSolvedOnDate(selfSolvedStats) : null
  const currentSelfSolvedStreak = selfSolvedStats?.currentStreak ?? null
  const streakSuffix =
    currentSelfSolvedStreak !== null && currentSelfSolvedStreak >= 2 ? ' 🔥' : ''

  return (
    <div className="flex h-[520px] w-[360px] flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h1 className="text-sm font-semibold tracking-tight">Cognitive Mode</h1>
        <button
          type="button"
          onClick={() => void handleEnabledToggle()}
          aria-pressed={enabled}
          title={enabled ? 'Pause interception' : 'Activate interception'}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              enabled
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                : 'bg-zinc-600'
            }`}
          />
          {enabled ? 'Active' : 'Paused'}
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4">
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Intercepted
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
              {stats?.totalInterceptions ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
            <div className="flex items-start justify-between gap-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Think Time
              </p>
              <button
                type="button"
                onClick={handleShareProgress}
                disabled={!stats}
                title="Share progress on X"
                aria-label="Share progress on X"
                className="shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-3 w-3 fill-current"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug text-zinc-50">
              {stats?.timeSavedThinking ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Streak
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
              {stats?.activeStreak ?? '—'}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Self-solved
          </h2>
          <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
            <p className="min-w-0">
              <span>Self-solved today:</span>
              <span className="mt-1 block font-mono tabular-nums text-zinc-100">
                {selfSolvedToday ?? '—'}
              </span>
            </p>
            <p className="min-w-0">
              <span>Current streak:</span>
              <span className="mt-1 block font-mono tabular-nums text-zinc-100">
                {currentSelfSolvedStreak ?? '—'}
                {currentSelfSolvedStreak !== null ? ` days${streakSuffix}` : ''}
              </span>
            </p>
            <p className="min-w-0">
              <span>All time:</span>
              <span className="mt-1 block font-mono tabular-nums text-zinc-100">
                {selfSolvedStats?.totalSelfSolved ?? '—'}
                <span className="block text-[10px] text-zinc-500">solved without AI</span>
              </span>
            </p>
          </div>
        </section>

        <section className="flex min-h-[120px] flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Recent Activity
            </h2>
            <button
              type="button"
              onClick={() =>
                chrome.tabs.create({ url: chrome.runtime.getURL('history.html') })
              }
              className="text-[11px] font-medium text-zinc-400 transition hover:text-zinc-200"
            >
              View Full History →
            </button>
          </div>
          <ul className="activity-feed min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {recentLogs.length === 0 ? (
              <li className="rounded-md border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-500">
                No hypotheses logged yet.
              </li>
            ) : (
              recentLogs.map((log) => (
                <li
                  key={log.timestamp}
                  className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                >
                  <time className="text-[11px] text-zinc-500">
                    {formatTimestamp(log.timestamp)}
                  </time>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                    {truncateHypothesis(log.hypothesis)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-4 py-3">
        <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Settings
        </h2>
        <label htmlFor="friction-delay" className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">Friction Delay</span>
          <span className="font-mono text-xs tabular-nums text-zinc-200">{frictionDelay}s</span>
        </label>
        <input
          id="friction-delay"
          type="range"
          min={FRICTION_DELAY_MIN}
          max={FRICTION_DELAY_MAX}
          step={1}
          value={frictionDelay}
          onChange={(e) => void handleFrictionDelayChange(Number(e.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-emerald-500"
        />
        <p className="mt-1.5 text-[10px] text-zinc-600">
          {FRICTION_DELAY_MIN}–{FRICTION_DELAY_MAX} seconds before unlock
        </p>
      </footer>
    </div>
  )
}

export default App
