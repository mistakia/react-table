import { describe, it } from 'mocha'
import { expect } from 'chai'

import group_columns_into_tree_view from '../src/utils/group-columns-into-tree-view.js'

// A column is indexed under every group it names, so the default behaviour for
// a column in two groups is CROSS-LISTING -- nested under one, and also a
// top-level node for the other. Both readings are wanted by real consumers, so
// the tests below pin each separately: the cross-listing case is the contract
// two-category columns already rely on, and `nest_only` is the opt-out for a
// group that exists only to subdivide a parent.

const parent = { column_group_id: 'PARENT', priority: 1 }
const child = { column_group_id: 'CHILD', priority: 1 }
const nest_only_child = {
  column_group_id: 'CHILD',
  priority: 1,
  nest_only: true
}

const make_columns = (child_group) => [
  { column_id: 'plain', column_groups: [parent] },
  { column_id: 'nested_a', column_groups: [parent, child_group] },
  { column_id: 'nested_b', column_groups: [parent, child_group] }
]

const headers = (nodes) => nodes.filter((n) => n.columns).map((n) => n.header)

const find_group = (nodes, header) =>
  nodes.find((n) => n.columns && n.header === header)

const leaf_ids = (nodes) =>
  nodes.filter((n) => !n.columns).map((n) => n.column_id)

describe('group_columns_into_tree_view', function () {
  it('cross-lists a two-group column at the root by default', function () {
    const tree = group_columns_into_tree_view(make_columns(child))

    expect(headers(tree)).to.have.members(['PARENT', 'CHILD'])

    const parent_node = find_group(tree, 'PARENT')
    expect(headers(parent_node.columns)).to.eql(['CHILD'])
    expect(leaf_ids(parent_node.columns)).to.eql(['plain'])
  })

  it('suppresses the root-level copy of a nest_only group', function () {
    const tree = group_columns_into_tree_view(make_columns(nest_only_child))

    // The discriminating assertion. Everything else in this spec is identical
    // between the two cases, so an implementation that ignored the flag would
    // pass every other line here.
    expect(headers(tree)).to.eql(['PARENT'])
  })

  it('still nests a nest_only group below the root', function () {
    const tree = group_columns_into_tree_view(make_columns(nest_only_child))

    const parent_node = find_group(tree, 'PARENT')
    const child_node = find_group(parent_node.columns, 'CHILD')

    expect(child_node, 'CHILD nested under PARENT').to.exist
    expect(leaf_ids(child_node.columns)).to.eql(['nested_a', 'nested_b'])
    expect(child_node.column_count).to.equal(2)
  })

  it('renders a column whose only group is nest_only as a root-level column', function () {
    const tree = group_columns_into_tree_view([
      { column_id: 'orphan', column_groups: [nest_only_child] }
    ])

    expect(headers(tree)).to.eql([])
    expect(leaf_ids(tree)).to.eql(['orphan'])
  })

  it('leaves an ungrouped column at the root', function () {
    const tree = group_columns_into_tree_view([
      { column_id: 'plain', column_groups: [parent] },
      { column_id: 'ungrouped' }
    ])

    expect(headers(tree)).to.eql(['PARENT'])
    expect(leaf_ids(tree)).to.eql(['ungrouped'])
  })

  it('throws when a group omits its id', function () {
    expect(() =>
      group_columns_into_tree_view([
        { column_id: 'bad', column_groups: [{ priority: 1 }] }
      ])
    ).to.throw('column_group_id is required')
  })
})
