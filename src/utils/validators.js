/**
 * True if the string parses as a URL with an http or https protocol.
 *
 * Deliberately permissive — this is the format check only. Whether the URL is reachable,
 * blocked or too large is decided later by the HEAD request in `SubmitUrlController`.
 *
 * @param {string} urlString
 * @returns {boolean}
 */
export const validUrl = (urlString) => {
  let url
  try {
    url = new URL(urlString)
  } catch (e) {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

/**
 * Validates the documentation ("source webpage") URL given during provide.
 *
 * Stricter than {@link validUrl}, and encodes policy rather than syntax — it must be:
 * - http or https
 * - on a `gov.uk` or `org.uk` hostname
 * - a webpage, **not** a data file: paths ending `.csv`, `.json`, `.xml`, `.geojson`,
 *   `.zip` or `.xls` are rejected
 *
 * The intent is that this URL points at the page which *links to* the endpoint, so a
 * human can find the data in context. `datasetDetailsController` separately rejects a
 * documentation URL equal to the endpoint URL.
 *
 * @param {string} urlString
 * @returns {boolean}
 */
export const validDocumentationUrl = (urlString) => {
  let url
  try {
    url = new URL(urlString)
    if (!(url.protocol === 'http:' || url.protocol === 'https:')) return false
    if (!url.hostname.toLowerCase().endsWith('gov.uk') && !url.hostname.toLowerCase().endsWith('org.uk')) return false

    const extensions = ['.csv', '.json', '.xml', '.geojson', '.zip', '.xls']
    if (extensions.some(ext => url.pathname.toLowerCase().endsWith(ext))) return false

    return true
  } catch (e) {
    return false
  }
}

/**
 * True if the address is on a `gov.uk` or `org.uk` domain (including subdomains).
 *
 * Narrower than a general email check by design: provide requests are expected to come
 * from a public body, so a personal address is rejected at the form.
 *
 * @param {string} emailId - trimmed before matching
 * @returns {boolean}
 */
export const validEmail = (emailId) => {
  return /^[^@]+@([a-z0-9-]+\.)*(gov|org)\.uk$/i.test(emailId.trim())
}

/**
 * Conditional `required` rule for the geometry type field.
 *
 * Unlike the other validators in this module it does **not** return a boolean. It returns
 * the list of hmpo validators to apply to the field, given the rest of the form's values —
 * `['required']` when the dataset needs a geometry type, `[]` when it does not, which
 * makes the field optional rather than failing it.
 *
 * @param {object} values - all submitted values for the step
 * @param {string} values.dataset
 * @returns {string[]} validator names for hmpo to apply
 */
export const validateGeomType = (values) => {
  // Only validate geometry type if dataset is tree
  return values.dataset === 'tree' ? ['required'] : []
}
