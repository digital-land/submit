import { describe, it, expect } from 'vitest'

const paginationTests = (template, nunjucks) => {
  describe('pagination', () => {
    it('correctly renders the pagination', () => {
      const pagination = {
        nextPage: 4,
        previousPage: 2,
        items: [
          { number: 1, href: '/results/test/0', current: false },
          { ellipsis: true, href: '#' },
          { number: 2, href: '/results/test/1', current: false },
          { number: 3, href: '/results/test/2', current: true },
          { number: 4, href: '/results/test/3', current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: '/results/test/9', current: false }
        ]
      }

      const params = {
        options: {
          pagination,
          verboseRows: [{}]
        },
        errors: {}
      }

      const html = nunjucks.render(template, params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

      expect(html).toContain('<nav class="govuk-pagination" role="navigation" aria-label="results"><div class="govuk-pagination__prev"> <a class="govuk-link govuk-pagination__link" href="/results/undefined/2" rel="prev"> <svg class="govuk-pagination__icon govuk-pagination__icon--prev" xmlns="http://www.w3.org/2000/svg" height="13" width="15" aria-hidden="true" focusable="false" viewBox="0 0 15 13"> <path d="m6.5938-0.0078125-6.7266 6.7266 6.7441 6.4062 1.377-1.449-4.1856-3.9768h12.896v-2h-12.984l4.2931-4.293-1.414-1.414z"></path> </svg> <span class="govuk-pagination__link-title">Previous</span></a> </div> <ul class="govuk-pagination__list"><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/0" aria-label="Page 1"> 1 </a> </li><li class="govuk-pagination__item govuk-pagination__item--ellipses">&ctdot;</li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/1" aria-label="Page 2"> 2 </a> </li><li class="govuk-pagination__item govuk-pagination__item--current"> <a class="govuk-link govuk-pagination__link" href="/results/test/2" aria-label="Page 3" aria-current="page"> 3 </a> </li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/3" aria-label="Page 4"> 4 </a> </li><li class="govuk-pagination__item govuk-pagination__item--ellipses">&ctdot;</li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/9" aria-label="Page 10"> 10 </a> </li></ul><div class="govuk-pagination__next"> <a class="govuk-link govuk-pagination__link" href="/results/undefined/4" rel="next"> <span class="govuk-pagination__link-title">Next</span> <svg class="govuk-pagination__icon govuk-pagination__icon--next" xmlns="http://www.w3.org/2000/svg" height="13" width="15" aria-hidden="true" focusable="false" viewBox="0 0 15 13"> <path d="m8.107-0.0078125-1.4136 1.414 4.2926 4.293h-12.986v2h12.896l-4.1855 3.9766 1.377 1.4492 6.7441-6.4062-6.7246-6.7266z"></path> </svg></a> </div></nav>')
    })

    it('correctly renders the pagination when viewing the first page', () => {
      const pagination = {
        nextPage: 2,
        previousPage: undefined,
        items: [
          { number: 1, href: '/results/test/0', current: true },
          { number: 2, href: '/results/test/1', current: false },
          { number: 3, href: '/results/test/2', current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: '/results/test/9', current: false }
        ]
      }

      const params = {
        options: {
          pagination,
          verboseRows: [{}]
        },
        errors: {}
      }

      const html = nunjucks.render(template, params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

      expect(html).toContain('<nav class="govuk-pagination" role="navigation" aria-label="results"><ul class="govuk-pagination__list"><li class="govuk-pagination__item govuk-pagination__item--current"> <a class="govuk-link govuk-pagination__link" href="/results/test/0" aria-label="Page 1" aria-current="page"> 1 </a> </li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/1" aria-label="Page 2"> 2 </a> </li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/2" aria-label="Page 3"> 3 </a> </li><li class="govuk-pagination__item govuk-pagination__item--ellipses">&ctdot;</li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/9" aria-label="Page 10"> 10 </a> </li></ul><div class="govuk-pagination__next"> <a class="govuk-link govuk-pagination__link" href="/results/undefined/2" rel="next"> <span class="govuk-pagination__link-title">Next</span> <svg class="govuk-pagination__icon govuk-pagination__icon--next" xmlns="http://www.w3.org/2000/svg" height="13" width="15" aria-hidden="true" focusable="false" viewBox="0 0 15 13"> <path d="m8.107-0.0078125-1.4136 1.414 4.2926 4.293h-12.986v2h12.896l-4.1855 3.9766 1.377 1.4492 6.7441-6.4062-6.7246-6.7266z"></path> </svg></a> </div></nav>')
    })

    it('correctly renders the pagination when viewing the last page', () => {
      const pagination = {
        nextPage: undefined,
        previousPage: 9,
        items: [
          { number: 1, href: '/results/test/0', current: false },
          { ellipsis: true, href: '#' },
          { number: 8, href: '/results/test/7', current: false },
          { number: 9, href: '/results/test/8', current: false },
          { number: 10, href: '/results/test/9', current: true }
        ]
      }

      const params = {
        options: {
          pagination,
          verboseRows: [{}]
        },
        errors: {}
      }

      const html = nunjucks.render(template, params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

      expect(html).toContain('<nav class="govuk-pagination" role="navigation" aria-label="results"><div class="govuk-pagination__prev"> <a class="govuk-link govuk-pagination__link" href="/results/undefined/9" rel="prev"> <svg class="govuk-pagination__icon govuk-pagination__icon--prev" xmlns="http://www.w3.org/2000/svg" height="13" width="15" aria-hidden="true" focusable="false" viewBox="0 0 15 13"> <path d="m6.5938-0.0078125-6.7266 6.7266 6.7441 6.4062 1.377-1.449-4.1856-3.9768h12.896v-2h-12.984l4.2931-4.293-1.414-1.414z"></path> </svg> <span class="govuk-pagination__link-title">Previous</span></a> </div> <ul class="govuk-pagination__list"><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/0" aria-label="Page 1"> 1 </a> </li><li class="govuk-pagination__item govuk-pagination__item--ellipses">&ctdot;</li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/7" aria-label="Page 8"> 8 </a> </li><li class="govuk-pagination__item"> <a class="govuk-link govuk-pagination__link" href="/results/test/8" aria-label="Page 9"> 9 </a> </li><li class="govuk-pagination__item govuk-pagination__item--current"> <a class="govuk-link govuk-pagination__link" href="/results/test/9" aria-label="Page 10" aria-current="page"> 10 </a> </li></ul></nav>')
    })
  })
}

export default paginationTests
