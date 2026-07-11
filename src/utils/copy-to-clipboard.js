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
