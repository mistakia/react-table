import recorder from '../helpers/record-highcharts-mounts.js' // must precede the component import
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

import BarChartOverlay, {
  BAR_CHART_MOUNT_ANIMATION_MS
} from '../../src/bar-chart-overlay/bar-chart-overlay.js'

// Flipping orientation must throw the chart away and mount a new one, rather
// than hand the changed options to the live chart. highcharts-react-official
// applies a changed options object with chart.update(options, true, true), and
// Highcharts transitions the live bars across the inversion -- which is what
// made a flip read as the whole plot rotating.
//
// What this spec can and cannot see: jsdom renders no chart at all, so nothing
// here asserts what the animation LOOKS like. It asserts the two things that
// cause it -- that React remounted, and that the options the new chart is
// handed permit a build animation. The appearance is verified in a real
// browser (tmp/bar-chart/orientation/ in the league repo), where the prior code
// reads 145px of bar thickness on the first frame after a flip, on its way to
// 13px, and this code reads 13px on the first frame.

const rows = [
  { subject: 'A', value: 3 },
  { subject: 'B', value: 1 },
  { subject: 'C', value: -2 }
]

let container = null

beforeEach(() => {
  recorder.reset()
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(async () => {
  if (container._react_root) {
    await act(async () => container._react_root.unmount())
  }
  container.remove()
  container = null
})

const render_with = async (orientation) => {
  const ui = (
    <BarChartOverlay
      data={rows}
      accessor_path='value'
      column={{ header_label: 'Value' }}
      get_label={(row) => row.subject}
      bar_chart_options={{ orientation }}
      on_close={() => {}}
    />
  )
  await act(async () => {
    if (!container._react_root) {
      container._react_root = createRoot(container)
    }
    container._react_root.render(ui)
  })
}

describe('bar chart orientation', () => {
  it('remounts the chart when the orientation changes', async () => {
    await render_with('vertical')
    await render_with('horizontal')

    const mounts = recorder.mounts.filter((m) => m.event === 'mount')
    const unmounts = recorder.mounts.filter((m) => m.event === 'unmount')

    expect(mounts).to.have.lengthOf(2)
    expect(unmounts).to.have.lengthOf(1)
    // The chart that went away is the one that was there first, and the one
    // standing at the end is new. Without the key there is one mount and no
    // unmount, because React reuses the element and the options change flows
    // through chart.update instead.
    expect(unmounts[0].id).to.equal(mounts[0].id)
    expect(mounts[1].id).to.not.equal(mounts[0].id)
  })

  it('keeps the same chart when a non-orientation option changes', async () => {
    await render_with('vertical')
    await render_with('vertical')

    expect(recorder.mounts.filter((m) => m.event === 'mount')).to.have.lengthOf(
      1
    )
    expect(
      recorder.mounts.filter((m) => m.event === 'unmount')
    ).to.have.lengthOf(0)
  })

  it('gives the mounted chart a build animation', async () => {
    await render_with('vertical')

    const [{ options }] = recorder.mounts.filter((m) => m.event === 'mount')
    // The grow half. A column series animates up from the zero baseline and a
    // bar series out from the side, but only if the series animation the
    // options builder switches off is switched back on for the mount.
    expect(options.plotOptions.series.animation).to.deep.equal({
      duration: BAR_CHART_MOUNT_ANIMATION_MS
    })
  })
})
