export function aOrAn (word) {
  // returns 'a' or 'an' depending on the first letter of the input word - does not quite work for all words such as hour
  return word && typeof word === 'string' ? (['a', 'e', 'i', 'o', 'u'].includes(word.trim().toLowerCase()[0]) ? 'an' : 'a') : 'a'
}
