import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  resolve: {
    fallback: {
      os: false,
      path: false,
      fs: false,
      vm: false,
      zlib: false,
      http: false,
      https: false,
      tls: false,
      net: false,
      stream: false,
      crypto: false
    }
  },
  entry: {
    map: '/src/assets/js/map.js',
    application: '/src/assets/js/application.js',
    statusPage: '/src/assets/js/statusPage.js',
    'list-filter': '/src/assets/js/list-filter.js'
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
