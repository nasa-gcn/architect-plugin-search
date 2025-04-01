/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn, untilTerminated } from './processes.js'
import { type SearchEngineLauncherFunction } from './run.js'

export const launchBinary: SearchEngineLauncherFunction<{
  bin: string
}> = async ({ bin, dataDir, logsDir, options }) => {
  const args = [...options, `path.data=${dataDir}`, `path.logs=${logsDir}`].map(
    (opt) => `-E${opt}`
  )

  console.log('Spawning', bin, ...args)
  const child = await spawn(bin, args, {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: true,
  })

  async function kill() {
    console.log('Killing child process')
    child.kill('SIGKILL')
  }

  const signals = ['message', 'SIGTERM', 'SIGINT']
  signals.forEach((signal) => {
    process.on(signal, async () => {
      await kill()
    })
  })

  return {
    kill,
    async waitUntilStopped() {
      await untilTerminated(child)
    },
  }
}
