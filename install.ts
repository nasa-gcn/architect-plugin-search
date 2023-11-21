/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'os'
import { pipeline } from 'stream/promises'
import { join } from 'path'
import fetch from 'make-fetch-happen'
import { Extract as unzip } from 'unzip-stream'
import { x as untar } from 'tar'
import { cache, exists, mkdirP } from './paths.js'
import { writeFile } from 'fs/promises'

const version = '2.11.0'

const types = new Map([
  ['Linux', ['linux', 'tar.gz']],
  ['Windows_NT', ['windows', 'zip']],
])

const archs = ['x64', 'arm64']

function getFilename() {
  const os_type = os.type()
  const os_arch = os.arch()

  const typeInfo = types.get(os_type)

  if (
    !typeInfo ||
    !archs.includes(os_arch) ||
    (os_type === 'Windows_NT' && os_arch === 'arm64')
  ) {
    throw new Error(
      `No OpenSearch binary is available for your OS type (${os_type}) and architecture (${os_arch}). For supported operating systems, see https://opensearch.org/versions/opensearch-2-11-0.html.`
    )
  }

  const [type, ext] = typeInfo
  return { name: `opensearch-${version}-${type}-${os_arch}`, ext }
}

async function download(url: string) {
  console.log('Downloading', url, 'to', cache)
  await mkdirP(cache)
  const { body } = await fetch(url, { cachePath: cache })
  return body
}

export async function install() {
  const { name, ext } = getFilename()
  const extractPath = join(cache, name)
  const binExt = os.type() === 'Windows_NT' ? '.bat' : ''
  const binPath = join(
    extractPath,
    `opensearch-${version}`,
    'bin',
    `opensearch${binExt}`
  )

  const binPathExists = await exists(binPath)

  if (!binPathExists) {
    const url = `https://artifacts.opensearch.org/releases/bundle/opensearch/${version}/${name}.${ext}`
    const stream = await download(url)

    let extract
    if (url.endsWith('.tar.gz')) {
      extract = untar({ cwd: extractPath })
    } else if (url.endsWith('.zip')) {
      extract = unzip({ path: extractPath })
    } else {
      throw new Error('unknown archive type')
    }

    console.log('Extracting to', extractPath)
    await mkdirP(extractPath)
    await pipeline(stream, extract)
  }
  return binPath
}
