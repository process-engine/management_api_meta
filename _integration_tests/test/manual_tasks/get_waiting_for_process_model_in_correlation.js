'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe(`ManagementAPI: GetManualTasksForProcessModelInCorrelation`, () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_manualtask';
  const processModelIdNoManualTasks = 'test_management_api_manualtask_empty';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId, processModelIdNoManualTasks]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should return a list of ManualTasks for a given process model in a given correlation', async () => {

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks.length).be.greaterThan(0);

      const manualTask = manualTaskList.manualTasks[0];

      should(manualTask).have.property('id');
      should(manualTask).have.property('flowNodeInstanceId');
      should(manualTask).have.property('name');
      should(manualTask).have.property('correlationId');
      should(manualTask).have.property('processModelId');
      should(manualTask).have.property('processInstanceId');
      should(manualTask).have.property('tokenPayload');
      should(manualTask).not.have.property('processInstanceOwner');
      should(manualTask).not.have.property('identity');
    });

    it('should return an empty Array, if the given correlation does not have any ManualTasks', async () => {

      return new Promise(async (resolve, reject) => {
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoManualTasks);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoManualTasks);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const manualTaskList = await testFixtureProvider
          .managementApiClient
          .getManualTasksForProcessModel(defaultIdentity, processModelIdNoManualTasks);

        should(manualTaskList).have.property('manualTasks');
        should(manualTaskList.manualTasks).be.an.instanceOf(Array);
        should(manualTaskList.manualTasks).have.a.lengthOf(0);

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the processModelId does not exist', async () => {

      const invalidProcessModelId = 'invalidProcessModelId';

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, invalidProcessModelId, correlationId);

      should(manualTaskList).have.property('manualTasks');
      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(0);
    });

    it('should return an empty Array, if the correlationId does not exist', async () => {

      const invalidCorrelationId = 'invalidCorrelationId';

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, invalidCorrelationId);

      should(manualTaskList).have.property('manualTasks');
      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(0);
    });
  });

  describe('Pagination', () => {

    const correlationIdPaginationTest = uuid.v4();

    before(async () => {
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 ManualTasks after this.
      for(let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 5);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 0, 2);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 5, 2);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 7, 5);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 0, 20);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 1000);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should fail to retrieve the correlation\'s ManualTasks, when the user is unauthorized', async () => {

      try {
        const manualTaskList = await testFixtureProvider
          .managementApiClient
          .getManualTasksForProcessModelInCorrelation({}, processModelId, correlationId);

        should.fail(manualTaskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.match(expectedErrorCode);
      }
    });

    it('should return an empty Array, if the user not allowed to access any suspended ManualTasks', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;
      const manualTaskList = await testFixtureProvider
        .managementApiClient
        .getManualTasksForProcessModelInCorrelation(restrictedIdentity, processModelId, correlationId);

      should(manualTaskList).have.property('manualTasks');
      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(0);
    });
  });
});
