// Copy text that is not known yet, without losing the click that asked for it.
//
// WebKit only permits a clipboard write while the document still holds the
// transient activation from the user gesture, and an intervening `await` on a
// network call ends it -- so `await fetch(...)` then `writeText(...)` rejects
// with NotAllowedError in Safari while working in Chrome, which grants
// clipboard-write to the focused document outright. The spec's answer is to
// hand `ClipboardItem` the PROMISE synchronously inside the gesture and let the
// browser wait on it; that is what this does, and it is the only path that
// works in Safari for a link the server has yet to mint.
//
// `text_promise` must not reject -- resolve it to whatever should be copied
// instead, since by fallback time the activation is already spent. Returns true
// on success, false otherwise.
export async function copy_deferred_text_to_clipboard(text_promise) {
  if (
    typeof ClipboardItem !== 'undefined' &&
    navigator.clipboard &&
    navigator.clipboard.write
  ) {
    try {
      // Constructed and handed over before any await, deliberately.
      const item = new ClipboardItem({
        'text/plain': text_promise.then(
          (text) => new Blob([text], { type: 'text/plain' })
        )
      })
      await navigator.clipboard.write([item])
      return true
    } catch (err) {
      // fall through to the await-then-write path
    }
  }

  return copy_to_clipboard(await text_promise)
}

// Copy text to the clipboard with a fallback for non-secure contexts.
//
// navigator.clipboard is only defined in secure contexts (HTTPS or localhost);
// an app served over plain HTTP on a non-localhost host has no async Clipboard
// API, so navigator.clipboard is undefined and a direct writeText call throws.
// Fall back to a hidden-textarea + execCommand('copy') so copy keeps working
// there. Returns true on success, false otherwise.
export default async function copy_to_clipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      // fall through to the legacy execCommand path
    }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch (err) {
    return false
  }
}
