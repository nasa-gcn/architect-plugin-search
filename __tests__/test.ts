import assert from 'node:assert'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ExecaError, execa } from 'execa'
import { sleep } from '@nasa-gcn/architect-plugin-utils'
import { launchDockerSubprocess } from '../docker.js'

async function fetchRetry(
  ...props: Parameters<typeof fetch>
): ReturnType<typeof fetch> {
  let response
  try {
    response = await fetch(...props)
  } catch (e) {
    console.error(e)
    if (!(e instanceof TypeError)) throw e
  }

  if (response?.ok) {
    return response
  } else {
    await sleep(1000)
    return await fetchRetry(...props)
  }
}

describe('launchDockerSubprocess', () => {
  test('exits when killed programmatically', async () => {
    const port = 9200
    const url = `http://localhost:${port}/`
    const { kill, waitUntilStopped } = launchDockerSubprocess({
      Image: 'httpd',
      HostConfig: {
        PortBindings: {
          '80/tcp': [{ HostIP: '127.0.0.1', HostPort: `${port}` }],
        },
      },
    })
    await fetchRetry(url)
    await kill()
    await waitUntilStopped()
    await assert.rejects(fetch(url), TypeError)
  })
})

const signals = ['SIGTERM'] as const
const engines = ['elasticsearch']

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
          stderr: 'inherit',
          stdout: ['inherit', 'pipe'],
        })

        return new Promise<void>((resolve) => {
          process?.stdout?.on('data', (chunk) => {
            if (chunk.includes('Ran Sandbox startup plugin in')) {
              console.log('***Sandbox is READY')
              resolve()
            }
          })
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
            await assert.rejects(
              fetch(`http://localhost:${port}/`),
              TypeError,
              `port ${port} must be closed`
            )
          }
        }
      })

      test('connection was alive', async () => {
        console.log("fetchRetry('http://localhost:3333/')")
        const response = await fetchRetry('http://localhost:3333/')
        const result = await response.json()
        assert.deepStrictEqual(result?.meta.connection.status, 'alive')
      })
    })
  })
)
