'use strict';

const should = require('should');

const ProcessInstanceHandler = require('../../dist/commonjs').ProcessInstanceHandler;
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/active', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId;
  let defaultIdentity;
  const processModelId = 'usertask_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const result = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(defaultIdentity, processModelId, 'StartEvent_1', {});

    correlationId = result.correlationId;

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await waitForProcessToReachFirstFlowNode();
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should return all active correlations through the management api', async () => {

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getActiveCorrelations(defaultIdentity);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation.state).be.equal('running');
      should(correlation).have.property('identity');
      should(correlation.identity).have.property('token');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('processModels');

      correlation.processModels.forEach((processModel) => {
        should(processModel).have.property('processDefinitionName');
        should(processModel).have.property('processModelId');
        should(processModel).have.property('processInstanceId');
        should(processModel).have.property('hash');
        should(processModel).have.property('xml');
        should(processModel).have.property('state');
        should(processModel.state).be.equal('running');
        should(processModel).have.property('createdAt');
      });
    });
  });

  it('should fail to retrieve a list of correlations, when the user is unauthorized', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getActiveCorrelations({});

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  /**
   * Periodically checks if a given correlation exists. After a specific number of retries has been exceeded, an error is thrown.
   * This is to help avoid any timing errors that may occur because of the immediate resolving after starting the process instance.
   */
  async function waitForProcessToReachFirstFlowNode() {

    const maxNumberOfRetries = 10;
    const delayBetweenRetriesInMs = 500;

    const flowNodeInstanceService = await testFixtureProvider.resolveAsync('FlowNodeInstanceService');

    for (let i = 0; i < maxNumberOfRetries; i++) {

      await wait(delayBetweenRetriesInMs);

      const flowNodeInstances = await flowNodeInstanceService.queryByCorrelation(correlationId);

      if (flowNodeInstances && flowNodeInstances.length >= 1) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance like failed to start!`);
  }

  async function cleanup() {

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, resolve);

      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

      const userTaskInput = {
        formFields: {
          Sample_Form_Field: 'Hello',
        },
      };

      for (const userTask of userTaskList.userTasks) {
        await testFixtureProvider
          .consumerApiClientService
          .finishUserTask(defaultIdentity, userTask.processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskInput);
      }
    });
  }

  async function wait(timeInMs) {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }

});
