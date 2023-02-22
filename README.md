# Architect plugin for OpenSearch / ElasticSearch

This is a [plugin](https://arc.codes/docs/en/guides/plugins/overview) for [Architect](https://arc.codes/) that installs an [Amazon OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html) collection for the application.

When you are using Architect's [sandbox](https://arc.codes/docs/en/reference/cli/sandbox) mode, the plugin [downloads and runs Elasticsearch locally](https://www.elastic.co/guide/en/elasticsearch/reference/current/run-elasticsearch-locally.html).

Pair this pacakge with [@nasa-gcn/architect-functions-search](https://github.com/nasa-gcn/architect-functions-search) to connect to the service from your Node.js Lambda function code.
