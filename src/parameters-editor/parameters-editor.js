import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import TextField from '@mui/material/TextField'

import {
  fuzzy_match,
  group_parameters,
  get_string_from_object
} from '#src/utils'
import { table_context } from '#src/table-context'

import ParametersEditorItem from './parameters-editor-item'
import './parameters-editor.styl'

const collect_records_with_definitions = (records, all_columns) =>
  records.map((record) => ({
    record,
    definition: all_columns[record.column_id]
  }))

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

  const supporting_records_by_param = useMemo(() => {
    const map = new Map()
    for (const { record, definition } of collect_records_with_definitions(
      records,
      all_columns
    )) {
      const param_names = Object.keys(definition?.column_params || {})
      for (const name of param_names) {
        if (!map.has(name)) map.set(name, [])
        map.get(name).push(record)
      }
    }
    return map
  }, [records, all_columns])

  const param_definitions = useMemo(() => {
    const defs = {}
    for (const { definition } of collect_records_with_definitions(
      records,
      all_columns
    )) {
      for (const [name, def] of Object.entries(
        definition?.column_params || {}
      )) {
        if (!defs[name]) defs[name] = def
      }
    }
    return defs
  }, [records, all_columns])

  const visible_params = useMemo(
    () =>
      Object.entries(param_definitions).filter(
        ([name, def]) =>
          !def.hidden && (!search_text || fuzzy_match(search_text, name))
      ),
    [param_definitions, search_text]
  )

  const sections = useMemo(() => {
    if (show_sections && records.length > 1) {
      const shared = []
      const all = []
      for (const [name, def] of visible_params) {
        const supporting = supporting_records_by_param.get(name) || []
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
  }, [
    show_sections,
    records.length,
    visible_params,
    supporting_records_by_param
  ])

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
                        records={supporting_records_by_param.get(name) || []}
                        param_name={name}
                        param_definition={def}
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
