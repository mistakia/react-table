export default function group_parameters(params) {
  const groups = {}
  Object.entries(params).forEach(([param_name, param_definition]) => {
    const param_groups = param_definition.groups || ['Ungrouped']
    param_groups.forEach((group) => {
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push([param_name, param_definition])
    })
  })
  return groups
}
