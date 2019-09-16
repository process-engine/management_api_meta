'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

describe('Management API:   Receive CronjobStopped Notification', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let cronjobService;

  let defaultIdentity;

  const processModelId = 'test_management_api_cyclic_timers';

  const cronjobStoppedMessagePath = 'cronjob_stopped';
  const sampleCronjobStoppedMessage = {
    processModelId: processModelId,
    cronjobs: [
      {
        subscription: {
          eventName: 'TimerStartEvent_1_d2263515-0fca-4ea3-a4df-05fba899de99',
          id: '05722c48-4ffa-4022-8f3d-c8bdd966e06e',
          onlyReceiveOnce: false,
        },
        startEventId: 'TimerStartEvent_1',
        cronjob: '*/15 1 * * *',
      },
    ],
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    cronjobService = await testFixtureProvider.resolveAsync('CronjobService');
  });

  after(async () => {
    await cronjobService.stop();
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a cronjob is stopped', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationSubscription;

      const onCronjobStoppedCallback = async (CronjobStoppedMessage) => {

        should.exist(CronjobStoppedMessage);
        should(CronjobStoppedMessage).have.property('processModelId');
        should(CronjobStoppedMessage).have.property('cronjobs');
        should(CronjobStoppedMessage.processModelId).be.equal(sampleCronjobStoppedMessage.processModelId);

        await testFixtureProvider
          .managementApiClient
          .removeSubscription(defaultIdentity, notificationSubscription);

        resolve();
      };

      notificationSubscription = await testFixtureProvider
        .managementApiClient
        .onCronjobStopped(defaultIdentity, onCronjobStoppedCallback);

      await cronjobService.start();

      await cronjobService.stop();

    });
  });

  it('should no longer receive CronjobStopped notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClient
      .onCronjobStopped(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(cronjobStoppedMessagePath, sampleCronjobStoppedMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(cronjobStoppedMessagePath, sampleCronjobStoppedMessage);
    eventAggregator.publish(cronjobStoppedMessagePath, sampleCronjobStoppedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive CronjobStopped notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .managementApiClient
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .managementApiClient
        .onCronjobStopped(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(cronjobStoppedMessagePath, sampleCronjobStoppedMessage);
      eventAggregator.publish(cronjobStoppedMessagePath, sampleCronjobStoppedMessage);
    });
  });

  it('should only receive one CronjobStopped notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClient
      .onCronjobStopped(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(cronjobStoppedMessagePath, sampleCronjobStoppedMessage);

    // Wait some time before publishing another event, or we risk the subscription being stopped
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(cronjobStoppedMessagePath, sampleCronjobStoppedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

});
