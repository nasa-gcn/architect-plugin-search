/*!
 * Copyright © 2022 United States Government as represented by the Administrator
 * of the National Aeronautics and Space Administration. No copyright is claimed
 * in the United States under Title 17, U.S. Code. All Other Rights Reserved.
 *
 * SPDX-License-Identifier: NASA-1.3
 */

export function cloudformationResources({
  availabilityZoneCount,
  instanceCount,
  instanceType,
  volumeSize,
}: Record<string, string | undefined>) {
  if (!availabilityZoneCount)
    throw new Error('availabilityZoneCount must be defined')
  if (!instanceCount) throw new Error('instanceCount must be defined')
  if (!instanceType) throw new Error('instanceType must be defined')
  if (!volumeSize) throw new Error('volumeSize must be defined')

  const AvailabilityZoneCount = parseInt(availabilityZoneCount)
  const InstanceCount = parseInt(instanceCount)
  const VolumeSize = parseInt(volumeSize)
  const ZoneAwarenessEnabled = AvailabilityZoneCount > 1

  return {
    OpenSearchServiceDomain: {
      Type: 'AWS::OpenSearchService::Domain',
      Properties: {
        AccessPolicies: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: 'es:ESHttp*',
              Resource: '*',
              Principal: { AWS: { 'Fn::GetAtt': 'Role.Arn' } },
            },
          ],
        },
        ClusterConfig: {
          InstanceType: instanceType,
          InstanceCount,
          ZoneAwarenessEnabled,
          ...(ZoneAwarenessEnabled && {
            ZoneAwarenessConfig: {
              AvailabilityZoneCount,
            },
          }),
        },
        DomainEndpointOptions: { EnforceHTTPS: true },
        EBSOptions: { EBSEnabled: true, VolumeSize },
        EncryptionAtRestOptions: { Enabled: true },
        NodeToNodeEncryptionOptions: { Enabled: true },
      },
    },
  }
}

export const services = {
  name: {
    Ref: 'OpenSearchServiceDomain',
  },
  node: {
    'Fn::Sub': [
      'https://${DomainEndpoint}',
      {
        DomainEndpoint: {
          'Fn::GetAtt': 'OpenSearchServiceDomain.DomainEndpoint',
        },
      },
    ],
  },
  sig4service: 'es',
}
