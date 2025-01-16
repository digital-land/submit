import datasette from '../../services/datasette.js'

/**
 * @param {{ req?: import('express').Request}} opts options (optional)
 * @returns {Promise<Map<string, string>}
 */
export const getDatasetSlugNameMapping = async (opts = {}) => {
  const datasetSlugNameTable = await datasette.runQuery('select dataset, name from dataset', 'digital-land', opts)

  const datasetMapping = new Map()
  datasetSlugNameTable.rows.forEach(([slug, name]) => {
    datasetMapping.set(slug, name)
  })
  return datasetMapping
}
