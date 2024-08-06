/* globals MutationObserver, document */

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
}

export default initiateJsHiddenChecks
