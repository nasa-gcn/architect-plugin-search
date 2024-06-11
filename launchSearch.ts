/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import Dockerode from 'dockerode'

const [, , argv] = process.argv
const { dataDir, logsDir, engine, port, options } = JSON.parse(argv)

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

async function waiting() {
  await dockerContainer.wait()
  process.exit(0)
}

async function launch() {
  dockerContainer = await launchDocker()
  waiting()
}

launch()

const signals = ['SIGTERM', 'SIGINT']
signals.forEach((signal) => {
  process.on(signal, async () => {
    await dockerContainer.kill()
    process.exit(0)
  })
})
