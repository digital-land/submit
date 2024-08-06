import PageController from './pageController.js'
import yaml from 'js-yaml';
import fs from 'fs';

const templateFile = 'src/assets/emailTemplates/newEndpoint.yml'

const templateContent = fs.readFileSync(templateFile, 'utf8');
const template = yaml.load(templateContent);

class confirmationController extends PageController {
  locals(req, res, next) {
    const name = req.sessionModel.get('name')
    const email = req.sessionModel.get('email')
    const organisation = req.sessionModel.get('lpa')
    const dataset = req.sessionModel.get('dataset')
    const documentationUrl = req.sessionModel.get('documentation-url')
    const endpoint = req.sessionModel.get('endpoint-url')

    const recipient = 'digitalland@levellingup.gov.uk'
    const templateVars = { name, organisation, email, endpoint, documentationUrl, dataset };
    const subject = template.subject.replace(/\${(.*?)}/g, (match, key) => templateVars[key]);
    const body = template.body.replace(/\${(.*?)}/g, (match, key) => templateVars[key]);

    req.form.options.mailTo = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    super.locals(req, res, next)
  }
}

export default confirmationController
