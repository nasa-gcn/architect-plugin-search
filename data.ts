/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { access, constants, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Client } from '@opensearch-project/opensearch'
import type { ClientOptions } from '@opensearch-project/opensearch'
import { exists } from './paths.js'
import chunk from 'lodash/chunk.js'
import { update } from './updater.js'
import { RequestBody } from '@opensearch-project/opensearch/lib/Transport.js'
import { search } from '@nasa-gcn/architect-functions-search'

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

/**
 * Calls `client.indices.putIndexTemplate()` for each named template defined in
 * templateFile. If `opts` are omitted, gets the opensearch client from the
 * "@nasa-gcn/architect-functions-search" plugin.
 *
 * @param templateFile
 * @param opts
 * @returns
 */
export async function initializeIndices(
  templateFile: string,
  opts?: ClientOptions
) {
  try {
    await access(templateFile, constants.R_OK)
  } catch {
    update.err(`File "${templateFile}" found or not readable`)
    return
  }

  try {
    const data = JSON.parse(await readFile(templateFile, 'utf8'))
    const client = opts ? new Client(opts) : await search()
    const promises = data.index_templates.map(
      ({ name, index_template }: { name: string; index_template: unknown }) => {
        client.indices.putIndexTemplate({
          name,
          body: index_template as RequestBody,
        })
      }
    )
    await Promise.all(promises)
  } catch (error) {
    update.err(error)
  }
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
