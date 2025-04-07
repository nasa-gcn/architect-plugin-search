/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { launchDockerSubprocess } from '@nasa-gcn/architect-plugin-utils'
import { type SearchEngineLauncherFunction } from './run.js'

export const launchDocker: SearchEngineLauncherFunction = async ({
  dataDir,
  logsDir,
  engine,
  port,
  options,
}) =>
  launchDockerSubprocess({
    Env: [...options, 'path.data=/var/lib/search', 'path.logs=/var/log/search'],
    HostConfig: {
      AutoRemove: true,
      Mounts: [
        { Source: dataDir, Target: '/var/lib/search', Type: 'bind' },
        { Source: logsDir, Target: '/var/log/search', Type: 'bind' },
      ],
      PortBindings: {
        [`${port}/tcp`]: [{ HostIP: '127.0.0.1', HostPort: `${port}` }],
      },
    },
    Image:
      engine === 'elasticsearch'
        ? 'elastic/elasticsearch:8.6.2'
        : 'opensearchproject/opensearch:2.11.0',
  })
