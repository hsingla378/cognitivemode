import { initInterceptor, type InterceptorHandle } from './interceptor'
import { mountOverlay } from './mount'
import { getSettings, recordGateTriggered, recordSelfSolved, saveCognitiveLog } from './storage'
import type { OverlayController, PendingSubmit } from './types'

let pendingSubmit: PendingSubmit | null = null
let overlay: OverlayController | null = null
let interceptor: InterceptorHandle | null = null

const EXTENSION_META_NAME = 'cognitivemode-extension'
const EXTENSION_READY_EVENT = 'cognitivemode:ready'
const SETTINGS_KEY = 'cognitive_settings'

function isLandingPage(): boolean {
  const { hostname } = window.location
  return hostname === 'cognitivemode.app' || hostname === 'localhost'
}

function injectExtensionMetaTag(): void {
  if (document.querySelector(`meta[name="${EXTENSION_META_NAME}"]`)) return

  const meta = document.createElement('meta')
  meta.name = EXTENSION_META_NAME
  meta.content = 'installed'
  document.head.appendChild(meta)
}

function dispatchExtensionReadyEvent(): void {
  window.dispatchEvent(new CustomEvent(EXTENSION_READY_EVENT))
}

function startInterception() {
  if (interceptor) return

  overlay =
    overlay ??
    mountOverlay({
      async onSubmit({ hypothesis, tried, durationSeconds }) {
        const submit = pendingSubmit
        pendingSubmit = null

        await saveCognitiveLog(hypothesis, tried, durationSeconds)
        interceptor?.unlock(submit?.trigger)
      },
      async onSelfSolved({ hypothesis }) {
        pendingSubmit = null

        await recordSelfSolved(hypothesis)
        interceptor?.releaseIntercept()
      },
      onDismiss() {
        pendingSubmit = null
        interceptor?.releaseIntercept()
      },
    })

  interceptor = initInterceptor((pending) => {
    pendingSubmit = pending
    void recordGateTriggered()
    overlay?.show(pending)
  })
}

function stopInterception() {
  pendingSubmit = null
  overlay?.hide()
  interceptor?.destroy()
  interceptor = null
}

async function applyEnabledState(enabled: boolean) {
  if (enabled) {
    startInterception()
  } else {
    stopInterception()
  }
}

async function init() {
  if (isLandingPage()) {
    injectExtensionMetaTag()
    dispatchExtensionReadyEvent()
    console.debug('[Cognitive Mode] extension handshake active')
    return
  }

  const settings = await getSettings()
  await applyEnabledState(settings.enabled)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return

    const next = changes[SETTINGS_KEY].newValue
    const enabled =
      next &&
      typeof next === 'object' &&
      'enabled' in next &&
      typeof next.enabled === 'boolean'
        ? next.enabled
        : true

    void applyEnabledState(enabled)
  })

  console.debug('[Cognitive Mode] content script active')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true })
} else {
  void init()
}
