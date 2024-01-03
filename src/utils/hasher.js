import { createHash } from 'crypto'

export default (string) => {
  if (!string) {
    return ''
  }
  return createHash('sha256').update(string).digest('hex')
}
