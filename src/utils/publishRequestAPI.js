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
    return 'fakeId'
  },

  getRequestData: async (resultId) => {
    // const result = await fetch(`${this.apiEndpoint}/results/${resultId}`);
    // return result.json();
    return {
      id: 'fakeId',
      status: 'fakeStatus',
      data: {}
    }
  }
}

export default publishRequestApi
