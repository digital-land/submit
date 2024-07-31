import config from '../../config/index.js'

const getFullServiceName = (service) => {
  if (!service || typeof service !== 'string') {
    throw new Error('Service name must be a non-empty string')
  }
  return config.serviceName.replace('Provide', service)
}

export default getFullServiceName
