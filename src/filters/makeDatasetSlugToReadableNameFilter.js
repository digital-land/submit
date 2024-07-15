import logger from '../utils/logger.js'

/**
 * Creates a filter function that takes a dataset slug as input and returns its corresponding readable name.
 * The filter function uses a provided dataset name mapping to look up the readable name.
 *
 * @param {Map<string, string>} datasetNameMapping - A map of dataset slugs to their corresponding readable names.
 * @returns {(slug: string) => string} - A filter function that takes a dataset slug as input and returns its corresponding readable name.
 */
export const makeDatasetSlugToReadableNameFilter = (datasetNameMapping) => {
  /**
   * A filter function that takes a dataset slug as input and returns its corresponding readable name.
   *
   * @param {string} slug - The dataset slug to look up.
   * @returns {string} - The readable name corresponding to the provided slug.
   * @throws {Error} - If the provided slug is not found in the dataset name mapping.
   */
  return (slug) => {
    const name = datasetNameMapping.get(slug)
    if (!name) {
      // throw new Error(`Can't find a name for ${slug}`)
      // ToDo: work out what to do here? potentially update it with data from datasette
      logger.error(`can't find a name for ${slug}`)
      return slug
    }
    return name
  }
}

/**
 * Creates a mapping of dataset slugs to their corresponding readable names.
 * 
 * @param {Array<[string, string]>} dataSubjects - An array of tuples, where each tuple contains a dataset slug and its corresponding readable name.
 * @returns {Map<string, string>} - A Map object where each key is a dataset slug and its value is the corresponding readable name.
 */
export const createDatasetMapping = (dataSubjects) => {
  const datasetMapping = new Map();
  dataSubjects.forEach(([slug, name]) => {
    datasetMapping.set(slug, name);
  });
  return datasetMapping;
}


