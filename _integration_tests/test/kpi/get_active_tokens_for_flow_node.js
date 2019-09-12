'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('Management API: GetActiveTokensForFlowNode', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

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
    await testFixtureProvider.tearDown();
  });

  it('should successfully get the active tokens for a running FlowNodeInstance', async () => {

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForFlowNode(defaultIdentity, userTask1Id);

    should(activeTokens).be.an.Array();
    should(activeTokens).have.a.lengthOf(1);

    const activeToken = activeTokens[0];

    assertActiveToken(activeToken, userTask1Id);
  });

  it('should not include tokens from already finished FlowNodeInstances with the same ID', async () => {

    // Execute another ProcessInstance and wait for it to finish this time.
    // The tokens of this ProcessInstance should not show as ActiveTokens.
    await executeSampleProcess();

    const activeTokens = await testFixtureProvider
      .managementApiClient
      .getActiveTokensForFlowNode(defaultIdentity, userTask1Id);

    should(activeTokens).be.an.Array();
    should(activeTokens).have.a.lengthOf(1);

    const activeToken = activeTokens[0];

    assertActiveToken(activeToken, userTask1Id);
  });

  async function executeSampleProcess() {

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;
    const payload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: {
        user_task: false,
      },
    };

    await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, returnOn);
  }

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
