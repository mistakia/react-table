/* global Blob */

function convert_to_markdown_table(objArray) {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray

  if (!array.length) {
    return ''
  }

  // Get column headers from first object
  const headers = Object.keys(array[0])

  // Build markdown table header
  let markdown = '| ' + headers.join(' | ') + ' |\n'

  // Add separator row
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'

  // Add data rows
  for (const row of array) {
    const values = headers.map((header) => {
      const value = row[header]
      // Escape pipe characters in cell values
      return String(value ?? '').replace(/\|/g, '\\|')
    })
    markdown += '| ' + values.join(' | ') + ' |\n'
  }

  return markdown
}

export default function export_markdown({
  headers,
  data,
  file_name = 'table-export'
}) {
  const date = new Date()
  const timestamp = date.toISOString().replace(/:/g, '-').replace(/\..+/, '')
  file_name = `${file_name}-${timestamp}.md`

  if (headers) {
    data.unshift(headers)
  }

  // Convert Object to JSON
  const json_object = JSON.stringify(data)
  const markdown = convert_to_markdown_table(json_object)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, file_name)
  } else {
    const link = document.createElement('a')
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', file_name)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
