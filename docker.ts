/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { updater } from '@architect/utils'
import Dockerode, { type ContainerCreateOptions } from 'dockerode'
import { fork } from 'node:child_process'
import { promisify } from 'node:util'

const [, , command, jsonifiedArgs] = process.argv

type Options = Omit<ContainerCreateOptions, 'Image'> &
  Required<Pick<ContainerCreateOptions, 'Image'>>

if (command === 'launch-docker-subprocess') {
  const options: Options = JSON.parse(jsonifiedArgs)
  ;(options.HostConfig ??= {}).AutoRemove = true
  const docker = new Dockerode()

  await promisify(docker.modem.followProgress)(await docker.pull(options.Image))

  const container = await docker.createContainer(options)
  const stream = await container.attach({ stream: true, stderr: true })
  stream.pipe(process.stderr)
  await container.start()

  const signals = ['message', 'SIGTERM', 'SIGINT']
  signals.forEach((signal) => {
    process.on(signal, async () => {
      await container.kill()
    })
  })

  await container.wait()
  process.exit()
}

export function launchDockerSubprocess(options: Options) {
  const update = updater('Docker')
  update.start(`Launching container ${options.Image}`)
  const subprocess = fork(new URL(import.meta.url), [
    'launch-docker-subprocess',
    JSON.stringify(options),
  ])
  update.done(`Launched container ${options.Image}`)

  return {
    async kill() {
      update.update(`Stopping container ${options.Image}`)
      subprocess.send({ action: 'kill' })
    },
    async waitUntilStopped() {
      return new Promise<void>((resolve) => {
        subprocess.on('exit', () => {
          update.done(`Stopped container ${options.Image}`)
          resolve()
        })
      })
    },
  }
}
