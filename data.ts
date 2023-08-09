/*!
 * Copyright © 2022 United States Government as represented by the Administrator
 * of the National Aeronautics and Space Administration. No copyright is claimed
 * in the United States under Title 17, U.S. Code. All Other Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { Client } from '@opensearch-project/opensearch'
import type { ClientOptions } from '@opensearch-project/opensearch'
import { exists } from './paths'

const jsonFilename = 'sandbox-search.json'
const jsFilename = 'sandbox-search.js'

async function getData(path: string) {
  let result
  const jsonPath = join(path, jsonFilename)
  const jsPath = join(path, jsFilename)

  if (await exists(jsonPath)) {
    console.log(`Loading search records from ${jsonPath}`)
    result = JSON.parse(await readFile(jsonPath, { encoding: 'utf-8' }))
  } else if (await exists(jsPath)) {
    console.log(`Loading search records from ${jsPath}`)
    result = (await import(pathToFileURL(jsPath).toString())).default
    if (typeof result === 'function') {
      result = result()
    }
    if (result instanceof Promise) {
      result = await result
    }
  }
  if (result) {
    console.log(`Loaded ${result.length} search records`)
  }
  return result
}

export async function populate(path: string, opts: ClientOptions) {
  const data = await getData(path)
  if (data) {
    const client = new Client(opts)
    await client.bulk({ body: data })
  }
}
