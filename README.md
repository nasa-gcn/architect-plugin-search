[![npm](https://img.shields.io/npm/v/@nasa-gcn/architect-plugin-search)](https://www.npmjs.com/package/@nasa-gcn/architect-plugin-search)

# Architect plugin for OpenSearch / ElasticSearch

This is a [plugin](https://arc.codes/docs/en/guides/plugins/overview) for [Architect](https://arc.codes/) that provisions managed [Amazon OpenSearch](https://aws.amazon.com/opensearch-service/) for the application.

When you are using Architect's [sandbox](https://arc.codes/docs/en/reference/cli/sandbox) mode, the plugin [downloads and runs Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html#elasticsearch-install-packages) or [OpenSearch](https://opensearch.org/downloads.html#opensearch) locally. If search engine binaries are not available for your platform, then the plugin falls back to trying to launch them in a container using [Docker](https://www.docker.com).

Pair this pacakge with [@nasa-gcn/architect-functions-search](https://github.com/nasa-gcn/architect-functions-search) to connect to the service from your Node.js Lambda function code.

## Usage

1.  Install this package using npm:

        npm i -D @nasa-gcn/architect-plugin-search

2.  Add the following to your project's `app.arc` configuration file:

        @plugins
        nasa-gcn/architect-plugin-search

3.  Amazon offers two flavors of managed OpenSearch: OpenSearch Service and OpenSearch Serverless. By default, this plugin will provision OpenSearch Serverless. If you want to use OpenSearch Service instead, then add a `@search` section to your `app.arc` file:

        @search
        # Enable automatic software updates (disabled by default).
        autoSoftwareUpdateEnabled true
        # See https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html for supported instance types
        instanceType t3.small.search
        instanceCount 2
        availabilityZoneCount 2
        # dedicatedMasterCount is optional; if zero or undefined, dedicated
        # master nodes are disabled.
        dedicatedMasterCount 3
        dedicatedMasterType t3.small.search
        # Enable off-peak window for software updates (disabled by default).
        offPeakWindowEnabled true
        # Use OpenSearch in sandbox mode; default is Elasticsearch.
        sandboxEngine opensearch

4.  Optionally, create a file called `sandbox-search.json` or `sandbox-search.js` in your project and populate it with sample data to be passed to [`client.bulk()`](https://github.com/opensearch-project/opensearch-js/blob/main/guides/bulk.md). Here are some examples.

    ## sandbox-search.json

        [
            {"index": {"_index": "movies", "_id": 1}},
            {"title": "The Hunt for the Red October"},
            {"index": {"_index": "movies", "_id": 2}},
            {"title": "Star Trek II: The Wrath of Khan"}
        ]

    ## sandbox-search.js (constant data)

        module.exports = [
            {"index": {"_index": "movies", "_id": 1}},
            {"title": "The Hunt for the Red October"},
            {"index": {"_index": "movies", "_id": 2}},
            {"title": "Star Trek II: The Wrath of Khan"}
        ]

    ## sandbox-search.js (function or async function)

        module.exports = function() {
            return [
                {"index": {"_index": "movies", "_id": 1}},
                {"title": "The Hunt for the Red October"},
                {"index": {"_index": "movies", "_id": 2}},
                {"title": "Star Trek II: The Wrath of Khan"}
            ]
        }

## Connecting to OpenSearch from your application

In your Architect application, use the [@nasa-gcn/architect-functions-search](https://github.com/nasa-gcn/architect-functions-search) package to connect to your OpenSearch instance. To install the package, run:

```
npm i @nasa-gcn/architect-functions-search
```

Then add the following JavaScript code to your application:

```ts
import { search } from '@nasa-gcn/architect-functions-search'

const client = await search()
```

Now `client` is an instance of the [OpenSearch JavaScript client](https://opensearch.org/docs/latest/clients/javascript/index/), and you can call any client method on it — for example, [`client.index.create()`](https://opensearch.org/docs/latest/clients/javascript/index/#creating-an-index), [`client.index()`](https://opensearch.org/docs/latest/clients/javascript/index/#indexing-a-document), or [`client.search()`](https://opensearch.org/docs/latest/clients/javascript/index/#searching-for-documents).

## Making post-deployment requests to OpenSearch or ElasticSearch from your application

If you would like to make post-deployment REST API calls to your OpenSearch or ElasticSearch instance, you may optionally add a postdeploy-search.js file in the root directory of your Architect project. This file should by default export a function that takes a configured OpenSearch client instance as its only argument. The function will be called post-deployment in production mode and at the start of sandbox mode.

Here's an sample postdeploy-search.js file for making requests to OpenSearch:

```ts
export default async function (client) {
  await client.transport.request({
    method: 'PUT',
    path: '/_cluster/settings',
    body: {
      persistent: {
        cluster.max_shards_per_node: '500',
      },
    },
  })
}
```

## Advanced usage from your application

If you would like to manually connect to OpenSearch from your application, then you will need to sign your requests using [AWS SIG4](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html); the OpenSearch client library provides the [`AwsSigv4Signer`](https://opensearch.org/docs/latest/clients/javascript/index/#authenticating-with-amazon-opensearch-service--aws-sigv4) helper to automate this.

You can read the API endpoint information using [Architect service discovery](<https://arc.codes/docs/en/reference/runtime-helpers/node.js#arc.services()>):

```ts
import * as arc from '@architect/functions'

const services = await arc.services()
const searchConfig = services.nasa_gcn - architect_plugin_search
```

The `searchConfig` object has the following two properties:

- `searchConfig.node`: the URL of the API endpoint.
- `searchConfig.sig4service`: the value to pass for the `service` property in the `AwsSigv4Signer` constructor.

See https://github.com/nasa-gcn/architect-functions-search/blob/main/index.ts for example code.
