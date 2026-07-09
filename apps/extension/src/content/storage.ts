import type { CognitiveEntry } from './types'

const STORAGE_KEY = 'cognitive_entries'
const SETTINGS_KEY = 'cognitive_settings'
const BYPASS_KEY = 'cognitive_daily_bypass'
const SELF_SOLVED_STATS_KEY = 'cognitivemode_stats'
const DAILY_BYPASS_LIMIT = 1
const DEFAULT_COUNTDOWN_DURATION = 15
const MIN_COUNTDOWN_DURATION = 5
const MAX_COUNTDOWN_DURATION = 60
const SECONDS_PER_INTERCEPTION = 15

export interface Settings {
  countdownDuration: number
  enabled: boolean
}

export interface Stats {
  totalInterceptions: number
  timeSavedThinking: string
  activeStreak: number
}

export interface SelfSolvedHistoryEntry {
  date: string
  domain: string
  hypothesis: string
}

export interface SelfSolvedStats {
  totalGatesTriggered: number
  totalSelfSolved: number
  currentStreak: number
  longestStreak: number
  lastSelfSolvedDate: string
  selfSolvedHistory: SelfSolvedHistoryEntry[]
}

interface BypassState {
  date: string
  remaining: number
}

const DEFAULT_SETTINGS: Settings = {
  countdownDuration: DEFAULT_COUNTDOWN_DURATION,
  enabled: true,
}

function isExtensionContextInvalidated(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Extension context invalidated')
}

async function safeStorageGet(
  key: string,
  fallback: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    return chrome.storage.local.get(key)
  } catch (error) {
    if (isExtensionContextInvalidated(error)) return fallback
    throw error
  }
}

async function safeStorageSet(values: Record<string, unknown>): Promise<boolean> {
  try {
    await chrome.storage.local.set(values)
    return true
  } catch (error) {
    if (isExtensionContextInvalidated(error)) return false
    throw error
  }
}

function clampCountdownDuration(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COUNTDOWN_DURATION
  return Math.min(MAX_COUNTDOWN_DURATION, Math.max(MIN_COUNTDOWN_DURATION, Math.round(value)))
}

function getCalendarDate(): string {
  const now = new Date()
  return formatCalendarDate(now)
}

function formatCalendarDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPreviousCalendarDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const previous = new Date(year, month - 1, day)
  previous.setDate(previous.getDate() - 1)
  return formatCalendarDate(previous)
}

function calculateActiveStreak(logs: CognitiveEntry[]): number {
  const loggedDates = new Set(logs.map((entry) => formatCalendarDate(new Date(entry.timestamp))))
  const cursor = new Date()
  let streak = 0

  while (loggedDates.has(formatCalendarDate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function createDefaultSelfSolvedStats(): SelfSolvedStats {
  return {
    totalGatesTriggered: 0,
    totalSelfSolved: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSelfSolvedDate: '',
    selfSolvedHistory: [],
  }
}

function isSelfSolvedHistoryEntry(value: unknown): value is SelfSolvedHistoryEntry {
  return (
    !!value &&
    typeof value === 'object' &&
    'date' in value &&
    'domain' in value &&
    'hypothesis' in value &&
    typeof value.date === 'string' &&
    typeof value.domain === 'string' &&
    typeof value.hypothesis === 'string'
  )
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

function normalizeSelfSolvedStats(value: unknown): SelfSolvedStats {
  const defaults = createDefaultSelfSolvedStats()
  if (!value || typeof value !== 'object') return defaults

  const stored = value as Partial<SelfSolvedStats>
  const history = Array.isArray(stored.selfSolvedHistory)
    ? stored.selfSolvedHistory.filter(isSelfSolvedHistoryEntry)
    : defaults.selfSolvedHistory

  return {
    totalGatesTriggered: readNumber(stored.totalGatesTriggered),
    totalSelfSolved: readNumber(stored.totalSelfSolved),
    currentStreak: readNumber(stored.currentStreak),
    longestStreak: readNumber(stored.longestStreak),
    lastSelfSolvedDate:
      typeof stored.lastSelfSolvedDate === 'string' ? stored.lastSelfSolvedDate : '',
    selfSolvedHistory: history,
  }
}

export function updateSelfSolvedStats(
  current: SelfSolvedStats,
  event: SelfSolvedHistoryEntry,
): SelfSolvedStats {
  const previousDate = current.lastSelfSolvedDate
  let currentStreak = 1

  if (previousDate === event.date) {
    currentStreak = current.currentStreak
  } else if (previousDate === getPreviousCalendarDate(event.date)) {
    currentStreak = current.currentStreak + 1
  }

  return {
    ...current,
    totalGatesTriggered: Math.max(current.totalGatesTriggered, current.totalSelfSolved + 1),
    totalSelfSolved: current.totalSelfSolved + 1,
    currentStreak,
    longestStreak: Math.max(current.longestStreak, currentStreak),
    lastSelfSolvedDate: event.date,
    selfSolvedHistory: [...current.selfSolvedHistory, event],
  }
}

export function countSelfSolvedOnDate(stats: SelfSolvedStats, date = getCalendarDate()): number {
  return stats.selfSolvedHistory.filter((entry) => entry.date === date).length
}

async function readBypassState(): Promise<BypassState> {
  const today = getCalendarDate()
  const { [BYPASS_KEY]: stored } = await safeStorageGet(BYPASS_KEY, {})

  if (
    stored &&
    typeof stored === 'object' &&
    'date' in stored &&
    'remaining' in stored &&
    typeof stored.date === 'string' &&
    typeof stored.remaining === 'number' &&
    stored.date === today
  ) {
    return {
      date: today,
      remaining: Math.max(0, stored.remaining),
    }
  }

  return { date: today, remaining: DAILY_BYPASS_LIMIT }
}

export async function getBypasses(): Promise<number> {
  const state = await readBypassState()
  return state.remaining
}

export async function consumeDailyBypass(): Promise<boolean> {
  const state = await readBypassState()
  if (state.remaining <= 0) return false

  const saved = await safeStorageSet({
    [BYPASS_KEY]: {
      date: state.date,
      remaining: state.remaining - 1,
    },
  })

  return saved
}

export async function getCognitiveLogs(): Promise<CognitiveEntry[]> {
  const { [STORAGE_KEY]: existing } = await safeStorageGet(STORAGE_KEY, {})
  return Array.isArray(existing) ? existing : []
}

function formatTimeSaved(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins} mins ${secs} secs`
}

export async function getStats(): Promise<Stats> {
  const logs = await getCognitiveLogs()
  const totalInterceptions = logs.length
  const totalSeconds = logs.reduce(
    (sum, entry) => sum + (entry.durationSeconds ?? SECONDS_PER_INTERCEPTION),
    0,
  )

  return {
    totalInterceptions,
    timeSavedThinking: formatTimeSaved(totalSeconds),
    activeStreak: calculateActiveStreak(logs),
  }
}

export async function getSelfSolvedStats(): Promise<SelfSolvedStats> {
  const { [SELF_SOLVED_STATS_KEY]: stored } = await safeStorageGet(SELF_SOLVED_STATS_KEY, {})
  return normalizeSelfSolvedStats(stored)
}

export async function recordGateTriggered(): Promise<void> {
  const stats = await getSelfSolvedStats()
  await safeStorageSet({
    [SELF_SOLVED_STATS_KEY]: {
      ...stats,
      totalGatesTriggered: stats.totalGatesTriggered + 1,
    },
  })
}

export async function getSettings(): Promise<Settings> {
  const { [SETTINGS_KEY]: stored } = await safeStorageGet(SETTINGS_KEY, {})
  if (stored && typeof stored === 'object') {
    const partial = stored as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...partial,
      countdownDuration:
        typeof partial.countdownDuration === 'number'
          ? clampCountdownDuration(partial.countdownDuration)
          : DEFAULT_SETTINGS.countdownDuration,
      enabled: typeof partial.enabled === 'boolean' ? partial.enabled : DEFAULT_SETTINGS.enabled,
    }
  }
  return { ...DEFAULT_SETTINGS }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await safeStorageSet({
    [SETTINGS_KEY]: {
      ...current,
      ...settings,
      countdownDuration:
        settings.countdownDuration !== undefined
          ? clampCountdownDuration(settings.countdownDuration)
          : current.countdownDuration,
      enabled: settings.enabled !== undefined ? settings.enabled : current.enabled,
    },
  })
}

export async function saveCognitiveLog(
  hypothesis: string,
  tried: string,
  durationSeconds = DEFAULT_COUNTDOWN_DURATION,
): Promise<void> {
  const entry: CognitiveEntry = {
    hypothesis,
    tried,
    domain: location.hostname,
    timestamp: Date.now(),
    durationSeconds,
  }

  const entries = await getCognitiveLogs()
  entries.push(entry)

  await safeStorageSet({ [STORAGE_KEY]: entries })
}

export async function recordSelfSolved(hypothesis: string): Promise<void> {
  const stats = await getSelfSolvedStats()
  const event: SelfSolvedHistoryEntry = {
    date: getCalendarDate(),
    domain: location.hostname,
    hypothesis,
  }

  await safeStorageSet({
    [SELF_SOLVED_STATS_KEY]: updateSelfSolvedStats(stats, event),
  })
}
