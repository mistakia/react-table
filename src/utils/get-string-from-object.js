export const get_string_from_object = (obj) => {
  let k
  let cls = ''
  for (k in obj) {
    if (obj[k]) {
      cls && (cls += ' ')
      cls += k
    }
  }
  return cls
}
