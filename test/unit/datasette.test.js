import datasette, { formatData } from '../../src/services/datasette.js'
import axios from 'axios'
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

describe('datasette', () => {
  beforeEach(() => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        columns: ['column1', 'column2'],
        rows: [
          ['value1', 'value2'],
          ['value3', 'value4']
        ]
      }
    })
  })

  afterEach(() => {
    vi.mocked(axios.get).mockReset()
  })

  it('runs a SQL query and returns the results', async () => {
    const query = 'SELECT * FROM table_name'
    const result = await datasette.runQuery(query)

    expect(result).toEqual({
      columns: ['column1', 'column2'],
      formattedData: [
        { column1: 'value1', column2: 'value2' },
        { column1: 'value3', column2: 'value4' }
      ],
      rows: [
        ['value1', 'value2'],
        ['value3', 'value4']
      ]
    })
  })

  it('throws an error if the query fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Query failed'))

    await expect(datasette.runQuery('SELECT * FROM table_name')).rejects.toThrowError('Query failed')
  })

  it('formats data correctly', () => {
    const columns = ['column1', 'column2']
    const rows = [['value1', 'value2'], ['value3', 'value4']]
    const formattedData = formatData(columns, rows)

    expect(formattedData).toEqual([
      { column1: 'value1', column2: 'value2' },
      { column1: 'value3', column2: 'value4' }
    ])
  })
})
