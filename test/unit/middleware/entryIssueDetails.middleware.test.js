import { describe, it, expect, vi } from 'vitest'
import { addResourceMetaDataToResources } from '../../../src/middleware/entryIssueDetails.middleware'

describe('entryIssueDetails.middleware.test.js', () => {
  describe('addResourceMetaDataToResources', () => {
    it('adds metadata to resources when metadata is found', () => {
      const req = {
        resources: [
          { resource: 'resource1', foo: 'bar' },
          { resource: 'resource2', baz: 'qux' }
        ],
        resourceMetaData: [
          { resource: 'resource1', description: 'Resource 1 desc' },
          { resource: 'resource3', description: 'Resource 3 desc' }
        ]
      }
      const res = {}
      const next = vi.fn()

      addResourceMetaDataToResources(req, res, next)

      expect(req.resources).toEqual([
        { resource: 'resource1', foo: 'bar', description: 'Resource 1 desc' },
        { resource: 'resource2', baz: 'qux' }
      ])
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('leaves resources unchanged when metadata is not found', () => {
      const req = {
        resources: [
          { resource: 'resource1', foo: 'bar' },
          { resource: 'resource2', baz: 'qux' }
        ],
        resourceMetaData: [
          { resource: 'resource3', metaData: { description: 'Resource 3 desc' } }
        ]
      }
      const res = {}
      const next = vi.fn()

      addResourceMetaDataToResources(req, res, next)

      expect(req.resources).toEqual([
        { resource: 'resource1', foo: 'bar' },
        { resource: 'resource2', baz: 'qux' }
      ])
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('calls next() when done', () => {
      const req = {
        resources: [],
        resourceMetaData: []
      }
      const res = {}
      const next = vi.fn()

      addResourceMetaDataToResources(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('setRecordCount', () => {

  })

  describe('prepareEntry', () => {

  })

  describe('prepareEntryIssueDetailsTemplateParams', () => {

  })

  describe('getIssueDetails', () => {

  })
})
