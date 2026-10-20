// Reshape a filter's value when its operator changes. IN and NOT IN take a
// list and every other value-bearing operator takes one value, so switching
// across that line has to convert the value both ways. Converting only into IN
// left a filter switched back to Equal to holding ["RB"], which the server
// bound as the Postgres array literal '{"RB"}' and matched nothing.
const LIST_OPERATORS = ['IN', 'NOT IN']
const VALUELESS_OPERATORS = [
  'IS NULL',
  'IS NOT NULL',
  'IS EMPTY',
  'IS NOT EMPTY'
]

const is_present = (value) =>
  value !== undefined && value !== null && value !== ''

export const coerce_where_value_for_operator = ({ operator, value }) => {
  if (LIST_OPERATORS.includes(operator)) {
    return [].concat(value).filter(is_present)
  }
  if (VALUELESS_OPERATORS.includes(operator)) return value
  if (Array.isArray(value)) return value.find(is_present) ?? ''
  return value
}
