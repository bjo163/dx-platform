
import { GatewayServer } from '../../packages/gateway/dist/index.js';
const server = new GatewayServer({ port: 12345, baseDir: 'test', runJobs: false });
console.log('Server created');
server.listen(12345).then(() => {
  console.log('Server listening on', server.boundPort);
  server.close().then(() => {
    console.log('Server closed');
  }).catch(err => console.error('Close error:', err));
}).catch(err => console.error('Listen error:', err));
