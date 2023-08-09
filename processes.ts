/*!
 * Copyright © 2022 United States Government as represented by the Administrator
 * of the National Aeronautics and Space Administration. No copyright is claimed
 * in the United States under Title 17, U.S. Code. All Other Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn as node_spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

export async function spawn(...args: Parameters<typeof node_spawn>) {
  const child = node_spawn(...args)

  return new Promise<ReturnType<typeof node_spawn>>((resolve, reject) => {
    child
      .on('spawn', () => {
        resolve(child)
      })
      .on('error', reject)
  })
}

export async function untilTerminated(child: ChildProcess) {
  return new Promise<number | null>((resolve, reject) => {
    child.on('exit', resolve).on('error', reject)
  })
}

class UnexpectedTerminationError extends Error {
  readonly exitStatus: number | null

  constructor(exitStatus: number | null) {
    super('Child process terminated unexpectedly with exit status ${number}')
    this.exitStatus = exitStatus
  }
}

export async function untilTerminatedUnexpectedly(child: ChildProcess) {
  return new Promise<number | null>((_resolve, reject) => {
    child
      .on('exit', (exitStatus) =>
        reject(new UnexpectedTerminationError(exitStatus))
      )
      .on('error', reject)
  })
}
