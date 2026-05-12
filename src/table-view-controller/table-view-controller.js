import React, { useEffect, useCallback, useContext, useRef } from 'react'
import PropTypes from 'prop-types'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'

import TableViewModal from '#src/table-view-modal'
import { generate_view_id, get_string_from_object } from '#src/utils'
import { MENU_CLOSE_TIMEOUT } from '#src/constants.mjs'
import { table_context } from '#src/table-context'
import ViewItem from './view-item'
import CurrentViewHeader from './current-view-header'
import ViewOrganizationRail from './view-organization-rail'
import { use_auto_tags } from './use-auto-tags'
import { use_organized_views } from './use-organized-views'

import './table-view-controller.styl'

const TableViewController = ({
  select_view,
  selected_view,
  views = [],
  on_view_change,
  delete_view,
  disable_create_view = false,
  disable_edit_view = false,
  new_view_prefix_columns = [],
  // New optional organization props — all default to undefined (legacy mode)
  favorite_view_ids,
  tags_by_view_id,
  derive_auto_tags,
  on_toggle_favorite,
  on_add_user_tag,
  on_remove_user_tag,
  on_save_current_view,
  on_reset_current_view
}) => {
  const { table_username, all_columns } = useContext(table_context)
  const [input_value, set_input_value] = React.useState('')
  const [selected_edit_view, set_selected_edit_view] = React.useState({})
  const [edit_view_modal_open, set_edit_view_modal_open] = React.useState(false)
  const [view_controls_open, set_view_controls_open] = React.useState(false)
  const [closing, set_closing] = React.useState(false)
  const [active_section, set_active_section] = React.useState('all')
  const [active_tag_filters, set_active_tag_filters] = React.useState(
    () => new Set()
  )

  const container_ref = useRef(null)
  const input_ref = useRef(null)
  const list_ref = useRef(null)
  const [transform, set_transform] = React.useState('')

  const has_org_props = Boolean(
    table_username || favorite_view_ids || tags_by_view_id || derive_auto_tags
  )

  // Deterministic auto-tags per view — empty Map when derive_auto_tags is absent
  const auto_tags_map = use_auto_tags(views, all_columns || {}, derive_auto_tags)

  // Organized / filtered view list
  const { sections, counts, filtered } = use_organized_views({
    views,
    table_username,
    favorite_view_ids,
    tags_by_view_id,
    auto_tags_map,
    filter_text: input_value,
    active_tag_filters,
    active_section
  })

  // Collect all unique tags visible in the current section for the rail chip cloud
  const all_visible_tags = React.useMemo(() => {
    const source_views =
      active_section === 'all'
        ? filtered
        : sections[active_section] || []
    const seen = new Map()
    for (const v of source_views) {
      for (const tag of v.tags || []) {
        if (!seen.has(tag.name)) seen.set(tag.name, tag)
      }
    }
    return Array.from(seen.values())
  }, [filtered, sections, active_section])

  const handle_menu_toggle = useCallback(() => {
    if (view_controls_open) {
      set_closing(true)
      set_view_controls_open(false)
      setTimeout(() => set_closing(false), MENU_CLOSE_TIMEOUT)
    } else {
      set_view_controls_open(true)
    }
  }, [view_controls_open])

  const handle_input_change = (event) => {
    set_input_value(event.target.value)
  }

  const handle_select_view = (view) => {
    select_view(view.view_id)
    set_input_value('')
  }

  const handle_add_click = () => {
    on_view_change(
      {
        ...selected_view,
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
      },
      {
        view_state_changed: true,
        is_new_view: true
      }
    )
    handle_menu_toggle()
  }

  const handle_toggle_tag_filter = (tag_name) => {
    set_active_tag_filters((prev) => {
      const next = new Set(prev)
      if (next.has(tag_name)) {
        next.delete(tag_name)
      } else {
        next.add(tag_name)
      }
      return next
    })
  }

  const handle_click_away = useCallback(
    (event) => {
      if (view_controls_open && !container_ref.current.contains(event.target)) {
        set_closing(true)
        set_view_controls_open(false)
        setTimeout(() => set_closing(false), MENU_CLOSE_TIMEOUT)
      }
    },
    [view_controls_open]
  )

  // Escape key closes modal
  useEffect(() => {
    const handle_key_down = (event) => {
      if (event.key === 'Escape' && view_controls_open) {
        handle_menu_toggle()
      }
    }
    if (view_controls_open) {
      document.addEventListener('keydown', handle_key_down)
    }
    return () => document.removeEventListener('keydown', handle_key_down)
  }, [view_controls_open, handle_menu_toggle])

  // Center the panel horizontally (desktop only, matches existing behavior)
  useEffect(() => {
    if (view_controls_open && container_ref.current) {
      const rect = container_ref.current.getBoundingClientRect()
      const scroll_left = window.pageXOffset || document.documentElement.scrollLeft
      const window_center_x = window.innerWidth / 2 + scroll_left
      const element_width =
        window.innerWidth < 768
          ? 0.9 * window.innerWidth
          : 0.6 * window.innerWidth
      const element_center_x = rect.left + element_width / 2 + scroll_left
      set_transform(`translateX(${window_center_x - element_center_x}px)`)
    } else {
      set_transform('')
    }
  }, [view_controls_open])

  // Auto-scroll to selected item when modal opens
  useEffect(() => {
    if (view_controls_open && list_ref.current) {
      const selected_el = list_ref.current.querySelector(
        '.table-view-item.-selected'
      )
      if (selected_el) {
        selected_el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
  }, [view_controls_open])

  const current_view = views.find((v) => v.view_id === selected_view.view_id)
  const { view_name: title, view_description: description, view_username: username } =
    current_view || { view_name: 'Views', view_description: '', view_username: '' }

  const is_favorited =
    on_toggle_favorite && favorite_view_ids
      ? favorite_view_ids instanceof Set
        ? favorite_view_ids.has(selected_view.view_id)
        : false
      : false

  const display_views = active_section === 'all' ? filtered : sections[active_section] || []

  const list_items = display_views.map((view) => (
    <ViewItem
      key={view.view_id}
      {...{
        handle_select_view,
        set_selected_edit_view,
        set_edit_view_modal_open,
        delete_view,
        view,
        on_view_change,
        disable_edit_view,
        selected_view,
        handle_menu_toggle
      }}
    />
  ))

  return (
    <div className='table-view-controller-container'>
      <ClickAwayListener onClickAway={handle_click_away}>
        <div
          ref={container_ref}
          style={{ transform }}
          className={get_string_from_object({
            'table-expanding-control-container': true,
            'table-view-controller': true,
            '-open': view_controls_open,
            '-closing': closing,
            '-with-org': has_org_props
          })}>
          <div
            onClick={handle_menu_toggle}
            className='table-expanding-control-button'>
            <label className='table-expanding-control-label'>Current View</label>
            <div className='current-view-info'>
              <div className='current-view-username'>{username}</div>
              <div className='current-view-title'>{title}</div>
              {description && (
                <div className='current-view-description'>{description}</div>
              )}
            </div>
          </div>

          {view_controls_open && (
            <div className='table-view-controls'>
              {has_org_props && current_view && (
                <CurrentViewHeader
                  view={current_view}
                  is_favorited={is_favorited}
                  is_table_state_changed={Boolean(
                    current_view.is_table_state_changed
                  )}
                  on_toggle_favorite={on_toggle_favorite}
                  on_save_current_view={on_save_current_view}
                  on_reset_current_view={on_reset_current_view}
                  on_edit={
                    !disable_edit_view
                      ? (v) => {
                          set_selected_edit_view(v)
                          set_edit_view_modal_open(true)
                        }
                      : undefined
                  }
                  on_duplicate={(v) => {
                    on_view_change(
                      {
                        view_id: generate_view_id(),
                        view_name: `${v.view_name} (copy)`,
                        view_username: table_username || 'system',
                        view_description: v.view_description,
                        table_state: v.table_state
                      },
                      { view_state_changed: true, is_new_view: true }
                    )
                  }}
                />
              )}

              <div
                className={get_string_from_object({
                  'table-view-body': true,
                  '-with-rail': has_org_props
                })}>
                {has_org_props && (
                  <ViewOrganizationRail
                    active_section={active_section}
                    on_section_change={set_active_section}
                    counts={counts}
                    all_tags={all_visible_tags}
                    active_tag_filters={active_tag_filters}
                    on_toggle_tag_filter={handle_toggle_tag_filter}
                  />
                )}

                <div className='table-view-main'>
                  <div className='table-view-header'>
                    <TextField
                      size='small'
                      label='Filter Views'
                      placeholder='Filter views'
                      value={input_value}
                      onChange={handle_input_change}
                      autoComplete='off'
                      inputRef={input_ref}
                    />
                  </div>
                  <div className='table-view-list' ref={list_ref}>
                    {list_items}
                  </div>
                  {!disable_create_view && (
                    <div className='table-view-footer'>
                      <div
                        className='table-view-add-button'
                        onClick={handle_add_click}>
                        <AddIcon />
                        Add view
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <TableViewModal
            {...{
              view: selected_edit_view,
              edit_view_modal_open,
              set_edit_view_modal_open,
              on_view_change
            }}
          />
        </div>
      </ClickAwayListener>
    </div>
  )
}

TableViewController.propTypes = {
  select_view: PropTypes.func.isRequired,
  selected_view: PropTypes.object.isRequired,
  views: PropTypes.array,
  on_view_change: PropTypes.func.isRequired,
  delete_view: PropTypes.func.isRequired,
  disable_create_view: PropTypes.bool,
  disable_edit_view: PropTypes.bool,
  new_view_prefix_columns: PropTypes.array,
  // Organization props (all optional)
  favorite_view_ids: PropTypes.instanceOf(Set),
  tags_by_view_id: PropTypes.instanceOf(Map),
  derive_auto_tags: PropTypes.func,
  on_toggle_favorite: PropTypes.func,
  on_add_user_tag: PropTypes.func,
  on_remove_user_tag: PropTypes.func,
  on_save_current_view: PropTypes.func,
  on_reset_current_view: PropTypes.func
}

export default React.memo(TableViewController)
