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

async function waitForParticipants(minParticipants: number) {
  while (participants.length < minParticipants) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function publishParticipantData(data: Record<string, any>) {
  daprService.client.pubsub.publish('my-pubsub-component', 'my-topic', data);
}

function handleRaceStart(data: Record<string, any>) {
  let randomValue = Math.floor(Math.random() * 5) + 1;

  if (Math.floor(Math.random() * 5) + 1 === 1) {
    console.log(`[Race][START] ${data.turtleName} has stumbled! 🙈💥`);
  } else {
    if (Math.floor(Math.random() * 10) + 1 === 1) {
      console.log(`[Race][START] ${data.turtleName} has turbo boosted! 🚀🚀🚀`);
      randomValue = randomValue * 2;
    }
    console.log(`[Race][START] ${data.turtleName} is moving ${randomValue} steps, position: ${data.position}/100`);
    data.position += randomValue;
  }

  if (data.position >= 100) {
    ranking.push(data.turtleName);
    console.log(`[Race][FINISH] ${data.turtleName} has reached the finish line! 🏁`);
  }
}

function printRanking() {
  console.log('\nRanking:');
  console.log('\t|------------------------|');
  ranking.forEach((participant, index) => {
    let icon = index === 2 ? '🥉' : index === 1 ? '🥈' : index === 0 ? '🥇' : '';
    console.log(`\t|  ${icon}\t${participant}\t${index + 1}º\t|`);
  });
  console.log('\t------------------------\n');
}

async function handleRaceFinish() {
  if (ranking.length === participants.length) {
    printRanking();
    await new Promise(resolve => setTimeout(resolve, 20000));
    ranking = [];
    participants = [];
    started = false;
  }
}

async function startRace() {
  await daprService.server.pubsub.subscribe('my-pubsub-component', 'my-topic', async (data: Record<string, any>) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!started) {
      if (!participants.includes(data.turtleName)) {
        participants.push(data.turtleName);
      }
      console.log(data.turtleName);
      console.log(`[Race][Warm-up] ${participants.length} runners!`);
      await waitForParticipants(12);
      
      started = true;
      console.log('Largada: a hora de mostrar quem treinou e quem só postou!!');
      console.log('\n\n');
      console.log({ participants });
      console.log('\n\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      publishParticipantData(data);
      return;
    }
    
    handleRaceStart(data);
    
    if (data.position >= 100) {
      handleRaceFinish();
    }
    
    publishParticipantData(data);
  });

  await daprService.server.start();
}

fastify.get('/health', async function handler(request, reply) {
  return { status: 'ok' };
});

fastify.get('/register', async function handler(request, reply) {
  if (started) return { status: 'ok', message: 'Corrida já iniciada' };
  const { name } = request.query as { name: string };
  
  try {
    publishParticipantData({ turtleName: name, position: 0 });
  } catch (error) {
    console.log({ error });
  }
  
  return { status: 'ok' };
});

fastify.get('/register-sample', async function handler(request, reply) {
  if (started) return { status: 'ok', message: 'Corrida já iniciada' };
  
  const { names } = request.query as { names: string };
  for (const name of names.split(',')) {
    publishParticipantData({ turtleName: name, position: 0 });
  }
  
  return { status: 'ok' };
});

async function startServer() {
  try {
    await fastify.listen({ port: 3000 });
    startRace();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
