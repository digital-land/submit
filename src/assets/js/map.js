import parse from 'wellknown'
import maplibregl from 'maplibre-gl'

const fillColor = '#008'
const lineColor = '#000000'
const opacity = 0.4

class Map {
  constructor (containerId, geometries, interactive = true, wktFormat = true) {
    this.map = new maplibregl.Map({
      container: containerId,
      style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=ncAXR9XEn7JgHBLguAUw',
      zoom: 11,
      center: [-0.1298779, 51.4959698],
      interactive
    })

    this.map.on('load', () => {
      if (wktFormat) this.addWktDataToMap(geometries)
      else this.addGeoJsonUrlsToMap(geometries)
    })
  }

  addWktDataToMap (geometriesWkt) {
    const geometries = []
    geometriesWkt.forEach((geometryWkt, index) => {
      const name = `geometry-${index}`

      // Convert the coordinates string to a GeoJSON object
      const geometry = parse(geometryWkt)
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
            'fill-opacity': opacity
          }
        })

        this.map.addLayer({
          id: name + '-border',
          type: 'line',
          source: name,
          layout: {},
          paint: {
            'line-color': lineColor,
            'line-width': 1
          }
        })
      } else if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
        this.map.addLayer({
          id: name,
          type: 'circle',
          source: name,
          paint: {
            'circle-radius': 10,
            'circle-color': fillColor,
            'circle-opacity': opacity
          }
        })
      }
    })

    this.bbox = this.calculateBoundingBoxFromGeometries(geometries.map(g => g.coordinates))
    this.setMapViewToBoundingBox()
  }

  addGeoJsonUrlsToMap (geoJsonUrls) {
    geoJsonUrls.forEach(async (url, index) => {
      const sourceId = `geojson-${index}`
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: url
      })

      this.map.addLayer({
        id: `${sourceId}-layer`,
        type: 'fill',
        source: sourceId,
        layout: {},
        paint: {
          'fill-color': fillColor,
          'fill-opacity': opacity
        }
      })
    })
  }

  setMapViewToBoundingBox () {
    this.map.fitBounds(this.bbox, { padding: 20, duration: 0 })
  }

  moveMapToLocation (location) {
    this.map.flyTo({
      center: location,
      zoom: 11
    })
  }

  calculateBoundingBoxFromGeometries (geometries) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

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
}

const generateGeoJsonLinks = async (geoJsonUrl) => {
  const geoJsonLinks = [geoJsonUrl]
  const initialResponse = await fetch(geoJsonUrl)
  const initialData = await initialResponse.json()

  if (!initialData.links || !initialData.links.last) return geoJsonLinks

  const lastLink = new URL(initialData.links.last)
  const limit = lastLink.searchParams.get('limit')
  const lastOffset = lastLink.searchParams.get('offset')

  if (!limit || !lastOffset) return geoJsonLinks

  console.log(limit, lastOffset)

  // generate an array of links to fetch
  /*  for (let offset = limit; offset < lastOffset; offset += limit) {
    const newLink = new URL(geoJsonUrl)
    newLink.searchParams.set('offset', offset)
    console.log(newLink.toString())
    geoJsonLinks.push(newLink.toString())
  } */

  return geoJsonLinks
}

const createMapFromServerContext = async () => {
  const { containerId, geometries, mapType, geoJsonUrl } = window.serverContext

  let data = geometries

  if (geoJsonUrl) {
    data = await generateGeoJsonLinks(geoJsonUrl)

    console.log(data)
  }

  // if any of the required properties are missing, return null
  if (!containerId || !data) {
    console.log('Missing required properties (containerId and (geometries or geoJsonUrl)) on window.serverContext', window.serverContext)
    return null
  }

  return new Map(containerId, data, mapType !== 'static', geoJsonUrl === undefined)
}

const newMap = createMapFromServerContext()

window.map = newMap
