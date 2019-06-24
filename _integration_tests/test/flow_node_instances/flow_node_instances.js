'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

const testCase = 'GET  ->  /process_instances/:process_instance_id/flow_node_instances';
describe(`Management API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId;

  const processModelId = 'test_management_api_usertask';
  let processInstanceId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId);
    correlationId = result.correlationId;
    processInstanceId = result.processInstanceId;

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a list of flow node instances', async () => {

    const flowNodeInstances = await testFixtureProvider
      .managementApiClientService
      .getFlowNodeInstancesForProcessInstance(testFixtureProvider.identities.defaultUser, processInstanceId);

    assertFlowNodeInstances(flowNodeInstances);
  });

  function assertFlowNodeInstances(flowNodeInstances) {
    should(flowNodeInstances).be.instanceOf(Array);
    should(flowNodeInstances.length).be.greaterThan(0);

    for (const flowNodeInstance of flowNodeInstances) {
      should(flowNodeInstance).have.property('id');
      should(flowNodeInstance).have.property('flowNodeId');
      should(flowNodeInstance).have.property('flowNodeType');
      should(flowNodeInstance).have.property('correlationId');
      should(flowNodeInstance).have.property('processModelId');
      should(flowNodeInstance).have.property('processInstanceId');
      should(flowNodeInstance).have.property('tokens');
      should(flowNodeInstance).have.property('state');
      should(flowNodeInstance).have.property('owner');

      should(flowNodeInstance.processModelId).be.equal(processModelId);

      const hasOnEnterToken = flowNodeInstance.tokens.some((token) => token.type === 'onEnter');
      const hasOnExitToken = flowNodeInstance.tokens.some((token) => token.type === 'onExit');

      should(hasOnEnterToken).be.true();
      should(hasOnExitToken).be.true();
    }
  }

});
