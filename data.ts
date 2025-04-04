/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Client } from '@opensearch-project/opensearch'
import type { ClientOptions } from '@opensearch-project/opensearch'
import { exists } from './paths.js'
import chunk from 'lodash/chunk.js'
import { update } from './updater.js'

const jsonFilename = 'sandbox-search.json'
const jsFilename = 'sandbox-search.js'

async function getData(path: string): Promise<object[]> {
  let result
  const jsonPath = join(path, jsonFilename)
  const jsPath = join(path, jsFilename)

  if (await exists(jsonPath)) {
    update.update(`Loading search records from ${jsonPath}`)
    result = JSON.parse(await readFile(jsonPath, { encoding: 'utf-8' }))
  } else if (await exists(jsPath)) {
    update.update(`Loading search records from ${jsPath}`)
    result = (await import(pathToFileURL(jsPath).toString())).default
    if (typeof result === 'function') {
      result = result()
    }
    if (result instanceof Promise) {
      result = await result
    }
  }
  if (result) {
    update.update(`Loaded ${result.length} search records`)
  }
  return result
}

export async function populate(path: string, opts: ClientOptions) {
  const data = await getData(path)
  if (data) {
    const client = new Client(opts)
    const batch_size = 10
    const batches = chunk(data, batch_size)
    for (const batch of batches) {
      await client.bulk({ body: batch })
    }
  }
}
