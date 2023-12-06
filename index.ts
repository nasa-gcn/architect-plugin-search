/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { launch } from './run.js'
import { populate } from './data.js'
import {
  cloudformationResources as serverlessCloudformationResources,
  services as serverlessServices,
} from './serverless.js'
import {
  cloudformationResources as serviceCloudformationResources,
  services as serviceServices,
} from './service.js'

/**
 * Convert a string to a suitable name for an OpenSearch Serverless collection.
 *
 * See valid name criteria at
 * https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-manage.html#serverless-create
 */
function toCollectionName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .padEnd(3, '-')
    .slice(0, 32)
}

function getConfig(arc: {
  search?: string[][]
}): Record<string, string | undefined> {
  if (arc.search) return Object.fromEntries(arc.search)
  else return {}
}

export const deploy = {
  // @ts-expect-error: The Architect plugins API has no type definitions.
  start({ cloudformation, inventory, arc, stage }) {
    let resources
    const config = getConfig(arc)
    if (config.availabilityZoneCount) {
      resources = serviceCloudformationResources(config)
    } else {
      const { app } = inventory.inv
      const collectionName = toCollectionName(`${app}-${stage}`)
      resources = serverlessCloudformationResources(collectionName)
    }
    Object.assign(cloudformation.Resources, resources)
    return cloudformation
  },
  // @ts-expect-error: The Architect plugins API has no type definitions.
  services({ stage, arc }) {
    if (stage !== 'production') {
      return { node: 'http://localhost:9200' }
    } else if (arc.search) {
      return serviceServices
    } else {
      return serverlessServices
    }
  },
}

let local: Awaited<ReturnType<typeof launch>>

function getEngine(name?: string) {
  if (name?.toLowerCase() === 'opensearch') return 'opensearch'
  else return 'elasticsearch'
}

export const sandbox = {
  async start({
    // @ts-expect-error: The Architect plugins API has no type definitions.
    arc,
    inventory: {
      inv: {
        // @ts-expect-error: The Architect plugins API has no type definitions.
        _project: { cwd },
      },
    },
  }) {
    const engine = getEngine(getConfig(arc).sandboxEngine)
    local = await launch({ engine })
    await populate(cwd, { node: local.url })
  },
  async end() {
    await local.stop()
  },
}
