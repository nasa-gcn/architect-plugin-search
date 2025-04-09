/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { access, mkdir } from 'node:fs/promises'
import envPaths from 'env-paths'
import type { PathLike } from 'node:fs'

export const { cache, temp } = envPaths('@nasa-gcn/architect-plugin-search')

export async function mkdirP(path: PathLike) {
  await mkdir(path, { recursive: true })
}

export async function exists(path: PathLike) {
  try {
    await access(path)
  } catch {
    return false
  }
  return true
}
