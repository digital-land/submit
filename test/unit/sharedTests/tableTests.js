import { describe, it, expect } from 'vitest'
import prettifyColumnName from '../../../src/filters/prettifyColumnName'

export const runTableTests = (tableParams, document) => {
  describe('Table Component', () => {
    const tableHead = document.querySelector('.govuk-table__head')

    it('Renders the correct table headings', () => {
      const columnHeadings = tableHead.children[0].children

      tableParams.columns.forEach((column, i) => {
        expect(columnHeadings[i].textContent).toContain(prettifyColumnName(column))
      })
    })

    const tableBody = document.querySelector('.govuk-table__body')
    const rows = tableBody.children

    it('Renders the correct number of rows rows', () => {
      expect(rows.length).toEqual(tableParams.rows.length)
    })

    it('Renders the correct row content', () => {
      tableParams.rows.forEach((rowData, i) => {
        const columns = rows[i].children
        expect(columns.length).toEqual(Object.keys(rowData.columns).length)

        Object.values(rowData.columns).forEach((field, j) => {
          if (field.value) {
            expect(columns[j].textContent).toContain(field.value)
          } else if (field.html) {
            expect(columns[j].innerHTML).toContain(field.html)
          }

          if (field.error) {
            expect(columns[j].textContent).toContain(prettifyColumnName(field.error.message))
          }
        })
      })
    })
  })
}
