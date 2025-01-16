import * as v from 'valibot'

/**
 * Takes an Error and if it's a ValiError, returns an array of issue summaries (with paths). Empty array otherwise.
 *
 * Useful to show the schema issues in a consise way.
 *
 * @param {Error} error
 * @returns { { path: string[], message: string}[] }
 */
export function schemaIssues (error) {
  const issues = []
  if (v.isValiError(error)) {
    for (const issue of error.issues) {
      if (issue.path) {
        issues.push({ path: issue.path.map(elem => elem.key), message: issue.message })
      }
    }
  }
  return issues
}
