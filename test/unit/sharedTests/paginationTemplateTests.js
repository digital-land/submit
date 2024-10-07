import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'

const path = '/check/results/test'

const paginationTests = (template, nunjucks) => {
  describe('pagination', () => {
    it('correctly renders the pagination', () => {
      const pagination = {
        nextPage: 4,
        previousPage: 2,
        items: [
          { number: 1, href: `${path}/0`, current: false },
          { ellipsis: true, href: '#' },
          { number: 2, href: `${path}/1`, current: false },
          { number: 3, href: `${path}/2`, current: true },
          { number: 4, href: `${path}/3`, current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: `${path}/9`, current: false }
        ]
      }

      const params = {
        options: {
          pagination,
          verboseRows: [{}],
          id: 'test'
        },
        errors: {}
      }

      testPagination({ template, params, nunjucks })
    })

    it('correctly renders the pagination when viewing the first page', () => {
      const pagination = {
        nextPage: 2,
        previousPage: undefined,
        items: [
          { number: 1, href: `${path}/0`, current: true },
          { number: 2, href: `${path}/1`, current: false },
          { number: 3, href: `${path}/2`, current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: `${path}/9`, current: false }
        ]
      }

      const params = {
        options: {
          pagination,
          verboseRows: [{}],
          id: 'test'
        },
        errors: {}
      }

      testPagination({ template, nunjucks, params })
    })

    it('correctly renders the pagination when viewing the last page', () => {
      const pagination = {
        nextPage: undefined,
        previousPage: 9,
        items: [
          { number: 1, href: `${path}/0`, current: false },
          { ellipsis: true, href: '#' },
          { number: 8, href: `${path}/7`, current: false },
          { number: 9, href: `${path}/8`, current: false },
          { number: 10, href: `${path}/9`, current: true }
        ]
      }

      const params = {
        options: {
          pagination,
          verboseRows: [{}],
          id: 'test'
        },
        errors: {}
      }

      testPagination({ template, nunjucks, params })
    })
  })
}

const testPagination = ({ template, nunjucks, params }) => {
  const html = nunjucks.render(template, params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

  const { id, pagination } = params.options

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  const paginationNode = document.querySelector('nav.govuk-pagination')
  const paginationChildren = paginationNode.children

  let currentPaginationChild = 0

  // Previous link
  if (pagination.previousPage) {
    expect(paginationChildren[currentPaginationChild].children[0].href).toEqual(`/check/results/${id}/${pagination.previousPage}`)
    currentPaginationChild++
  }

  // page numbers
  const pageNumberNodes = paginationChildren[currentPaginationChild].children
  expect(pageNumberNodes.length).toEqual(pagination.items.length)

  pagination.items.forEach((item, index) => {
    if (item.ellipsis) {
      expect(pageNumberNodes[index].textContent).toEqual(' ⋯ ')
    } else {
      expect(pageNumberNodes[index].children[0].href).toEqual(item.href)
      expect(pageNumberNodes[index].children[0].textContent).toEqual(` ${item.number} `)
      if (item.current) {
        expect(pageNumberNodes[index].className).toContain('current')
      } else {
        expect(pageNumberNodes[index].className).not.toContain('current')
      }
    }
  })
  currentPaginationChild++

  // next link
  if (pagination.nextPage) {
    expect(paginationChildren[currentPaginationChild].children[0].href).toEqual(`/check/results/${id}/${pagination.nextPage}`)
    currentPaginationChild++
  }

  expect(paginationChildren.length).toEqual(currentPaginationChild)
}

export default paginationTests
