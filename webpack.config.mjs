import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  entry: {
    map: '/src/assets/js/map.js',
    application: '/src/assets/js/application.js',
    statusPage: '/src/assets/js/statusPage.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/js')
  },
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, '/')
    },
    compress: true,
    port: 9000,
    open: true, // open the browser after server had been started
    hot: true // enable HMR on the server
  }
}
