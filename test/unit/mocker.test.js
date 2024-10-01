import { describe, it, expect } from 'vitest'
import { generateNextRandomNumber, resetRandomNumberGenerator } from '../utils/mocker'

describe('generateNextRandomNumber', () => {
  describe('generates the same sequence of values when given the seed', () => {
    const testSeeds = [
      1111111111,
      123456789,
      2222222222,
      8649740574,
      9870987765544
    ]

    testSeeds.forEach(seed => {
      it(`seed: ${seed}`, () => {
        const firstPass = []
        const secondPass = []

        for (let i = 0; i < 10; i++) {
          firstPass.push(generateNextRandomNumber(seed))
        }

        resetRandomNumberGenerator()

        for (let i = 0; i < 10; i++) {
          secondPass.push(generateNextRandomNumber(seed))
        }

        expect(firstPass).toEqual(secondPass)

        resetRandomNumberGenerator()
      })
    })
  })
})
