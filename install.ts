/*!
 * Copyright © 2022 United States Government as represented by the Administrator
 * of the National Aeronautics and Space Administration. No copyright is claimed
 * in the United States under Title 17, U.S. Code. All Other Rights Reserved.
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

const version = '8.6.2'

const types = new Map([
  ['Linux', ['linux', 'tar.gz']],
  ['Darwin', ['darwin', 'tar.gz']],
  ['Windows_NT', ['windows', 'zip']],
])

const archs = new Map([
  ['x64', 'x86_64'],
  ['arm64', 'aarch64'],
])

function getFilename() {
  const os_type = os.type()
  const os_arch = os.arch()

  const typeInfo = types.get(os_type)
  const arch = archs.get(os_arch)

  if (!typeInfo || !arch) {
    throw new Error(
      `No ElasticSearch binary is available for your OS type (${os_type}) and architecture (${os_arch}). For supported operating systems, see https://www.elastic.co/downloads/elasticsearch.`
    )
  }

  const [type, ext] = typeInfo
  return { name: `elasticsearch-${version}-${type}-${arch}`, ext }
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
    `elasticsearch-${version}`,
    'bin',
    `elasticsearch${binExt}`
  )
  const binPathExists = await exists(binPath)

  if (!binPathExists) {
    const url = `https://artifacts.elastic.co/downloads/elasticsearch/${name}.${ext}`
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
