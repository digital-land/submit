import parse from 'wellknown'
import maplibregl from 'maplibre-gl'

const lineColor = '#000000'
const fillColor = '#008'
const fillOpacity = 0.4
const boundaryLineColor = '#f00'
const boundaryLineOpacity = 1
const pointOpacity = 0.8
const pointRadius = 5
const pointColor = '#008'

/**
 * Creates a Map instance.
 * @param {MapOptions} opts - The options for creating the map.
 * @constructor
 */
/**
 * Options for creating a Map instance.
 * @typedef {Object} MapOptions
 * @property {string} containerId - Required - The ID of the HTML container element for the map.
 * @property {string[]} data - Required - An array of URLs or WKT geometries to be added to the map.
 * @property {string} [boundaryGeoJsonUrl] - Optional - The URL of the boundary GeoJSON to be added to the map.
 * @property {boolean} [interactive] - Optional - Indicates whether the map should be interactive. Default is true.
 * @property {boolean} [wktFormat] - Optional - Indicates whether the data is in WKT format. Default is false.
 * @property {number[]} [boundingBox] - Optional - The bounding box coordinates [minX, minY, maxX, maxY] to set the initial view of the map.
 */
export class Map {
  constructor (opts) {
    this.bbox = opts.boundingBox ?? null
    this.map = new maplibregl.Map({
      container: opts.containerId,
      style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=ncAXR9XEn7JgHBLguAUw',
      zoom: 11,
      center: [-0.1298779, 51.4959698],
      interactive: opts.interactive ?? true
    })

    // Add map controls
    this.addControls(opts.interactive)

    this.map.on('load', async () => {
      // Store the first symbol layer id
      this.setFirstMapLayerId()

      // Add the boundary GeoJSON to the map
      if (opts.boundaryGeoJsonUrl) this.addBoundaryGeoJsonToMap(opts.boundaryGeoJsonUrl)

      // Add layer data to map
      if (opts.wktFormat) this.addWktDataToMap(opts.data)
      else await this.addGeoJsonUrlsToMap(opts.data)

      // Move the map to the bounding box
      if (this.bbox && this.bbox.length) this.setMapViewToBoundingBox()
    })
  }

  addControls (interactive = true) {
    this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    if (interactive) {
      this.map.addControl(new maplibregl.NavigationControl())
      this.map.addControl(new maplibregl.FullscreenControl())
    }
  }

  setFirstMapLayerId () {
    const layers = this.map.getStyle().layers

    // Find the index of the first symbol layer in the map style
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol') {
        this.firstMapLayerId = layers[i].id
        break
      }
    }
  }

  addWktDataToMap (geometriesWkt) {
    const geometries = []
    geometriesWkt.forEach((geometryWkt, index) => {
      const name = `geometry-${index}`

      // Convert the coordinates string to a GeoJSON object
      const geometry = parse(geometryWkt)

      // if the geometry is invalid, log an error and continue
      if (!geometry) {
        console.error('Invalid WKT geometry format', geometryWkt)
        return
      }

      // store geometries for use in calculating the bbox later
      geometries.push(geometry)
      // add the source
      this.map.addSource(name, {
        type: 'geojson',
        data: geometry
      })

      // Add a layer to the map based on the geometry type
      if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        this.map.addLayer({
          id: name,
          type: 'fill',
          source: name,
          layout: {},
          paint: {
            'fill-color': fillColor,
            'fill-opacity': fillOpacity
          }
        }, this.firstMapLayerId)

        this.map.addLayer({
          id: name + '-border',
          type: 'line',
          source: name,
          layout: {},
          paint: {
            'line-color': lineColor,
            'line-width': 1
          }
        }, this.firstMapLayerId)
      } else if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
        this.map.addLayer({
          id: name,
          type: 'circle',
          source: name,
          paint: {
            'circle-radius': pointRadius,
            'circle-color': pointColor,
            'circle-opacity': pointOpacity
          }
        }, this.firstMapLayerId)
      }
    })

    this.bbox = calculateBoundingBoxFromGeometries(geometries.map(g => g.coordinates))
  }

  async addGeoJsonUrlsToMap (geoJsonUrls) {
    geoJsonUrls.forEach(async (url, index) => {
      const name = `geometry-${index}`
      this.map.addSource(name, {
        type: 'geojson',
        data: url
      })

      this.map.addLayer({
        id: name,
        type: 'fill',
        source: name,
        layout: {},
        paint: {
          'fill-color': fillColor,
          'fill-opacity': fillOpacity
        }
      }, this.firstMapLayerId)

      this.map.addLayer({
        id: `${name}-point`,
        type: 'circle',
        source: name,
        paint: {
          'circle-radius': pointRadius,
          'circle-color': pointColor,
          'circle-opacity': pointOpacity
        },
        filter: ['==', '$type', 'Point']
      }, this.firstMapLayerId)

      this.map.addLayer({
        id: `${name}-border`,
        type: 'line',
        source: name,
        layout: {},
        paint: {
          'line-color': lineColor,
          'line-width': 1
        }
      }, this.firstMapLayerId)
    })

    if (!this.bbox || this.bbox.length === 0) {
      this.bbox = await generateBoundingBox(geoJsonUrls?.[0])
    }
  }

  addBoundaryGeoJsonToMap (geoJsonUrl) {
    this.map.addSource('boundary', {
      type: 'geojson',
      data: geoJsonUrl
    })

    this.map.addLayer({
      id: 'boundary',
      type: 'line',
      source: 'boundary',
      layout: {},
      paint: {
        'line-color': boundaryLineColor,
        'line-width': 2,
        'line-opacity': boundaryLineOpacity
      }
    }, this.firstMapLayerId)
  }

  setMapViewToBoundingBox () {
    this.map.fitBounds(this.bbox, { padding: 20, duration: 0, maxZoom: 11 })
  }
}

export const calculateBoundingBoxFromGeometries = (geometries) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  if (!geometries) return []

  const pullOutCoordinates = (geometry) => {
    if (Array.isArray(geometry[0])) {
      geometry.forEach(pullOutCoordinates)
    } else {
      const [x, y] = geometry

      // if x or y isn't a valid number log an error and continue
      if (isNaN(x) || isNaN(y)) {
        console.error('Invalid coordinates', x, y)
        return
      }

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  pullOutCoordinates(geometries)

  // Return the bounding box
  return [[minX, minY], [maxX, maxY]]
}

export const generatePaginatedGeoJsonLinks = async (geoJsonUrl) => {
  const geoJsonLinks = [geoJsonUrl]
  const initialResponse = await fetch(geoJsonUrl)
  const initialData = await initialResponse.json()

  // return if no pagination is needed
  if (!initialData.links || !initialData.links.last) {
    return geoJsonLinks
  }

  const lastLink = new URL(initialData.links.last)
  const limit = parseInt(lastLink.searchParams.get('limit'))
  const lastOffset = parseInt(lastLink.searchParams.get('offset'))

  if (!limit || !lastOffset) {
    console.error('Invalid pagination links', lastLink)
    return geoJsonLinks
  }

  // create a loop to generate the links
  for (let offset = limit; offset < lastOffset; offset += limit) {
    const newLink = new URL(geoJsonUrl)
    newLink.searchParams.set('offset', offset)

    geoJsonLinks.push(newLink.toString())
  }

  return geoJsonLinks
}

export const generateBoundingBox = async (boundaryGeoJsonUrl) => {
  if (!boundaryGeoJsonUrl) return []

  const res = await fetch(boundaryGeoJsonUrl)
  const boundaryGeoJson = await res.json()
  const coordinates = boundaryGeoJson?.features?.[0]?.geometry?.coordinates ?? null

  return calculateBoundingBoxFromGeometries(coordinates)
}

export const createMapFromServerContext = async () => {
  const { containerId, geometries, mapType, geoJsonUrl, boundaryGeoJsonUrl } = window.serverContext
  const options = {
    containerId,
    data: geometries,
    boundaryGeoJsonUrl,
    interactive: mapType !== 'static',
    wktFormat: geoJsonUrl === undefined
  }

  // if the geoJsonUrl is provided, generate the paginated GeoJSON links
  if (geoJsonUrl) {
    options.data = await generatePaginatedGeoJsonLinks(geoJsonUrl)
  }

  if (options.boundaryGeoJsonUrl) {
    options.boundingBox = await generateBoundingBox(boundaryGeoJsonUrl)
  }

  // if any of the required properties are missing, return null
  if (!options.containerId || !options.data) {
    console.log('Missing required properties (containerId, geometries) on window.serverContext', window.serverContext)
    return null
  }

  return new Map(options)
}

try {
  window.map = await createMapFromServerContext()
} catch (error) {
  console.error('Error creating map', error)
}
