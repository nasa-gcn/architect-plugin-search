/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import treeKill from 'tree-kill'
import { spawn, untilTerminated } from './processes.js'
import { type SearchEngineLauncherFunction } from './run.js'
import omit from 'lodash/omit.js'
import { update } from './updater.js'

export const launchBinary: SearchEngineLauncherFunction<{
  bin: string
}> = async ({ bin, dataDir, logsDir, options }) => {
  const args = [...options, `path.data=${dataDir}`, `path.logs=${logsDir}`].map(
    (opt) => `-E${opt}`
  )

  update.status('Spawning', bin, ...args)
  const child = await spawn(bin, args, {
    stdio: ['ignore', 'ignore', 'inherit'],
    // On Windows, the program must be launched in a shell because it is a .bat file. See
    // https://nodejs.org/docs/latest/api/child_process.html#spawning-bat-and-cmd-files-on-windows
    shell: process.platform === 'win32',
    // Use bundled JVM, not system JVM, in case system JVM is too old
    env: omit(process.env, ['JAVA_HOME']),
  })

  async function kill() {
    update.update('Killing child process')
    if (child.pid) treeKill(child.pid)
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
