import { describe, it, vi, expect } from 'vitest'
import { getGetStarted } from '../../../src/middleware/getStarted.middleware.js'

describe('get-started', () => {
  const exampleLpa = {
    formattedData: [
      { name: 'Example LPA', organisation: 'LPA' }
    ]
  }
  const exampleDataset = { name: 'Example Dataset', dataset: 'example-dataset', collection: 'example-collection' }

  it('should render the get-started template with the correct params', async () => {
    const req = {
      params: { lpa: 'example-lpa', dataset: 'example-dataset' },
      orgInfo: exampleLpa.formattedData[0],
      dataset: exampleDataset,
      authority: ''
    }
    const res = { render: vi.fn() }
    const next = vi.fn()

    getGetStarted(req, res, next)

    expect(res.render).toHaveBeenCalledTimes(1)
    expect(res.render).toHaveBeenCalledWith('organisations/get-started.html', {
      organisation: { name: 'Example LPA', organisation: 'LPA' },
      dataset: exampleDataset,
      authority: ''
    })
  })

  it('should catch and pass errors to the next function', async () => {
    const req = {
      params: { lpa: 'example-lpa', dataset: 'example-dataset' },
      orgInfo: undefined, // this should fail validation
      dataset: exampleDataset
    }
    const res = { render: vi.fn() }
    const next = vi.fn()

    getGetStarted(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.render).toHaveBeenCalledTimes(0)
  })
})
