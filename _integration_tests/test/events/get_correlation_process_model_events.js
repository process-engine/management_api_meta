'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('ManagementAPI: GetEventsForProcessModelInCorrelation', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_signal_event';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should return a list of events for a given process model in a given correlation', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events.length).be.greaterThan(0);

      eventList.events.forEach((event) => {
        should(event).have.property('id');
        should(event).have.property('processInstanceId');
        should(event).have.property('flowNodeInstanceId');
        should(event).have.property('correlationId');
        should(event).have.property('processModelId');
        should(event).have.property('bpmnType');
        should(event).have.property('eventType');
        should(event).have.property('eventName');
      });
    });

    it('should return an empty Array, if the process_model_id does not exist', async () => {

      const invalidProcessModelId = 'invalidprocessModelId';

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, invalidProcessModelId, correlationId);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(0);
    });

    it('should return an empty Array, if the correlation_id does not exist', async () => {

      const invalidCorrelationId = 'invalidCorrelationId';

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, invalidCorrelationId);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(0);
    });
  });

  describe('Pagination', () => {

    const correlationIdPaginationTest = uuid.v4();

    before(async () => {
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 Events after this.
      for(let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 5);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 0, 2);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 5, 2);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 7, 5);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 0, 20);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 1000);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should fail to retrieve the correlation\'s events, when the user is unauthorized', async () => {

      try {
        await testFixtureProvider
          .managementApiClient
          .getWaitingEventsForProcessModelInCorrelation({}, processModelId, correlationId);

        should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 401;
        const expectedErrorMessage = /no auth token provided/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });

    it('should return an empty Array, if the user is not allowed to access any suspended events', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;
      const eventList = await testFixtureProvider
        .managementApiClient
        .getWaitingEventsForProcessModelInCorrelation(restrictedIdentity, processModelId, correlationId);

      should(eventList).have.property('events');

      should(eventList.events).be.an.instanceOf(Array);
      should(eventList.events).have.a.lengthOf(0);
    });
  });
});
