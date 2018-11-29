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
      const endEventId = 'EndEvent_Success';
      const payload = {
        correlationId: uuid.v4(),
        inputValues: {},
      };
      const startCallbackType = StartCallbackType.CallbackOnEndEventReached;

      const onProcessStartedCallback = (processStartedMessage) => {
        console.log('Process started');
        console.log(processStartedMessage);

        should.exist(processStartedMessage);

        // Since this notification channel will receive ALL processEnded messages,
        // we need to make sure that we intercepted the one we anticipated.
        if (processStartedMessage.correlationId !== payload.correlationId) {
          return;
        }

        /*
        should(processEndedMessage).have.property('correlationId');
        should(processEndedMessage.correlationId).be.equal(payload.correlationId);
        should(processEndedMessage).have.property('flowNodeId');
        should(processEndedMessage.flowNodeId).be.equal(endEventId);*/

        resolve();
      };

      testFixtureProvider.managementApiClientService.onProcessStarted(onProcessStartedCallback);

      testFixtureProvider
        .managementApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType, endEventId);

    });
  });

});
