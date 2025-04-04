/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'node:os'
import { pipeline } from 'node:stream/promises'
import { join, posix } from 'node:path'
import fetch from 'make-fetch-happen'
import { Extract as unzip } from 'unzip-stream'
import { x as untar } from 'tar'
import { cache, exists, mkdirP } from './paths.js'
import { SandboxEngine, manifest } from './engines.js'
import { update } from './updater.js'

async function download(url: string) {
  update.update('Downloading', url, 'to', cache)
  await mkdirP(cache)
  const { body } = await fetch(url, { cachePath: cache })
  return body
}

export async function install(engine: SandboxEngine) {
  const type = os.type()
  const arch = os.arch()
  const url = manifest.find(
    (entry) =>
      entry.engine === engine && entry.arch === arch && entry.type === type
  )?.url
  if (!url) {
    update.warn(
      `No ${engine} binary is available for your OS type (${type}) and architecture (${arch}).`
    )
    return
  }

  const archiveFilename = posix
    .basename(new URL(url).pathname)
    .replace(/(.tar.gz|.zip)$/, '')
  const extractPath = join(cache, archiveFilename)
  const binExt = type === 'Windows_NT' ? '.bat' : ''
  const binPath = join(
    extractPath,
    archiveFilename.split('-').slice(0, 2).join('-'),
    'bin',
    `${engine}${binExt}`
  )

  const binPathExists = await exists(binPath)

  if (!binPathExists) {
    const stream = await download(url)

    let extract
    if (url.endsWith('.tar.gz')) {
      extract = untar({ cwd: extractPath })
    } else if (url.endsWith('.zip')) {
      extract = unzip({ path: extractPath })
    } else {
      throw new Error('unknown archive type')
    }

    update.update('Extracting to', extractPath)
    await mkdirP(extractPath)
    await pipeline(stream, extract)
  }
  return binPath
}
