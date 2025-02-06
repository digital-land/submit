/**
 * @file Functionality around rendering data in tables.
 */

/**
 * Makes sure the 'reference' and 'name' columns come first.
 *
 * @param {{ fields: string[] }} opts options
 * @returns {{ leading: string[], trailing: [] }}
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
