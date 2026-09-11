import { derive_bar_chart_data, format_bar_value } from './bar-chart-data.js'

export const BAR_LABEL_FONT_SIZE = 10
export const BAR_LOGO_SIZE = 26

// Gap between the bar end and the value label, in pixels. Sized to clear the
// logo that rides on the bar end -- without it the two draw on top of each
// other, which is legible for neither.
const VALUE_LABEL_OFFSET = BAR_LOGO_SIZE * 0.85

export const AVERAGE_LINE_COLOR = '#333333'

// A Highcharts options object and nothing more -- no Highcharts import, no
// React. Keeping it pure is what lets the specs assert the chart's actual
// content (series data, plot lines, axis extremes, label formatting) rather
// than assert that a component mounted.
export const build_bar_chart_options = ({
  data,
  accessor_path,
  column = {},
  get_label = () => '',
  get_color = null,
  get_image = null,
  bar_chart_options = {},
  footer_text = null,
  height = 600
}) => {
  const orientation =
    bar_chart_options.orientation === 'horizontal' ? 'horizontal' : 'vertical'
  const is_horizontal = orientation === 'horizontal'
  const reverse_category_axis = bar_chart_options.reverse_category_axis === true

  const rank_window =
    bar_chart_options.rank_window === 'bottom' ? 'bottom' : 'top'

  const derived = derive_bar_chart_data({
    data,
    accessor_path,
    get_label,
    get_color,
    get_image,
    logo_size: BAR_LOGO_SIZE,
    value_decimals_override: bar_chart_options.value_decimals ?? null,
    // Passed through UNCOALESCED. `?? null` here would collapse the absent
    // case onto the explicit-null case and turn every default chart into an
    // uncapped one.
    row_limit: bar_chart_options.row_limit,
    rank_window,
    include_average_in_extremes: bar_chart_options.show_average_line !== false
  })

  const {
    categories,
    bar_points,
    logo_points,
    average,
    value_decimals,
    axis_extremes,
    is_empty,
    total_row_count,
    is_truncated,
    scope_text
  } = derived

  const metric_base =
    column.short_label || column.header_label || column.name || 'Value'
  const metric_label = bar_chart_options.custom_y_axis_title || metric_base
  const subject_label = bar_chart_options.custom_x_axis_title || null

  // The scope clause sits in the SUBTITLE, directly under the title, not in
  // the credits line where the reference puts its sample minimum. A reader
  // decides what a ranked chart is a chart OF before reading any bar, and a
  // 10px note in the bottom-right corner is found after. It is appended to the
  // consumer's own subtitle rather than replacing it, and there is no option
  // that removes it -- a chart drawing 40 of 500 has to say so.
  const subtitle_text = [bar_chart_options.custom_subtitle, scope_text]
    .filter(Boolean)
    .join(' — ')

  const font_family = bar_chart_options.font_family || null
  const show_average_line =
    bar_chart_options.show_average_line !== false && average !== null
  const show_value_labels = bar_chart_options.show_value_labels !== false

  // The average line runs across the CATEGORY axis, so its label sits at the
  // start of that axis -- which on a ranked chart is where the longest bar is,
  // in both orientations. Two things follow, and neither transfers from one
  // orientation to the other.
  //
  // Highcharts rotates a plot-line label to 90 degrees when the line is
  // vertical, which an inverted (horizontal-bar) chart makes it. The label then
  // reads sideways down the top of the plot, across the longest bar. Rotation
  // is pinned flat and the label moved to the FOOT of the line, past the
  // shortest bar, which is the only end of a ranked axis with space on it.
  const average_label_placement = is_horizontal
    ? { align: 'left', verticalAlign: 'bottom', rotation: 0, x: 4, y: -6 }
    : { align: 'left', verticalAlign: 'top', rotation: 0, x: 4, y: -4 }

  const average_plot_line = show_average_line
    ? [
        {
          value: average,
          color: AVERAGE_LINE_COLOR,
          width: 1,
          dashStyle: 'Dash',
          // Above the bars. At a lower z the line and its label draw behind
          // them, which on a chart where most bars cross the average leaves
          // the label washed out and the line dashed only in the gaps.
          zIndex: 6,
          label: {
            text: bar_chart_options.average_line_label || 'Average',
            ...average_label_placement,
            style: {
              color: AVERAGE_LINE_COLOR,
              fontSize: `${BAR_LABEL_FONT_SIZE}px`,
              // A halo, because the label sits at the end of the category axis
              // and a ranked chart puts its LONGEST bar exactly there. Dark
              // ink on a dark team colour was unreadable in the browser pass
              // even with the line drawing correctly on top. Kept after
              // re-judging against the reference, whose own average label
              // carries no halo only because its longest bar is nowhere near
              // it -- that is a property of their data, not of the design.
              textOutline: '2px #ffffff'
            }
          }
        }
      ]
    : []

  // The zero baseline is drawn explicitly rather than left to the axis line.
  // With negatives present the axis line sits at the chart's bottom edge, not
  // at zero, so without this the bars below zero have nothing to hang from and
  // the reader cannot see where the sign changes.
  const zero_plot_line = derived.has_negative_values
    ? [
        {
          value: 0,
          color: '#666666',
          width: 1,
          zIndex: 3
        }
      ]
    : []

  const value_axis = {
    title: { text: metric_label },
    min: axis_extremes.min,
    max: axis_extremes.max,
    startOnTick: false,
    endOnTick: false,
    // The grid is scenery, not data. Highcharts' default is a solid line at
    // roughly one per 72px, which on a 760px plot draws thirteen rules behind
    // the bars and competes with the two lines that MEAN something -- the zero
    // baseline and the average. A dotted hairline at a wider interval leaves
    // both of those the only solid horizontals on the chart.
    gridLineColor: '#e8e8e8',
    gridLineDashStyle: 'Dot',
    tickPixelInterval: 90,
    labels: { style: { fontSize: `${BAR_LABEL_FONT_SIZE}px` } },
    plotLines: [...zero_plot_line, ...average_plot_line]
  }

  const category_axis = {
    categories,
    // Which end the ranking starts at. Highcharts already reverses the category
    // axis BY DEFAULT on an inverted chart -- so that categories read downward
    // from the top rather than up from the origin -- which is why the option
    // cannot be passed straight through: the user asks for "the other way
    // round", and what that means in Highcharts terms flips with `inverted`.
    // One shared field rather than one per orientation, because "the ranking
    // runs the other way" is the same request in both.
    reversed: is_horizontal ? !reverse_category_axis : reverse_category_axis,
    title: { text: subject_label },
    // Every subject is labelled, as in the reference. Highcharts otherwise
    // thins category labels when they crowd, which on a ranked chart drops
    // exactly the identity that makes a bar worth looking at.
    labels: {
      step: 1,
      style: { fontSize: `${BAR_LABEL_FONT_SIZE}px` }
    },
    lineWidth: 1,
    tickLength: 0
  }

  // The value label sits at the bar's value end and OUTSIDE it -- above a
  // positive bar, below a negative one. That flip cannot live on the series,
  // where `y` is a single static number: one offset pushes the positive labels
  // clear and drives the negative ones back down INTO their own bars, on top
  // of the logo already sitting there. Measured in a browser against real
  // 2024 team EPA, where 21 of 32 bars are negative.
  //
  // Only placement is set per point. The formatter, style and crop rules stay
  // on the series, which is what keeps every label formatting alike.
  const labelled_bar_points = bar_points.map((point) => {
    const is_negative = point.y < 0
    const placement = is_horizontal
      ? {
          x: is_negative ? -VALUE_LABEL_OFFSET : VALUE_LABEL_OFFSET,
          y: 0,
          align: is_negative ? 'right' : 'left'
        }
      : {
          x: 0,
          y: is_negative ? VALUE_LABEL_OFFSET : -VALUE_LABEL_OFFSET,
          verticalAlign: is_negative ? 'top' : 'bottom'
        }
    return { ...point, dataLabels: placement }
  })

  const series = [
    {
      id: 'bar-chart-bars',
      type: is_horizontal ? 'bar' : 'column',
      name: metric_label,
      data: labelled_bar_points,
      // Per-subject colour is the point of this chart, so a single series
      // colour would be wrong even as a fallback for rows the resolver
      // declines; those fall through to this neutral ink.
      color: '#4a5568',
      borderWidth: 0,
      // Square ends. Highcharts 12 rounds a column by default, and on this
      // chart the rounding lands exactly where the value is read -- the bar's
      // value end, under the logo riding on it, so a bar's tip reads short of
      // where it stops. The reference's bars are square for the same reason.
      borderRadius: 0,
      groupPadding: 0.05,
      pointPadding: 0.05,
      // Highcharts divides the plot width among the categories, so a result of
      // one or two rows draws a bar hundreds of pixels wide -- a shape that
      // reads as a filled panel rather than as a bar, and swamps the logo
      // sitting on its end. Tied to the logo because the logo is what the cap
      // protects: a bar wide enough to lose the mark on its end has stopped
      // being a bar. Far above the width a full 32-subject chart produces, so
      // it binds only the degenerate case.
      maxPointWidth: BAR_LOGO_SIZE * 3,
      dataLabels: {
        enabled: show_value_labels,
        // Outside the bar end, on both signs. `inside: false` plus `crop` and
        // `overflow` off is what keeps a label on a bar that reaches the top
        // of the plot from being silently dropped.
        //
        // The OFFSET that clears the logo is set per point, not here, because
        // it has to follow the sign -- see labelled_bar_points above.
        inside: false,
        crop: false,
        overflow: 'allow',
        style: {
          fontSize: `${BAR_LABEL_FONT_SIZE}px`,
          fontWeight: 'normal',
          textOutline: 'none',
          ...(font_family ? { fontFamily: font_family } : {})
        },
        formatter: function () {
          return format_bar_value({
            value: this.y,
            decimals: value_decimals
          })
        }
      }
    }
  ]

  if (logo_points.length) {
    series.push({
      id: 'bar-chart-logos',
      type: 'scatter',
      name: 'logos',
      data: logo_points,
      enableMouseTracking: false,
      showInLegend: false,
      zIndex: 5,
      states: { hover: { enabled: false } },
      dataLabels: { enabled: false }
    })
  }

  return {
    chart: {
      type: is_horizontal ? 'bar' : 'column',
      height,
      // Highcharts writes its OWN font stack into the SVG, so a chart inside a
      // styled app renders in Lucida Grande while every label around it is on
      // the app's face -- the one divergence a consumer cannot fix from the
      // outside, because no CSS on an ancestor reaches past an inline style.
      // Defaulting to `inherit` hands the decision back to the page. An
      // explicit `font_family` still wins, for an export that has to stand on
      // its own away from the app's stylesheet.
      style: { fontFamily: font_family || 'inherit' }
    },
    title: {
      text: bar_chart_options.custom_title || metric_label
    },
    subtitle: subtitle_text
      ? {
          text: subtitle_text,
          style: { fontSize: '10px', fontWeight: 'normal' }
        }
      : undefined,
    // Highcharts swaps which physical axis is which for a 'bar' chart, but the
    // ROLES do not swap: xAxis is always the category axis and yAxis always
    // the value axis. Assigning by role rather than by position is why the
    // orientation toggle is a one-line change.
    xAxis: category_axis,
    yAxis: value_axis,
    legend: { enabled: false },
    credits: footer_text
      ? {
          enabled: true,
          text: footer_text,
          href: null,
          position: { align: 'right', x: -10, y: -6 },
          style: { fontSize: '10px', cursor: 'default' }
        }
      : { enabled: false },
    tooltip: {
      formatter: function () {
        const label = this.point?.label ?? this.x
        const value = format_bar_value({
          value: this.y,
          decimals: value_decimals
        })
        return `<b>${label}</b><br/>${metric_label}: ${value}`
      }
    },
    plotOptions: {
      series: {
        animation: false,
        states: { inactive: { opacity: 1 } }
      }
    },
    series,
    exporting: { enabled: true },
    // Carried out so the component can render an empty state instead of an
    // axis pair over blank space, and so specs can assert the empty case
    // without reaching into the series array.
    custom: {
      is_empty,
      row_count: bar_points.length,
      total_row_count,
      is_truncated,
      scope_text,
      rank_window,
      average,
      value_decimals
    }
  }
}

export default build_bar_chart_options
