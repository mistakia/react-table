import { SHARE_LINK_URL_SCHEMA } from '#src/constants.mjs'

// THE URL THE "COPY LINK" BUTTON HANDS SOMEONE ELSE.
//
// Extracted from the menu component rather than left inline because the bug it
// was written against is entirely about which PATH the link names, and that is
// a decision testable with three strings and no DOM.
//
// THE PATH MUST BE THE ROUTE THAT READS A QUERY STRING, NEVER THE ROUTE THE
// USER HAPPENS TO BE STANDING ON. The two coincide on a consumer's ordinary
// table route and come apart on every route that hydrates a STORED record -- a
// generation share (`/s/:share_id`), a saved view (`/data-views/:view_id`), a
// resolved short link (`/u/:hash`). Those fetch their state on mount and ignore
// the query string entirely, so a link built from `window.location.pathname`
// there names the old stored view in its path while carrying the on-screen
// state in a query string no reader ever looks at.
//
// Measured on xo.football 2026-09-16: a user opened a shared view, generated an
// entirely different one over it, copied the link, and pasted it back as a
// reference. The path still named the original share, so the browser and the
// view-generation agent's link resolver both rebuilt the view that share had
// recorded the day before. The copier saw the new columns; every reader got the
// old ones; nothing on either side reported a discrepancy.
//
// `share_link_pathname` is the consumer declaring which of its routes carries
// table state in a query string. Absent, the current path is the only answer
// available here -- and on a consumer with a single table route it is also the
// right one.

/**
 * The query string carrying a table state and its view identity.
 *
 * @param {object} params
 * @param {object} params.table_state
 * @param {object} [params.selected_view]
 * @returns {URLSearchParams}
 */
export const build_share_link_params = ({ table_state, selected_view }) => {
  const params = new URLSearchParams()

  for (const [key, type] of Object.entries(SHARE_LINK_URL_SCHEMA.table_state)) {
    const value = table_state?.[key]
    if (type === 'array') {
      if (Array.isArray(value) && value.length > 0) {
        params.append(key, JSON.stringify(value))
      }
    } else if (type === 'object') {
      if (value && typeof value === 'object' && Object.keys(value).length > 0) {
        params.append(key, JSON.stringify(value))
      }
    } else if (type === 'string') {
      if (value) params.append(key, value)
    } else if (type === 'boolean') {
      // Always emit booleans -- saved-view state may default to `true`, and
      // skipping `false` would let a stale `true` survive a round-trip.
      params.append(key, String(Boolean(value)))
    }
  }

  for (const key of SHARE_LINK_URL_SCHEMA.view) {
    const value = selected_view?.[key]
    if (value) params.append(key, value)
  }

  return params
}

/**
 * The absolute link to copy for the state currently on screen.
 *
 * @param {object} params
 * @param {object} params.table_state
 * @param {object} [params.selected_view]
 * @param {string} params.origin - the consumer's origin
 * @param {string} params.current_pathname - the path the user is on
 * @param {string} [params.share_link_pathname] - the route that reads a query
 *   string, when the consumer declares one
 * @returns {string}
 */
export const build_share_link = ({
  table_state,
  selected_view,
  origin,
  current_pathname,
  share_link_pathname
}) => {
  const params = build_share_link_params({ table_state, selected_view })
  const pathname = share_link_pathname || current_pathname
  return `${origin}${pathname}?${params.toString()}`
}
