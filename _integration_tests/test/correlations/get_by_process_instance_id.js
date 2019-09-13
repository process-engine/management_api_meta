'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Management API: GetCorrelationByProcessInstanceId', () => {

  let testFixtureProvider;
  let processInstanceId1;
  let processInstanceId2;

  const processModelId = 'generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceId1 = await createFinishedProcessInstance(testFixtureProvider.identities.defaultUser);
    processInstanceId2 = await createFinishedProcessInstance(testFixtureProvider.identities.secondDefaultUser);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstance(identity) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(identity, processModelId, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.processInstanceId;
  }

  it('should return a correlation by its ProcessInstanceId through the Management API', async () => {

    const correlation = await testFixtureProvider
      .managementApiClient
      .getCorrelationByProcessInstanceId(testFixtureProvider.identities.defaultUser, processInstanceId1);

    should(correlation).have.property('id');
    should(correlation).have.property('state');
    should(correlation).have.property('createdAt');
    should(correlation).have.property('processInstances');

    correlation.processInstances.forEach((processInstance) => {
      should(processInstance).have.property('processDefinitionName');
      should(processInstance).have.property('processModelId');
      should(processInstance.processModelId).be.equal(processModelId);
      should(processInstance).have.property('processInstanceId');
      should(processInstance).have.property('hash');
      should(processInstance).have.property('xml');
      should(processInstance).have.property('state');
      should(processInstance).have.property('identity');
      should(processInstance.identity).have.property('token');
      should(processInstance).have.property('createdAt');
    });
  });

  it('should return another users Correlation through the Management API, if the requesting user is a SuperAdmin', async () => {

    const correlation = await testFixtureProvider
      .managementApiClient
      .getCorrelationByProcessInstanceId(testFixtureProvider.identities.defaultUser, processInstanceId1);

    should(correlation).have.property('id');
    should(correlation).have.property('state');
    should(correlation).have.property('createdAt');
    should(correlation).have.property('processInstances');

    correlation.processInstances.forEach((processInstance) => {
      should(processInstance).have.property('processDefinitionName');
      should(processInstance).have.property('processModelId');
      should(processInstance.processModelId).be.equal(processModelId);
      should(processInstance).have.property('processInstanceId');
      should(processInstance).have.property('hash');
      should(processInstance).have.property('xml');
      should(processInstance).have.property('state');
      should(processInstance).have.property('identity');
      should(processInstance.identity).have.property('token');
      should(processInstance).have.property('createdAt');
    });
  });

  it('should filter out another user\'s Correlations, if the requesting user is a regular user', async () => {
    const correlationDefaultUser = await testFixtureProvider
      .managementApiClient
      .getCorrelationByProcessInstanceId(testFixtureProvider.identities.defaultUser, processInstanceId1);

    correlationDefaultUser.processInstances.forEach((processInstance) => {
      should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.defaultUser.userId);
    });

    const correlationSecondUser = await testFixtureProvider
      .managementApiClient
      .getCorrelationByProcessInstanceId(testFixtureProvider.identities.secondDefaultUser, processInstanceId2);

    correlationSecondUser.processInstances.forEach((processInstance) => {
      should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.secondDefaultUser.userId);
    });

  });

  it('should fail to retrieve the Correlation, if no Correlation for the given ProcessInstanceId exists', async () => {
    const invalidProcessInstanceId = 'invalid_id';

    try {
      const correlationList = await testFixtureProvider
        .managementApiClient
        .getCorrelationByProcessInstanceId(testFixtureProvider.identities.defaultUser, invalidProcessInstanceId);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /No correlations.*?found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the Correlation, if the user is unauthorized', async () => {
    try {
      const correlationList = await testFixtureProvider
        .managementApiClient
        .getCorrelationByProcessInstanceId({}, processInstanceId1);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });
});
