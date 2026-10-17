import {
  is_param_value_admissible,
  resolve_column_params
} from './resolve-column-params.js'

// What params a column keeps when its STAT is changed to a different column.
//
// A carried param survives only if the new column DECLARES it and the held
// VALUE is still admissible under that declaration. The key test alone was not
// enough: `output` is declared on every from-plays and ratio column, so a copied
// "per game" rate rode onto a column that offers no such period and the view
// died on the server's refusal. Judging the value drops a rate the new column
// cannot serve and keeps one it can.
//
// Two rules, in this order. A carried param is first handed to
// `resolve_column_params`, which REPAIRS a value the new siblings strand by
// resetting it to a default (`market_type` -> `selection_type` is the case it
// exists for). Whatever is still inadmissible afterwards is DROPPED, because
// the resolver can only repair a param that has a default to put in place —
// `output` declares `default_value: null`, so an incompatible rate comes back
// unchanged and would ride onto the new column exactly as reported. Dropping is
// also what the report asks for: editing a copied field's stat to one that
// cannot serve the rate should unapply the rate.
//
// A new column that declares no params keeps none, which is what the caller did
// before this existed — a param on a column that does not declare it is the same
// defect one level down.
//
// `fill_unset: false` because the carried set is a deliberate state: this must
// not hand the new column defaults for params the user never set.
export const resolve_carried_column_params = ({
  previous_params,
  next_column_params,
  data_type_select
}) => {
  if (!next_column_params) return {}

  const carried = Object.fromEntries(
    Object.entries(previous_params || {}).filter(
      ([key]) => next_column_params[key]
    )
  )

  const resolved = resolve_column_params({
    column_params: next_column_params,
    params: carried,
    data_type_select,
    fill_unset: false
  }).params

  return Object.fromEntries(
    Object.entries(resolved).filter(([key, value]) => {
      const param_definition = next_column_params[key]
      if (!param_definition) return false
      return is_param_value_admissible({
        param_definition,
        params: resolved,
        value
      })
    })
  )
}

export default resolve_carried_column_params
