import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

import ScatterPlotSettingsPanel from '../src/scatter-plot-overlay/scatter-plot-settings-panel'

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

describe('ScatterPlotSettingsPanel - toolbar controls', () => {
  it('renders regression, tier, x-mean, y-mean, settings, download buttons and point-color select', async () => {
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

    expect(button_texts.some((t) => t.includes('regression'))).to.equal(true)
    expect(button_texts.some((t) => t.includes('tier'))).to.equal(true)
    expect(button_texts.some((t) => t.includes('x mean'))).to.equal(true)
    expect(button_texts.some((t) => t.includes('y mean'))).to.equal(true)
    expect(button_texts.some((t) => t.includes('settings'))).to.equal(true)
    expect(button_texts.some((t) => t.includes('download'))).to.equal(true)

    const selects = container.getElementsByTagName('select')
    expect(selects.length).to.be.at.least(1)
  })

  it('clicking Settings... opens the modal', async () => {
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

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).to.equal(false)

    const buttons = Array.from(container.getElementsByTagName('button'))
    const settings_btn = buttons.find((b) =>
      b.textContent.toLowerCase().includes('settings')
    )
    expect(settings_btn).to.not.be.undefined

    await act(async () => {
      settings_btn.click()
    })

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).to.equal(true)
  })

  it('Cancel button closes the modal without calling on_change', async () => {
    const on_change = sinon.spy()
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
    ).to.equal(false)
    expect(on_change.called).to.equal(false)
  })

  it('Save button closes the modal', async () => {
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

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).to.equal(false)
  })

  it('on_change is called with deep-cloned options when toggling tier grid', async () => {
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

    expect(received.length).to.equal(1)
    expect(received[0].show_tier_grid).to.equal(true)
    expect(received[0]).to.not.equal(initial)
  })

  it('on_toggle_regression is called when clicking Regression button', async () => {
    const toggle = sinon.spy()
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

    expect(toggle.callCount).to.equal(1)
  })

  it('Save with no changes does NOT call on_change', async () => {
    const on_change = sinon.spy()
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

    expect(
      container.innerHTML.includes('scatter-plot-settings-modal')
    ).to.equal(false)
    expect(on_change.called).to.equal(false)
  })

  it('Save preserves toolbar fields updated while modal is open (no stale-draft regression)', async () => {
    const on_change = sinon.spy()
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: { point_color_mode: 'team' },
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

    await act(async () => {
      container._react_root.render(
        React.createElement(ScatterPlotSettingsPanel, {
          scatter_plot_options: {
            point_color_mode: 'team',
            show_tier_grid: true
          },
          on_change,
          show_regression: false,
          on_toggle_regression: () => {},
          on_download_png: () => {}
        })
      )
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

    expect(on_change.called).to.equal(true)
    const saved = on_change.lastCall.args[0]
    expect(saved.show_tier_grid).to.equal(true)
    expect(saved.point_color_mode).to.equal('team')
  })

  it('prop updates after mount propagate into the rendered toolbar state', async () => {
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

    const get_tier_btn = () =>
      Array.from(container.getElementsByTagName('button')).find((b) =>
        b.textContent.toLowerCase().includes('tier')
      )

    expect(get_tier_btn().className.includes('active')).to.equal(false)

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

    expect(get_tier_btn().className.includes('active')).to.equal(true)
  })
})

describe('ScatterPlotSettingsModal - reference lines editor', () => {
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

  it('shows Add reference line button in modal', async () => {
    const container = make_container()
    await open_modal(container)
    const btns = Array.from(container.getElementsByTagName('button'))
    expect(
      btns.some((b) => b.textContent.includes('Add reference line'))
    ).to.equal(true)
  })

  it('clicking Add reference line adds a row', async () => {
    const container = make_container()
    await open_modal(container)

    const add_btn = Array.from(container.getElementsByTagName('button')).find(
      (b) => b.textContent.includes('Add reference line')
    )
    await act(async () => {
      add_btn.click()
    })

    const rows = container.querySelectorAll('.ref-line-row')
    expect(rows.length).to.equal(1)
  })

  it('adding two rows then deleting one leaves one row', async () => {
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

    expect(container.querySelectorAll('.ref-line-row').length).to.equal(2)

    const delete_btns = container.querySelectorAll('.ref-line-delete')
    await act(async () => {
      delete_btns[0].click()
    })

    expect(container.querySelectorAll('.ref-line-row').length).to.equal(1)
  })

  it('Save calls on_change with reference_lines array when a line is added', async () => {
    const on_change = sinon.spy()
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

    expect(on_change.callCount).to.equal(1)
    const saved = on_change.firstCall.args[0]
    expect(Array.isArray(saved.reference_lines)).to.equal(true)
    expect(saved.reference_lines.length).to.equal(1)
    expect(saved.reference_lines[0].axis).to.equal('x')
    expect(saved.reference_lines[0].value).to.equal(0)
    expect(saved.reference_lines[0].color).to.equal('#888888')
  })

  it('Save with existing reference_lines prop preserves them in on_change', async () => {
    const on_change = sinon.spy()
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

    expect(container.querySelectorAll('.ref-line-row').length).to.equal(1)

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

    expect(on_change.callCount).to.equal(1)
    const saved = on_change.firstCall.args[0]
    expect(saved.reference_lines.length).to.equal(2)
    expect(saved.reference_lines[0].label).to.equal('midpoint')
  })

  it('mean toggle buttons still work alongside reference_lines', async () => {
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

    expect(received.length).to.equal(1)
    expect(typeof received[0].show_x_mean_line).to.equal('boolean')
    expect(received[0].reference_lines).to.not.be.undefined
    expect(Array.isArray(received[0].reference_lines)).to.equal(true)
  })
})

describe('ScatterPlotSettingsModal - custom title and subtitle (S11)', () => {
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

  it('custom title input is rendered in modal', async () => {
    const container = make_container()
    await open_modal(container)
    const input = container.querySelector('#custom-title-input')
    expect(input).to.not.equal(null)
    expect(input.tagName.toLowerCase()).to.equal('input')
    expect(input.type).to.equal('text')
  })

  it('custom subtitle textarea is rendered in modal', async () => {
    const container = make_container()
    await open_modal(container)
    const textarea = container.querySelector('#custom-subtitle-input')
    expect(textarea).to.not.equal(null)
    expect(textarea.tagName.toLowerCase()).to.equal('textarea')
  })

  it('custom title input shows existing value from scatter_plot_options', async () => {
    const container = make_container()
    await open_modal(container, { custom_title: 'My Title' })
    const input = container.querySelector('#custom-title-input')
    expect(input.value).to.equal('My Title')
  })

  it('Save with custom_title calls on_change with custom_title set', async () => {
    const on_change = sinon.spy()
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

    expect(on_change.callCount).to.equal(1)
    const saved = on_change.firstCall.args[0]
    expect(saved.custom_title).to.be.undefined
  })

  it('Save with pre-existing custom_title preserves it in on_change payload', async () => {
    const on_change = sinon.spy()
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

    expect(on_change.callCount).to.equal(1)
    const saved = on_change.firstCall.args[0]
    expect(saved.custom_title).to.equal('My Title')
  })
})

describe('ScatterPlotSettingsModal - font family (S12)', () => {
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

  it('font-family select is rendered in modal', async () => {
    const container = make_container()
    await open_modal(container)
    const select = container.querySelector('#font-family-select')
    expect(select).to.not.equal(null)
    expect(select.tagName.toLowerCase()).to.equal('select')
  })

  it('font-family select has Default option with empty value', async () => {
    const container = make_container()
    await open_modal(container)
    const select = container.querySelector('#font-family-select')
    const default_option = Array.from(select.options).find(
      (o) => o.value === ''
    )
    expect(default_option).to.not.be.undefined
    expect(default_option.text).to.equal('Default')
  })

  it('font-family select pre-selects existing font_family from options', async () => {
    const container = make_container()
    await open_modal(container, { font_family: 'Georgia' })
    const select = container.querySelector('#font-family-select')
    expect(select.value).to.equal('Georgia')
  })

  it('Save with pre-existing font_family preserves it in on_change payload', async () => {
    const on_change = sinon.spy()
    const container = make_container()
    await render(
      React.createElement(ScatterPlotSettingsPanel, {
        scatter_plot_options: { font_family: 'serif' },
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

    expect(on_change.callCount).to.equal(1)
    const saved = on_change.firstCall.args[0]
    expect(saved.font_family).to.equal('serif')
  })

  it('Save with no font_family in options does not add font_family key', async () => {
    const on_change = sinon.spy()
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

    expect(on_change.callCount).to.equal(1)
    const saved = on_change.firstCall.args[0]
    expect(saved.font_family).to.be.undefined
  })
})
