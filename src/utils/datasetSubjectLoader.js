import fetchDatasetsRequiredForLocalAuthority from './datasetteQueries/fetchDatasetsFromProvisions.js'
import { datasetSlugToReadableName } from './datasetSlugToReadableName.js'
import logger from './logger.js'
import config from '../../config/index.js'
import { getDatasetCollectionSlugNameMapping } from './datasetteQueries/fetchDatasetCollections.js'
import { getRedisClient } from './datasetLoader.js'

const CACHE_TTL = 6 * 60 * 60 // 6 hours

const fallbackDataSubjects = {
  'article-4-direction': {
    available: true,
    dataSets: [
      {
        value: 'article-4-direction',
        text: 'Article 4 direction',
        available: true
      },
      {
        value: 'article-4-direction-area',
        text: 'Article 4 direction area',
        available: true
      }
    ]
  },
  'brownfield-land': {
    available: true,
    dataSets: [
      {
        value: 'brownfield-land',
        text: 'Brownfield land',
        available: true
      },
      {
        value: 'brownfield-site',
        text: 'Brownfield site',
        available: false
      }
    ]
  },
  'conservation-area': {
    available: true,
    dataSets: [
      {
        value: 'conservation-area',
        text: 'Conservation area',
        available: true
      },
      {
        value: 'conservation-area-document',
        text: 'Conservation area document',
        available: true
      }
    ]
  },
  'listed-building': {
    available: true,
    dataSets: [
      {
        value: 'listed-building',
        text: 'Listed building',
        available: false
      },
      {
        value: 'listed-building-grade',
        text: 'Listed building grade',
        available: false
      },
      {
        value: 'listed-building-outline',
        text: 'Listed building outline',
        available: true
      }
    ]
  },
  'tree-preservation-order': {
    available: true,
    dataSets: [
      {
        value: 'tree',
        text: 'Tree',
        available: true,
        requiresGeometryTypeSelection: true
      },
      {
        value: 'tree-preservation-order',
        text: 'Tree preservation order',
        available: true
      },
      {
        value: 'tree-preservation-zone',
        text: 'Tree preservation zone',
        available: true
      }
    ]
  }
}

/* Assign datasets to their collections if a mapping exists; otherwise, group them under 'other', also a check here is done to see if dataset table exists.
* Special handling: e.g., the 'tree' dataset requires geometry type selection
* The fallbackDataSubjects demos what is being built.
*/
export async function makeDatasetSubjectMap (nameMap) {
  const dataSubjectMapping = await getDatasetCollectionSlugNameMapping(nameMap)

  if (!dataSubjectMapping) {
    logger.warn('Failed to fetch dataset collection mapping, using fallback')
    return fallbackDataSubjects
  }

  const subjects = {}
  for (const key of Object.keys(nameMap)) {
    const dataset = {
      value: key,
      text: nameMap[key],
      available: true
    }

    // Add special handling for any: currenlty only for tree dataset
    if (key === 'tree') {
      dataset.requiresGeometryTypeSelection = true
    }

    // Only add if there is a collection mapping, if mapping is to empty collection '', make key ='other'
    const mapping = dataSubjectMapping.get(key)
    if (mapping === undefined) {
      continue
    }
    const subjectKey = mapping === '' ? 'other' : mapping

    // Initialize the subject if it doesn't exist
    if (!subjects[subjectKey]) {
      subjects[subjectKey] = {
        available: true,
        dataSets: []
      }
    }

    subjects[subjectKey].dataSets.push(dataset)
  }

  return subjects
}

// Build data subjects by fetching dataset keys from provision table instead of hard coding.
export async function buildDataSubjects () {
  // First try to fetch dataset keys(slugs) from provisions table (i.e.the keys(datasets) that the LA is expected to provide based on provision rules)
  let datasetKeys = []
  try {
    datasetKeys = await fetchDatasetsRequiredForLocalAuthority()
  } catch (error) {
    logger.warn('buildDataSubjects: Error fetching dataset keys roll back to defaults')
    datasetKeys = Object.keys(config.datasetsConfig)
  }

  // Use existing datasetSlugToReadableName to create lookup of dataset keys to readable names
  const nameMap = {}
  for (const key of datasetKeys) {
    nameMap[key] = datasetSlugToReadableName(key)
  }

  return makeDatasetSubjectMap(nameMap)
}

// Get data subject map, with Redis caching
export async function getDataSubjectMap () {
  let dataSubjectMap = {}

  const cacheKey = 'dataset:dataSubjectMap'
  const client = await getRedisClient()

  // Temporary diable caching while we monitor for issues
  // if (client) {
  //   try {
  //     const cached = await client.get(cacheKey)
  //     if (cached) {
  //       dataSubjectMap = JSON.parse(cached)
  //       return dataSubjectMap
  //     }
  //   } catch (err) {
  //     logger.warn(`datasetSubjectLoader/redis get error: ${err.message}`)
  //   }
  // }

  // fallback → fetch fresh
  dataSubjectMap = await buildDataSubjects()

  if (client) {
    try {
      await client.setEx(cacheKey, CACHE_TTL, JSON.stringify(dataSubjectMap))
    } catch (err) {
      logger.warn(`datasetSubjectLoader/redis set error: ${err.message}`)
    }
  }
  return dataSubjectMap
}
