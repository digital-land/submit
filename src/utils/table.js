/**
 * @file Functionality around rendering data in tables.
 */

/**
 * @typedef {Object} LeadingTrailingSplit
 * @property {string[]} leading
 * @property {string[]} trailing
 */

/**
 * Makes sure the 'reference' and 'name' columns come first.
 *
 * @param {Object} opts - Options object
 * @param {string[]} opts.fields - Array of field names
 * @returns {LeadingTrailingSplit} Object containing leading and trailing fields
 */
export const splitByLeading = ({ fields }) => {
  const leading = []
  const trailing = []
  for (const field of fields) {
    if (field.toLocaleLowerCase('en-GB') === 'reference') {
      leading.splice(0, 0, field)
    } else if (field.toLocaleLowerCase('en-GB') === 'name') {
      leading.push(field)
    } else {
      trailing.push(field)
    }
  }
  return { leading, trailing }
}
