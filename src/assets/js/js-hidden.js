const hideElementsWithJsHidden = () => {
  document.querySelectorAll('.js-hidden').forEach((el, i) => {
    console.log(el)
    el.style.display = 'none'
  })
}

export default hideElementsWithJsHidden
