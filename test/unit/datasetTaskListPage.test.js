import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './sharedTests/generic-page.js'
import jsdom from 'jsdom'
import mocker from '../utils/mocker.js'
import { OrgDatasetTaskList } from '../../src/routes/schemas.js'

const nunjucks = setupNunjucks({})

const seed = new Date().getTime()

describe(`Dataset Task List Page (seed: ${seed})`, () => {
  const params = mocker(OrgDatasetTaskList, seed)
  const html = nunjucks.render('organisations/datasetTaskList.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: `${params.organisation.name} - ${params.dataset.name} - Task list - Submit and update your planning data`,
    breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Organisations', href: '/organisations' }, { text: 'mock org', href: `/organisations/${params.organisation.organisation}` }, { text: 'Article 4 direction area' }]
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual(params.organisation.name)
    expect(document.querySelector('h1').textContent).toContain(params.dataset.name)
  })

  it('Renders the dataset navigation links correctly', () => {
    const links = document.querySelectorAll('.app-c-dataset-navigation .govuk-service-navigation__link')
    const activeLink = document.querySelector('.app-c-dataset-navigation .govuk-service-navigation__item.govuk-service-navigation__item--active')
    const issueCount = document.querySelector('.app-c-dataset-navigation .govuk-service-navigation__item.govuk-service-navigation__item--active .app-c-dataset-navigation__notification-badge')

    expect(document.querySelector('.app-c-dataset-navigation')).not.toBeNull()
    expect(links.length).toEqual(2)
    expect(activeLink.textContent).toContain('Task list')
    expect(issueCount.textContent).toContain(`${params.taskList.length} issue${params.taskList.length > 1 ? 's' : ''}`)
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
        expect(statusStrong.classList.toString()).toContain(task.status.tag.classes)
      }
    })
  })

  it('renders correctly when no taskList items are passed in', () => {
    const organisation = { name: 'Test Organisation', statistical_geography: '12345678', organisation: 'test organisation' }
    const dataset = { name: 'Test Dataset', dataset: 'test-dataset', collection: 'test-dataset' }
    const taskList = []

    const html = nunjucks.render('organisations/datasetTaskList.html', {
      organisation,
      dataset,
      taskList
    })

    const paragraphText = `There are no issues with ${organisation.name}'s ${dataset.name} dataset.`
    const linkHref = `https://www.planning.data.gov.uk/entity/?dataset=${dataset.dataset}&geometry_curie=statistical-geography:${organisation.statistical_geography}`

    expect(html).toContain(paragraphText)
    expect(html).toContain(linkHref)
  })
})
