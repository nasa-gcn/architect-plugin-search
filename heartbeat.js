import { exec } from 'child_process';

const pidInput = process.argv[2];
const containerName = process.argv[3]
let healthy = true
let currentIntervalId

function checkProcessStatus(pid) {
  return new Promise((resolve) => {
    exec(`ps -p ${pid}`, (error, stdout) => {
      if (error) {
        resolve({ pid, running: false });
      } else {
        const processRunning = stdout.includes(pid.toString());
        resolve({ pid, running: processRunning });
      }
    });
  });
}

async function monitorProcess(pid, container) {
  try {
    const status = await checkProcessStatus(pid);
    if (!status.running){
      exec(`docker stop ${container}`)
      healthy = false
      process.exit(0)
    }
  } catch (error) {
    console.error('Error checking process status:', error);
  }
}

currentIntervalId = setInterval(() => {
  monitorProcess(parseInt(pidInput), containerName);
}, 10000); // ping every 10 seconds
process.stdout.write('\u0007')

if (!healthy){
  clearInterval(currentIntervalId);
}