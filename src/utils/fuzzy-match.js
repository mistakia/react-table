// https://github.com/bevacqua/fuzzysearch
const fuzzy_match_string = (needle, haystack = '') => {
  if (!needle || !haystack) {
    return false
  }

  needle = needle.toLowerCase()
  haystack = haystack.toLowerCase()
  const needle_words = needle.split(' ') // Split needle into words
  const haystack_length = haystack.length

  return needle_words.every((needle_word) => {
    const needle_word_length = needle_word.length
    if (needle_word_length > haystack_length) {
      return false
    }

    if (needle_word_length === haystack_length) {
      return needle_word === haystack
    }

    // eslint-disable-next-line no-labels
    outer: for (let i = 0, j = 0; i < needle_word_length; i++) {
      const nch = needle_word.charCodeAt(i)
      while (j < haystack_length) {
        if (haystack.charCodeAt(j++) === nch) {
          // eslint-disable-next-line no-labels
          continue outer
        }
      }
      return false
    }
    return true
  })
}

/**
 * Fuzzy-match needle against a view object.
 *
 * Back-compat: when called with two strings (legacy call sites), behaves
 * identically to the original fuzzy_match(needle, view_name) signature.
 *
 * Extended signature: fuzzy_match(needle, view) where view is an object
 * with optional fields { view_name, view_description, view_username, tags }.
 * `tags` is an array of { name, source } objects or plain strings.
 * Any matching field returns true.
 */
export const fuzzy_match = (needle, view_or_string = '') => {
  if (!needle) return false

  if (typeof view_or_string === 'string') {
    return fuzzy_match_string(needle, view_or_string)
  }

  const view = view_or_string

  if (fuzzy_match_string(needle, view.view_name)) return true
  if (view.view_description && fuzzy_match_string(needle, view.view_description))
    return true
  if (view.view_username && fuzzy_match_string(needle, view.view_username))
    return true

  if (Array.isArray(view.tags)) {
    for (const tag of view.tags) {
      const tag_name = typeof tag === 'string' ? tag : tag.name
      if (tag_name && fuzzy_match_string(needle, tag_name)) return true
    }
  }

  return false
}
