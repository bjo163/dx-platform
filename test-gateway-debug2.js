
import { GatewayServer } from '../../packages/gateway/dist/index.js';

async function test() {
  const server = new GatewayServer({ port: 12345, baseDir: 'test', runJobs: false });
  console.log('Server created');
  
  // Test listen with timeout
  const listenPromise = server.listen();
  const listenTimeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Listen timeout')), 5000);
  });
  
  try {
    await Promise.race([listenPromise, listenTimeout]);
    console.log('Server listening on', server.boundPort);
    
    // Test close with timeout
    const closePromise = server.close();
    const closeTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Close timeout')), 5000);
    });
    
    await Promise.race([closePromise, closeTimeout]);
    console.log('Server closed');
  } catch (err) {
    console.error('Error:', err);
  }
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
