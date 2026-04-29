// Fields whose match should render as a highlighted title cell rather than as
// a snippet subtitle. Cell renderers compare RowHighlights.matched_field against
// this set to decide which presentation to use.
//
// The server-side filter-mode orchestrator has its own copy of this constant
// (libs-server/search/filter-mode.mjs) for routing range data into either
// cell_ranges.title or snippet on the wire. Both must stay in sync.
export const TITLE_FIELDS = new Set(['title', 'short_description'])
