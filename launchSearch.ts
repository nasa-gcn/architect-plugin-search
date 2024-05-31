/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import Dockerode from 'dockerode'

const dataDir = process.argv[2]
const logsDir = process.argv[3]
const engine = process.argv[4]
const port = process.argv[5]
const options = process.argv[6].split(',')

type Message = {
  action: string
}

let dockerConatiner: Dockerode.Container

async function launchDocker() {
  const Image =
    engine === 'elasticsearch'
      ? 'elastic/elasticsearch:8.6.2'
      : 'opensearchproject/opensearch:2.11.0'
  console.log('Launching Docker container', Image)
  const docker = new Dockerode()

  const container = await docker.createContainer({
    Env: [...options, 'path.data=/var/lib/search', 'path.logs=/var/log/search'],
    HostConfig: {
      AutoRemove: true,
      Mounts: [
        { Source: dataDir, Target: '/var/lib/search', Type: 'bind' },
        { Source: logsDir, Target: '/var/log/search', Type: 'bind' },
      ],
      PortBindings: {
        [`${port}/tcp`]: [{ HostIP: '127.0.0.1', HostPort: `${port}` }],
      },
    },
    Image,
  })
  const stream = await container.attach({ stream: true, stderr: true })
  stream.pipe(process.stderr)
  await container.start()
  dockerConatiner = container
}

async function stopping() {
  if (process.send) process.send('containerStopped')
}

async function waiting() {
  await dockerConatiner.wait()
  stopping()
}

launchDocker()

process.once('message', async (message: Message) => {
  if (message.action === 'wait') {
    waiting()
  } else {
    await dockerConatiner.kill()
  }
})

process.on('SIGTERM', async () => {
  await dockerConatiner.kill()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await dockerConatiner.kill()
  process.exit(0)
})
