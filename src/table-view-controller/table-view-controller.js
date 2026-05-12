import React, {
  useEffect,
  useLayoutEffect,
  useCallback,
  useContext,
  useRef
} from 'react'
import PropTypes from 'prop-types'
import { ClickAwayListener } from '@mui/base/ClickAwayListener'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'

import TableViewModal from '#src/table-view-modal'
import { generate_view_id, get_string_from_object } from '#src/utils'
import { use_confirm_click } from '#src/utils/use-confirm-click'
import { MENU_CLOSE_TIMEOUT } from '#src/constants.mjs'
import { table_context } from '#src/table-context'
import ViewItem from './view-item'
import ViewOrganizationRail from './view-organization-rail'
import TagChip from './tag-chip'
import TagInput from './tag-input'
import { use_auto_tags } from './use-auto-tags'
import { use_organized_views, get_all_tags } from './use-organized-views'

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

  const has_org_props = Boolean(
    table_username || favorite_view_ids || tags_by_view_id || derive_auto_tags
  )

  // Deterministic auto-tags per view — empty Map when derive_auto_tags is absent
  const auto_tags_map = use_auto_tags(
    views,
    all_columns || {},
    derive_auto_tags
  )

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
      active_section === 'all' || active_section === 'authors'
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

  // Autocomplete suggestions for TagInput: union of user tag names across all
  // views (so the user sees their existing tag vocabulary) plus auto/llm tag
  // names visible in the current view set.
  const tag_suggestions = React.useMemo(() => {
    const names = new Set()
    if (tags_by_view_id && tags_by_view_id.forEach) {
      tags_by_view_id.forEach((tag_list) => {
        if (!tag_list) return
        const iter = tag_list.forEach ? tag_list : Array.from(tag_list)
        iter.forEach((t) => {
          if (t && t.name) names.add(t.name)
        })
      })
    }
    for (const v of views) {
      const auto = auto_tags_map && auto_tags_map.get(v.view_id)
      if (auto) for (const name of auto) names.add(name)
    }
    return Array.from(names).sort()
  }, [tags_by_view_id, views, auto_tags_map])

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

  // Center the panel horizontally relative to the viewport. The transform is
  // written directly to the DOM (rather than routed through React state) so
  // it lands in the same paint cycle as the .-open class change. Otherwise
  // the width transition starts from one commit and the transform transition
  // from a later commit, producing a visibly staggered animation.
  //
  // On mobile the open width is 96vw; on desktop it's min(80vw, 960px). The
  // computed left edge is clamped with a small safety margin (desktop only)
  // so neither edge falls outside the viewport.
  useLayoutEffect(() => {
    const el = container_ref.current
    if (!el) return
    if (!view_controls_open) {
      el.style.transform = ''
      return
    }
    const rect = el.getBoundingClientRect()
    const is_mobile = window.innerWidth <= 768
    const element_width = is_mobile
      ? 0.96 * window.innerWidth
      : Math.min(0.8 * window.innerWidth, 960)
    const margin = is_mobile ? 0 : 12
    const desired_left = (window.innerWidth - element_width) / 2
    const min_left = margin
    const max_left = window.innerWidth - element_width - margin
    const clamped_left = Math.max(
      min_left,
      Math.min(max_left, desired_left)
    )
    el.style.transform = `translateX(${clamped_left - rect.left}px)`
  }, [view_controls_open])

  // Scroll the list so the selected item is visible after the expand
  // animation settles. The parent container animates width/height over 250ms;
  // measuring offsets before that finishes scrolls to wrong positions.
  // Listen for transitionend on the container instead of guessing with rAF.
  useEffect(() => {
    if (!view_controls_open) return
    const container = container_ref.current
    const list = list_ref.current
    if (!container || !list) return

    let done = false
    const do_scroll = () => {
      if (done) return
      done = true
      const selected_el = list.querySelector('.table-view-item.-selected')
      if (!selected_el) {
        list.scrollTop = 0
        return
      }
      const list_rect = list.getBoundingClientRect()
      const item_rect = selected_el.getBoundingClientRect()
      const target =
        list.scrollTop +
        (item_rect.top - list_rect.top) -
        list.clientHeight / 2 +
        item_rect.height / 2
      list.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    }

    const handler = (e) => {
      if (e.target !== container) return
      if (e.propertyName !== 'height' && e.propertyName !== 'width') return
      do_scroll()
    }
    container.addEventListener('transitionend', handler)
    // Fallback in case the transition never fires (reduced-motion, etc.)
    const fallback = setTimeout(do_scroll, 350)
    return () => {
      container.removeEventListener('transitionend', handler)
      clearTimeout(fallback)
    }
  }, [view_controls_open])

  const current_view = views.find((v) => v.view_id === selected_view.view_id)
  const {
    view_name: title,
    view_description: description,
    view_username: username
  } = current_view || {
    view_name: 'Views',
    view_description: '',
    view_username: ''
  }

  const author_list = React.useMemo(() => {
    if (active_section !== 'authors') return []
    const counts = new Map()
    for (const v of filtered) {
      const author = v.view_username || 'system'
      counts.set(author, (counts.get(author) || 0) + 1)
    }
    return Array.from(counts.entries()).sort(([a], [b]) => {
      if (a === table_username) return -1
      if (b === table_username) return 1
      if (a === 'system') return 1
      if (b === 'system') return -1
      return a.localeCompare(b)
    })
  }, [active_section, filtered, table_username])

  const [selected_author, set_selected_author] = React.useState(null)

  React.useEffect(() => {
    if (active_section !== 'authors') {
      set_selected_author(null)
      return
    }
    if (selected_author && author_list.some(([a]) => a === selected_author)) {
      return
    }
    const fallback =
      (author_list.find(([a]) => a === table_username) ||
        author_list[0] ||
        [])[0] || null
    set_selected_author(fallback)
  }, [active_section, author_list, table_username, selected_author])

  const display_views = React.useMemo(() => {
    if (active_section === 'all') return filtered
    if (active_section === 'authors') {
      if (!selected_author) return []
      return filtered.filter(
        (v) => (v.view_username || 'system') === selected_author
      )
    }
    return sections[active_section] || []
  }, [active_section, filtered, sections, selected_author])

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
        handle_menu_toggle,
        on_toggle_favorite,
        is_favorited: Boolean(
          favorite_view_ids &&
            typeof favorite_view_ids.has === 'function' &&
            favorite_view_ids.has(view.view_id)
        )
      }}
    />
  ))

  // Tag list, tag input, and action set for the selected view. Looked up
  // across the unfiltered views array so the chips stay visible regardless of
  // which rail section is active.
  const current_tags = React.useMemo(() => {
    if (!current_view) return []
    return get_all_tags(current_view, tags_by_view_id, auto_tags_map)
  }, [current_view, tags_by_view_id, auto_tags_map])
  const is_favorited = Boolean(
    favorite_view_ids &&
      typeof favorite_view_ids.has === 'function' &&
      favorite_view_ids.has(selected_view.view_id)
  )
  const can_edit_current =
    Boolean(current_view && current_view.is_editable) && !disable_edit_view
  const can_edit_tags =
    can_edit_current && Boolean(on_add_user_tag && on_remove_user_tag)
  const is_table_state_changed = Boolean(
    current_view && current_view.is_table_state_changed
  )
  const can_save =
    is_table_state_changed && Boolean(current_view && current_view.is_editable)
  const save_tooltip =
    current_view && current_view.is_editable
      ? 'Save current view'
      : 'Duplicate this view to save your changes'

  const stop = (fn) => (e) => {
    e.stopPropagation()
    if (fn) fn()
  }

  const {
    is_confirming: is_delete_confirming,
    handle_click: handle_delete_click,
    reset: reset_delete_confirm
  } = use_confirm_click({
    on_confirm: () => {
      if (current_view) delete_view(current_view.view_id)
    }
  })

  React.useEffect(() => {
    reset_delete_confirm()
  }, [view_controls_open, selected_view.view_id, reset_delete_confirm])

  const handle_duplicate_current = () => {
    if (!current_view) return
    on_view_change(
      {
        view_id: generate_view_id(),
        view_name: `${current_view.view_name} (copy)`,
        view_username: table_username || 'system',
        view_description: current_view.view_description,
        table_state: current_view.table_state
      },
      { view_state_changed: true, is_new_view: true }
    )
  }

  return (
    <div className='table-view-controller-container'>
      <ClickAwayListener onClickAway={handle_click_away}>
        <div
          ref={container_ref}
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
            <label className='table-expanding-control-label'>
              Current View
            </label>
            <div className='current-view-info'>
              <div className='current-view-title-row'>
                <div className='current-view-title'>{title}</div>
                {current_view && (
                  <div
                    className='current-view-actions'
                    onClick={(e) => e.stopPropagation()}>
                    {on_toggle_favorite && (
                      <Tooltip
                        title={
                          is_favorited
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                        }
                        placement='top'
                        enterDelay={700}>
                        <IconButton
                          size='small'
                          className={get_string_from_object({
                            'cva-btn': true,
                            '-favorite': true,
                            '-active': is_favorited
                          })}
                          onClick={stop(() =>
                            on_toggle_favorite(
                              current_view.view_id,
                              is_favorited
                            )
                          )}>
                          {is_favorited ? (
                            <StarIcon fontSize='small' />
                          ) : (
                            <StarBorderIcon fontSize='small' />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    {(on_reset_current_view || on_save_current_view) && (
                      <span className='cva-divider' aria-hidden='true' />
                    )}
                    {on_reset_current_view && (
                      <Tooltip
                        title='Reset to saved state'
                        placement='top'
                        enterDelay={700}>
                        <span>
                          <IconButton
                            size='small'
                            className='cva-btn'
                            onClick={stop(on_reset_current_view)}
                            disabled={!is_table_state_changed}>
                            <UndoIcon fontSize='small' />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {on_save_current_view && (
                      <Tooltip
                        title={save_tooltip}
                        placement='top'
                        enterDelay={700}>
                        <span>
                          <IconButton
                            size='small'
                            className={get_string_from_object({
                              'cva-btn': true,
                              '-primary': true
                            })}
                            onClick={stop(on_save_current_view)}
                            disabled={!can_save}>
                            <SaveIcon fontSize='small' />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <span className='cva-divider' aria-hidden='true' />
                    {can_edit_current && (
                      <Tooltip
                        title='Edit view details'
                        placement='top'
                        enterDelay={700}>
                        <IconButton
                          size='small'
                          className='cva-btn'
                          onClick={stop(() => {
                            set_selected_edit_view(current_view)
                            set_edit_view_modal_open(true)
                          })}>
                          <EditIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip
                      title='Duplicate view'
                      placement='top'
                      enterDelay={700}>
                      <IconButton
                        size='small'
                        className='cva-btn'
                        onClick={stop(handle_duplicate_current)}>
                        <ContentCopyIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    {can_edit_current && (
                      <Tooltip
                        title={
                          is_delete_confirming
                            ? 'Click again to confirm'
                            : 'Delete view'
                        }
                        placement='top'
                        enterDelay={700}>
                        <IconButton
                          size='small'
                          className={get_string_from_object({
                            'cva-btn': true,
                            '-destructive': true,
                            '-confirming': is_delete_confirming
                          })}
                          onClick={stop(handle_delete_click)}>
                          <DeleteIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
              {description && (
                <div className='current-view-description'>{description}</div>
              )}
              {view_controls_open && current_view && (
                <>
                  {(current_tags.length > 0 || can_edit_tags) && (
                    <div
                      className='current-view-tags'
                      onClick={(e) => e.stopPropagation()}>
                      {current_tags.map((tag) => (
                        <TagChip
                          key={`${tag.source}-${tag.name}`}
                          name={tag.name}
                          source={tag.source}
                          on_remove={
                            can_edit_tags && tag.source === 'user'
                              ? () =>
                                  on_remove_user_tag(
                                    current_view.view_id,
                                    tag.name
                                  )
                              : undefined
                          }
                        />
                      ))}
                      {can_edit_tags && (
                        <TagInput
                          suggestions={tag_suggestions}
                          existing_tag_names={current_tags
                            .filter((t) => t.source === 'user')
                            .map((t) => t.name)}
                          on_submit={(name) =>
                            on_add_user_tag(current_view.view_id, name)
                          }
                          on_remove={(name) =>
                            on_remove_user_tag(current_view.view_id, name)
                          }
                          placeholder='Add tag'
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className='current-view-username'>{username}</div>
          </div>

          {view_controls_open && (
            <div className='table-view-controls'>
              <div
                className={get_string_from_object({
                  'table-view-body': true,
                  '-with-rail': has_org_props,
                  '-with-authors': has_org_props && active_section === 'authors'
                })}>
                {has_org_props && (
                  <ViewOrganizationRail
                    active_section={active_section}
                    on_section_change={set_active_section}
                    counts={counts}
                    all_tags={all_visible_tags}
                    active_tag_filters={active_tag_filters}
                    on_toggle_tag_filter={handle_toggle_tag_filter}
                    on_clear_tag_filters={() =>
                      set_active_tag_filters(new Set())
                    }
                  />
                )}

                {active_section === 'authors' && (
                  <div className='tvc-author-column'>
                    <div className='tvc-author-column-header'>Author</div>
                    <div className='tvc-author-column-list'>
                      {author_list.map(([author, count]) => (
                        <button
                          key={author}
                          type='button'
                          className={get_string_from_object({
                            'tvc-author-column-item': true,
                            '-active': author === selected_author
                          })}
                          onClick={() => set_selected_author(author)}>
                          <span className='tvc-author-column-name'>
                            {author}
                          </span>
                          <span className='tvc-author-column-count'>
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
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
              on_view_change,
              tags_by_view_id,
              auto_tags_map,
              tag_suggestions,
              can_edit_tags: Boolean(
                !disable_edit_view &&
                  selected_edit_view &&
                  selected_edit_view.view_username &&
                  selected_edit_view.view_username === table_username &&
                  on_add_user_tag &&
                  on_remove_user_tag
              ),
              on_add_user_tag,
              on_remove_user_tag
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
  favorite_view_ids: PropTypes.object,
  tags_by_view_id: PropTypes.object,
  derive_auto_tags: PropTypes.func,
  on_toggle_favorite: PropTypes.func,
  on_add_user_tag: PropTypes.func,
  on_remove_user_tag: PropTypes.func,
  on_save_current_view: PropTypes.func,
  on_reset_current_view: PropTypes.func
}

export default React.memo(TableViewController)
