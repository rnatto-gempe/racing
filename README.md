# Racing

Este é um projeto para aplicar: 
- Dapr
- Pub/Sub
- Observabilidade

## Desenvolvimento

Neste tópico irei registrar todo meu progresso no projeto, bem como o planejamento do que executar

Iniciar o dapr

`dapr init`

Iniciar um container rabbitmq para obter o painel de controle

```bash
docker run -d --rm --hostname my-rabbitmq --name my-rabbitmq \
    -e RABBITMQ_DEFAULT_USER=test-user -e RABBITMQ_DEFAULT_PASS=test-password \
    -p 0.0.0.0:5672:5672 -p 0.0.0.0:15672:15672 \
    rabbitmq:3-management


    docker run --name prometheus -d -p 8080:8080 prom/prometheus

```

iniciar o projeto, com typescript

`npm install`


