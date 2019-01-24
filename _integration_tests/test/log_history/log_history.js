'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Management API: GET -> /process_model/:processModelId/logs?correlationId=value', () => {
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_management_api_logging_simple_process';
  const correlationId = uuid.v4();
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);
    await executeSampleProcess(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should sucessfully get an array which contains all logs for a given correlation', async () => {
    const logs = await testFixtureProvider
      .managementApiClientService
      .getProcessModelLog(defaultIdentity, processModelId, correlationId);

    const expectedProperties = [
      'timeStamp',
      'correlationId',
      'processModelId',
      'processInstanceId',
      'logLevel',
      'message',
    ];

    should(logs).be.an.Array();
    should(logs).have.length(8);

    for (const currentLogEntry of logs) {
      should(currentLogEntry).have.properties(...expectedProperties);
    }
  });

  it('should sucessfully get an array which contains all logs', async () => {
    const customCorrelationId = uuid.v4();
    await executeSampleProcess(customCorrelationId);

    const logs = await testFixtureProvider
      .managementApiClientService
      .getProcessModelLog(defaultIdentity, processModelId);

    const expectedProperties = [
      'timeStamp',
      'correlationId',
      'processModelId',
      'processInstanceId',
      'logLevel',
      'message',
    ];

    should(logs).be.an.Array();
    should(logs.length).be.greaterThan(8);

    for (const currentLogEntry of logs) {
      should(currentLogEntry).have.properties(...expectedProperties);
    }
  });

  it('should throw a 401 error when no auth token is provided', async () => {
    try {
      const logs = await testFixtureProvider
        .managementApiClientService
        .getProcessModelLog({}, processModelId, correlationId);

      should.fail(null, null, 'The request should have failed with code 401!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error).have.properties('code', 'message');
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should return an empty array when trying to get logs for a non existing processModelid', async () => {
    const nonExistingProcessModelId = 'bogus_process_model_id';
    const logs = await testFixtureProvider
      .managementApiClientService
      .getProcessModelLog(defaultIdentity, nonExistingProcessModelId, correlationId);

    should(logs).be.an.Array();
    should(logs).be.empty();
  });

  it('should return an empty array when trying to get logs for a non existing correlationId', async () => {
    const nonExistingCorrelationId = 'bogus_correlation_id';
    const logs = await testFixtureProvider
      .managementApiClientService
      .getProcessModelLog(defaultIdentity, processModelId, nonExistingCorrelationId);

    should(logs).be.an.Array();
    should(logs).be.empty();
  });

  async function executeSampleProcess(usedCorrelationId) {

    const payload = {
      correlationId: usedCorrelationId,
      inputValues: {
        user_task: false,
      },
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, returnOn);
  }
});
