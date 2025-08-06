// src/utils/datasetsLoader.js
import config from '../../config/index.js'

export async function getDatasetNameMap () {
  const res = await fetch(`${config.mainWebsiteUrl}/dataset.json`)
  if (!res.ok) throw new Error(`Failed to fetch datasets from API: ${res.statusText}`)

  const { datasets } = await res.json()
  return Object.fromEntries(
    datasets.map(d => [d.dataset, d.name])
  )
}
