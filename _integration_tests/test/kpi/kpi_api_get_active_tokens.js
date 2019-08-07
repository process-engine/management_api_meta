'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('Management API -> Get ActiveTokens - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let processInstanceId;

  const processModelId = 'heatmap_sample';
  const correlationId = uuid.v4();

  const userTask1Id = 'UserTask_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await executeProcessAndWaitForUserTask();
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should successfully get the active tokens for a running ProcessModel', async () => {

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForProcessModel(defaultIdentity, processModelId);

    should(activeTokens).be.an.Array();
    const assertionError = `Expected ${JSON.stringify(activeTokens)} to have two entries, but received ${activeTokens.length}!`;
    should(activeTokens.length).be.equal(2, assertionError); // 2 UserTasks running in parallel executed branches

    for (const activeToken of activeTokens) {
      assertActiveToken(activeToken, activeToken.flowNodeId);
    }
  });

  it('should successfully get the active tokens for a running ProcessModel within a correlation', async () => {

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId);

    should(activeTokens).be.an.Array();
    const assertionError = `Expected ${JSON.stringify(activeTokens)} to have two entries, but received ${activeTokens.length}!`;
    should(activeTokens.length).be.equal(2, assertionError); // 2 UserTasks running in parallel executed branches

    for (const activeToken of activeTokens) {
      assertActiveToken(activeToken, activeToken.flowNodeId);
    }
  });

  it('should successfully get the active tokens for a running ProcessInstance', async () => {

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId);

    should(activeTokens).be.an.Array();
    const assertionError = `Expected ${JSON.stringify(activeTokens)} to have two entries, but received ${activeTokens.length}!`;
    should(activeTokens.length).be.equal(2, assertionError); // 2 UserTasks running in parallel executed branches

    for (const activeToken of activeTokens) {
      assertActiveToken(activeToken, activeToken.flowNodeId);
    }
  });

  it('should successfully get the active tokens for a running FlowNodeInstance', async () => {

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForFlowNode(defaultIdentity, userTask1Id);

    should(activeTokens).be.an.Array();
    should(activeTokens.length).be.equal(1);

    const activeToken = activeTokens[0];

    assertActiveToken(activeToken, userTask1Id);
  });

  it('should not include tokens from already finished ProcessModels with the same ID', async () => {

    // Execute another ProcessInstance and wait for it to finish this time.
    // The tokens of this ProcessInstance should not show as ActiveTokens.
    await executeSampleProcess();

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForProcessModel(defaultIdentity, processModelId);

    should(activeTokens).be.an.Array();
    const assertionError = `Expected ${JSON.stringify(activeTokens)} to have two entries, but received ${activeTokens.length}!`;
    should(activeTokens.length).be.equal(2, assertionError); // 2 UserTasks running in parallel executed branches

    for (const activeToken of activeTokens) {
      assertActiveToken(activeToken, activeToken.flowNodeId);
    }
  });

  it('should not include tokens from already finished FlowNodeInstances with the same ID', async () => {

    // Execute another ProcessInstance and wait for it to finish this time.
    // The tokens of this ProcessInstance should not show as ActiveTokens.
    await executeSampleProcess();

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForFlowNode(defaultIdentity, userTask1Id);

    should(activeTokens).be.an.Array();
    should(activeTokens.length).be.equal(1);

    const activeToken = activeTokens[0];

    assertActiveToken(activeToken, userTask1Id);
  });

  async function executeSampleProcess() {

    const initialToken = {
      user_task: false,
    };

    await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);
  }

  async function executeProcessAndWaitForUserTask() {

    const initialToken = {
      user_task: true,
    };

    const startResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);

    processInstanceId = startResult.processInstanceId;

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 2);
  }

  function assertActiveToken(activeToken, flowNodeId) {

    const expectedPayload = {
      user_task: true,
    };

    should(activeToken.processModelId).be.equal(processModelId);
    should(activeToken.flowNodeId).be.equal(flowNodeId);
    should(activeToken.correlationId).be.equal(correlationId);
    should(activeToken.identity).be.eql(defaultIdentity);
    should(activeToken.payload).be.eql(expectedPayload);

    should(activeToken).have.property('processInstanceId');
    should(activeToken).have.property('flowNodeInstanceId');
    should(activeToken).have.property('createdAt');
  }

  async function cleanup() {
    return new Promise(async (resolve, reject) => {

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(testFixtureProvider.identities.defaultUser, correlationId);

      for (const userTask of userTaskList.userTasks) {
        const userTaskProcessInstanceId = userTask.processInstanceId;
        const userTaskInstanceId = userTask.flowNodeInstanceId;
        const userTaskResult = {};

        await testFixtureProvider
          .managementApiClient
          .finishUserTask(testFixtureProvider.identities.defaultUser, userTaskProcessInstanceId, correlationId, userTaskInstanceId, userTaskResult);
      }
    });
  }
});
