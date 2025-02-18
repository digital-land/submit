import * as v from 'valibot'

/**
 * Takes an Error and if it's a ValiError, returns an array of issue summaries (with paths). Empty array otherwise.
 *
 * Useful to show the schema issues in a consise way.
 *
 * @param {Error} error - The error to check for schema issues
 * @returns {Array<Object>} Array of issue objects with path and message properties
 * @returns {Array<string>} returns[].path - The path to the issue
 * @returns {string} returns[].message - The error message
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
