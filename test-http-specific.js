
const http = require('node:http');
const server = http.createServer((req, res) => { res.end('ok'); });
server.listen(12345, '127.0.0.1', () => {
  console.log('Listening on', server.address());
  server.close(() => {
    console.log('Closed');
  });
});
