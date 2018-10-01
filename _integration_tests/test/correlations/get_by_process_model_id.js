'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').ProcessModelExecution.StartCallbackType; //eslint-disable-line

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/process_model/:process_model_id', () => {

  let testFixtureProvider;

  const processModelId = 'generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    await createFinishedProcessInstance();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstance() {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(testFixtureProvider.identities.defaultUser, processModelId, startEventId, payload, returnOn);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

  it('should return a correlation by its id through the Management API', async () => {

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getCorrelationsByProcessModelId(testFixtureProvider.identities.defaultUser, processModelId);

    should(correlations).be.an.Array();
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {

      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('identity');
      should(correlation.identity).have.property('token');
      should(correlation).have.property('processModels');

      correlation.processModels.forEach((processModel) => {
        should(processModel).have.property('name');
        should(processModel.name).be.equal(processModelId);
        should(processModel).have.property('hash');
        should(processModel).have.property('xml');
        should(processModel).have.property('processInstanceId');
        should(processModel).have.property('createdAt');
      });
    });

  });

  it('should fail to retrieve the Correlations, if no Correlation for the given ProcessModel exists', async () => {
    const invalidProcessModelId = 'invalid_id';

    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getCorrelationsByProcessModelId(testFixtureProvider.identities.defaultUser, invalidProcessModelId);

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /No correlations.*?found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the ProcessModel, if the user is unauthorized', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getCorrelationsByProcessModelId({}, processModelId);

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
