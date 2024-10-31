import { fetchDatasetInfo, fetchOrgInfo } from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'

export const constructTableParams = (req, res, next) => {
  req.tableParams = {
    columns: [
      'column 1',
      'column 2',
      'column 3'
    ],
    fields: [
      'column 1',
      'column 2',
      'column 3'
    ],
    rows: [
      {
        columns: {
          'column 1': {
            value: 'value 1'
          },
          'column 2': {
            html: '<b>html 1</b>'
          },
          'column 3': {
            value: 'value 2',
            error: {
              message: 'error 1'
            }
          }
        }
      }
    ]
  }

  next()
}

export const prepareTemplatePramas = (req, res, next) => {
  const { orgInfo, dataset, tableParams } = req

  req.templateParams = {
    organisation: orgInfo,
    dataset,
    tableParams
  }
  next()
}

export const getGetDataview = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/dataview.html',
  handlerName: 'getDataview'
})

export default [
  fetchOrgInfo,
  fetchDatasetInfo,
  constructTableParams,
  prepareTemplatePramas,
  getGetDataview
]
