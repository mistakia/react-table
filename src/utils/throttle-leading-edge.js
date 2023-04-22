export const throttle_leading_edge = (fn, delay) => {
  // Create a timer object.
  let timer = null

  // Define a wrapper function that calls the original function and then cancels the timer.
  function wrapper() {
    // Clear the timer.
    clearTimeout(timer)

    // Call the original function.
    fn()

    // Create a new timer.
    timer = setTimeout(() => {}, delay)
  }

  // Return the wrapper function.
  return wrapper
}
