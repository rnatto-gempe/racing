import { DaprClient, DaprServer } from '@dapr/dapr';
// Common settings
const serverHost = '127.0.0.1'; // App Host of this Example Server
const daprHost = '127.0.0.1';
const serverPort = '50051'; // App Port of this Example Server

export class DaprService {
  // manage server and client from dapr here, returning the same instance when called getServer() or getClient()
  public server: DaprServer = new DaprServer({
    serverHost,
    serverPort,
    clientOptions: {
      daprHost,
      daprPort: process.env.DAPR_HTTP_PORT,
    },
  });
  public client: DaprClient = new DaprClient({ daprHost, daprPort: process.env.DAPR_HTTP_PORT });
}
