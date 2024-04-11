import { LocalstackContainer } from '@testcontainers/localstack'
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'

export default class Localstack {
  constructor () {
    this.image = 'localstack/localstack:latest'
    this.buckets = []
  }

  async start () {
    console.log('Starting LocalstackContainer')
    this.container = await new LocalstackContainer(this.image).start()
    return this
  }

  async stop () {
    console.log('Stopping LocalstackContainer')
    await this.container.stop()
  }

  async createBucket (bucketName) {
    console.log('CREATING BUCKET: ' + bucketName)
    const client = new S3Client({
      endpoint: this.container.getConnectionUri(),
      forcePathStyle: true,
      region: 'us-east-1',
      credentials: {
        secretAccessKey: 'test',
        accessKeyId: 'test'
      }
    })
    const input = {
      Bucket: bucketName
    }
    const command = new CreateBucketCommand(input)
    await client.send(command)
    this.buckets.push(bucketName)
  }
}
