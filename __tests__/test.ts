import assert from 'node:assert'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ExecaError, execa } from 'execa'
import { sleep } from '@nasa-gcn/architect-plugin-utils'

async function fetchRetry(
  ...props: Parameters<typeof fetch>
): ReturnType<typeof fetch> {
  let response
  try {
    response = await fetch(...props)
  } catch (e) {
    if (!(e instanceof TypeError)) throw e
  }

  if (response?.ok) {
    return response
  } else {
    await sleep(1000)
    return await fetchRetry(...props)
  }
}

const signals = ['SIGTERM'] as const
const engines = ['elasticsearch', 'opensearch']

engines.forEach((engine) =>
  signals.forEach((signal) => {
    describe(`${engine} stops when sent signal ${signal}`, () => {
      let process: ReturnType<typeof execa> | undefined

      beforeEach(async () => {
        // FIXME: replace with import.meta.resolve once it is stable in Node.js
        const cwd = join(dirname(fileURLToPath(import.meta.url)), engine)

        process = execa('arc', ['sandbox'], {
          cwd,
          preferLocal: true,
          forceKillAfterDelay: false,
          stdio: 'inherit',
        })
      })

      afterEach(async () => {
        if (process) {
          assert.ok(process.kill(signal))
          // Make sure arc sandbox is dead
          try {
            await process
          } catch (e) {
            if (!(e instanceof ExecaError)) throw e
          }
          // Give subprocesses some time to die
          await sleep(1000)

          // Make sure that arc sandbox and opensearch/elasticseasrch are both
          // down and not responding to HTTP requests any more
          for (const port of [3333, 9200]) {
            assert.rejects(fetch(`http://localhost:${port}/`), TypeError)
          }
        }
      })

      test('connection was alive', async () => {
        const response = await fetchRetry('http://localhost:3333/')
        const result = await response.json()
        assert.deepStrictEqual(result?.meta.connection.status, 'alive')
      })
    })
  })
)
