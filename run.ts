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
import type { ChildProcess } from 'child_process'
import {
  spawn,
  untilTerminated,
  untilTerminatedUnexpectedly,
} from './processes.js'
import { pipeline } from 'stream/promises'
import { createReadStream } from 'fs'
import type { SandboxEngine } from './engines.js'

export class LocalSearch {
  private readonly child!: ChildProcess
  private readonly tempDir!: string
  readonly port!: number
  readonly url!: string

  private constructor(props: {
    child: ChildProcess
    tempDir: string
    port: number
    url: string
  }) {
    return Object.assign(this, props)
  }

  static async launch({
    port,
    engine,
  }: {
    port?: number
    engine: SandboxEngine
  }) {
    port ??= 9200
    const url = `http://localhost:${port}`

    const bin = await install(engine)
    let child

    await mkdirP(temp)
    const tempDir = await mkdtemp(join(temp, 'run-'))
    try {
      const dataDir = join(tempDir, 'data')
      const logsDir = join(tempDir, 'logs')
      await Promise.all([dataDir, logsDir].map(mkdirP))

      let command
      let args = []
      const opts = [
        `http.port=${port}`,
        'discovery.type=single-node',
        engine === 'elasticsearch'
          ? 'xpack.security.enabled=false'
          : 'plugins.security.disabled=true',
      ]

      if (bin) {
        command = bin
        opts.push(`path.data=${dataDir}`, `path.logs=${logsDir}`)
        args = opts.map((opt) => `-E${opt}`)
      } else {
        command = 'docker'
        opts.push('path.data=/docker.data', 'path.logs=/docker.logs')
        args = [
          'run',
          '--rm',
          '-i',
          '-p',
          `${port}:${port}`,
          '-v',
          `${dataDir}:/docker.data`,
          '-v',
          `${logsDir}:/docker.logs`,
          ...opts.flatMap((opt) => ['-e', opt]),
          engine === 'elasticsearch'
            ? 'elastic/elasticsearch:8.6.2'
            : 'opensearchproject/opensearch:2.11.0',
        ]
      }

      console.log('Spawning', command, ...args)
      child = await spawn(command, args, {
        stdio: ['ignore', 'ignore', 'inherit'],
      })

      try {
        await Promise.race([
          waitPort({ port, protocol: 'http' }),
          untilTerminatedUnexpectedly(child),
        ])
      } catch (e) {
        await pipeline(
          createReadStream(join(logsDir, 'opensearch.log')),
          process.stderr
        )
        throw e
      }
      console.log(`${engine} is ready at`, url)
    } catch (e) {
      await rimraf(tempDir)
      throw e
    }

    return new this({ child, tempDir, port, url })
  }

  async stop() {
    console.log('Stopping child process')
    this.child.kill()
    await untilTerminated(this.child)
    console.log('Removing temporary directory')
    await rimraf(this.tempDir)
  }
}

export async function launch(...args: Parameters<typeof LocalSearch.launch>) {
  return await LocalSearch.launch(...args)
}
