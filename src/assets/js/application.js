/*
    This script should contain javascript that will run on all pages
    as it will be loaded into the base nunjucks template.
*/

import hideElementsWithJsHidden from './js-hidden.js'

window.addEventListener('load', () => {
  hideElementsWithJsHidden()
})
