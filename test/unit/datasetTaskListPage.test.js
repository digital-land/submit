import { describe, it, expect } from 'vitest'
import config from '../../config/index.js'
import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'
import { runGenericPageTests } from './generic-page.js'
import jsdom from 'jsdom'

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'src/views/check',
  'src/views/submit',
  'node_modules/govuk-frontend/dist/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  dev: true,
  noCache: true,
  watch: true
})

const datasetNameMapping = new Map()

addFilters(nunjucksEnv, { datasetNameMapping })

describe('Dataset Task List Page', () => {
  const params = {
    organisation: {
      name: 'fake organisation'
    },
    dataset: {
      name: 'Article 4 direction area'
    },
    taskList: [
      {
        title: {
          text: '2 fields have future entry dates'
        },
        href: 'toDo',
        status: {
          tag: {
            text: 'Error',
            classes: 'govuk-tag--red'
          }
        }
      },
      {
        title: {
          text: '3 fields have invalid coordinates'
        },
        href: 'toDo',
        status: {
          tag: {
            text: 'Issue',
            classes: undefined
          }
        }
      },
      {
        title: {
          text: 'one field has an invalid decimal'
        },
        href: 'toDo',
        status: {
          tag: {
            text: 'Warning',
            classes: 'govuk-tag--blue'
          }
        }
      }
    ]
  }
  const html = nunjucks.render('organisations/datasetTaskList.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: 'fake organisation - Article 4 direction area - Task list - Submit planning and housing data for England',
    serviceName: config.serviceName
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual(params.organisation.name)
    expect(document.querySelector('h1').textContent).toContain(params.dataset.name)
    // expect(document.querySelector('h2').textContent).toContain('How to prepare and submit your World heritage site buffer zone data')
  })

  const taskListItems = document.querySelectorAll('.govuk-task-list__item')
  it('Task list items are rendered correctly', () => {
    expect(taskListItems.length).toEqual(params.taskList.length)
    params.taskList.forEach((task, i) => {
      const name = taskListItems[i].querySelector('.govuk-task-list__name-and-hint')
      const link = name.querySelector('.govuk-link')
      const status = taskListItems[i].querySelector('.govuk-task-list__status')
      const statusStrong = status.querySelector('strong')

      expect(name.textContent).toContain(task.title.text)
      expect(link.href).toContain(task.href)
      expect(status.textContent).toContain(task.status.tag.text)
      if (task.status.tag.classes) {
        expect(statusStrong.classList.contains(task.status.tag.classes)).toBe(true)
      }
    })
  })
})
