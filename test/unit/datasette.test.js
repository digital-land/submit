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

    expect(result).toHaveProperty('columns')
    expect(result).toHaveProperty('formattedData')
    expect(result).toHaveProperty('rows')
    expect(result.formattedData).toHaveLength(2)
    expect(result.formattedData[0]).toEqual({ column1: 'value1', column2: 'value2' })
    expect(result.formattedData[1]).toEqual({ column1: 'value3', column2: 'value4' })
    expect(result.columns).toEqual(['column1', 'column2'])
    expect(result.rows[0]).toEqual(['value1', 'value2'])
    expect(result.rows[1]).toEqual(['value3', 'value4'])
  })

  it('throws an error if the query fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Query failed'))

    await expect(datasette.runQuery('SELECT * FROM table_name')).rejects.toThrowError('Query failed')
  })

  it('formats data correctly', () => {
    const columns = ['column1', 'column2']
    const rows = [['value1', 'value2'], ['value3', 'value4']]
    const formattedData = formatData(columns, rows)

    expect(formattedData).toHaveLength(2)
    expect(formattedData[0]).toEqual({ column1: 'value1', column2: 'value2' })
    expect(formattedData[1]).toEqual({ column1: 'value3', column2: 'value4' })
  })
})
