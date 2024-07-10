import config from '../../config/index.js'

export default (service) => {
  const serviceName = config.serviceName

  return serviceName.replace('Provide', service)
}
