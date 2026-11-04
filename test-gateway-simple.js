
import { GatewayServer } from '../../packages/gateway/dist/index.js';

async function test() {
  const server = new GatewayServer({ port: 12346, baseDir: 'test', runJobs: false });
  console.log('Server created');
  await server.listen();
  console.log('Server listening on', server.boundPort);
  await server.close();
  console.log('Server closed');
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
