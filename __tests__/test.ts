import assert from 'node:assert'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ExecaError, execa } from 'execa'
import { sleep } from '@nasa-gcn/architect-plugin-utils'
import { launchDockerSubprocess } from '../docker.js'
import { type Writable } from 'node:stream'

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
let stdin: Writable | null

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
          stdin: 'pipe',
          stderr: 'inherit',
          stdout: ['inherit', 'pipe'],
        })
        stdin = process.stdin

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
          // console.log('assert.ok(process.kill(signal))')
          // assert.ok(process.kill(signal))
          assert.ok('stdin.write')
          stdin?.write('\u0003')
          // Make sure arc sandbox is dead
          console.log('await process')
          try {
            await process
          } catch (e) {
            if (!(e instanceof ExecaError)) throw e
          }
          // Give subprocesses some time to die
          console.log('await sleep(1000)')
          await sleep(1000)

          // Make sure that arc sandbox and opensearch/elasticseasrch are both
          // down and not responding to HTTP requests any more
          for (const port of [3333, 9200]) {
            console.log('port', port)
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
        console.log('response.json()')
        const result = await response.json()
        console.log('assert.deepStrictEqual')
        assert.deepStrictEqual(result?.meta.connection.status, 'alive')
      })
    })
  })
)
