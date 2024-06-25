// https://github.com/bevacqua/fuzzysearch
export const fuzzy_match = (needle, haystack = '') => {
  if (!needle || !haystack) {
    return false
  }

  needle = needle.toLowerCase()
  haystack = haystack.toLowerCase()
  const needle_words = needle.split(' ') // Split needle into words
  const haystack_length = haystack.length

  return needle_words.every(needle_word => {
    const needle_word_length = needle_word.length
    if (needle_word_length > haystack_length) {
      return false
    }

    if (needle_word_length === haystack_length) {
      return needle_word === haystack
    }

    outer: for (let i = 0, j = 0; i < needle_word_length; i++) {
      const nch = needle_word.charCodeAt(i)
      while (j < haystack_length) {
        if (haystack.charCodeAt(j++) === nch) {
          continue outer
        }
      }
      return false
    }
    return true
  })
}
