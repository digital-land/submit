// export default [
//   validateIssueTableQueryParams,
//   parallel([
//     fetchOrgInfo,
//     fetchDatasetInfo
//   ]),
//   fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
//   fetchEntitiesWithIssues,
//   prepareIssueTableParams,
//   getIssuesTable,
//   logPageError
// ]
