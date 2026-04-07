import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Map, calculateBoundingBoxFromGeometries, generatePaginatedGeoJsonLinks, generateBoundingBox, createMapFromServerContext } from '../../../src/assets/js/map'
import parse from 'wellknown'
import maplibregl from 'maplibre-gl'

// Extend the mocks
global.fetch = vi.fn()

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      addControl: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'load') callback()
      }),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      fitBounds: vi.fn(),
      flyTo: vi.fn(),
      getStyle: vi.fn().mockReturnValue({ layers: [{ type: 'symbol', id: 'symbol-layer' }] }),
      getCanvas: vi.fn().mockReturnValue({ style: { cursor: '' } })
    })),
    ScaleControl: vi.fn(),
    NavigationControl: vi.fn(),
    FullscreenControl: vi.fn()
  }
}))

vi.mock('wellknown', () => ({
  default: vi.fn().mockReturnValue({ type: 'Polygon', coordinates: [[0, 0], [1, 1]] }),
  parse: vi.fn().mockReturnValue({ type: 'Polygon', coordinates: [[0, 0], [1, 1]] })
}))

vi.mock('../../../src/assets/js/os-api-token.js', () => ({
  getApiToken: vi.fn().mockReturnValue('valid-token')
}))

describe('map.js', () => {
  describe('Map class extended tests', () => {
    it('should add controls based on interactivity', () => {
      const mapInteractive = new Map({ containerId: 'map', data: [], interactive: true })
      const mapNonInteractive = new Map({ containerId: 'map', data: [], interactive: false })

      expect(mapInteractive.map.addControl).toHaveBeenCalledWith(expect.any(maplibregl.NavigationControl))
      expect(mapInteractive.map.addControl).toHaveBeenCalledWith(expect.any(maplibregl.FullscreenControl))
      expect(mapNonInteractive.map.addControl).not.toHaveBeenCalledWith(expect.any(maplibregl.NavigationControl))
    })

    it('should handle different geometry types correctly', () => {
      parse.mockReturnValueOnce({ type: 'Point', coordinates: [1, 1] })

      const map = new Map({ containerId: 'map', data: ['POINT (1 1)'], interactive: true, wktFormat: true })

      expect(map.map.addSource).toHaveBeenCalledWith('dataset', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { coordinates: [1, 1], type: 'Point' }
            }]
        }
      })
      expect(map.map.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'fill', id: 'dataset-poly' }),
        'symbol-layer'
      )
    })

    it('should calculate bounding box with complex nested arrays', () => {
      const geometries = [[[[-5, -5], [0, 0]], [[10, 10], [15, 15]]]]
      const result = calculateBoundingBoxFromGeometries(geometries)

      expect(result).toEqual([[-5, -5], [15, 15]])
    })

    it('should set first map layer id on map load', () => {
      const map = new Map({ containerId: 'map', data: [], interactive: true })

      map.setFirstMapLayerId()

      expect(map.firstMapLayerId).toBe('symbol-layer')
    })
  })

  describe('calculateBoundingBoxFromGeometries extended tests', () => {
    it('should handle empty arrays gracefully', () => {
      const result = calculateBoundingBoxFromGeometries([])

      expect(result).toEqual([[Infinity, Infinity], [-Infinity, -Infinity]])
    })

    it('should handle complex multi-dimensional coordinates', () => {
      const geometries = [[[[5, 5], [10, 10], [-20, -20]], [[15, 15], [-25, -25]]]]
      const result = calculateBoundingBoxFromGeometries(geometries)

      expect(result).toEqual([[-25, -25], [15, 15]])
    })

    it('should return empty array if geometry is undefined', () => {
      const geometries = undefined
      const result = calculateBoundingBoxFromGeometries(geometries)

      expect(result).toEqual([])
    })
  })

  describe('generatePaginatedGeoJsonLinks extended tests', () => {
    it('should handle missing or malformed pagination links', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ links: { last: 'http://example.com/geojson?offset=NaN&limit=20' } })
      })

      const result = await generatePaginatedGeoJsonLinks('http://example.com/geojson')

      expect(result).toEqual(['http://example.com/geojson'])
    })

    it('should correctly generate links when only partial pagination is present', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ links: { last: 'http://example.com/geojson?limit=500&offset=1500' } })
      })

      const result = await generatePaginatedGeoJsonLinks('http://example.com/geojson')

      expect(result).toEqual([
        'http://example.com/geojson',
        'http://example.com/geojson?offset=500',
        'http://example.com/geojson?offset=1000',
        'http://example.com/geojson?offset=1500'
      ])
    })
  })

  describe('generateBoundingBox extended tests', () => {
    it('should handle empty features array gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [[0, 0], [1, 1], [0, 1], [0, 0]]
                ]
              }
            }
          ]
        })
      })

      const result = await generateBoundingBox('http://example.com/boundary.geojson')

      expect(result).toEqual([[0, 0], [1, 1]])
    })
  })

  describe('createMapFromServerContext extended tests', () => {
    beforeEach(() => {
      global.window = {} // Create a mock window object
    })

    afterEach(() => {
      delete global.window // Clean up after each test
    })

    it('should handle cases where data is in WKT format', async () => {
      global.window.serverContext = {
        containerId: 'map',
        geometries: ['POINT (1 1)', 'LINESTRING (1 1, 2 2)'],
        mapType: 'interactive',
        geoJsonUrl: undefined
      }

      const map = await createMapFromServerContext()

      expect(map).toBeInstanceOf(Map)
      expect(map.map).toBeDefined()
    })

    it('should log an error if required properties are missing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      global.window.serverContext = {
        containerId: 'map',
        mapType: 'static'
      }

      const map = await createMapFromServerContext()

      expect(map).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Missing required properties (containerId, geometries) on window.serverContext',
        expect.any(Object)
      )
    })

    it('should default to maptiler style if token fetch fails', async () => {
      vi.mock('../../../src/assets/js/os-api-token.js', () => ({
        getApiToken: vi.fn().mockReturnValue(''),
        getFreshApiToken: vi.fn().mockRejectedValue(new Error('API token fetch failed'))
      }))

      global.window.serverContext = {
        containerId: 'map',
        geometries: ['POINT (1 1)', 'LINESTRING (1 1, 2 2)'],
        mapType: 'interactive',
        geoJsonUrl: undefined
      }

      const map = await createMapFromServerContext()

      expect(map).toBeInstanceOf(Map)
      expect(map.map).toBeDefined()
      expect(map.opts).toEqual({
        containerId: 'map',
        data: ['POINT (1 1)', 'LINESTRING (1 1, 2 2)'],
        interactive: true,
        wktFormat: true,
        geoJsonUrl: undefined,
        boundaryGeoJsonUrl: undefined,
        style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=ncAXR9XEn7JgHBLguAUw',
        limitMaxZoom: false
      })
    })
    it('should default limitMaxZoom to false if dataset page', async () => {
      global.window.serverContext = {
        containerId: 'map',
        geometries: ['POINT (1 1)', 'LINESTRING (1 1, 2 2)'],
        mapType: 'interactive'
      }

      const map = await createMapFromServerContext()
      expect(map.opts.limitMaxZoom).toBe(false)
    })
    it('should default limitMaxZoom to true is entity page', async () => {
      global.window.serverContext = {
        containerId: 'map',
        geometries: ['POINT (1 1)', 'LINESTRING (1 1, 2 2)']
      }

      const map = await createMapFromServerContext()
      expect(map.opts.limitMaxZoom).toBe(true)
    })
  })
})
