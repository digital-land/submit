/**
 * This module provides code a set of schemas for params passed to
 * the nunjuck templates in `./src/views`
 */

import * as v from 'valibot'

export const EmptyParams = v.object({})
export const UptimeParams = v.object({
  upTime: v.string()
})

export const ErrorParams = v.strictObject({
  err: v.object({})
})

const NonEmptyString = v.pipe(v.string(), v.nonEmpty())

export const Base = v.object({
  // serviceName: NonEmptyString,
  // pageTitle: NonEmptyString,
  pageName: v.optional(NonEmptyString)
})

export const StartPage = v.object({
  ...Base.entries
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

export const OrgField = v.strictObject({ name: NonEmptyString, organisation: NonEmptyString, statistical_geography: v.optional(v.string()), entity: v.optional(v.integer()) })
export const DatasetNameField = v.strictObject({ name: NonEmptyString, dataset: NonEmptyString, collection: NonEmptyString })

export const errorSummaryField = v.strictObject({
  heading: v.optional(v.string()),
  items: v.array(v.strictObject({
    html: v.string(),
    href: v.url()
  }))
})

const tableParams = v.strictObject({
  columns: v.array(NonEmptyString),
  rows: v.array(v.strictObject({
    columns: v.objectWithRest(
      {},
      v.object({
        error: v.optional(v.object({
          message: v.string()
        })),
        value: v.optional(v.string()),
        html: v.optional(v.string())
      })
    )
  })),
  fields: v.array(NonEmptyString)
})

const paginationParams = v.optional(v.strictObject({
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

export const OrgOverviewPage = v.strictObject({
  organisation: OrgField,
  datasets: v.array(v.strictObject({
    endpoint: v.optional(v.url()),
    status: v.enum(datasetStatusEnum),
    slug: NonEmptyString,
    issue_count: v.optional(v.number()),
    error: v.optional(v.nullable(NonEmptyString)),
    http_error: v.optional(NonEmptyString),
    issue: v.optional(NonEmptyString),
    entity_count: v.optional(v.number()),
    // synthetic entry, represents a user friendly count (e.g. count missing value in a column as 1 issue)
    numIssues: v.optional(v.number())
  })),
  totalDatasets: v.integer(),
  datasetsWithEndpoints: v.integer(),
  datasetsWithIssues: v.integer(),
  datasetsWithErrors: v.integer()
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
  issueCount: v.integer(),
  stats: v.strictObject({
    numberOfRecords: v.integer(),
    numberOfFieldsSupplied: v.integer(),
    numberOfFieldsMatched: v.integer(),
    numberOfExpectedFields: v.integer(),
    endpoints: v.array(v.strictObject({
      name: v.string(),
      documentation_url: v.optional(v.string()),
      endpoint: v.string(),
      lastAccessed: v.string(),
      lastUpdated: v.string(),
      error: v.optional(v.strictObject({
        code: v.integer(),
        exception: v.string()
      }))
    }))
  })
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
    http_status: v.integer(),
    latest_log_entry_date: v.isoDateTime(),
    latest_200_date: v.isoDateTime()
  })
})

export const OrgIssueDetails = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  errorSummary: errorSummaryField,
  issueType: NonEmptyString,
  issueField: NonEmptyString,
  entry: v.strictObject({
    title: NonEmptyString,
    fields: v.array(v.strictObject({
      key: v.strictObject({ text: NonEmptyString }),
      value: v.strictObject({ html: v.string() }),
      classes: v.string()
    })),
    geometries: v.optional(v.array(v.string()))
  }),
  pagination: paginationParams,
  issueEntitiesCount: v.integer(),
  pageNumber: v.integer()
})

export const OrgIssueTable = v.strictObject({
  organisation: OrgField,
  dataset: DatasetNameField,
  errorSummary: errorSummaryField,
  issueType: NonEmptyString,
  tableParams,
  pagination: paginationParams
})

export const CheckAnswers = v.strictObject({
  values: v.strictObject({
    lpa: NonEmptyString,
    name: NonEmptyString,
    email: v.pipe(v.string(), v.email()),
    dataset: NonEmptyString,
    'endpoint-url': v.url(),
    'documentation-url': v.url(),
    hasLicence: NonEmptyString
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

/**
 * This acts as a registry of template -> schema for convenience.
 */
export const templateSchema = new Map([
  ['dataset-details.html', DatasetDetails],
  ['check-answers.html', CheckAnswers],
  ['choose-dataset.html', ChooseDataset],
  ['lpa-details.html', v.any()],

  ['submit/confirmation.html', v.any()],

  ['organisations/overview.html', OrgOverviewPage],
  ['organisations/find.html', OrgFindPage],
  ['organisations/get-started.html', OrgGetStarted],
  ['organisations/dataset-overview.html', OrgDatasetOverview],
  ['organisations/datasetTaskList.html', OrgDatasetTaskList],
  ['organisations/http-error.html', OrgEndpointError],
  ['organisations/issueDetails.html', OrgIssueDetails],
  ['organisations/issueTable.html', OrgIssueTable],

  ['errorPages/503', UptimeParams],
  ['errorPages/500', ErrorParams],
  ['errorPages/404', EmptyParams],
  ['privacy-notice.html', EmptyParams],
  ['landing.html', EmptyParams],
  ['cookies.html', EmptyParams],
  ['accessibility.html', EmptyParams]
])
