const prettifyColumnName = (columnName) => {
  // Split the string on underscores and spaces
  const words = columnName.split(/[-\s]/)

  // Capitalize the first letter of the first word and make 'url' uppercase
  const title = words.map((word, index) => {
    if (word.toLowerCase() === 'url') {
      return word.toUpperCase()
    } else if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    } else {
      return word
    }
  }).join(' ')

  return title
}

export default prettifyColumnName
