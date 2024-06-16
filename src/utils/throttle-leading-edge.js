export const throttle_leading_edge = (fn, delay) => {
  // Create a timer object.
  let timer = null

  // Define a wrapper function that calls the original function at the leading edge.
  function wrapper() {
    // Check if the timer is not set, which means the function can be called.
    if (timer === null) {
      // Call the original function.
      fn()

      // Set the timer to prevent further calls until the delay has passed.
      timer = setTimeout(() => {
        timer = null
      }, delay)
    }
  }

  // Return the wrapper function.
  return wrapper
}
