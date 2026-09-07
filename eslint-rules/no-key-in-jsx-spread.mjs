// `key` is not a prop. React reads it off the element before the component ever
// sees it, so spreading it in through an object literal is silently different
// from writing it as an attribute -- and React's JSX runtime warns about it at
// render time rather than at build time.
//
// The incident: table-cell.js built its custom-component branch as
// `<div {...{ key: column.columnDef.id, className, style }}>`, which warned on
// every data view carrying a column with a `columnDef.component` (the Team
// column, among others). The key was vestigial -- it sat on the root element a
// component RETURNS, where the real key is already supplied by the parent, and
// the sibling default branch in the same file never had one. It cost a console
// warning per cell for two years and changed nothing.
//
// This repo's house style leans hard on `{...{ }}` for JSX props, which is what
// makes this worth a rule here specifically: the spread is the default way
// props get written, so the foot-gun is on the common path rather than the
// unusual one.
//
// DELIBERATELY NARROW, to the JSX-spread form. `React.createElement(C, { key })`
// and TanStack's `flexRender(C, { key, ...ctx })` also pass key through a props
// object, and React 19 deprecates that too -- but under React 18 it is correct,
// it is the ONLY way to key a dynamically-resolved component, and table.js
// depends on it in two places. Flagging it would demand a refactor that has no
// clean answer today, so the rule stays silent on it and the React 19 upgrade
// picks it up. A version covering both would ship with a baseline file, which is
// a weaker thing than an error with no exemptions.
//
// Static limit worth naming: a key arriving through a nested spread
// (`{...{ ...base, ...rest }}` where `rest` holds it) is invisible here. The
// rule catches the literal property, which is every instance this repo has ever
// had.

const RULE_ID = 'no-key-in-jsx-spread'

// A `key: value` entry written literally in an object expression. `key` in a
// computed position (`{ [k]: v }`) is a different key and not ours to judge;
// shorthand (`{ key }`) and a quoted name (`{ 'key': v }`) are both the real
// thing.
const is_literal_key_property = (property) => {
  if (property.type !== 'Property') return false
  if (property.computed) return false
  const { key } = property
  if (key.type === 'Identifier') return key.name === 'key'
  if (key.type === 'Literal') return key.value === 'key'
  return false
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'ban `key` inside an object literal spread into JSX'
    },
    schema: [],
    fixable: null,
    messages: {
      spread:
        '`key` is not a prop and must not be spread into JSX. React strips it off the element before the component sees it, so this warns at render time on every instance. Either write it as an attribute -- `<div key={...} {...rest} />` -- or drop it: a key on the root element a component returns is supplied by the parent and does nothing here.'
    }
  },
  create(context) {
    return {
      JSXSpreadAttribute(node) {
        if (node.argument?.type !== 'ObjectExpression') return
        for (const property of node.argument.properties) {
          if (is_literal_key_property(property)) {
            context.report({ node: property, messageId: 'spread' })
          }
        }
      }
    }
  }
}

export default {
  rules: {
    [RULE_ID]: rule
  }
}

export { RULE_ID }
