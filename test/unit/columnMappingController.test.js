import { describe, expect, it } from 'vitest'
import {
  applySubmittedFieldSelections,
  applyDetectedGeometryColumnMapping,
  buildExpectedFieldRows,
  buildColumnMappingRows,
  buildSpecFields,
  buildSubmittedColumnMapping,
  buildSelectableColumns,
  detectGeometryColumnMapping,
  getBracketFields,
  validateColumnMapping
} from '../../src/controllers/columnMappingController.js'

describe('columnMappingController helpers', () => {
  it('builds rows from mapped, missing and unmapped columns', () => {
    const rows = buildColumnMappingRows({
      columnFieldLog: [
        { column: 'Reference', field: 'reference', mandatory: true, missing: false },
        { column: 'Name', field: 'name', mandatory: false, missing: false },
        { field: 'start-date', mandatory: false, missing: true }
      ],
      userColumnMapping: {
        Name: 'name'
      }
    })

    expect(rows).toEqual([
      {
        column: 'Reference',
        field: 'reference',
        isMapped: true,
        isAutoMapped: true,
        isMissing: false,
        userDefined: false
      },
      {
        column: 'Name',
        field: 'name',
        isMapped: true,
        isAutoMapped: false,
        isMissing: false,
        userDefined: true
      },
      {
        column: '',
        field: 'start-date',
        isMapped: false,
        isMissing: true,
        userDefined: false,
        userIgnored: true
      }
    ])
  })

  it('keeps missing required fields that have no uploaded column', () => {
    const rows = buildColumnMappingRows({
      columnFieldLog: [
        { field: 'reference', mandatory: true, missing: true }
      ],
      userColumnMapping: {}
    })

    expect(rows).toEqual([
      {
        column: '',
        field: 'reference',
        isMapped: false,
        isMissing: true,
        userDefined: false,
        userIgnored: false
      }
    ])
  })

  it('merges submitted mappings with existing mappings', () => {
    const mapping = buildSubmittedColumnMapping({
      existingMapping: {
        Old: 'notes',
        Removed: 'name',
        Reference: 'reference'
      },
      body: {
        map: {
          Reference: 'IGNORE'
        },
        fieldMap: {
          reference: 'New reference',
          notes: 'na'
        }
      }
    })

    expect(mapping).toEqual({
      Removed: 'name',
      Reference: 'IGNORE',
      'New reference': 'reference',
      na: 'IGNORE'
    })
  })

  it('supports literal bracketed form keys', () => {
    const mapping = buildSubmittedColumnMapping({
      existingMapping: {
        Old: 'notes'
      },
      body: {
        'map[Old]': 'IGNORE',
        'fieldMap[reference]': 'Reference',
        'unmap[Removed]': 'yes'
      }
    })

    expect(mapping).toEqual({
      Old: 'IGNORE',
      Reference: 'reference'
    })
  })

  it('leaves existing mappings unchanged when fieldMap values are blank', () => {
    const mapping = buildSubmittedColumnMapping({
      existingMapping: {
        Description: 'description',
        Geometry: 'geometry'
      },
      body: {
        fieldMap: {
          description: '',
          geometry: '',
          notes: 'Notes'
        },
        map: {
          Description: '',
          Geometry: ''
        }
      }
    })

    expect(mapping).toEqual({
      Description: 'description',
      Geometry: 'geometry',
      Notes: 'notes'
    })
  })

  it('builds spec fields from dataset fields without hardcoded defaults', () => {
    expect(buildSpecFields(['notes', 'reference', 'name'])).toEqual(['name', 'notes', 'reference'])
    expect(buildSpecFields([])).toEqual([])
  })

  it('builds expected field rows and uploaded column options', () => {
    const columnMappingRows = [
      {
        column: 'Reference',
        field: 'reference',
        isMapped: true,
        isAutoMapped: true,
        userDefined: false,
        userIgnored: false
      },
      {
        column: 'Name',
        field: 'name',
        isMapped: true,
        userDefined: true,
        userIgnored: false
      }
    ]

    expect(buildSelectableColumns(columnMappingRows, [{ converted_row: { Reference: 'abc', Name: 'Test name' } }])).toEqual(['Name'])
    expect(buildExpectedFieldRows({
      columnMappingRows,
      specFields: ['notes', 'reference', 'name'],
      requiredFields: ['reference']
    })).toEqual([
      {
        field: 'reference',
        column: 'Reference',
        isMapped: true,
        isAutoMapped: true,
        isEditable: false,
        userDefined: false,
        userIgnored: false,
        isRequired: true
      },
      {
        field: 'name',
        column: 'Name',
        isMapped: true,
        isAutoMapped: false,
        isEditable: true,
        userDefined: true,
        userIgnored: false,
        isRequired: false
      },
      {
        field: 'notes',
        column: '',
        isMapped: false,
        isAutoMapped: false,
        isEditable: true,
        userDefined: false,
        userIgnored: false,
        isRequired: false
      }
    ])
  })

  it('detects point geometry from the first data row', () => {
    const columnFieldLog = [
      { field: 'point', column: null, missing: true, mandatory: true },
      { field: 'geometry', column: null, missing: true, mandatory: true }
    ]
    const rows = [
      { converted_row: { Reference: 'abc', WKT: 'POINT (-0.1 51.5)' } }
    ]

    expect(detectGeometryColumnMapping(columnFieldLog, rows)).toEqual({
      WKT: 'point'
    })
    expect(applyDetectedGeometryColumnMapping(columnFieldLog, rows)).toEqual([
      { field: 'point', column: 'WKT', detectedGeometryMapping: true, missing: false, mandatory: true },
      { field: 'geometry', column: null, missing: true, mandatory: true }
    ])
  })

  it('detects polygon geometry from the first data row', () => {
    const columnFieldLog = [
      { field: 'geometry', column: null, missing: true, mandatory: true }
    ]
    const rows = [
      { converted_row: { Reference: 'abc', Shape: '  MULTIPOLYGON (((-0.1 51.5,-0.2 51.6)))' } }
    ]

    expect(detectGeometryColumnMapping(columnFieldLog, rows)).toEqual({
      Shape: 'geometry'
    })
    expect(applyDetectedGeometryColumnMapping(columnFieldLog, rows)).toEqual([
      { field: 'geometry', column: 'Shape', detectedGeometryMapping: true, missing: false, mandatory: true }
    ])
    expect(detectGeometryColumnMapping(columnFieldLog, [
      { converted_row: { Boundary: 'POLYGON ((-0.1 51.5,-0.2 51.6))' } }
    ])).toEqual({
      Boundary: 'geometry'
    })
  })

  it('does not detect geometry when point or geometry are not expected fields', () => {
    expect(detectGeometryColumnMapping([
      { field: 'reference', column: null, missing: true, mandatory: true }
    ], [
      { converted_row: { WKT: 'POINT (-0.1 51.5)' } }
    ])).toEqual({})
  })

  it('does not override an existing point or geometry mapping', () => {
    expect(detectGeometryColumnMapping([
      { field: 'geometry', column: 'Geometry', missing: false, mandatory: true },
      { field: 'point', column: null, missing: true, mandatory: true }
    ], [
      { converted_row: { WKT: 'POINT (-0.1 51.5)' } }
    ])).toEqual({})
  })

  it('hides the other geometry field when one is mapped by column mapping', () => {
    expect(buildExpectedFieldRows({
      columnMappingRows: [
        {
          column: 'WKT',
          field: 'geometry',
          isMapped: true,
          isAutoMapped: false,
          userDefined: true,
          userIgnored: false
        },
        {
          column: '',
          field: 'point',
          isMapped: false,
          userDefined: false,
          userIgnored: false
        }
      ],
      specFields: ['geometry', 'point'],
      requiredFields: ['geometry', 'point']
    }).map(row => row.field)).toEqual(['geometry'])
  })

  it('locks detected geometry mappings as mapped field rows', () => {
    const columnMappingRows = buildColumnMappingRows({
      columnFieldLog: applyDetectedGeometryColumnMapping([
        { field: 'geometry', column: null, missing: true, mandatory: true },
        { field: 'point', column: null, missing: true, mandatory: true }
      ], [
        { converted_row: { WKT: 'POLYGON ((-0.1 51.5,-0.2 51.6))' } }
      ]),
      userColumnMapping: {}
    })

    expect(buildExpectedFieldRows({
      columnMappingRows,
      specFields: ['geometry', 'point'],
      requiredFields: ['geometry', 'point']
    })).toEqual([
      {
        field: 'geometry',
        column: 'WKT',
        isMapped: true,
        isAutoMapped: true,
        isEditable: false,
        userDefined: false,
        userIgnored: false,
        isRequired: true
      }
    ])
  })

  it('keeps detected geometry mappings locked after they are persisted as column mappings', () => {
    const columnMappingRows = buildColumnMappingRows({
      columnFieldLog: [
        {
          field: 'geometry',
          column: 'WKT',
          detectedGeometryMapping: true,
          missing: false,
          mandatory: true
        }
      ],
      userColumnMapping: {
        WKT: 'geometry'
      }
    })

    expect(buildExpectedFieldRows({
      columnMappingRows,
      specFields: ['geometry'],
      requiredFields: ['geometry']
    })).toEqual([
      {
        field: 'geometry',
        column: 'WKT',
        isMapped: true,
        isAutoMapped: true,
        isEditable: false,
        userDefined: false,
        userIgnored: false,
        isRequired: true
      }
    ])
  })

  it('sorts expected field rows by automapped, required, then user-defined priority', () => {
    const columnMappingRows = [
      {
        column: 'Alpha column',
        field: 'alpha',
        isMapped: true,
        isAutoMapped: true,
        userDefined: false,
        userIgnored: false
      },
      {
        column: 'Beta column',
        field: 'beta',
        isMapped: true,
        isAutoMapped: true,
        userDefined: false,
        userIgnored: false
      },
      {
        column: '',
        field: 'gamma',
        isMapped: false,
        userDefined: false,
        userIgnored: false
      },
      {
        column: '',
        field: 'delta',
        isMapped: false,
        userDefined: false,
        userIgnored: false
      },
      {
        column: 'Epsilon column',
        field: 'epsilon',
        isMapped: true,
        userDefined: true,
        userIgnored: false
      }
    ]

    expect(buildExpectedFieldRows({
      columnMappingRows,
      specFields: ['delta', 'beta', 'gamma', 'epsilon', 'alpha'],
      requiredFields: ['alpha', 'gamma']
    }).map(row => row.field)).toEqual([
      'alpha',
      'beta',
      'gamma',
      'epsilon',
      'delta'
    ])
  })

  it('marks missing expected field rows as required', () => {
    const columnMappingRows = [
      {
        column: '',
        field: 'reference',
        isMapped: false,
        isMissing: true,
        userDefined: false,
        userIgnored: false
      }
    ]

    expect(buildExpectedFieldRows({
      columnMappingRows,
      specFields: ['notes', 'reference'],
      requiredFields: ['reference']
    })).toEqual([
      {
        field: 'reference',
        column: '',
        isMapped: false,
        isAutoMapped: false,
        isEditable: true,
        userDefined: false,
        userIgnored: false,
        isRequired: true
      },
      {
        field: 'notes',
        column: '',
        isMapped: false,
        isAutoMapped: false,
        isEditable: true,
        userDefined: false,
        userIgnored: false,
        isRequired: false
      }
    ])
  })

  it('preserves ignored fields when building expected rows', () => {
    const columnMappingRows = [
      {
        column: '',
        field: 'notes',
        isMapped: false,
        userDefined: false,
        userIgnored: true
      }
    ]

    expect(buildExpectedFieldRows({
      columnMappingRows,
      specFields: ['notes'],
      requiredFields: []
    })).toEqual([
      {
        field: 'notes',
        column: '',
        isMapped: false,
        isAutoMapped: false,
        isEditable: true,
        userDefined: false,
        userIgnored: true,
        isRequired: false
      }
    ])
  })

  it('includes ignored and spare uploaded columns in dropdown options', () => {
    const rows = buildColumnMappingRows({
      columnFieldLog: [
        { column: 'Reference', field: 'reference' }
      ],
      userColumnMapping: {
        Extra: 'IGNORE'
      }
    })

    expect(buildSelectableColumns(rows, [{ converted_row: { Reference: 'abc', Notes: 'note', Extra: 'extra' } }])).toEqual(['Extra', 'Notes'])
  })

  it('extracts nested and literal bracketed fields', () => {
    expect(getBracketFields({
      map: { Column: 'field' },
      'map[Other column]': 'other-field'
    }, 'map')).toEqual({
      Column: 'field',
      'Other column': 'other-field'
    })
  })

  it('validates blank field mapping selections', () => {
    expect(validateColumnMapping({
      fieldMap: {
        notes: '',
        reference: 'Reference',
        geometry: 'na'
      }
    })).toEqual({
      notes: {
        text: 'Select the notes field'
      }
    })
  })

  it('validates not provided selections for required fields', () => {
    expect(validateColumnMapping({
      fieldMap: {
        reference: 'na',
        notes: 'na'
      }
    }, [
      { field: 'reference', isRequired: true },
      { field: 'notes', isRequired: false }
    ])).toEqual({})
  })

  it('applies submitted selections to mapping rows for redisplay', () => {
    const rows = [
      { field: 'notes', column: '', userIgnored: false },
      { field: 'reference', column: 'Reference', userIgnored: false }
    ]

    applySubmittedFieldSelections(rows, {
      fieldMap: {
        notes: 'Notes'
      }
    })

    expect(rows).toEqual([
      { field: 'notes', column: 'Notes', userIgnored: false },
      { field: 'reference', column: 'Reference', userIgnored: false }
    ])
  })

  it('marks na submitted selections as user ignored for redisplay', () => {
    const rows = [
      { field: 'notes', column: 'Notes', userIgnored: false }
    ]

    applySubmittedFieldSelections(rows, {
      fieldMap: {
        notes: 'na'
      }
    })

    expect(rows).toEqual([
      { field: 'notes', column: '', userIgnored: true }
    ])
  })

  it('marks unselected spare uploaded columns as ignored on submit', () => {
    const mapping = buildSubmittedColumnMapping({
      body: {
        fieldMap: {
          reference: 'Reference',
          notes: 'na'
        }
      },
      spareUploadedColumns: ['Reference', 'Notes', 'Extra']
    })

    expect(mapping).toEqual({
      Reference: 'reference',
      Notes: 'IGNORE',
      Extra: 'IGNORE',
      na: 'IGNORE'
    })
  })
})
