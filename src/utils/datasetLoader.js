// src/utils/datasetLoader.js
import config from '../../config/index.js'

export async function getDatasetNameMap () {
  const res = await fetch(`${config.mainWebsiteUrl}/dataset.json`)
  if (!res.ok) throw new Error(`Failed to fetch datasets from API: ${res.statusText}`)

  const data = await res.json()
  const { datasets } = data || {}
  if (!Array.isArray(datasets)) {
    throw new Error('Invalid API response: datasets is not an array')
  }
  return Object.fromEntries(
    datasets
      .filter(d => d && d.dataset && d.name)
      .map(d => [d.dataset, d.name])
  )
}
