import { DaprClient, DaprServer } from '@dapr/dapr';
import Fastify from 'fastify';
import { DaprService } from './services/dapr/DaprService';
const fastify = Fastify({
  logger: true,
});

const daprService = new DaprService();
let participants: string[] = [];
let started = false;
let ranking: string[] = [];
async function start() {
  // Initialize the subscription. Note that this must be done BEFORE calling .start()
  await daprService.server.pubsub.subscribe('my-pubsub-component', 'my-topic', async (data: Record<string, any>) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!started) {
      // bloqueie o começo da corrida até possuir o mínimo de participantes

      if (!participants.includes(data.turtleName)) {
        participants.push(data.turtleName);
      }
      console.log(data.turtleName);
      console.log(`[Race][Warm-up] ${participants.length} runners!`);

      if (participants.length >= 12) {
        started = true;
        console.log('Largada: a hora de mostrar quem treinou e quem só postou!!');
        console.log('\n\n');
        console.log({ participants });
        console.log('\n\n');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        daprService.client.pubsub.publish('my-pubsub-component', 'my-topic', data);
      }
      return;
    }
    // random value between 1 and 5
    const randomValue = Math.floor(Math.random() * 5) + 1;
    // check if the turtle has stumble
    if (Math.floor(Math.random() * 10) + 1 === 1) {
      console.log(`[Race][START] ${data.turtleName} has stumbled! 🙈💥 `);
    } else {
      // calculate a turbo boost chance of 1 in 10
      if (Math.floor(Math.random() * 10) + 1 === 1) {
        // add icons to the console log
        console.log(`[Race][Example] ${data.turtleName} has turbo boosted! 🚀🚀🚀`);
        randomValue * 2;
      }
      console.log(`[Race][Example] ${data.turtleName} is moving ${randomValue} steps`);
      data.position += randomValue;
    }
    if (data.position >= 100) {
      ranking.push(data.turtleName);
      console.log(`[Race][Example] ${data.turtleName} has reached the finish line! 🏁`);
      if (ranking.length === participants.length) {
        // its over
        // print ranking with participant and ranking position
        console.log('\nRanking:');
        console.log('----------------');
        ranking.forEach((participant, index) => {
          let icon = '';
          if (index === 2) icon = '🥉';
          if (index === 1) icon = '🥈';
          if (index === 0) icon = '🥇';
          console.log(`${index + 1}º\t-\t${icon}\t${participant} `);
        });
        console.log('----------------\n');

        await new Promise((resolve) => setTimeout(resolve, 20000));
        ranking = [];
        participants = [];
        started = false;
      }
      return;
    }
    daprService.client.pubsub.publish('my-pubsub-component', 'my-topic', data);
  });

  await daprService.server.start();
}
// Declare a route
fastify.get('/health', async function handler(request, reply) {
  return { status: 'ok' };
});
fastify.get('/start', async function handler(request, reply) {});
// Declare a route
fastify.get('/register', async function handler(request, reply) {
  if (started) return { status: 'ok', message: 'Corrida já iniciada' };
  const { name } = request.query as { name: string };
  try {
    daprService.client.pubsub.publish('my-pubsub-component', 'my-topic', { turtleName: name, position: 0 });
  } catch (error) {
    console.log({ error });
  }
  return { status: 'ok' };
});

async function api() {
  try {
    await fastify.listen({ port: 3000 });
    start();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
api();
