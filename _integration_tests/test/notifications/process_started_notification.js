'use strict';

const should = require('should');
const uuid = require('uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('Management API:   Receive Process Started Notification', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'generic_sample';

  const noopCallback = () => {};

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when the ProcessInstance was started', async () => {

    return new Promise(async (resolve, reject) => {

      const correlationId = uuid.v4();
      let notificationReceived = false;

      const notificationReceivedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        // Since this notification channel will receive ALL processStarted messages,
        // we need to make sure that we intercepted the one we anticipated.
        const messageWasNotFromSpecifiedCorrelation = processStartedMessage.correlationId !== correlationId;
        if (messageWasNotFromSpecifiedCorrelation) {
          return;
        }

        const expectedStartEventId = 'StartEvent_1';

        should(processStartedMessage.correlationId).be.equal(correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(expectedStartEventId);
        notificationReceived = true;
      };

      const notificationSubscription = await testFixtureProvider
        .managementApiClientService
        .onProcessStarted(defaultIdentity, notificationReceivedCallback);

      // We must await the end of the ProcessInstance to avoid messed up entries in the database.
      const processFinishedCallback = async () => {
        await testFixtureProvider
          .managementApiClientService
          .removeSubscription(defaultIdentity, notificationSubscription);

        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the started ProcessInstance!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification when a process with a given ProcessModelId was started', async () => {

    return new Promise(async (resolve, reject) => {

      const correlationId = uuid.v4();
      let notificationReceived = false;

      const notificationReceivedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        const messageWasNotFromSpecifiedCorrelation = processStartedMessage.correlationId !== correlationId;
        if (messageWasNotFromSpecifiedCorrelation) {
          return;
        }

        const expectedStartEventId = 'StartEvent_1';

        should(processStartedMessage.correlationId).be.equal(correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(expectedStartEventId);
        notificationReceived = true;
      };

      const notificationSubscription = await testFixtureProvider
        .managementApiClientService
        .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId);

      // We must await the end of the ProcessInstance to avoid messed up entries in the database.
      const processFinishedCallback = async () => {
        await testFixtureProvider
          .managementApiClientService
          .removeSubscription(defaultIdentity, notificationSubscription);

        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the started ProcessInstance!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should fail to subscribe for the ProcessStarted notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onProcessStarted({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the ProcessWithProcessModelIdStarted notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onProcessWithProcessModelIdStarted({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });
});
