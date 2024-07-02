// this function strips out unnecessary whitespace from our html to make sure comparisons are accurate
export const stripWhitespace = (str) => {
    return str.replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/>\s+/g, '>').replace(/\s+</g, '<').replace(/\s+>/g, '>').replace(/<\s+/g, '<')
  }
  