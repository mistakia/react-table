import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'

import { copy_deferred_text_to_clipboard } from '../src/utils/copy-to-clipboard.js'

// The property under test is a TIMING one, so every assertion here is about
// when the clipboard was called rather than what landed in it: Safari only
// permits a write while the click's user activation is alive, and awaiting the
// text first spends it.

const original_clipboard_item = globalThis.ClipboardItem
let original_clipboard_descriptor = null

const set_clipboard = (clipboard) => {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
    writable: true
  })
}

beforeEach(() => {
  original_clipboard_descriptor = Object.getOwnPropertyDescriptor(
    globalThis.navigator,
    'clipboard'
  )
})

afterEach(() => {
  if (original_clipboard_descriptor) {
    Object.defineProperty(
      globalThis.navigator,
      'clipboard',
      original_clipboard_descriptor
    )
  } else {
    delete globalThis.navigator.clipboard
  }
  globalThis.ClipboardItem = original_clipboard_item
})

describe('copy_deferred_text_to_clipboard', () => {
  it('calls the clipboard before the text promise resolves', async () => {
    let written_item = null
    let write_call_count = 0
    globalThis.ClipboardItem = class {
      constructor(items) {
        this.items = items
      }
    }
    set_clipboard({
      write: async (items) => {
        write_call_count += 1
        written_item = items[0]
      },
      writeText: async () => {
        throw new Error('writeText must not be used when write is available')
      }
    })

    let resolve_text
    const text_promise = new Promise((resolve) => {
      resolve_text = resolve
    })

    const copy_promise = copy_deferred_text_to_clipboard(text_promise)
    // One microtask turn, which is all the clipboard call gets before the
    // gesture would be spent by a network await.
    await Promise.resolve()
    expect(write_call_count).to.equal(1)

    resolve_text('https://xo.football/s/abc')
    expect(await copy_promise).to.equal(true)

    const blob = await written_item.items['text/plain']
    expect(await blob.text()).to.equal('https://xo.football/s/abc')
  })

  it('falls back to writeText where ClipboardItem is unavailable', async () => {
    delete globalThis.ClipboardItem
    let written_text = null
    set_clipboard({
      writeText: async (text) => {
        written_text = text
      }
    })

    const ok = await copy_deferred_text_to_clipboard(
      Promise.resolve('https://xo.football/s/abc')
    )

    expect(ok).to.equal(true)
    expect(written_text).to.equal('https://xo.football/s/abc')
  })

  it('falls back to writeText when the clipboard refuses the item', async () => {
    globalThis.ClipboardItem = class {
      constructor(items) {
        this.items = items
      }
    }
    let written_text = null
    set_clipboard({
      write: async () => {
        throw new Error('NotAllowedError')
      },
      writeText: async (text) => {
        written_text = text
      }
    })

    const ok = await copy_deferred_text_to_clipboard(
      Promise.resolve('https://xo.football/s/abc')
    )

    expect(ok).to.equal(true)
    expect(written_text).to.equal('https://xo.football/s/abc')
  })
})
