const HmpoConfig = require('hmpo-config')

const config = new HmpoConfig()
config.addFile('./config/default.yaml')
module.exports = config.toJSON()
