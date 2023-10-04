/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export function cloudformationResources({
  availabilityZoneCount,
  dedicatedMasterCount,
  dedicatedMasterType,
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

  const DedicatedMasterCount =
    (dedicatedMasterCount && parseInt(dedicatedMasterCount)) || undefined
  const DedicatedMasterEnabled = Boolean(DedicatedMasterCount)
  const DedicatedMasterType = dedicatedMasterType
  if (DedicatedMasterEnabled && !DedicatedMasterType) {
    throw new Error(
      'dedicatedMasterType must be defined because dedicateMasterCount > 0'
    )
  }

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
          DedicatedMasterCount,
          DedicatedMasterEnabled,
          DedicatedMasterType,
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
