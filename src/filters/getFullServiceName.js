import config from '../../config/index.js'

const getFullServiceName = (service) => config.serviceName.replace('Provide', service)

export default getFullServiceName
