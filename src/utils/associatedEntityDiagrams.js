import { associatedEntityDiagrams, diagramsPath } from '../content/associatedEntityDiagrams.js'

/**
 * Turns a dataset slug into the wording used in the alt text, e.g. 'plan-timetable' -> 'plan timetable'.
 *
 * Deliberately not datasetSlugToReadableName: that is async, backed by datasette/redis, and returns
 * title cased display names. Plain de-hyphenation matches the wording already used in the issue
 * messages and reads naturally mid-sentence.
 *
 * @param {string} slug
 * @returns {string}
 */
const readableDatasetName = (slug) => slug.replace(/-/g, ' ')

/**
 * @param {string} dataset
 * @param {{ parentDataset: string, field: string }} entry
 * @returns {string}
 */
const diagramAltText = (dataset, { parentDataset, field }) => {
  const parentName = readableDatasetName(parentDataset)
  const datasetName = readableDatasetName(dataset)

  return `This diagram shows the relationship between the ${parentName} dataset and the ${datasetName} ` +
    `dataset. The reference value from your ${parentName} dataset needs to match the ${field} value in ` +
    `your ${datasetName} dataset.`
}

/**
 * Appends the relationship diagram to a field's guidance, for datasets whose reference back to
 * another dataset can raise a 'missing associated entity' issue.
 *
 * The diagram is attached to the back reference field rather than to a particular issue type, so it
 * is also shown for e.g. a missing value on the same field - the relationship is worth explaining
 * either way. Returns the specification unchanged when the dataset or field doesn't have a diagram.
 *
 * @param {{ field: string, guidance?: string }} [fieldSpecification]
 * @param {string} [dataset]
 * @returns {{ field: string, guidance?: string } | undefined}
 */
export function withAssociatedEntityDiagram (fieldSpecification, dataset) {
  if (!fieldSpecification || !dataset) return fieldSpecification

  const entry = associatedEntityDiagrams[dataset]
  if (!entry || fieldSpecification.field !== entry.field) return fieldSpecification

  const image = `![${diagramAltText(dataset, entry)}](/public/${diagramsPath}/${entry.diagram}.svg)`

  // Return a copy: the specification is parsed once per request from a shared object and callers
  // must not see the diagram accumulate on it.
  return {
    ...fieldSpecification,
    guidance: [fieldSpecification.guidance, image].filter(Boolean).join('\n\n')
  }
}

export default withAssociatedEntityDiagram
