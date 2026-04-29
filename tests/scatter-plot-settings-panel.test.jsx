import { describe, expect, test, mock, beforeAll, afterAll, afterEach } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import ScatterPlotSettingsPanel from '../src/scatter-plot-overlay/scatter-plot-settings-panel'

beforeAll(() => {
  GlobalRegistrator.register()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  GlobalRegistrator.unregister()
})

let _containers = []

const make_container = () => {
  const div = document.createElement('div')
  document.body.appendChild(div)
  _containers.push(div)
  return div
}

afterEach(async () => {
  for (const c of _containers) {
    if (c._react_root) {
      await act(async () => { c._react_root.unmount() })
    }
    c.remove()
  }
  _containers = []
})

const render = async (ui, container) => {
  await act(async () => {
    const root = createRoot(container)
    container._react_root = root
    root.render(ui)
  })
}

const default_options = {}

describe('ScatterPlotSettingsPanel — toolbar controls', () => {
  test('renders regression, tier, x-mean, y-mean, settings, download buttons and point-color select', async () => {
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: default_options,
        on_change: () => {},
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    const buttons = container.getElementsByTagName('button')
    const button_texts = Array.from(buttons).map((b) =>
      b.textContent.toLowerCase()
    )

    expect(button_texts.some((t) => t.includes('regression'))).toBe(true)
    expect(button_texts.some((t) => t.includes('tier'))).toBe(true)
    expect(button_texts.some((t) => t.includes('x mean'))).toBe(true)
    expect(button_texts.some((t) => t.includes('y mean'))).toBe(true)
    expect(button_texts.some((t) => t.includes('settings'))).toBe(true)
    expect(button_texts.some((t) => t.includes('download'))).toBe(true)

    const selects = container.getElementsByTagName('select')
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })

  test('clicking Settings... opens the modal', async () => {
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: default_options,
        on_change: () => {},
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    // Modal should not be present initially
    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).toBe(false)

    const buttons = Array.from(container.getElementsByTagName('button'))
    const settings_btn = buttons.find((b) =>
      b.textContent.toLowerCase().includes('settings')
    )
    expect(settings_btn).toBeDefined()

    await act(async () => {
      settings_btn.click()
    })

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).toBe(true)
  })

  test('Cancel button closes the modal without calling on_change', async () => {
    const on_change = mock(() => {})
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: default_options,
        on_change,
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    const settings_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase().includes('settings'))

    await act(async () => {
      settings_btn.click()
    })

    const cancel_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase().includes('cancel'))

    await act(async () => {
      cancel_btn.click()
    })

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).toBe(false)
    expect(on_change).not.toHaveBeenCalled()
  })

  test('Save button closes the modal', async () => {
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: default_options,
        on_change: () => {},
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    const settings_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase().includes('settings'))

    await act(async () => {
      settings_btn.click()
    })

    const save_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase() === 'save')

    await act(async () => {
      save_btn.click()
    })

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).toBe(false)
  })

  test('on_change is called with deep-cloned options when toggling tier grid', async () => {
    const received = []
    const on_change = (opts) => received.push(opts)
    const initial = { show_tier_grid: false }
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: initial,
        on_change,
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    const tier_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase().includes('tier'))

    await act(async () => {
      tier_btn.click()
    })

    expect(received.length).toBe(1)
    expect(received[0].show_tier_grid).toBe(true)
    // Confirm deep clone — not the same reference as initial
    expect(received[0]).not.toBe(initial)
  })

  test('on_toggle_regression is called when clicking Regression button', async () => {
    const toggle = mock(() => {})
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: default_options,
        on_change: () => {},
        show_regression: false,
        on_toggle_regression: toggle,
        on_download_png: () => {}
      }),
      container
    )

    const reg_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase().includes('regression'))

    await act(async () => {
      reg_btn.click()
    })

    expect(toggle).toHaveBeenCalledTimes(1)
  })

  test('Save with no changes does NOT call on_change', async () => {
    const on_change = mock(() => {})
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: default_options,
        on_change,
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    const settings_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase().includes('settings'))

    await act(async () => {
      settings_btn.click()
    })

    const save_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase() === 'save')

    await act(async () => {
      save_btn.click()
    })

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).toBe(false)
    expect(on_change).not.toHaveBeenCalled()
  })

  test('prop updates after mount propagate into the rendered toolbar state', async () => {
    const container = make_container()
    const initial = { show_tier_grid: false }
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: initial,
        on_change: () => {},
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    // Initially tier button should not be active
    const get_tier_btn = () =>
      Array.from(container.getElementsByTagName('button')).find((b) =>
        b.textContent.toLowerCase().includes('tier')
      )

    expect(get_tier_btn().className.includes('active')).toBe(false)

    // Re-render with updated prop
    await act(async () => {
      container._react_root.render(
        React.createElement(ScatterPlotSettingsPanel, {
          scatter_plot_options: { show_tier_grid: true },
          on_change: () => {},
          show_regression: false,
          on_toggle_regression: () => {},
          on_download_png: () => {}
        })
      )
    })

    expect(get_tier_btn().className.includes('active')).toBe(true)
  })
})
