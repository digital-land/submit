import express from 'express'

const router = express.Router()

router.get('/*', (req, res) => {
  const path = req.params[0].replace(/[^a-zA-Z0-9/-]/g, '')

  return res.redirect(302, `https://www.planning.data.gov.uk/guidance/${path}`)
})

export default router
