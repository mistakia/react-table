export const debounce = (callback, delay) => {
  let timer

  return function () {
    const context = this
    const args = arguments

    clearTimeout(timer)
    timer = setTimeout(() => {
      callback.apply(context, args)
    }, delay)
  }
}
