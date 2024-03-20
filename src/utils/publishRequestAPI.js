import config from '../../config/index.js'

const publishRequestApi = {
  apiEndpoint: config.publishRequestApi,

  postFileRequest: async (formData) => {
    const { uploadedFilename, originalFilename, dataset, collection, geomType } = formData

    return await this._postRequest({
      dataset,
      collection,
      geom_type: geomType,
      uploaded_filename: uploadedFilename,
      original_filename: originalFilename,
      type: 'check_file'
    })
  },

  postUrlRequest: async (formData) => {
    const { url, dataset, collection, geomType } = formData

    return await this._postRequest({
      dataset,
      collection,
      geom_type: geomType,
      url,
      type: 'check_url'
    })
  },

  _postRequest: async (formData) => {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    return data.id // assuming the response contains the id
  },

  getRequestData: async (resultId) => {
    // const result = await fetch(`${this.apiEndpoint}/results/${resultId}`);
    const result = {
      id: 1,
      type: 'check_url',
      status: 'COMPLETE',
      created: '2024-03-13T16:50:59.472751Z',
      modified: '2024-03-13T16:50:59.472751Z',
      params: {
        type: 'check_url',
        collection: 'article_4_direction',
        dataset: 'article_4_direction_area',
        url: 'https://services3.arcgis.com/lCzPKKaGs7lhrnrV/ArcGIS/rest/services/Planning_Portal_Article_4_Direction_081223/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson'
      },
      response: {
        data: {
          'column-field-log': [],
          'error-summary': []
        },
        details: [
          {
            'line-number': 1,
            'converted-row': {},
            'issue-log-row': {}
          }
        ]
      }
    }
    return new RequestData(result)
  }
}

class RequestData {
  constructor (data) {
    Object.assign(this, data)
  }

  hasErrors () {
    return this.response.data['error-summary'].length > 0
  }

  isComplete () {
    return this.status === 'COMPLETE'
  }
}

export default publishRequestApi
