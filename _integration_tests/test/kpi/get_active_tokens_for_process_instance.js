'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('Management API: GetActiveTokensForProcessInstance', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let processInstanceId;

  const processModelId = 'heatmap_sample';
  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await executeProcessAndWaitForUserTask();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully get the active tokens for a running ProcessInstance', async () => {

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId);

    should(activeTokens).be.an.Array();
    const assertionError = `Expected ${JSON.stringify(activeTokens)} to have two entries, but received ${activeTokens.length}!`;
    should(activeTokens).have.a.lengthOf(2, assertionError); // 2 UserTasks running in parallel executed branches

    for (const activeToken of activeTokens) {
      assertActiveToken(activeToken, activeToken.flowNodeId);
    }
  });

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
});
