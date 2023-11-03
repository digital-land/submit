// write a hello world test in vitest

// Path: test/unit/test.test.js

import { describe, it, expect } from 'vitest'

describe('hello world', () => {
  it('hello world', () => {
    expect('hello world').toBe('hello world')
  })
})
