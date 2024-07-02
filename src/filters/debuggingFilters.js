  // some additional filters useful for debugging:

export const getkeys = function (object) {
    if (Object.prototype.toString.call(object) === '[object Array]') {
      const keys = []
      for (let i = object.length - 1; i >= 0; i--) {
        keys.push(Object.keys(object[i]))
      }
      return keys
    } else {
      return Object.keys(object)
    }
}

export const getContext = function () {
    return this.ctx
}
