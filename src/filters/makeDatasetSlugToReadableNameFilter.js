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
      throw new Error(`Can't find a name for ${slug}`)
    }
    return name
  }
}

/**
 *
 * @param {*} dataSubjects
 * @returns {Map<string,string>}
 */
export const createDatasetMapping = (dataSubjects) => {
  const mapping = new Map()
  for (const data of Object.values(dataSubjects)) {
    for (const dataset of data.dataSets) {
      mapping.set(dataset.value, dataset.text)
    }
  }
  return mapping
}
