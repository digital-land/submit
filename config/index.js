import HmpoConfig from 'hmpo-config'

const config = new HmpoConfig()
config.addFile('./config/default.yaml')
export default config.toJSON()
