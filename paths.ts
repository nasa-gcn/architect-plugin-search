/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { access, mkdir } from 'fs/promises'
import envPaths from 'env-paths'
import { name } from './package.json'
import type { PathLike } from 'fs'

export const { cache, temp } = envPaths(name)

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
