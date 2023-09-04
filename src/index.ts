import { DaprClient, DaprServer } from '@dapr/dapr';
import Fastify from 'fastify';
import { DaprService } from './services/dapr/DaprService';
import Prometheus from 'prom-client';
import logger from './logs';
const victoryCount = new Prometheus.Counter({
  name: `participant_victory`,
  help: 'participant victory',
  labelNames: ['participant'],
});
const countParticipants = new Prometheus.Counter({
  name: `participant_register`,
  help: 'participant register',
});
const countStumbles = new Prometheus.Counter({
  name: `participant_stumbles`,
  help: 'participant stumbles',
  labelNames: ['participant'],
});
const countBoosts = new Prometheus.Counter({
  name: `participant_boosts`,
  help: 'participant boosts',
  labelNames: ['participant'],
});
const countPosition = new Prometheus.Counter({
  name: `participant_position`,
  help: 'participant position',
  labelNames: ['participant'],
});
const fastify = Fastify({
  logger: true,
});
const MIN_PARTICIPANTS = 12;
const RACE_LENGTH = 1000;
const daprService = new DaprService();
let participants: string[] = [];
let started = false;
let ranking: string[] = [];

async function publishParticipantData(data: Record<string, any>, queue = 'warm-up') {
  await daprService.client.pubsub.publish('pubsub-component', queue, data);
}

async function handleRace(data: Record<string, any>) {
  let randomValue = Math.floor(Math.random() * 5) + 1;

  if (Math.floor(Math.random() * 5) + 1 === 1) {
    logger.info(` participant has stumbled! 🙈💥`, data);
    // console.log(`[Race][RUNNING] ${data.turtleName} has stumbled! 🙈💥`);
    countStumbles.inc({ participant: data.turtleName });
  } else {
    if (Math.floor(Math.random() * 10) + 1 === 1) {
      logger.info(`participant has turbo boosted! 🚀🚀🚀`, data);
      randomValue = randomValue * 2;
      countBoosts.inc({ participant: data.turtleName });
    }
    logger.info(`participant is moving 🚀🚀🚀`, data, randomValue);

    if (randomValue + data.position > RACE_LENGTH) {
      countPosition.inc({ participant: data.turtleName }, RACE_LENGTH - data.position);
      data.position = RACE_LENGTH;
    } else {
      data.position += randomValue;
      countPosition.inc({ participant: data.turtleName }, randomValue);
    }
  }

  if (data.position >= RACE_LENGTH) {
    ranking.push(data.turtleName);
    logger.info(`participant has reached the finish line! 🏁🏁🏁`, data);
  } else {
    await publishParticipantData(data, 'race');
  }
}

function printRanking() {
  console.log('\t|-----------------------|');
  console.log('\t|       Ranking         |');
  console.log('\t|-----------------------|');
  victoryCount.inc({ participant: ranking[0] });
  ranking.forEach((participant, index) => {
    let icon = index === 2 ? '🥉' : index === 1 ? '🥈' : index === 0 ? '🥇' : '';
    console.log(`\t|  ${icon}\t${participant}\t${index + 1}º\t|`);
  });
  console.log('\t|-----------------------|\n');
}

async function handleRaceFinish() {
  if (ranking.length === participants.length) {
    printRanking();
    await new Promise((resolve) => setTimeout(resolve, 20000));
    ranking = [];
    participants = [];
    started = false;
    countParticipants.reset();
    countStumbles.reset();
    countBoosts.reset();
    countPosition.reset();

    return;
  }
}
async function warmUp(data: Record<string, any>) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (!started) {
    if (!participants.includes(data.turtleName)) {
      console.log(`registering participant`, data);

      participants.push(data.turtleName);
      countParticipants.inc();

      logger.info(`total_participants: ${participants.length}}`);
      started = participants.length >= MIN_PARTICIPANTS;
      logger.info(`Start race: ${started}`);

      publishParticipantData(data, 'race');
    }
  }
}
async function startRace(data: Record<string, any>) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  await handleRace(data);
  if (participants.length === ranking.length) {
    logger.info(`Finish race: ${started}`);
    await handleRaceFinish();
  }
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

fastify.get('/metrics', async function handler(request, reply) {
  reply.headers({
    'Content-Type': Prometheus.register.contentType,
  });
  reply.send(await Prometheus.register.metrics());
});

async function startServer() {
  try {
    await fastify.listen({ port: 3000 });
    await daprService.server.pubsub.subscribe('pubsub-component', 'warm-up', warmUp);
    await daprService.server.pubsub.subscribe('pubsub-component', 'race', startRace);
    await daprService.server.start();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
