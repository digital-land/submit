import nunjucks from 'nunjucks'

/**
 * JSON for use inside a <script> element.
 *
 * `dump | safe` does not escape `<`, so a value containing `</script>` would end
 * the script element early. `<`, `>` and `&` are written as \u escapes instead,
 * which JavaScript reads back as the same characters.
 *
 * @param {*} value
 * @returns {nunjucks.runtime.SafeString}
 */
export const jsonForScript = (value) => {
  const json = JSON.stringify(value)
  if (json === undefined) return nunjucks.runtime.markSafe('')
  return nunjucks.runtime.markSafe(
    json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  )
}
