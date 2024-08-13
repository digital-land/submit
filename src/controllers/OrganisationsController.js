import datasette from '../services/datasette.js'
import performanceDbApi from '../services/performanceDbApi.js' // Assume you have an API service module
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { dataSubjects } from '../utils/utils.js'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects)
  .flatMap(dataSubject =>
    dataSubject.dataSets
      .filter(dataset => dataset.available)
      .map(dataset => dataset.value)
  )

/**
 * Returns a status tag object with a text label and a CSS class based on the status.
 *
 * @param {string} status - The status to generate a tag for (e.g. "Error", "Needs fixing", etc.)
 * @returns {object} - An object with a `tag` property containing the text label and CSS class.
 */
function getStatusTag (status) {
  const statusToTagClass = {
    Error: 'govuk-tag--red',
    'Needs fixing': 'govuk-tag--yellow',
    Warning: 'govuk-tag--blue',
    Issue: 'govuk-tag--blue'
  }

  return {
    tag: {
      text: status,
      classes: statusToTagClass[status]
    }
  }
}

const organisationsController = {
  /**
   * Get LPA overview data and render the overview page
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   * @returns {Promise<void>} - Returns a promise that resolves when the overview page is rendered
   */
  async getOverview (req, res, next) {
    try {
      const lpa = req.params.lpa
      
      const organisationResult = await datasette.runQuery(`SELECT name, organisation FROM organisation WHERE organisation = '${lpa}'`)
      const organisation = organisationResult.formattedData[0]


      const datasetsFilter = ['article-4-direction',
        'article-4-direction-area',
        'conservation-area',
        'conservation-area-document',
        'tree-preservation-order',
        'tree-preservation-zone',
        'tree',
        'listed-building',
        'listed-building-outline']

      // Make API request
      const lpaOverview = await performanceDbApi.getLpaOverview(lpa, { datasetsFilter })

      // restructure datasets to usable format
      const datasets = Object.entries(lpaOverview.datasets).map(([key, value]) => {
        return {
          slug: key,
          ...value
        }
      })

      // add in any of the missing key 8 datasets
      const keys = Object.keys(lpaOverview.datasets)
      availableDatasets.forEach(dataset => {
        if (!keys.includes(dataset)) {
          datasets.push({
            slug: dataset,
            endpoint: null
          })
        }
      })

      const totalDatasets = datasets.length
      const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] = datasets.reduce((accumulator, dataset) => {
        if (dataset.endpoint !== null) accumulator[0]++
        if (dataset.issue) accumulator[1]++
        if (dataset.error) accumulator[2]++
        return accumulator
      }, [0, 0, 0])

      const params = {
        organisation,
        datasets,
        totalDatasets,
        datasetsWithEndpoints,
        datasetsWithIssues,
        datasetsWithErrors
      }

      res.render('organisations/overview.html', params)
    } catch (error) {
      logger.error(error)
      next(error)
    }
  },

  /**
   * Handles the GET /organisations request
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getOrganisations (req, res, next) {
    try {
      const sql = 'select name, organisation from organisation'
      const result = await datasette.runQuery(sql)

      const sortedResults = result.formattedData.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })

      const alphabetisedOrgs = sortedResults.reduce((acc, current) => {
        const firstLetter = current.name.charAt(0).toUpperCase()
        acc[firstLetter] = acc[firstLetter] || []
        acc[firstLetter].push(current)
        return acc
      }, {})

      res.render('organisations/find.html', { alphabetisedOrgs })
    } catch (err) {
      logger.warn(err)
      next(err)
    }
  },

  /**
 * Handles GET requests for the "Get Started" page.
 *
 * @param {Express.Request} req - The incoming request object.
 * @param {Express.Response} res - The response object to send back to the client.
 * @param {Express.NextFunction} next - The next function in the middleware chain.
 *
 * Retrieves the organisation and dataset names from the database and renders the "Get Started" page with the organisation and dataset details.
 */
  async getGetStarted (req, res, next) {
    try {
    // get the organisation name
      const lpa = req.params.lpa
      const organisationResult = await datasette.runQuery(`SELECT name FROM organisation WHERE organisation = '${lpa}'`)
      const organisation = organisationResult.formattedData[0]

      // get the dataset name
      const datasetId = req.params.dataset
      const datasetResult = await datasette.runQuery(`SELECT name FROM dataset WHERE dataset = '${datasetId}'`)
      const dataset = datasetResult.formattedData[0]

      const params = {
        organisation,
        dataset
      }

      res.render('organisations/get-started.html', params)
    } catch (err) {
      logger.error(err)
      next(err)
    }
  },

  /**
 * Handles GET requests for the dataset task list page.
 *
 * @param {Express.Request} req - The incoming request object.
 * @param {Express.Response} res - The response object to send back to the client.
 * @param {Express.NextFunction} next - The next function in the middleware chain.
 *
 * Retrieves the organisation and dataset names from the database, fetches the issues for the given LPA and dataset,
 * and renders the dataset task list page with the list of tasks and organisation and dataset details.
 */
  async getDatasetTaskList (req, res, next) {
    const lpa = req.params.lpa
    const datasetId = req.params.dataset

    try {
      const organisationResult = await datasette.runQuery(`SELECT name FROM organisation WHERE organisation = '${lpa}'`)
      const organisation = organisationResult.formattedData[0]

      const datasetResult = await datasette.runQuery(`SELECT name FROM dataset WHERE dataset = '${datasetId}'`)
      const dataset = datasetResult.formattedData[0]

      const issues = await performanceDbApi.getLpaDatasetIssues(lpa, datasetId)

      const taskList = issues.map((issue) => {
        return {
          title: {
            text: performanceDbApi.getTaskMessage(issue.issue_type, issue.num_issues)
          },
          href: `/organisations/${lpa}/${datasetId}/${issue.issue_type}`,
          status: getStatusTag(issue.status)
        }
      })

      const params = {
        taskList,
        organisation,
        dataset
      }

      res.render('organisations/datasetTaskList.html', params)
    } catch (e) {
      logger.warn(`getDAtasetTaskList() failed for lpa='${lpa}', datasetId='${datasetId}'`, { type: types.App })
      next(e)
    }
  },

  async getEndpointError (req, res, next, { resourceStatus }) {
    const { lpa, dataset: datasetId } = req.params

    try {
      const organisationResult = await datasette.runQuery(`SELECT name FROM organisation WHERE organisation = '${lpa}'`)
      const organisation = organisationResult.formattedData[0]

      const datasetResult = await datasette.runQuery(`SELECT name FROM dataset WHERE dataset = '${datasetId}'`)
      const dataset = datasetResult.formattedData[0]

      const daysSince200 = resourceStatus.days_since_200
      const today = new Date()
      const last200Date = new Date(today.getTime() - (daysSince200 * 24 * 60 * 60 * 1000))
      const last200Datetime = last200Date.toISOString().slice(0, 19) + 'Z'

      const params = {
        organisation: {
          name: organisation.name
        },
        dataset: {
          name: dataset.name
        },
        errorData: {
          endpoint_url: resourceStatus.endpoint_url,
          http_status: resourceStatus.status,
          latest_log_entry_date: resourceStatus.latest_log_entry_date,
          latest_200_date: last200Datetime
        }
      }
      res.render('organisations/http-error.html', params)
    } catch (e) {
      logger.warn(`conditionalTaskListHandler() failed for lpa='${lpa}', datasetId='${datasetId}'`, { type: types.App })
      next(e)
    }
  },

  async conditionalTaskListHandler (req, res, next) {
    const { lpa, dataset: datasetId } = req.params

    try {
      const resourceStatus = await performanceDbApi.getResourceStatus(lpa, datasetId)

      if (resourceStatus.status !== '200') {
        return await organisationsController.getEndpointError(req, res, next, { resourceStatus })
      } else {
        return await organisationsController.getDatasetTaskList(req, res, next)
      }
    } catch (e) {
      logger.warn(`conditionalTaskListHandler() failed for lpa='${lpa}', datasetId='${datasetId}'`, { type: types.App })
      next(e)
    }
  },

  /**
 * Handles GET requests for the issue details page.
 *
 * @param {Express.Request} req - The incoming request object.
 * @param {Express.Response} res - The response object to send back to the client.
 * @param {Express.NextFunction} next - The next function in the middleware chain.
 *
 * Retrieves the organisation, dataset, and issue details from the database, and renders the issue details page
 * with the list of issues, entry data, and organisation and dataset details.
 *
 * @throws {Error} If there is an error fetching the data or rendering the page.
 */
  async getIssueDetails (req, res, next) {
    const { lpa, dataset: datasetId, issue_type: issueType } = req.params
    let { resourceId, entityNumber } = req.params

    try {
      entityNumber = entityNumber ? parseInt(entityNumber) : 1

      const organisationResult = await datasette.runQuery(`SELECT name FROM organisation WHERE organisation = '${lpa}'`)
      const organisation = organisationResult.formattedData[0]

      const datasetResult = await datasette.runQuery(`SELECT name FROM dataset WHERE dataset = '${datasetId}'`)
      const dataset = datasetResult.formattedData[0]

      if (!resourceId) {
        const resource = await performanceDbApi.getLatestResource(lpa, datasetId)
        resourceId = resource.resource
      }

      const issues = await performanceDbApi.getIssues(resourceId, issueType, datasetId)

      const issuesByEntryNumber = issues.reduce((acc, current) => {
        acc[current.entry_number] = acc[current.entry_number] || []
        acc[current.entry_number].push(current)
        return acc
      }, {})

      const errorHeading = performanceDbApi.getTaskMessage(issueType, Object.keys(issuesByEntryNumber).length, true)

      const issueItems = Object.entries(issuesByEntryNumber).map(([entryNumber, issues]) => {
        return {
          html: performanceDbApi.getTaskMessage(issueType, issues.length) + ` in record ${entryNumber}`,
          href: `/organisations/${lpa}/${datasetId}/${issueType}/${entryNumber}`
        }
      })

      const entryData = await performanceDbApi.getEntry(resourceId, entityNumber, datasetId)

      const fields = entryData.map((row) => {
        let hasError = false
        let issueIndex
        if (issuesByEntryNumber[entityNumber]) {
          issueIndex = issuesByEntryNumber[entityNumber].findIndex(issue => issue.field === row.field)
          if (issueIndex >= 0) {
            hasError = true
          }
        }

        let valueHtml = ''
        let classes = ''
        if (hasError) {
          const message = issuesByEntryNumber[entityNumber][issueIndex].message || issueType
          valueHtml += `<p class="govuk-error-message">${message}</p>`
          classes += 'dl-summary-card-list__row--error'
        }
        valueHtml += row.value

        return {
          key: {
            text: row.field
          },
          value: {
            html: valueHtml
          },
          classes
        }
      })

      if (issuesByEntryNumber[entityNumber]) {
        issuesByEntryNumber[entityNumber].forEach((issue) => {
          if (!fields.find(field => field.key.text === issue.field)) {
            const errorMessage = issue.message || issueType

            const valueHtml = `<p class="govuk-error-message">${errorMessage}</p>${issue.value}`
            const classes = 'dl-summary-card-list__row--error'

            fields.push({
              key: {
                text: issue.field
              },
              value: {
                html: valueHtml
              },
              classes
            })
          }
        })
      }

      const entry = {
        title: `entry: ${entityNumber}`,
        fields
      }

      const params = {
        organisation,
        dataset,
        errorHeading,
        issueItems,
        entry
      }

      res.render('organisations/issueDetails.html', params)
    } catch (e) {
      logger.warn(`getIssueDetails() failed for lpa='${lpa}', datasetId='${datasetId}', issue=${issueType}, entityNumber=${entityNumber}, resourceId=${resourceId}`, { type: types.App })
      next(e)
    }
  }
}

export default organisationsController
