import config from '../../config/index.js'

const publishRequestApi = {
  apiEndpoint: config.publishRequestApi,

  postRequest: async (formData) => {
    // try {
    //   // send the object key
    //   const response = await this.apiValidateFile({
    //     objectKey: objectKey,
    //     ...this.getBaseFormData(req)
    //   })

    //   return response.id // assuming the response contains the id

    // } catch (error) {
    //   this.handleApiError(error, req)
    // }
    return 1
  },

  getRequestData: async (resultId) => {
    // const result = await fetch(`${this.apiEndpoint}/results/${resultId}`);
    const result = {
      id: 1,
      type: 'check_url',
      status: 'PROCESSING',
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
