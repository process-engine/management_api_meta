'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').ProcessModelExecution.StartCallbackType; //eslint-disable-line

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/:correlation_id/process_model', () => {

  let testFixtureProvider;

  let correlationId;
  const processModelId = 'generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    correlationId = await createFinishedProcessInstanceAndReturnCorrelationId();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstanceAndReturnCorrelationId() {

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

  it('should return a Correlations ProcessModel through the management api', async () => {

    const processModels = await testFixtureProvider
      .managementApiClientService
      .getProcessModelsForCorrelation(testFixtureProvider.identities.defaultUser, correlationId);

    should(processModels).be.an.Array();
    should(processModels[0].id).be.equal(processModelId);
    should(processModels[0]).have.property('xml');
  });

  it('should fail to retrieve the ProcessModel, if the given Correlation does not exist', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getProcessModelsForCorrelation(testFixtureProvider.identities.defaultUser);

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the ProcessModel, if the user is unauthorized', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getProcessModelsForCorrelation({}, correlationId);

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
