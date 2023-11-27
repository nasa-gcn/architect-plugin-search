/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export type SandboxEngine = 'elasticsearch' | 'opensearch'

export const manifest = [
  {
    engine: 'elasticsearch',
    type: 'Linux',
    arch: 'x64',
    url: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.6.2-linux-x86_64.tar.gz',
  },
  {
    engine: 'elasticsearch',
    type: 'Linux',
    arch: 'arm64',
    url: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.6.2-linux-aarch64.tar.gz',
  },
  {
    engine: 'elasticsearch',
    type: 'Darwin',
    arch: 'x64',
    url: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.6.2-darwin-x86_64.tar.gz',
  },
  {
    engine: 'elasticsearch',
    type: 'Darwin',
    arch: 'arm64',
    url: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.6.2-darwin-aarch64.tar.gz',
  },
  {
    engine: 'elasticsearch',
    type: 'Windows_NT',
    arch: 'x64',
    url: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.6.2-windows-x86_64.zip',
  },
  {
    engine: 'opensearch',
    type: 'Linux',
    arch: 'x64',
    url: 'https://artifacts.opensearch.org/releases/bundle/opensearch/2.11.0/opensearch-2.11.0-linux-x64.tar.gz',
  },
  {
    engine: 'opensearch',
    type: 'Linux',
    arch: 'arm64',
    url: 'https://artifacts.opensearch.org/releases/bundle/opensearch/2.11.0/opensearch-2.11.0-linux-arm64.tar.gz',
  },
  {
    engine: 'opensearch',
    type: 'Windows_NT',
    arch: 'x64',
    url: 'https://artifacts.opensearch.org/releases/bundle/opensearch/2.11.0/opensearch-2.11.0-windows-x64.zip',
  },
]
