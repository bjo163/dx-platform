
import { GatewayServer } from '../../packages/gateway/dist/index.js';

async function test() {
  const server = new GatewayServer({ port: 12345, baseDir: 'test', runJobs: false });
  console.log('Server created');
  console.log('Server listening?', server.server.listening);
  
  try {
    await server.listen();
    console.log('Server listening on', server.boundPort);
    console.log('Server listening?', server.server.listening);
    
    await server.close();
    console.log('Server closed');
  } catch (err) {
    console.error('Error:', err);
  }
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
