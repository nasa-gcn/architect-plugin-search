@app
project

@http
get /

@search
sandboxEngine opensearch

@plugins
nasa-gcn/architect-plugin-search
  src ../../index.js
