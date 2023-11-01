'use strict'

const { Controller } = require('hmpo-form-wizard')

const { readFile } = require('node:fs/promises')
const { lookup } = require('mime-types')

const apiRoute = 'http://127.0.0.1:8082/api/dataset/validate/file/request/'

class SubmitForm extends Controller {
  async saveValues (req, res, next) {
    const formData = new FormData()
    formData.append('dataset', req.sessionModel.get('dataset'))
    formData.append('collection', req.sessionModel.get('data-subject'))
    formData.append('organization', 'mockOrg')

    const filePath = req.sessionModel.get('datafile').path
    const file = new Blob([await readFile(filePath)], { type: lookup(filePath) })

    formData.append('upload_file', file, req.sessionModel.get('datafile').originalname)

    // post the data to the api
    const result = await fetch(apiRoute, {
      method: 'POST',
      body: formData
    })

    const json = await result.json()

    console.log(json)
  }
}

module.exports = SubmitForm
