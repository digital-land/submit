import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'

const path = '/check/results/test'

const paginationTests = (template, nunjucks, opts = {}) => {
  describe('pagination', () => {
    const hash = opts.hash ?? ''
    it('correctly renders the pagination', () => {
      const pagination = {
        nextPage: 4,
        previousPage: 2,
        items: [
          { number: 1, href: `${path}/0${hash}`, current: false },
          { ellipsis: true, href: '#' },
          { number: 2, href: `${path}/1${hash}`, current: false },
          { number: 3, href: `${path}/2${hash}`, current: true },
          { number: 4, href: `${path}/3${hash}`, current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: `${path}/9${hash}`, current: false }
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

      testPagination({ template, params, nunjucks, opts })
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

      testPagination({ template, nunjucks, params, opts })
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

      testPagination({ template, nunjucks, params, opts })
    })
  })
}

/**
 * - `hash` option - sometimes the pagination links might include a hash component (e.g. when using tabs)
 *
 * @param {{ template: string, nunjucks: Object, params: Object, opts: { hash?: string }}} options
 */
const testPagination = ({ template, nunjucks, params, opts = {} }) => {
  const html = nunjucks.render(template, params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

  const { id, pagination } = params.options

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  const paginationNode = document.querySelector('nav.govuk-pagination')
  const paginationChildren = paginationNode.children

  let currentPaginationChild = 0

  const hash = opts.hash ?? ''

  // Previous link
  if (pagination.previousPage) {
    expect(paginationChildren[currentPaginationChild].children[0].href).toEqual(`/check/results/${id}/${pagination.previousPage}${hash}`)
    currentPaginationChild++
  }

  // page numbers
  const pageNumberNodes = paginationChildren[currentPaginationChild].children
  expect(pageNumberNodes.length).toEqual(pagination.items.length)

  const tuples = { actual: [], expected: [] }
  for (let index = 0; index < pagination.items.length; ++index) {
    const pItem = pagination.items[index]
    const nItem = pageNumberNodes[index]
    const actual = []
    const expected = []
    if (pItem.ellipsis) {
      expected.push(' ⋯ ')
      actual.push(nItem.textContent)
    } else {
      expected.push(pItem.href)
      actual.push(nItem.children[0].href)

      expected.push(` ${pItem.number} `)
      actual.push(nItem.children[0].textContent)

      actual.push(pItem.current && nItem.className.includes('current') ? 'contains "current"' : 'no "current"')
      expected.push(pItem.current ? 'contains "current"' : 'no "current"')
    }
    tuples.actual.push(actual)
    tuples.expected.push(expected)
  }
  expect(tuples.actual).toStrictEqual(tuples.expected)
  currentPaginationChild++

  // next link
  if (pagination.nextPage) {
    expect(paginationChildren[currentPaginationChild].children[0].href).toEqual(`/check/results/${id}/${pagination.nextPage}${hash}`)
    currentPaginationChild++
  }

  expect(paginationChildren.length).toEqual(currentPaginationChild)
}

export default paginationTests
