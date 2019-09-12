'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('Management API: GetActiveTokensForCorrelationAndProcessModel', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'heatmap_sample';
  const correlationId = uuid.v4();

  before(async () => {
    try {
      testFixtureProvider = new TestFixtureProvider();
      await testFixtureProvider.initializeAndStart();

      await testFixtureProvider.importProcessFiles([processModelId]);
      processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

      defaultIdentity = testFixtureProvider.identities.defaultUser;

      await executeProcessAndWaitForUserTask();
    } catch (error) {
      console.log(error);
      throw error;
    }
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully get the active tokens for a running ProcessModel within a correlation', async () => {

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId);

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

    await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);
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
