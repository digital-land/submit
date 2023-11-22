import validationMessageLookup from './validationMessageLookup.js'

function toErrorList (errors) {
  const errorList = []
  for (const [key, value] of Object.entries(errors)) {
    errorList.push({
      text: validationMessageLookup(key, value.type),
      href: `#${key}`
    })
  }
  return errorList
}

export default toErrorList
