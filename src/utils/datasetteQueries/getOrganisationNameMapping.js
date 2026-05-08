import datasette from '../../services/datasette.js'

export const getOrganisationNameMapping = async () => {
  const table = await datasette.runQuery('select organisation, name from organisation')

  const mapping = new Map()
  table.rows.forEach(([orgId, name]) => {
    mapping.set(orgId, name)
  })
  return mapping
}
