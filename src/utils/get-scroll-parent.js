// more minimal version of https://github.com/olahol/scrollparent.js/blob/master/scrollparent.js
const regex = /(auto|scroll)/

const style = (node, prop) =>
  getComputedStyle(node, null).getPropertyValue(prop)

const scroll = (node) =>
  regex.test(
    style(node, 'overflow') +
      style(node, 'overflow-y') +
      style(node, 'overflow-x')
  )

export const get_scroll_parent = (node) =>
  !node || node === document.body
    ? document.body
    : scroll(node)
      ? node
      : get_scroll_parent(node.parentNode)
