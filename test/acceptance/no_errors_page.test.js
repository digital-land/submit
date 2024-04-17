import { test } from '@playwright/test'
import StartPOM from './PageObjectModels/startPOM'
import DatasetPOM from './PageObjectModels/datasetPOM'
import UploadMethodPOM from './PageObjectModels/uploadMethodPOM'
import UploadFilePOM from './PageObjectModels/uploadFilePOM'
import NoErrorsPOM from './PageObjectModels/noErrorsPOM'

// ToDo: this need rewriting or removing
test.skip('the page renders a table with the correct data', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadFilePOM = new UploadFilePOM(page)
  const noErrorsPOM = new NoErrorsPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.waitForPage()
  await uploadFilePOM.uploadFile('test/testData/conservation-area-ok.csv')
  await uploadFilePOM.clickContinue()

  await noErrorsPOM.waitForPage()

  await noErrorsPOM.validateTableIsCorrect([
    ['Geometry', 'Name', 'Point', 'Start date', 'End date', 'Document URL', 'Legislation', 'Notes'],
    ['POLYGON ((0 51, -1 51, -1 52, 0 51))', 'Camden Square', 'POINT (-0.130484959448 51.544845663239)', '40/04/1980', '', 'https://www.camden.gov.uk/camden-square-conservation-area-appraisal-and-management-strategy', '', ''],
    ['POLYGON ((1 52, 0 52, 0 52, 1 51))', 'Holly Lodge Estate', 'POINT (-0.150097204178 51.564975754948)', '01/06/1992', '', 'https://www.camden.gov.uk/holly-lodge-conservation-area', '', ''],
    ['POLYGON ((0.2 51, 0.8 51, -0.2 52, -0.8 52, 0.2 51))', 'Dartmouth Park', 'POINT (-0.145442349961 51.559999511433)', '01/06/1992', '', 'https://www.camden.gov.uk/dartmouth-park-conservation-area-appraisal-and-management-strategy', '', '']
  ])
})
