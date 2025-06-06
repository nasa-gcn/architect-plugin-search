/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'node:path'
import waitPort from 'wait-port'
import { install } from './install.js'
import { mkdtemp } from 'node:fs/promises'
import { mkdirP, temp } from './paths.js'
import rimraf from 'rimraf'
import type { SandboxEngine } from './engines.js'
import { neverResolve } from '@nasa-gcn/architect-plugin-utils'
import { launchBinary } from './runBinary.js'
import { launchDocker } from './runDocker.js'
import { update } from './updater.js'

export type SearchEngineLauncherFunction<T = object> = (
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
  const untilStopped = waitUntilStopped()

  update.update(`Waiting for localhost:${port}`)
  try {
    await Promise.race([
      waitPort({ port, protocol: 'http', output: 'silent' }),
      neverResolve(untilStopped),
    ])
  } catch (e) {
    update.err('Search engine terminated unexpectedly')
    throw e
  }

  return {
    url,
    port,
    async stop() {
      await kill()
      await untilStopped
      update.update('Removing temporary directory')
      await rimraf(tempDir)
    },
  }
}
