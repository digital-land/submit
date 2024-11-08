import express from 'express'
import nunjucks from 'nunjucks'
import config from '../../config/index.js'

const router = express.Router()

function getNavigationStructure () {
  return config.guidanceNavigation
}

router.get('/*', (req, res) => {
  try {
    const path = req.params[0].replace(/[^a-zA-Z0-9/-]/g, '')
    if (path.includes('..')) {
      throw new Error('Invalid path')
    }

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
      navigation: getNavigationStructure()
    })

    res.send(guidancePage)
  } catch (error) {
    if (error?.message === 'template not found') {
      console.info('Guidance page not found', { type: 'App', path: req.path })
      res.status(404).render('errorPages/404', {})
    } else {
      console.error('Error rendering guidance page', {
        type: 'App',
        path: req.path,
        error: error.message
      })
      res.status(500).render('errorPages/500', {})
    }
  }
})

export default router
