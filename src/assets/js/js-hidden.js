const hideElementsWithJsHidden = () => {
  document.querySelectorAll('.js-hidden').forEach((el, i) => {
    console.log('Hiding element', el)
    el.style.display = 'none'
    el.style.visibility = 'none'
  })
}

export default hideElementsWithJsHidden
