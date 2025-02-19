/* globals MutationObserver, document */

/**
 * Initiates checks for elements with the class 'js-hidden' and updates their display and visibility styles accordingly.
 *
 * When an element gains the 'js-hidden' class, its display and visibility styles are set to 'none' and 'hidden', respectively.
 * When an element loses the 'js-hidden' class, its display and visibility styles are reset to their default values.
 *
 * This function also hides any elements that already have the 'js-hidden' class when it is called.
 */
const initiateJsHiddenChecks = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target
        const classList = target.classList
        if (classList.contains('js-hidden')) {
          // Class js-hidden was added
          target.style.display = 'none'
          target.style.visibility = 'hidden'
        } else {
          // Class js-hidden was removed
          target.style.display = ''
          target.style.visibility = ''
        }
      }
    })
  })

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  })

  document.querySelectorAll('.js-hidden').forEach((el, i) => {
    console.log('Hiding element', el)
    el.style.display = 'none'
    el.style.visibility = 'none'
  })

  document.querySelectorAll('.js-enabled').forEach((el, i) => {
    console.log('Showing element', el)
    el.style.display = 'block'
    el.style.visibility = 'visible'
  })
}

export default initiateJsHiddenChecks
