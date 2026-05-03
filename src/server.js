import { createServer } from 'node:http';
import { createApp } from './app.js';

const port = process.env.PORT || 3000;
const server = createServer(createApp());
server.listen(port, () => {
  console.log(`ShopeNesia running at http://localhost:${port}`);
});
