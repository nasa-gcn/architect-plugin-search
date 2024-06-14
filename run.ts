/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'path'
import waitPort from 'wait-port'
import { install } from './install.js'
import { mkdtemp } from 'fs/promises'
import { mkdirP, temp } from './paths.js'
import rimraf from 'rimraf'
import { spawn, untilTerminated } from './processes.js'
import type { SandboxEngine } from './engines.js'
import { UnexpectedResolveError, neverResolve } from './promises.js'
import { fork } from 'child_process'
import { fileURLToPath } from 'url'

type SearchEngineLauncherFunction<T = object> = (
  props: T & {
    options: string[]
    dataDir: string
    logsDir: string
    engine: SandboxEngine
    port: number
  }
) => Promise<{
  kill: () => Promise<void>
  waitUntilStopped: () => Promise<void>
}>

const launchBinary: SearchEngineLauncherFunction<{ bin: string }> = async ({
  bin,
  dataDir,
  logsDir,
  options,
}) => {
  const args = [...options, `path.data=${dataDir}`, `path.logs=${logsDir}`].map(
    (opt) => `-E${opt}`
  )

  console.log('Spawning', bin, ...args)
  const child = await spawn(bin, args, {
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  return {
    async kill() {
      console.log('Killing child process')
      child.kill()
    },
    async waitUntilStopped() {
      await untilTerminated(child)
    },
  }
}

const launchDocker: SearchEngineLauncherFunction = async ({
  dataDir,
  logsDir,
  engine,
  port,
  options,
}) => {
  const argv = {
    dataDir,
    logsDir,
    engine,
    port,
    options,
  }
  const __filename = fileURLToPath(import.meta.url)
  const subprocess = fork(__filename, [
    'launch-docker-subprocess',
    JSON.stringify(argv),
  ])

  return {
    async kill() {
      console.log('Killing Docker container')
      subprocess.send({ action: 'kill' })
    },
    async waitUntilStopped() {
      return new Promise<void>((resolve) => {
        subprocess.on('exit', () => {
          console.log('Docker container exited')
          resolve()
        })
      })
    },
  }
}

export async function launch({
  port,
  engine,
}: {
  port?: number
  engine: SandboxEngine
}) {
  port ??= 9200
  const url = `http://localhost:${port}`

  const options = [
    `http.port=${port}`,
    'discovery.type=single-node',
    engine === 'elasticsearch'
      ? 'xpack.security.enabled=false'
      : 'plugins.security.disabled=true',
  ]

  await mkdirP(temp)
  const tempDir = await mkdtemp(join(temp, 'run-'))
  const [dataDir, logsDir] = ['data', 'logs'].map((s) => join(tempDir, s))
  await Promise.all([dataDir, logsDir].map(mkdirP))

  const bin = await install(engine)
  const props = { engine, dataDir, logsDir, options, port }
  const { kill, waitUntilStopped } = await (bin
    ? launchBinary({ bin, ...props })
    : launchDocker(props))

  try {
    await Promise.race([
      waitPort({ port, protocol: 'http' }),
      neverResolve(waitUntilStopped()),
    ])
  } catch (e) {
    if (e instanceof UnexpectedResolveError) {
      throw new Error('Search engine terminated unexpectedly')
    } else {
      throw e
    }
  }

  return {
    url,
    port,
    async stop() {
      await kill()
      await waitUntilStopped()
      console.log('Removing temporary directory')
      await rimraf(tempDir)
    },
  }
}
