import assert from 'node:assert'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ExecaError, execa } from 'execa'
import { fetchRetry, sleep } from '@nasa-gcn/architect-plugin-utils'

const engines = ['elasticsearch', 'opensearch']

engines.forEach((engine) =>
  describe(`${engine} stops on Ctrl-C`, () => {
    let process: ReturnType<typeof execa> | undefined

    beforeEach(async () => {
      // FIXME: replace with import.meta.resolve once it is stable in Node.js
      const cwd = join(dirname(fileURLToPath(import.meta.url)), engine)

      process = execa('arc', ['sandbox'], {
        cwd,
        preferLocal: true,
        forceKillAfterDelay: false,
        stdin: 'pipe',
        stderr: 'inherit',
        stdout: ['inherit', 'pipe'],
      })

      return new Promise<void>((resolve) => {
        process?.stdout?.on('data', (chunk) => {
          if (chunk.includes('Ran Sandbox startup plugin in')) resolve()
        })
      })
    })

    afterEach(async () => {
      if (process) {
        // Type Ctrl-C into Architect's stdin
        process.stdin?.write('\u0003')
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
          await assert.rejects(
            fetch(`http://localhost:${port}/`),
            TypeError,
            `port ${port} must be closed`
          )
        }
      }
    })

    test('connection was alive', async () => {
      const response = await fetchRetry('http://localhost:3333/')
      const result = await response.json()
      assert.deepStrictEqual(result?.meta.connection.status, 'alive')
    })
  })
)
