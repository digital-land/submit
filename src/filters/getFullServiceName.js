import config from '../../config/index.js'

/*
  * Get the full service name from the short service name.
  *
  * The names should be specified in the config under 'serviceNames'.
  *
  * @param {string} service
  * @returns {string}
  */
export default (service) => {
  if (!service || typeof service !== 'string') {
    throw new TypeError('Service must be a string')
  }
  return config.serviceNames[service.toLowerCase()] || service
}

export default getFullServiceName
