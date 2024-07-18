/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn as node_spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'

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
