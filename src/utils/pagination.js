const { min, max } = Math
const range = (lo, hi) => Array.from({ length: hi - lo }, (_, i) => i + lo)

export const pagination = (count, current, ellipsis = '...') => {
  if (count <= 5) {
    return range(1, count + 1)
  }
  const adjacent = 1
  const left = current === count ? current - 2 * adjacent : max(1, current - adjacent)
  const right = current === 1 ? 1 + adjacent * 2 : min(count, current + adjacent)
  const middle = range(left, right + 1)
  let leftEllipsis = left > 1
  let rightEllipsis = right < count

  if (leftEllipsis && middle[0] === 2) {
    leftEllipsis = false
    middle.unshift(1)
  }

  if (rightEllipsis && middle[middle.length - 1] === count - 1) {
    rightEllipsis = false
    middle.push(count)
  }

  const result = [
    ...(leftEllipsis ? [1, ellipsis] : middle),
    ...(leftEllipsis && rightEllipsis ? middle : []),
    ...(rightEllipsis ? [ellipsis, count] : middle)
  ]
  return result
}
