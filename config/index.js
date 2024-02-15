import HmpoConfig from 'hmpo-config'

const config = new HmpoConfig()

// add default config
config.addFile('./config/default.yaml')

const environment = process.env.NODE_ENV || process.env.ENVIRONMENT || 'production'

// add environment specific config
try {
  config.addFile('./config/' + environment + '.yaml')
} catch (err) {
  console.error('No environment specific config file found for ' + environment + '.yaml')
}

export default config.toJSON()
