import express from 'express'
import nunjucks from 'nunjucks'
import config from '../../config/index.js'

const router = express.Router()

function getNavigationStructure () {
  return config.guidanceNavigation
}

router.get('/*', (req, res) => {
  try {
    const path = req.params[0]
    let templatePath = ''

    switch (path) {
      case '':
      case '/':
        templatePath = 'guidance/index'
        break
      case 'specifications':
      case 'specifications/':
        templatePath = 'guidance/specifications/index'
        break
      default:
        templatePath = `guidance/${path}`
    }

    const guidancePage = nunjucks.render(`${templatePath}.md`, {
      permalink: `/guidance${req.path}`,
      navigation: getNavigationStructure()
    })

    res.send(guidancePage)
  } catch (error) {
    console.info('Guidance page not found', { type: 'App', path: req.path })
    res.status(404).render('errorPages/404', {})
  }
})

export default router