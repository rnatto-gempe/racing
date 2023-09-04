import pino from 'pino';
const transport = pino.transport({
  target: "pino-loki",
  levels: {
    
  },
  options: {
    batching: true,
    interval: 5,

    host: 'http://localhost:3100',
    // basicAuth: {
    //   username: "username",
    //   password: "password",
    // },
  },
});

export default pino(transport);