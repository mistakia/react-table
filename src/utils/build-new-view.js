import generate_view_id from './generate-view-id'

// A new view is built from a fixed template, never from the view on screen.
// Deriving it from the selected view -- by spreading it and overwriting a few
// fields -- carried whatever else the consumer had attached: search config,
// editability, dirty flags. That made "new" quietly mean "a copy of this one",
// which is what Duplicate is for.
//
// Lives here rather than in a component because both the toolbar button and the
// view panel's own button create views, and they must create the same thing.
export default function build_new_view({
  table_username,
  new_view_prefix_columns = []
}) {
  return {
    view_id: generate_view_id(),
    view_name: 'New view',
    view_username: table_username || 'system',
    view_description: 'New view description',
    saved_table_state: null,
    table_state: {
      prefix_columns: new_view_prefix_columns,
      columns: [],
      sort: [],
      where: []
    }
  }
}
