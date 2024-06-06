/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import Dockerode from 'dockerode'

const [, , dataDir, logsDir, engine, port, optionsStr] = process.argv
const options = optionsStr.split(',')

type Message = {
  action: string
}

let dockerContainer: Dockerode.Container

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
  return container
}

function stopping() {
  if (process.send) process.send('containerStopped')
  process.exit(0)
}

async function waiting() {
  await dockerContainer.wait()
  stopping()
}

async function launch() {
  dockerContainer = await launchDocker()
  waiting()
}

launch()

process.once('message', async (message: Message) => {
  if (message.action === 'wait') {
    waiting()
  } else {
    await dockerContainer.kill()
    process.exit(0)
  }
})

process.on('SIGTERM', async () => {
  await dockerContainer.kill()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await dockerContainer.kill()
  process.exit(0)
})
