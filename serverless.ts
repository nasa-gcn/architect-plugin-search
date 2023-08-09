/*!
 * Copyright © 2022 United States Government as represented by the Administrator
 * of the National Aeronautics and Space Administration. No copyright is claimed
 * in the United States under Title 17, U.S. Code. All Other Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export function cloudformationResources(collectionName: string) {
  return {
    OpenSearchServerlessCollection: {
      Type: 'AWS::OpenSearchServerless::Collection',
      DependsOn: [
        'OpenSearchServerlessSecurityPolicyEncryption',
        'OpenSearchServerlessSecurityPolicyNetwork',
        'OpenSearchServerlessAccessPolicy',
      ],
      Properties: {
        Name: collectionName,
        Type: 'SEARCH',
      },
    },
    OpenSearchServerlessSecurityPolicyEncryption: {
      Type: 'AWS::OpenSearchServerless::SecurityPolicy',
      Properties: {
        Type: 'encryption',
        Name: collectionName,
        Policy: JSON.stringify({
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${collectionName}`],
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
        Name: collectionName,
        Policy: JSON.stringify([
          {
            Rules: [
              {
                ResourceType: 'collection',
                Resource: [`collection/${collectionName}`],
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
        Name: collectionName,
        Policy: {
          'Fn::Sub': [
            JSON.stringify([
              {
                Rules: [
                  {
                    ResourceType: 'collection',
                    Resource: [`collection/${collectionName}`],
                    Permission: ['aoss:*'],
                  },
                  {
                    ResourceType: 'index',
                    Resource: [`index/${collectionName}/*`],
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
  }
}

export const services = {
  node: {
    'Fn::GetAtt': 'OpenSearchServerlessCollection.CollectionEndpoint',
  },
  sig4service: 'aoss',
}
