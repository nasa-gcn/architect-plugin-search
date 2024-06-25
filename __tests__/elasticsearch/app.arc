@app
project

@http
get /

@search
sandboxEngine elasticsearch

@plugins
nasa-gcn/architect-plugin-search
  src ../../index.js
