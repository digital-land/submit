import { expect, test } from 'vitest'

test('hello world', () => {
  expect(1 + 1).toBe(2)
})

// test change
test('hello world fail', () => {
  expect(1 + 1).toBe(3)
})