/**
 * Datasets whose "missing associated entity" issue is a back reference to another dataset in the
 * same collection, and the relationship diagram that explains that reference.
 *
 * `diagram` is the slug used to build the diagram URL in the specification repo
 * (`docs/specification/{diagram}/diagram.svg`). It is stated explicitly rather than derived from
 * the dataset's collection because the two do not always agree: `plan-timetable` sits in the
 * `local-plan` collection but its diagram lives under `plan`.
 *
 * `parentDataset` is the dataset the reference points at, and `field` is the back reference field
 * on the dataset itself. The diagram is only shown against that field's guidance.
 *
 * `listed-building-outline` is deliberately absent: its associated entity is Historic England's
 * List Entry Number rather than a Planning Data dataset, so there is no relationship to diagram.
 */
export const associatedEntityDiagrams = {
  'article-4-direction-area': {
    diagram: 'article-4-direction',
    parentDataset: 'article-4-direction',
    field: 'article-4-direction'
  },
  'conservation-area-document': {
    diagram: 'conservation-area',
    parentDataset: 'conservation-area',
    field: 'conservation-area'
  },
  'tree-preservation-zone': {
    diagram: 'tree-preservation-order',
    parentDataset: 'tree-preservation-order',
    field: 'tree-preservation-order'
  },
  tree: {
    diagram: 'tree-preservation-order',
    parentDataset: 'tree-preservation-order',
    field: 'tree-preservation-order'
  },
  'plan-timetable': {
    diagram: 'plan',
    parentDataset: 'plan',
    field: 'plan'
  }
}

/**
 * The distinct diagrams referenced above, which is what we need to download.
 *
 * @returns {string[]}
 */
export const diagramSlugs = () =>
  [...new Set(Object.values(associatedEntityDiagrams).map(({ diagram }) => diagram))].sort()

/** Path the downloaded diagrams are served from, relative to the public directory. */
export const diagramsPath = 'static/images/diagrams'

export default associatedEntityDiagrams
