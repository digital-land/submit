import express from 'express'
/* import nunjucks from 'nunjucks'
import config from '../../config/index.js'
import logger from '../utils/logger.js' */

const router = express.Router()

router.get('/*', (req, res) => {
  const path = req.params[0].replace(/[^a-zA-Z0-9/-]/g, '')

  return res.redirect(302, `https://www.planning.data.gov.uk/guidance/${path}`)
})

/* function getNavigationStructure () {
  if (!config.guidanceNavigation) {
    logger.error('Guidance navigation configuration is missing')
    return { title: 'Guidance', items: [] }
  }

  return config.guidanceNavigation
} */

/* function extractUrlsFromItems (items) {
  let urls = []
  items.forEach(item => {
    if (item.url) {
      urls.push(item.url)
    }
    if (item.items) {
      urls = urls.concat(extractUrlsFromItems(item.items))
    }
  })
  return urls
}

function checkPathExists (items, path) {
  const fullPath = `/guidance${path}`.replace(/\/$/, '')
  const urls = extractUrlsFromItems(items)

  return urls.includes(fullPath)
}

router.get('/*', (req, res) => {
  const path = req.params[0].replace(/[^a-zA-Z0-9/-]/g, '')
  return res.redirect(302, `https://www.planning.data.gov.uk/guidance${path}`)

  try {
    const navigationStructure = getNavigationStructure()
    const path = req.params[0].replace(/[^a-zA-Z0-9/-]/g, '')

    if (path.includes('..') || !checkPathExists(navigationStructure.items, req.path)) {
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
      navigation: navigationStructure
    })

    res.send(guidancePage)
  } catch (error) {
    if (error?.message === 'template not found' || error?.message === 'Invalid path') {
      logger.info('Guidance page not found', { type: 'App', path: req.path })

      res.status(404).render('errorPages/404', {})
    } else {
      logger.error('Error rendering guidance page', {
        type: 'App',
        path: req.path,
        error: error.message
      })

      res.status(500).render('errorPages/500', {})
    }
  }
}) */

export default router
