import { vi, it, describe, expect, beforeEach } from 'vitest'
// import { lpaOverviewQuery } from '../../src/services/performanceDbApi'
import fs from 'fs'

// function lpaOverviewQuery (a, b) {
//   return ''
// }

vi.mock('../../config/index.js', () => {
  return {
    default: {
      environment: 'test'
    }
  }
})

vi.mock('fs')

describe('performanceDbApi', () => {
  let performanceDbApi
  let lpaOverviewQuery
  beforeEach(async () => {
    fs.createReadStream.mockImplementation((filePath) => {
      const entitiesFile = filePath.includes('entity')
      return {
        pipe: vi.fn().mockReturnValue({
          on: vi.fn((event, callback) => {
            /*  eslint-disable n/no-callback-literal */
            callback({
              issue_type: 'some_issue_type',
              singular_message: entitiesFile ? 'singular entities message for {column_name}' : 'singular message for {column_name}',
              plural_message: entitiesFile ? 'plural entities message for {column_name} with count {num_issues}' : 'plural message for {column_name} with count {num_issues}',
              allRows_message: 'all rows message for {column_name}'
            })
            /* eslint-enable n/no-callback-literal */

            return {
              on: vi.fn((event, callback) => {
                callback()
              })
            }
          })
        })
      }
    })

    const module = (await import('../../src/services/performanceDbApi'))
    lpaOverviewQuery = module.lpaOverviewQuery
    performanceDbApi = module.default
  })

  describe('lpaOverviewQuery', () => {
    it('uses params in the query', () => {
      const query = lpaOverviewQuery('local-authority:FOO', {
        datasetsFilter: ['dataset-one', 'dataset-two'],
        entityCounts: [{ dataset: 'dataset-three', resource: 'r1', entityCount: 10 }]
      })
      expect(query).toContain('local-authority:FOO')
      expect(query).toContain('dataset-one')
      expect(query).toContain('dataset-two')
    })
  })

  describe('getTaskMessage', () => {
    it('returns a message for a known issue type with no field provided', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1 })
      expect(message).toBeDefined()
      expect(message).toContain('singular message')
    })

    it('returns a message with the correct field replacement', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1, field: 'my_field' })
      expect(message).toContain('my_field')
    })

    it('returns a singular message for num_issues === 1', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1 })
      expect(message).toContain('singular message for value')
    })

    it('returns a plural message for num_issues > 1', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 2 })
      expect(message).toContain('plural message for value with count 2')
    })

    it('returns an entity-level message when entityLevel is true', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1, entityCount: 2 }, true)
      expect(message).toContain('singular entities message for value')
    })

    it('returns an "all rows" message when num_issues >= entityCount', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 5, entityCount: 5, field: 'some_field' })
      expect(message).toContain('all rows message for some_field')
    })

    it('returns a fallback message when the issue type is unknown', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'unknown_issue_type', num_issues: 1 })
      expect(message).toContain('1 issue of type unknown_issue_type')
    })
  })
})
