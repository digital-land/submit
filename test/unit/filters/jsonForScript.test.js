import { describe, it, expect } from 'vitest'
import nunjucks from 'nunjucks'
import { jsonForScript } from '../../../src/filters/jsonForScript.js'

describe('jsonForScript', () => {
  const env = new nunjucks.Environment(null, { autoescape: true })
  env.addFilter('jsonForScript', jsonForScript)
  const render = value => env.renderString('<script>const value = {{ value | jsonForScript }}</script>', { value })

  it('does not let a value end the script element', () => {
    const html = render(['POINT (1 1)</script><script>alert(1)</script>'])

    expect(html).not.toContain('</script><script>')
    expect(html.match(/<\/script>/g)).toHaveLength(1)
  })

  it('produces JSON that reads back as the original value', () => {
    const value = { geometries: ['POINT (1 1)', 'a < b && c > d', '</script>'], count: 2 }
    const json = render(value).replace('<script>const value = ', '').replace('</script>', '')

    expect(JSON.parse(json)).toEqual(value)
  })

  it('renders nothing for undefined', () => {
    expect(render(undefined)).toBe('<script>const value = </script>')
  })
})
