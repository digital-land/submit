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
 * in the query in `performanceDbApi.getLpaOverview()`
 */
const datasetStatusEnum = {
  Live: 'Live',
  'Needs fixing': 'Needs fixing',
  Warning: 'Warning',
  Error: 'Error',
  'Not submitted': 'Not submitted'
}

const OrgNameField = v.strictObject({ name: NonEmptyString })
const DatasetNameField = v.strictObject({ name: NonEmptyString })

export const OrgOverviewPage = v.strictObject({
  organisation: v.strictObject({
    name: NonEmptyString,
    organisation: NonEmptyString
  }),
  datasets: v.array(v.strictObject({
    endpoint: v.optional(v.url()),
    status: v.enum(datasetStatusEnum),
    slug: NonEmptyString,
    issue_count: v.optional(v.number()),
    error: v.optional(v.nullable(NonEmptyString)),
    http_error: v.optional(NonEmptyString),
    issue: v.optional(NonEmptyString)
  })),
  totalDatasets: v.integer(),
  datasetsWithEndpoints: v.integer(),
  datasetsWithIssues: v.integer(),
  datasetsWithErrors: v.integer()
})

export const OrgFindPage = v.strictObject({
  alphabetisedOrgs: v.record(NonEmptyString,
    v.array(v.strictObject({
      name: NonEmptyString,
      organisation: NonEmptyString
    })))
})

export const OrgGetStarted = v.strictObject({
  organisation: OrgNameField,
  dataset: DatasetNameField
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
  organisation: v.strictObject({
    name: NonEmptyString,
    organisation: NonEmptyString
  }),
  dataset: v.strictObject({
    name: NonEmptyString
  })
})

export const OrgEndpointError = v.strictObject({
  organisation: v.strictObject({
    name: NonEmptyString,
    organisation: NonEmptyString
  }),
  dataset: DatasetNameField,
  errorData: v.strictObject({
    endpoint_url: v.url(),
    http_status: v.integer(),
    latest_log_entry_date: v.isoDateTime(),
    latest_200_date: v.isoDateTime()
  })
})

export const OrgIssueDetails = v.strictObject({
  organisation: v.strictObject({
    name: NonEmptyString,
    organisation: NonEmptyString
  }),
  dataset: v.object({
    name: NonEmptyString,
    dataset: v.string()
  }),
  errorHeading: NonEmptyString,
  issueItems: v.array(v.strictObject({
    html: v.string(),
    href: v.url()
  })),
  issueType: NonEmptyString,
  entry: v.strictObject({
    title: NonEmptyString,
    fields: v.array(v.strictObject({
      key: v.strictObject({ text: NonEmptyString }),
      value: v.strictObject({ html: v.string() }),
      classes: v.string()
    }))
  })
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
  organisation: v.strictObject({
    name: NonEmptyString,
    organisation: NonEmptyString
  }),
  dataset: v.strictObject({
    name: NonEmptyString,
    dataset: NonEmptyString
  }),
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
  ['organisations/datasetTaskList.html', OrgDatasetTaskList],
  ['organisations/http-error.html', OrgEndpointError],
  ['organisations/issueDetails.html', OrgIssueDetails],

  ['errorPages/503', UptimeParams],
  ['errorPages/500', ErrorParams],
  ['errorPages/404', EmptyParams],
  ['privacy-notice.html', EmptyParams],
  ['start.html', EmptyParams],
  ['cookies.html', EmptyParams],
  ['accessibility.html', EmptyParams]
])
