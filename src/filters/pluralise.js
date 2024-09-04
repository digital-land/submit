import pluralize from 'pluralize'

export const pluralise = (word, count = 1) => {
  return pluralize(word, count)
}
