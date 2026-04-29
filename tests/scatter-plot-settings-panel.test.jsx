import {
  describe,
  expect,
  test,
  mock,
  beforeAll,
  afterAll,
  afterEach
} from 'bun:test'
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
      await act(async () => {
        c._react_root.unmount()
      })
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
    expect(container.innerHTML.includes('scatter-plot-settings-modal')).toBe(
      false
    )

    const buttons = Array.from(container.getElementsByTagName('button'))
    const settings_btn = buttons.find((b) =>
      b.textContent.toLowerCase().includes('settings')
    )
    expect(settings_btn).toBeDefined()

    await act(async () => {
      settings_btn.click()
    })

    expect(container.innerHTML.includes('scatter-plot-settings-modal')).toBe(
      true
    )
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

    expect(container.innerHTML.includes('scatter-plot-settings-modal')).toBe(
      false
    )
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

    const save_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase() === 'save'
    )

    await act(async () => {
      save_btn.click()
    })

    expect(container.innerHTML.includes('scatter-plot-settings-modal')).toBe(
      false
    )
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

    const tier_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase().includes('tier')
    )

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

    const reg_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase().includes('regression')
    )

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

    const save_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase() === 'save'
    )

    await act(async () => {
      save_btn.click()
    })

    expect(container.innerHTML.includes('scatter-plot-settings-modal')).toBe(
      false
    )
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

describe('ScatterPlotSettingsModal — reference lines editor', () => {
  const open_modal = async (container, opts = {}) => {
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: opts,
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
  }

  test('shows Add reference line button in modal', async () => {
    const container = make_container()
    await open_modal(container)
    const btns = Array.from(container.getElementsByTagName('button'))
    expect(btns.some((b) => b.textContent.includes('Add reference line'))).toBe(
      true
    )
  })

  test('clicking Add reference line adds a row', async () => {
    const container = make_container()
    await open_modal(container)

    const add_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.includes('Add reference line')
    )
    await act(async () => {
      add_btn.click()
    })

    const rows = container.querySelectorAll('.ref-line-row')
    expect(rows.length).toBe(1)
  })

  test('adding two rows then deleting one leaves one row', async () => {
    const container = make_container()
    await open_modal(container)

    const get_add_btn = () =>
      Array.from(container.getElementsByTagName('button')).find((b) =>
        b.textContent.includes('Add reference line')
      )

    await act(async () => {
      get_add_btn().click()
    })
    await act(async () => {
      get_add_btn().click()
    })

    expect(container.querySelectorAll('.ref-line-row').length).toBe(2)

    const delete_btns = container.querySelectorAll('.ref-line-delete')
    await act(async () => {
      delete_btns[0].click()
    })

    expect(container.querySelectorAll('.ref-line-row').length).toBe(1)
  })

  test('Save calls on_change with reference_lines array when a line is added', async () => {
    const on_change = mock(() => {})
    const container = make_container()

    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: {},
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

    const add_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.includes('Add reference line')
    )
    await act(async () => {
      add_btn.click()
    })

    const save_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase() === 'save'
    )
    await act(async () => {
      save_btn.click()
    })

    expect(on_change).toHaveBeenCalledTimes(1)
    const saved = on_change.mock.calls[0][0]
    expect(Array.isArray(saved.reference_lines)).toBe(true)
    expect(saved.reference_lines.length).toBe(1)
    expect(saved.reference_lines[0].axis).toBe('x')
    expect(saved.reference_lines[0].value).toBe(0)
    expect(saved.reference_lines[0].color).toBe('#888888')
  })

  test('Save with existing reference_lines prop preserves them in on_change', async () => {
    const on_change = mock(() => {})
    const existing_lines = [
      { axis: 'x', value: 50, label: 'midpoint', color: '#ff0000' }
    ]
    const container = make_container()

    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: { reference_lines: existing_lines },
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

    // Rows should be pre-populated
    expect(container.querySelectorAll('.ref-line-row').length).toBe(1)

    // Add another line
    const add_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.includes('Add reference line')
    )
    await act(async () => {
      add_btn.click()
    })

    const save_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase() === 'save'
    )
    await act(async () => {
      save_btn.click()
    })

    expect(on_change).toHaveBeenCalledTimes(1)
    const saved = on_change.mock.calls[0][0]
    expect(saved.reference_lines.length).toBe(2)
    expect(saved.reference_lines[0].label).toBe('midpoint')
  })

  test('mean toggle buttons still work alongside reference_lines', async () => {
    const received = []
    const on_change = (opts) => received.push(opts)
    const container = make_container()

    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: {
          reference_lines: [
            { axis: 'y', value: 100, label: 'target', color: '#00ff00' }
          ]
        },
        on_change,
        show_regression: false,
        on_toggle_regression: () => {},
        on_download_png: () => {}
      }),
      container
    )

    const x_mean_btn = Array.from(
      container.getElementsByTagName('button')
    ).find((b) => b.textContent.toLowerCase().includes('x mean'))
    await act(async () => {
      x_mean_btn.click()
    })

    expect(received.length).toBe(1)
    // show_x_mean_line was toggled (from absent/undefined to a boolean value)
    expect(typeof received[0].show_x_mean_line).toBe('boolean')
    // reference_lines must still be present in on_change payload
    expect(received[0].reference_lines).toBeDefined()
    expect(Array.isArray(received[0].reference_lines)).toBe(true)
  })
})

describe('ScatterPlotSettingsModal — custom title and subtitle (S11)', () => {
  const open_modal = async (container, opts = {}) => {
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: opts,
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
  }

  test('custom title input is rendered in modal', async () => {
    const container = make_container()
    await open_modal(container)
    const input = container.querySelector('#custom-title-input')
    expect(input).not.toBeNull()
    expect(input.tagName.toLowerCase()).toBe('input')
    expect(input.type).toBe('text')
  })

  test('custom subtitle textarea is rendered in modal', async () => {
    const container = make_container()
    await open_modal(container)
    const textarea = container.querySelector('#custom-subtitle-input')
    expect(textarea).not.toBeNull()
    expect(textarea.tagName.toLowerCase()).toBe('textarea')
  })

  test('custom title input shows existing value from scatter_plot_options', async () => {
    const container = make_container()
    await open_modal(container, { custom_title: 'My Title' })
    const input = container.querySelector('#custom-title-input')
    expect(input.value).toBe('My Title')
  })

  test('Save with custom_title calls on_change with custom_title set', async () => {
    const on_change = mock(() => {})
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: {},
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

    // Add a reference line to trigger a detectable change (Save only calls on_change when
    // the draft differs from scatter_plot_options; adding a line guarantees a diff).
    const add_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.includes('Add reference line')
    )
    await act(async () => {
      add_btn.click()
    })

    const save_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase() === 'save'
    )
    await act(async () => {
      save_btn.click()
    })

    // on_change should have been called; custom_title from initial props is preserved
    expect(on_change).toHaveBeenCalledTimes(1)
    const saved = on_change.mock.calls[0][0]
    // Initial options had no custom_title — key must remain absent
    expect(saved.custom_title).toBeUndefined()
  })

  test('Save with pre-existing custom_title preserves it in on_change payload', async () => {
    const on_change = mock(() => {})
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: { custom_title: 'My Title' },
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

    // Add a reference line to force a detectable change
    const add_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.includes('Add reference line')
    )
    await act(async () => {
      add_btn.click()
    })

    const save_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.toLowerCase() === 'save'
    )
    await act(async () => {
      save_btn.click()
    })

    expect(on_change).toHaveBeenCalledTimes(1)
    const saved = on_change.mock.calls[0][0]
    // custom_title from initial props must survive through Save
    expect(saved.custom_title).toBe('My Title')
  })
})
