/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { exists } from './paths.js'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { launch } from './run.js'
import { populate } from './data.js'
import { search as getSearchClient } from '@nasa-gcn/architect-functions-search'
import {
  cloudformationResources as serverlessCloudformationResources,
  services as serverlessServices,
} from './serverless.js'
import {
  cloudformationResources as serviceCloudformationResources,
  services as serviceServices,
} from './service.js'
import { update } from './updater.js'
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation'

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

const searchApiFile = 'postdeploy-search.js'

interface RemoteProps {
  stackName: string
  region: string
  sig4service: string
}

async function executeSearchRequests(cwd: string, props?: RemoteProps) {
  //Load api call file and run all api calls to cluster
  const apiPath = join(cwd, searchApiFile)
  if (await exists(apiPath)) {
    update.update(`Found ${searchApiFile} file, running it...`)
    let result = (await import(pathToFileURL(apiPath).toString())).default
    let client
    if (props?.stackName) {
      try {
        const cloudFormationClient = new CloudFormationClient({
          region: props.region,
        })
        const node = (
          await cloudFormationClient.send(
            new DescribeStacksCommand({ StackName: props.stackName })
          )
        ).Stacks?.[0]?.Outputs?.find(
          (x) => x.OutputKey == 'OpenSearchDomainEndpoint'
        )?.OutputValue
        if (!node) throw Error('Node not found')
        client = await getSearchClient({ node, sig4Service: props.sig4service })
      } catch (error) {
        update.warn(error)
        return
      }
    } else {
      client = await getSearchClient()
    }

    // result should be a function that returns a promise
    if (typeof result === 'function') {
      result = result(client)
    }

    await result
  }
}

function addTransforms(
  cloudformation: { Transform?: string[] | string },
  ...transforms: string[]
) {
  if (cloudformation.Transform === undefined) {
    cloudformation.Transform = transforms
  } else if (typeof cloudformation.Transform === 'string') {
    cloudformation.Transform = [cloudformation.Transform, ...transforms]
  } else {
    cloudformation.Transform.push(...transforms)
  }
}

export const deploy = {
  // @ts-expect-error: The Architect plugins API has no type definitions.
  start({ cloudformation, inventory, arc, stage }) {
    let resources, openSearchClientConfig
    const config = getConfig(arc)
    if (config.availabilityZoneCount) {
      resources = serviceCloudformationResources(config)
      openSearchClientConfig = serviceServices
    } else {
      const { app } = inventory.inv
      const collectionName = toCollectionName(`${app}-${stage}`)
      resources = serverlessCloudformationResources(collectionName)
      openSearchClientConfig = serverlessServices
    }
    Object.assign(cloudformation.Resources, resources)
    cloudformation.Outputs.OpenSearchDomainEndpoint = {
      Value: openSearchClientConfig.node,
      Description:
        'Endpoint for performing operations on the Opensearch Domain',
    }

    addTransforms(cloudformation, 'AWS::LanguageExtensions')
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
  // @ts-expect-error: The Architect plugins API has no type definitions.
  async end({ stackName, inventory, arc }) {
    const config = getConfig(arc)
    executeSearchRequests(inventory.inv._project.cwd, {
      stackName,
      region: inventory.inv.aws.region,
      sig4service: config.search
        ? serviceServices.sig4service
        : serverlessServices.sig4service,
    })
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
    update.start('Launching OpenSearch/ElasticSearch')
    const engine = getEngine(getConfig(arc).sandboxEngine)
    local = await launch({ engine })
    await executeSearchRequests(cwd)
    await populate(cwd, { node: local.url })
    update.done('OpenSearch/ElasticSearch is ready')
  },

  async end() {
    await local.stop()
    update.done('OpenSearch/ElasticSearch is stopped')
  },
}
