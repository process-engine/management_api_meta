const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('ManagementAPI: GetSuspendedTasksForCorrelation', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_all-tasks';
  const processModelIdNoTasks = 'test_management_api_usertask_empty';
  const processModelIdCallActivity = 'test_management_api_task_call_activity';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([
      processModelId,
      processModelIdNoTasks,
      processModelIdCallActivity,
    ]);

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
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
    });

    it('should return a Correlation\'s Tasks by its CorrelationId through the ManagementAPI', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationId);

      should(taskList).have.property('tasks');

      should(taskList.tasks).be.instanceOf(Array);
      should(taskList.tasks.length).be.greaterThan(0);

      const task = taskList.tasks[0];

      should(task).have.property('id');
      should(task).have.property('flowNodeInstanceId');
      should(task).have.property('name');
      should(task).have.property('correlationId');
      should(task).have.property('processModelId');
      should(task).have.property('processInstanceId');
      should(task).have.property('tokenPayload');
      should(task).not.have.property('processInstanceOwner');
      should(task).not.have.property('identity');
    });

    it('should return a list of Tasks from a call activity, by the given correlationId through the ManagementAPI', async () => {

      const processStartResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdCallActivity);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(processStartResult.correlationId, processModelId, 3);

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, processStartResult.correlationId);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.instanceOf(Array);
      should(taskList.tasks.length).be.greaterThan(0);

      const task = taskList.tasks[0];

      should(task).have.property('id');
      should(task).have.property('flowNodeInstanceId');
      should(task).have.property('name');
      should(task).have.property('correlationId');
      should(task).have.property('processModelId');
      should(task).have.property('processInstanceId');
      should(task).have.property('tokenPayload');
      should(task).not.have.property('processInstanceOwner');
      should(task).not.have.property('identity');

      await testFixtureProvider.clearDatabases();
      await testFixtureProvider.importProcessFiles([
        processModelId,
        processModelIdNoTasks,
        processModelIdCallActivity,
      ]);
    });

    it('should return an empty Array, if the given correlation does not have any Tasks', async () => {

      return new Promise(async (resolve, reject) => {
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoTasks);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoTasks);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const taskList = await testFixtureProvider
          .managementApiClient
          .getSuspendedTasksForCorrelation(defaultIdentity, result.correlationId);

        should(taskList).have.property('tasks');
        should(taskList.tasks).be.instanceOf(Array);
        should(taskList.tasks).have.a.lengthOf(0);

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the correlationId does not exist', async () => {

      const invalidCorrelationId = 'invalidCorrelationId';

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, invalidCorrelationId);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(0);
    });
  });

  describe('Pagination', () => {

    const correlationIdPaginationTest = uuid.v4();

    before(async () => {
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 3 UserTasks, 3 ManualTasks and 3 Empty Acitvities after this.
      for (let i = 0; i < 3; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 9);
    });

    it('should apply no limit, an offset of 4 and return 5 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 4);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 0, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 5, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 6, a limit of 5 and return 3 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 6, 5);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 0, 11);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(9);
    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 1000);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
    });

    it('should fail to retrieve the Correlation\'s Tasks, when the user is unauthorized', async () => {

      try {
        const taskList = await testFixtureProvider
          .managementApiClient
          .getSuspendedTasksForCorrelation({}, correlationId);

        should.fail(taskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.match(expectedErrorCode);
      }
    });

    it('should return an empty Array, if the user not allowed to access any suspended tasks', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;
      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForCorrelation(restrictedIdentity, correlationId);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(0);
    });
  });
});
