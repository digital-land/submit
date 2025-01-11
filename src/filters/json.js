export const parseJson = (value, property) => {
  try {
    const obj = JSON.parse(value)
    return obj[property]
  } catch (e) {
    return null
  }
}
