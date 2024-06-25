import { search } from '@nasa-gcn/architect-functions-search'
import { ConnectionError } from '@opensearch-project/opensearch/lib/errors.js'

export async function handler() {
  let statusCode = 200,
    result = {}

  const client = await search()
  try {
    result = await client.info()
  } catch (e) {
    if (e instanceof ConnectionError) {
      statusCode = 503
    } else {
      throw e
    }
  }

  return {
    statusCode,
    body: JSON.stringify(result),
    headers: {
      'cache-control':
        'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'application/json; charset=utf8',
    },
  }
}
