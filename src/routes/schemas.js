/**
 * This module provides code a set of schemas for params passed to
 * the nunjuck templates in `./src/views`
 */

import * as v from 'valibot'
import { MiddlewareError } from '../utils/errors.js'

export const EmptyParams = v.object({})

export const ErrorPageParams = v.object({
  err: v.instance(MiddlewareError),
  env: v.string(),
  supportEmail: v.pipe(v.string(), v.email()),
  uptime: v.optional(v.string()),
  downtime: v.optional(v.string())
})

export const NonEmptyString = v.pipe(v.string(), v.nonEmpty())

export const Base = v.object({
  // serviceName: NonEmptyString,
  // pageTitle: NonEmptyString,
  pageName: v.optional(NonEmptyString)
})

export const StartPage = v.object({
  ...Base.entries
})

export const PaginationParams = v.optional(v.strictObject({
  previous: v.optional(v.strictObject({
    href: v.string()
  })),
  next: v.optional(v.strictObject({
    href: v.string()
  })),
  items: v.array(v.variant('type', [
    v.strictObject({
      type: v.literal('number'),
      number: v.integer(),
      href: v.string(),
      current: v.boolean()
    }),
    v.strictObject({
      type: v.literal('ellipsis'),
      ellipsis: v.literal(true),
      href: v.string()
    })
  ]))
}))

export const dataRangeParams = v.object({
  minRow: v.pipe(v.number(), v.integer(), v.minValue(0)),
  maxRow: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalRows: v.pipe(v.number(), v.integer(), v.minValue(0)),
  maxPageNumber: v.pipe(v.number(), v.integer(), v.minValue(0)),
  pageLength: v.pipe(v.number(), v.integer(), v.minValue(1)),
  offset: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const errorSummaryParams = v.strictObject({
  heading: v.optional(v.string()),
  items: v.array(v.strictObject({
    html: v.string(),
    href: v.url()
  }))
})

export const tableParams = v.strictObject({
  columns: v.array(NonEmptyString),
  rows: v.array(v.strictObject({
    columns: v.objectWithRest(
      {},
      v.strictObject({
        error: v.optional(v.object({
          message: v.string()
        })),
        value: v.optional(v.string()),
        html: v.optional(v.string()),
        classes: v.optional(v.string())
      })
    )
  })),
  fields: v.array(NonEmptyString)
})

/**
 * The values of this enum should match values of the 'status' column
 * in the query in `fetchLpaOverview` middleware
 */
export const datasetStatusEnum = {
  Live: 'Live',
  'Needs fixing': 'Needs fixing',
  Warning: 'Warning',
  Error: 'Error',
  'Not submitted': 'Not submitted'
}

export const DeadlineNoticeField = v.strictObject({
  type: v.union([
    v.literal('due'),
    v.literal('overdue')
  ]),
  deadline: v.string()
})

const IssueSpecification = v.optional(v.strictObject({
  datasetField: NonEmptyString,
  field: NonEmptyString,
  description: v.optional(NonEmptyString),
  dataset: v.optional(NonEmptyString),
  guidance: v.optional(NonEmptyString)
}))

const OrgField = v.strictObject({ name: NonEmptyString, organisation: NonEmptyString, statistical_geography: v.optional(v.string()), entity: v.optional(v.integer()) })
const DatasetNameField = v.strictObject({ name: NonEmptyString, dataset: NonEmptyString, collection: NonEmptyString })
const DatasetItem = v.strictObject({
  endpointCount: v.optional(v.number()),
  status: v.enum(datasetStatusEnum),
  dataset: NonEmptyString,
  issueCount: v.optional(v.number()),
  error: v.optional(v.nullable(NonEmptyString)),
  issue: v.optional(NonEmptyString),
  entityCount: v.optional(v.number()),
  project: v.optional(v.string()),
  // synthetic entry, represents a user friendly count (e.g. count missing value in a column as 1 issue)
  numIssues: v.optional(v.number()),
  notice: v.optional(DeadlineNoticeField)
})

export const OrgOverviewPage = v.strictObject({
  organisation: OrgField,
  datasets: v.object({
    statutory: v.optional(v.array(DatasetItem)),
    other: v.optional(v.array(DatasetItem))
  }),
  totalDatasets: v.integer(),
  datasetsWithEndpoints: v.integer(),
  datasetsWithIssues: v.integer(),
  datasetsWithErrors: v.integer(),
  isODPMember: v.boolean()
})

export const OrgFindPage = v.strictObject({
  alphabetisedOrgs: v.record(NonEmptyString, v.array(OrgField))
})

export const OrgGetStarted = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField
})

export const OrgDatasetOverview = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  taskCount: v.integer(),
  stats: v.strictObject({
    numberOfRecords: v.integer(),
    numberOfFieldsSupplied: v.integer(),
    numberOfFieldsMatched: v.integer(),
    numberOfExpectedFields: v.integer(),
    endpoints: v.array(v.strictObject({
      name: v.string(),
      documentation_url: v.nullable(v.optional(v.string())),
      endpoint_url: v.string(),
      endpoint: NonEmptyString,
      lastAccessed: v.string(),
      lastUpdated: v.nullable(v.string()),
      error: v.optional(v.strictObject({
        code: v.integer(),
        exception: v.string()
      }))
    }))
  }),
  notice: v.optional(DeadlineNoticeField)
})

export const OrgDataView = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  taskCount: v.integer(),
  tableParams,
  pagination: PaginationParams,
  dataRange: dataRangeParams
})

export const OrgDatasetTaskList = v.strictObject({
  taskList: v.array(v.strictObject({
    title: v.strictObject({ text: NonEmptyString }),
    href: v.url(),
    status: v.strictObject({
      tag: v.strictObject({
        classes: NonEmptyString,
        text: NonEmptyString
      })
    })
  })),
  organisation: OrgField,
  dataset: v.strictObject({
    dataset: v.optional(NonEmptyString),
    name: NonEmptyString,
    collection: NonEmptyString
  })
})

export const OrgEndpointError = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  errorData: v.strictObject({
    endpoint_url: v.url(),
    http_status: v.optional(v.integer()),
    latest_log_entry_date: v.isoDateTime(),
    latest_200_date: v.optional(v.isoDateTime())
  })
})

const MapGeometry = v.union([
  v.string(),
  v.object({
    type: v.string(),
    reference: NonEmptyString,
    geo: NonEmptyString
  })
])

const MapGeometries = v.array(MapGeometry)

export const OrgIssueTable = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  errorSummary: errorSummaryParams,
  issueType: v.string(),
  issueSpecification: IssueSpecification,
  tableParams,
  pagination: PaginationParams,
  dataRange: dataRangeParams,
  geometries: v.optional(MapGeometries)
})

export const OrgIssueDetails = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  errorSummary: errorSummaryParams,
  issueType: NonEmptyString,
  issueField: NonEmptyString,
  entry: v.strictObject({
    title: NonEmptyString,
    fields: v.array(v.strictObject({
      key: v.strictObject({ text: NonEmptyString }),
      value: v.strictObject({ html: v.string(), originalValue: v.optional(v.string()) }),
      classes: v.string()
    })),
    geometries: v.optional(MapGeometries)
  }),
  pagination: PaginationParams,
  pageNumber: v.pipe(v.number(), v.integer()),
  dataRange: dataRangeParams,
  issueSpecification: IssueSpecification
})

export const CheckAnswers = v.strictObject({
  values: v.strictObject({
    lpa: NonEmptyString,
    name: NonEmptyString,
    email: v.pipe(v.string(), v.email()),
    dataset: NonEmptyString,
    'endpoint-url': v.url(),
    'documentation-url': v.url(),
    hasLicence: NonEmptyString,
    errors: v.optional(v.array(v.strictObject({
      text: NonEmptyString
    })))
  })
})

export const ChooseDataset = v.strictObject({
  errors: v.strictObject({
    dataset: v.optional(v.strictObject({
      type: v.enum({
        required: 'required'
      })
    }))
  })
})

export const DatasetDetails = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  values: v.strictObject({
    dataset: NonEmptyString
  }),
  errors: v.record(NonEmptyString, v.strictObject({
    type: NonEmptyString
  }))
})

const SubmitEndpointConfirmation = v.strictObject({
  values: v.object({
    dataset: NonEmptyString,
    email: NonEmptyString
  })
})

/**
 * This acts as a registry of template -> schema for convenience.
 */
export const templateSchema = new Map([
  ['dataset-details.html', DatasetDetails],
  ['check-answers.html', CheckAnswers],
  ['choose-dataset.html', ChooseDataset],
  ['lpa-details.html', v.any()],

  ['submit/confirmation.html', SubmitEndpointConfirmation],

  ['organisations/overview.html', OrgOverviewPage],
  ['organisations/find.html', OrgFindPage],
  ['organisations/get-started.html', OrgGetStarted],
  ['organisations/dataset-overview.html', OrgDatasetOverview],
  ['organisations/dataview.html', OrgDataView],
  ['organisations/datasetTaskList.html', OrgDatasetTaskList],
  ['organisations/http-error.html', OrgEndpointError],
  ['organisations/issueTable.html', OrgIssueTable],
  ['organisations/issueDetails.html', OrgIssueDetails],

  ['errorPages/error.njk', ErrorPageParams],
  ['privacy-notice.html', EmptyParams],
  ['landing.html', EmptyParams],
  ['cookies.html', EmptyParams],
  ['accessibility.html', EmptyParams]
])
