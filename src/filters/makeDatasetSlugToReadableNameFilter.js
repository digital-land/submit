import logger from '../utils/logger.js'

/**
 * Creates a filter function that takes a dataset slug as input and returns its corresponding readable name.
 * The filter function uses a provided dataset name mapping to look up the readable name.
 *
 * @param {Map<string, string>} datasetNameMapping - A map of dataset slugs to their corresponding readable names.
 * @returns {Function} A filter function that takes a dataset slug as input and returns its corresponding readable name.
 */
export const makeDatasetSlugToReadableNameFilter = (datasetNameMapping) => {
  /**
   * A filter function that takes a dataset slug as input and returns its corresponding readable name.
   *
   * @param {string} slug - The dataset slug to look up.
   * @param {boolean} [capitalize=false] - Whether to capitalize the first letter.
   * @returns {string} The readable name corresponding to the provided slug.
   * @throws {Error} - If the provided slug is not found in the dataset name mapping.
   */
  const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1)
  const lowercaseFirst = (str) => str.charAt(0).toLowerCase() + str.slice(1)

  return (slug, capitalize = false) => {
    const name = datasetNameMapping.get(slug)
    if (!name) {
      // ToDo: work out what to do here? potentially update it with data from datasette
      logger.debug(`can't find a name for ${slug}`)
      return capitalize ? capitalizeFirst(slug) : lowercaseFirst(slug)
    }
    return capitalize ? capitalizeFirst(name) : lowercaseFirst(name)
  }
}
