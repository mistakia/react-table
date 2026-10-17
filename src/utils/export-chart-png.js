// Highcharts sizes an export from `exporting.sourceWidth`/`sourceHeight`, then
// `chart.width`/`height`, then a `px` inline width on the container, and finally
// a 600x400 default (modules/exporting.js getSVG). The chart overlays size their
// container in PERCENT, so the px probe finds nothing and the export ships a
// 600px-wide image that squishes the rendered chart into a square. Handing the
// export the live rendered dimensions is what makes the PNG match the screen.

export const export_chart_png = (chart) => {
  if (!chart) return

  const options = { type: 'image/png' }
  if (chart.chartWidth > 0) options.sourceWidth = chart.chartWidth
  if (chart.chartHeight > 0) options.sourceHeight = chart.chartHeight

  if (typeof chart.exportChartLocal === 'function') {
    chart.exportChartLocal(options)
  } else if (typeof chart.exportChart === 'function') {
    chart.exportChart(options)
  }
}
