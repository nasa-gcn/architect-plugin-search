/*!
 * Copyright © 2022 United States Government as represented by the Administrator
 * of the National Aeronautics and Space Administration. No copyright is claimed
 * in the United States under Title 17, U.S. Code. All Other Rights Reserved.
 *
 * SPDX-License-Identifier: NASA-1.3
 */

import { launch } from './run.js'
import type { LocalElasticSearch } from './run.js'

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

export const deploy = {
  // @ts-expect-error: The Architect plugins API has no type definitions.
  start({ cloudformation, inventory, stage }) {
    const { app } = inventory.inv
    const Name = toCollectionName(`${app}-${stage}`)

    Object.assign(cloudformation.Resources, {
      OpenSearchServerlessCollection: {
        Type: 'AWS::OpenSearchServerless::Collection',
        DependsOn: [
          'OpenSearchServerlessSecurityPolicyEncryption',
          'OpenSearchServerlessSecurityPolicyNetwork',
          'OpenSearchServerlessAccessPolicy',
        ],
        Properties: {
          Name,
          Type: 'SEARCH',
        },
      },
      OpenSearchServerlessSecurityPolicyEncryption: {
        Type: 'AWS::OpenSearchServerless::SecurityPolicy',
        Properties: {
          Type: 'encryption',
          Name,
          Policy: JSON.stringify({
            Rules: [
              {
                ResourceType: 'collection',
                Resource: [`collection/${Name}`],
              },
            ],
            AWSOwnedKey: true,
          }),
        },
      },
      OpenSearchServerlessSecurityPolicyNetwork: {
        Type: 'AWS::OpenSearchServerless::SecurityPolicy',
        Properties: {
          Type: 'network',
          Name,
          Policy: JSON.stringify([
            {
              Rules: [
                {
                  ResourceType: 'collection',
                  Resource: [`collection/${Name}`],
                },
              ],
              AllowFromPublic: true,
            },
          ]),
        },
      },
      OpenSearchServerlessAccessPolicy: {
        Type: 'AWS::OpenSearchServerless::AccessPolicy',
        Properties: {
          Type: 'data',
          Name,
          Policy: {
            'Fn::Sub': [
              JSON.stringify([
                {
                  Rules: [
                    {
                      ResourceType: 'collection',
                      Resource: [`collection/${Name}`],
                      Permission: ['aoss:*'],
                    },
                    {
                      ResourceType: 'index',
                      Resource: [`index/${Name}/*`],
                      Permission: ['aoss:*'],
                    },
                  ],
                  // eslint-disable-next-line no-template-curly-in-string
                  Principal: ['${Role}'],
                },
              ]),
              {
                Role: { 'Fn::GetAtt': 'Role.Arn' },
              },
            ],
          },
        },
      },
    })
    return cloudformation
  },
  // @ts-expect-error: The Architect plugins API has no type definitions.
  services({ stage }) {
    const node =
      stage === 'production'
        ? {
            'Fn::GetAtt': 'OpenSearchServerlessCollection.CollectionEndpoint',
          }
        : 'http://localhost:9200'
    return { node }
  },
}

let local: LocalElasticSearch

export const sandbox = {
  async start() {
    local = await launch({})
  },
  async end() {
    await local.stop()
  },
}
