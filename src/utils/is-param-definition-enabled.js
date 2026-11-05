// Whether a param's control is offered under the table's row axes and row
// grain. A param keyed on something a row may lack -- a year to offset from, a
// team or player to attribute to -- declares where it applies, and is hidden
// everywhere else:
//
//   enable_on_row_axes   offered only when one of these axes is active
//   disable_on_row_axes  offered only when no axis is active
//   enable_on_row_grains offered only at one of these row grains
//
// A definition that declares none of them is offered everywhere. `row_grain`
// is the active grain id (`table_state.row_grain[0]`); with none known the
// grain gate stands aside rather than hiding every grain-scoped control.
export const is_param_definition_enabled = ({
  param_definition,
  row_axes = [],
  row_grain = null
}) => {
  if (param_definition?.enable_on_row_axes) {
    const is_axis_enabled = (row_axes || []).some((row_axis) =>
      param_definition.enable_on_row_axes.includes(row_axis)
    )
    if (!is_axis_enabled) return false
  }

  if (param_definition?.disable_on_row_axes && (row_axes || []).length) {
    return false
  }

  if (
    param_definition?.enable_on_row_grains &&
    row_grain &&
    !param_definition.enable_on_row_grains.includes(row_grain)
  ) {
    return false
  }

  return true
}
