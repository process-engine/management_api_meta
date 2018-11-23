'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').ProcessModelExecution.StartCallbackType;

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Management API:   Receive Process Ended Notification', () => {

  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it.only('should send a notification when a process is finished', async () => {

    return new Promise((resolve, reject) => {

      const startEventId = 'StartEvent_1';
      const payload = {
        correlationId: uuid.v4(),
        inputValues: {},
      };
      const startCallbackType = StartCallbackType.onProcessInstanceStarted;

      const onProcessStartedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        // Since this notification channel will receive ALL processEnded messages,
        // we need to make sure that we intercepted the one we anticipated.
        if (processStartedMessage.correlationId !== payload.correlationId) {
          return;
        }

        should(processStartedMessage.correlationId).be.equal(payload.correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(startEventId);

        resolve();
      };

      testFixtureProvider.managementApiClientService.onProcessStarted(defaultIdentity, onProcessStartedCallback);

      testFixtureProvider
        .managementApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);
    });
  });
});
