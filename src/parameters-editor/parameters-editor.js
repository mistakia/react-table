import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import TextField from '@mui/material/TextField'

import {
  fuzzy_match,
  group_parameters,
  get_string_from_object,
  resolve_param_definition_across_records
} from '#src/utils'
import { table_context } from '#src/table-context'

import ParametersEditorItem from './parameters-editor-item'
import './parameters-editor.styl'

const collect_records_with_definitions = (records, all_columns) =>
  records.map((record) => ({
    record,
    definition: all_columns[record.column_id]
  }))

// The refusal names columns the way the bulk-edit checkbox list does —
// `column-controls-selected-column.js` renders `column_title || column_id` in
// the `.column-name` div of the row carrying the checkbox, so a user reading
// the message can find the row to untick. `header_label` is deliberately not
// used: it appears only in the table header grid and on scatter-plot axes.
const attach_column_titles = ({ conflict, all_columns }) => ({
  ...conflict,
  groups: conflict.groups.map((group) => ({
    ...group,
    column_titles: group.column_ids.map(
      (column_id) => all_columns[column_id]?.column_title || column_id
    )
  }))
})

export default function ParametersEditor({
  records,
  row_axes = [],
  show_sections = false,
  inline = false
}) {
  const { all_columns } = useContext(table_context)
  const [search_text, set_search_text] = useState('')
  const search_input_ref = useRef(null)

  useEffect(() => {
    if (!inline && search_input_ref.current) {
      search_input_ref.current.focus()
    }
  }, [inline])

  // One resolution per parameter name, derived from EVERY record that declares
  // it. Resolving by click order is the defect this replaces: the first-ticked
  // column used to decide the offered values, the default, and the arity for
  // every other column the write would touch.
  const resolved_params = useMemo(() => {
    const entries_by_param = new Map()
    for (const { record, definition } of collect_records_with_definitions(
      records,
      all_columns
    )) {
      for (const [name, param_definition] of Object.entries(
        definition?.column_params || {}
      )) {
        if (!entries_by_param.has(name)) entries_by_param.set(name, [])
        entries_by_param.get(name).push({ record, param_definition })
      }
    }

    const resolved = new Map()
    for (const [name, entries] of entries_by_param) {
      const { param_definition, conflict } =
        resolve_param_definition_across_records({ entries })

      resolved.set(name, {
        records: entries.map((entry) => entry.record),
        param_definition,
        conflict: conflict && attach_column_titles({ conflict, all_columns }),
        // Grouping and the label come from the first declaration even when the
        // parameter is refused, since a refusal still renders in its group.
        display_definition: param_definition || entries[0].param_definition,
        // `hidden` is not offered at all, so a refusal there cannot mislead
        // anyone — nothing can be written through a control that never renders.
        hidden: entries.some(({ param_definition: def }) => Boolean(def.hidden))
      })
    }
    return resolved
  }, [records, all_columns])

  const visible_params = useMemo(
    () =>
      [...resolved_params.entries()]
        .filter(
          ([name, resolved]) =>
            !resolved.hidden && (!search_text || fuzzy_match(search_text, name))
        )
        .map(([name, resolved]) => [name, resolved.display_definition]),
    [resolved_params, search_text]
  )

  const sections = useMemo(() => {
    if (show_sections && records.length > 1) {
      const shared = []
      const all = []
      for (const [name, def] of visible_params) {
        const supporting = resolved_params.get(name)?.records || []
        if (supporting.length === records.length) {
          shared.push([name, def])
        } else {
          all.push([name, def])
        }
      }
      return [
        { key: 'shared', title: 'Shared', params: shared },
        { key: 'all', title: 'All', params: all }
      ]
    }
    return [{ key: 'flat', title: null, params: visible_params }]
  }, [show_sections, records.length, visible_params, resolved_params])

  const root_class = get_string_from_object({
    'parameters-editor': true,
    'parameters-editor--inline': inline
  })

  return (
    <div className={root_class}>
      <div className='rt-search-input'>
        <TextField
          variant='outlined'
          size='small'
          margin='none'
          fullWidth
          label='Search parameters'
          autoComplete='off'
          value={search_text}
          onChange={(event) => set_search_text(event.target.value)}
          inputRef={search_input_ref}
        />
      </div>
      <div className='parameters-editor-body'>
        {sections.map((section) => {
          if (section.params.length === 0) return null
          const grouped = group_parameters(Object.fromEntries(section.params))
          return (
            <React.Fragment key={section.key}>
              {section.title && (
                <div className='section-header'>{section.title}</div>
              )}
              <div className='parameters-container'>
                {Object.entries(grouped).map(([group_name, params]) => (
                  <div key={group_name} className='column-param-group'>
                    {group_name !== 'Ungrouped' && (
                      <div className='column-param-group-title'>
                        {group_name}
                      </div>
                    )}
                    {params.map(([name, def]) => (
                      <ParametersEditorItem
                        key={name}
                        records={resolved_params.get(name)?.records || []}
                        param_name={name}
                        param_definition={def}
                        conflict={resolved_params.get(name)?.conflict || null}
                        row_axes={row_axes}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

ParametersEditor.propTypes = {
  records: PropTypes.array.isRequired,
  row_axes: PropTypes.array,
  show_sections: PropTypes.bool,
  inline: PropTypes.bool
}
