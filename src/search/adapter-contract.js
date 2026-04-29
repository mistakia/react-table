/**
 * Search adapter contract for the react-table library.
 *
 * Adapters translate a user-typed query string into either a `state_patch` (for
 * server-side filtering through `where` or `q`) or a `client_filter` (for
 * in-memory predicate filtering on already-loaded rows). Adapters may also
 * return per-row highlight ranges so cell renderers can render inline matches.
 *
 * Plain objects are used for highlight maps and `cell_ranges` so the same shape
 * works on the wire, in Redux, and in cell renderers without conversion.
 *
 * @typedef {Object} Range
 * @property {number} offset Zero-based offset into the source text.
 * @property {number} length Length of the highlighted span.
 *
 * @typedef {Object} Snippet
 * @property {string} text Plain text body excerpt (no HTML, no sentinels).
 * @property {Range[]} ranges Highlight ranges within `text`.
 *
 * @typedef {Object} RowHighlights
 * @property {string} matched_field Field id where the strongest match landed.
 * @property {Record<string, Range[]>} cell_ranges Per-column highlight ranges
 *   keyed by column_id. Cell renderers read this with bracket access.
 * @property {?Snippet} snippet Windowed body match for the conditional subtitle,
 *   or null when the match is in a rendered cell.
 *
 * @typedef {Object} TableStatePatch
 * @property {Object[]} [where] Replacement `where` clause array.
 * @property {?string} [q] Replacement quick-search query, or null to clear.
 *
 * @typedef {Object} SearchResult
 * @property {TableStatePatch} [state_patch] Patch merged into table_state.
 * @property {function(rows: any[]): any[]} [client_filter] In-memory predicate.
 * @property {Record<string, RowHighlights>} [highlights] Highlights keyed by
 *   the consumer's row primary key (URI, thread_id, base_uri, etc.).
 *
 * @typedef {Object} SearchAdapterRunArgs
 * @property {string} query The current query string.
 * @property {Object} table_state Current table state.
 * @property {any[]} current_rows Current row set, when available.
 * @property {Object} view_search_config The `view.search` object.
 * @property {AbortSignal} [signal] Cancellation signal for async adapters.
 *
 * @typedef {Object} SearchAdapter
 * @property {string} id Unique identifier (e.g. 'client', 'where', 'server_q').
 * @property {function(view_search_config: Object): ?string} validate Returns
 *   null when the config is valid, otherwise a human-readable error string.
 * @property {function(SearchAdapterRunArgs): Promise<SearchResult>} run Resolves
 *   the query into a SearchResult.
 */

export {}
