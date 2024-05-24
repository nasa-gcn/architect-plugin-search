import Dockerode from "dockerode";

const dataDir = process.argv[2]
const logsDir = process.argv[3]
const engine = process.argv[4]
const port = process.argv[5]
const options = process.argv[6]

async function launchDocker(){
  const Image =
    engine === 'elasticsearch'
      ? 'elastic/elasticsearch:8.6.2'
      : 'opensearchproject/opensearch:2.11.0'
  console.log("Launching Docker container", Image);
  const docker = new Dockerode();
  const container = await docker.createContainer({
    Env: [...options, "path.data=/var/lib/search", "path.logs=/var/log/search"],
    HostConfig: {
      AutoRemove: true,
      Mounts: [
        { Source: dataDir, Target: "/var/lib/search", Type: "bind" },
        { Source: logsDir, Target: "/var/log/search", Type: "bind" }
      ],
      PortBindings: {
        [`${port}/tcp`]: [{ HostIP: "127.0.0.1", HostPort: `${port}` }]
      }
    },
    Image
  });

  const stream = await container.attach({ stream: true, stderr: true });
  stream.pipe(process.stderr);
  await container.start();
  return container
}

const container = launchDocker()

process.on('message', async (m) => {
  if (m.action === 'wait'){
    await container.wait()
  } else {
    await container.kill()
  }
});

process.on("SIGTERM", async ()=>{
  console.log("terminating docker instance...")
  await container.kill()
  process.exit(0)
})

process.on("SIGINT", async ()=>{
  console.log("terminating docker instance...")
  await container.kill()
  process.exit(0)
})
