import { describe, it, expect } from 'vitest'
import { withAssociatedEntityDiagram } from '../../../src/utils/associatedEntityDiagrams.js'
import { associatedEntityDiagrams, diagramSlugs } from '../../../src/content/associatedEntityDiagrams.js'

const diagramMarkdown = (specification) => {
  const match = specification.guidance.match(/!\[(.*)\]\((.*)\)$/s)
  return match ? { alt: match[1], src: match[2] } : undefined
}

describe('withAssociatedEntityDiagram', () => {
  it.each([
    ['article-4-direction-area', 'article-4-direction', 'article 4 direction', 'article 4 direction area'],
    ['conservation-area-document', 'conservation-area', 'conservation area', 'conservation area document'],
    ['tree-preservation-zone', 'tree-preservation-order', 'tree preservation order', 'tree preservation zone'],
    ['tree', 'tree-preservation-order', 'tree preservation order', 'tree'],
    ['plan-timetable', 'plan', 'plan', 'plan timetable']
  ])('appends the diagram for %s', (dataset, field, parentName, datasetName) => {
    const result = withAssociatedEntityDiagram({ field, guidance: 'existing guidance' }, dataset)
    const { alt, src } = diagramMarkdown(result)

    expect(result.guidance.startsWith('existing guidance\n\n')).toBe(true)
    expect(alt).toBe(
      `This diagram shows the relationship between the ${parentName} dataset and the ${datasetName} dataset. ` +
      `The reference value from your ${parentName} dataset needs to match the ${field} value in your ` +
      `${datasetName} dataset.`
    )
    expect(src).toBe(`/public/static/images/diagrams/${associatedEntityDiagrams[dataset].diagram}.svg`)
  })

  it('references a diagram that the fetch script downloads', () => {
    Object.values(associatedEntityDiagrams).forEach(({ diagram }) => {
      expect(diagramSlugs()).toContain(diagram)
    })
  })

  it('leaves other fields on a mapped dataset alone', () => {
    const fieldSpecification = { field: 'reference', guidance: 'existing guidance' }
    expect(withAssociatedEntityDiagram(fieldSpecification, 'tree')).toEqual(fieldSpecification)
  })

  it('leaves unmapped datasets alone', () => {
    const fieldSpecification = { field: 'conservation-area', guidance: 'existing guidance' }
    expect(withAssociatedEntityDiagram(fieldSpecification, 'conservation-area')).toEqual(fieldSpecification)
  })

  it('leaves listed-building-outline alone, as it has no relationship diagram', () => {
    const fieldSpecification = { field: 'listed-building', guidance: 'existing guidance' }
    expect(withAssociatedEntityDiagram(fieldSpecification, 'listed-building-outline')).toEqual(fieldSpecification)
  })

  it('does not mutate the field specification it is given', () => {
    const fieldSpecification = { field: 'plan', guidance: 'existing guidance' }
    withAssociatedEntityDiagram(fieldSpecification, 'plan-timetable')

    expect(fieldSpecification.guidance).toBe('existing guidance')
  })

  it('adds the diagram on its own when there is no existing guidance', () => {
    const result = withAssociatedEntityDiagram({ field: 'plan' }, 'plan-timetable')

    expect(result.guidance.startsWith('![')).toBe(true)
  })

  it('handles a missing field specification or dataset', () => {
    expect(withAssociatedEntityDiagram(undefined, 'tree')).toBeUndefined()
    expect(withAssociatedEntityDiagram({ field: 'plan' }, undefined)).toEqual({ field: 'plan' })
  })
})
