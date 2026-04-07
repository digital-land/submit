export const validUrl = (urlString) => {
  let url
  try {
    url = new URL(urlString)
  } catch (e) {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

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

export const validEmail = (emailId) => {
  return /^[^@]+@([a-z0-9-]+\.)*(gov|org)\.uk$/i.test(emailId.trim())
}

export const validateGeomType = (values) => {
  // Only validate geometry type if dataset is tree
  return values.dataset === 'tree' ? ['required'] : []
}
