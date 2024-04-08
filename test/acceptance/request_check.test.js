/*
    this file will hold acceptance tests for requesting checks
    the acceptance criteria we are basing these tests on are:
        - request check of a datafile with javascript enabled
        - request check of a datafile with javascript disabled
        - request check of a datafile when javascript fails
*/

import { test, expect } from '@playwright/test'
import { LocalstackContainer } from '@testcontainers/localstack'
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

import StartPOM from './PageObjectModels/startPOM'
import DatasetPOM from './PageObjectModels/datasetPOM'
import UploadMethodPOM from './PageObjectModels/uploadMethodPOM'
import UploadFilePOM from './PageObjectModels/uploadFilePOM'
import StatusPOM from './PageObjectModels/statusPOM'
import ResultsPOM from './PageObjectModels/resultsPOM'

test.describe('initial test container tests', async () => {
  let container

  test.beforeAll(async () => {
    container = await new LocalstackContainer('localstack/localstack:latest').start()
  })

  test.afterAll(async () => {
    await container.stop()
  })

  test.skip('should create a S3 bucket', async () => {
    const client = new S3Client({
      endpoint: container.getConnectionUri(),
      forcePathStyle: true,
      region: 'us-east-1',
      credentials: {
        secretAccessKey: 'test',
        accessKeyId: 'test'
      }
    })
    const input = {
      Bucket: 'testcontainers'
    }
    const command = new CreateBucketCommand(input)

    const createBucketResponse = await client.send(command)
    expect(createBucketResponse.$metadata.httpStatusCode).toEqual(200)
    const headBucketResponse = await client.send(new HeadBucketCommand(input))
    expect(headBucketResponse.$metadata.httpStatusCode).toEqual(200)

    await container.stop()
  })
})

test.describe('Request Check', () => {
  test.describe('with javascript enabled', () => {
    test.skip('request check of a datafile', async ({ page }) => {
      const startPOM = new StartPOM(page)
      const datasetPOM = new DatasetPOM(page)
      const uploadMethodPOM = new UploadMethodPOM(page)
      const uploadFilePOM = new UploadFilePOM(page)
      const statusPOM = new StatusPOM(page)
      const resultsPOM = new ResultsPOM(page)

      await startPOM.navigateHere()
      await startPOM.clickStartNow()

      await datasetPOM.waitForPage()
      await datasetPOM.selectDataset(DatasetPOM.datasets.Article_4_direction_area_dataset)
      await datasetPOM.clickContinue()

      await uploadMethodPOM.waitForPage()
      await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
      await uploadMethodPOM.clickContinue()

      await uploadFilePOM.waitForPage()
      await uploadFilePOM.uploadFile('test/datafiles/Article_4_direction_area_dataset.csv')
      await uploadFilePOM.clickContinue()

      await statusPOM.waitForPage()
      await statusPOM.expectStatusToBe('NEW')
      await statusPOM.expectStatusToBe('IN_PROGRESS')
      await statusPOM.waitForContinueButton()
      await statusPOM.expectStatusToBe('COMPLETE')
      await statusPOM.clickContinue()

      await resultsPOM.waitForPage()
      await resultsPOM.expectPageIsNoErrorsPage()
    })
  })

  test.describe('With javascript disabled', () => {
    test.use({ javaScriptEnabled: false })

    test.skip('request check of a datafile', async ({ page }) => {
      const startPOM = new StartPOM(page)
      const datasetPOM = new DatasetPOM(page)
      const uploadMethodPOM = new UploadMethodPOM(page)
      const uploadFilePOM = new UploadFilePOM(page)
      const statusPOM = new StatusPOM(page)
      const resultsPOM = new ResultsPOM(page)

      await startPOM.navigateHere()
      await startPOM.clickStartNow()

      await datasetPOM.waitForPage()
      await datasetPOM.selectDataset(DatasetPOM.datasets.Article_4_direction_area_dataset)
      await datasetPOM.clickContinue()

      await uploadMethodPOM.waitForPage()
      await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
      await uploadMethodPOM.clickContinue()

      await uploadFilePOM.waitForPage()
      await uploadFilePOM.uploadFile('test/datafiles/Article_4_direction_area_dataset.csv')
      await uploadFilePOM.clickContinue()

      await statusPOM.waitForPage()
      await statusPOM.expectStatusToBe('NEW')
      await statusPOM.waitForContinueButton()
      await statusPOM.clickContinue()

      await resultsPOM.waitForPage()

      // could be redirected back to the status page here? or could remain on  the results page

      await statusPOM.waitForPage()
    })
  })

  test.describe('With javascript failing', () => {
    test.skip('request check of a datafile', async ({ page }) => {
      // we need a way to make javascript fail here.

      const startPOM = new StartPOM(page)
      const datasetPOM = new DatasetPOM(page)
      const uploadMethodPOM = new UploadMethodPOM(page)
      const uploadFilePOM = new UploadFilePOM(page)
      const statusPOM = new StatusPOM(page)
      const resultsPOM = new ResultsPOM(page)

      await startPOM.navigateHere()
      await startPOM.clickStartNow()

      await datasetPOM.waitForPage()
      await datasetPOM.selectDataset(DatasetPOM.datasets.Article_4_direction_area_dataset)
      await datasetPOM.clickContinue()

      await uploadMethodPOM.waitForPage()
      await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
      await uploadMethodPOM.clickContinue()

      await uploadFilePOM.waitForPage()
      await uploadFilePOM.uploadFile('test/datafiles/Article_4_direction_area_dataset.csv')
      await uploadFilePOM.clickContinue()

      await statusPOM.waitForPage()
      await statusPOM.expectStatusToBe('NEW')
      await statusPOM.expectStatusToBe('IN_PROGRESS')
      await statusPOM.waitForContinueButton()
      await statusPOM.expectStatusToBe('FAILED')
      await statusPOM.clickContinue()

      await resultsPOM.waitForPage()
      await resultsPOM.expectPageIsErrorPage()
    })
  })
})
