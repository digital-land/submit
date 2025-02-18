/**
 * @file Functionality around rendering data in tables.
 */

/**
 * Makes sure the 'reference' and 'name' columns come first.
 *
 * @param {Object} opts - Options object
 * @param {string[]} opts.fields - Array of field names
 * @returns {Object} Object containing leading and trailing fields
 * @returns {string[]} returns.leading - Fields that should come first
 * @returns {string[]} returns.trailing - Remaining fields
 */
export const splitByLeading = ({ fields }) => {
  const leading = []
  const trailing = []
  for (const field of fields) {
    if (field === 'reference') {
      leading.splice(0, 0, field)
    } else if (field === 'name') {
      leading.push(field)
    } else {
      trailing.push(field)
    }
  }
  return { leading, trailing }
}
