# management api Integration Tests

This folder contains integration tests for the management api

## What are the goals of this project?

The goal of this is to make sure that the management api is behaving as described.

## How do I set this project up?

### Prerequesites

- Node `>= 7.10` + npm `>= 4.2.0`
- Docker `>= 17.05.0`

### Setup/Installation

1. Make sure you have a PostgresDB running.
   For a dockerized and ready-to-go database setup, see the
   [skeleton database](https://github.com/process-engine/skeleton/tree/develop/database)
   of the process engine.
2. Configure your local repositories to access your database.
   You can find the relevant config files here:
   - [`config/test/process/engine/flow_node_instance_repository.json`]
   - [`config/test/process/engine/process_model_repository.json`]
   - [`config/test/process/engine/timer_repository.json`]
3. run `npm install` to install the dependencies of the integration tests,
   including the consumer_api packages that will be tested.

4. run `npm run build` to ensure all typescript files are transpiled.

### Seeding

There is no seeding required.

## How do I use this project?

### Usage

Run `npm test` in this folder.

## What else is there to know?

### Authors/Contact information

- Christian Werner
