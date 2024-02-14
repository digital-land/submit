import HmpoConfig from 'hmpo-config'

const config = new HmpoConfig()

// add default config
config.addFile('./config/default.yaml')

// add environment specific config
try{
    config.addFile('./config/' + process.env.NODE_ENV + '.yaml')
}catch(err){
    console.error('No environment specific config file found for ' + process.env.NODE_ENV + '.yaml')
}

export default config.toJSON()
