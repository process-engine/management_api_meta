'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

describe('Management API:   Receive identity specific UserTask Notifications', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_usertask';
  let correlationId;
  let userTaskToFinish;

  const noopCallback = () => {};

  const userTaskWaitingMessagePath = 'user_task_reached';
  const userTaskFinishedMessagePath = 'user_task_finished';
  const sampleUserTaskMessage = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'User_Task_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };
  const sampleUserTaskMessageForDifferentUser = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'User_Task_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleUserTaskMessage.processInstanceOwner = defaultIdentity;
    sampleUserTaskMessageForDifferentUser.processInstanceOwner = testFixtureProvider.identities.restrictedUser;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a UserTask for the given identity is suspended', async () => {

    correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const notificationReceivedCallback = async (userTaskWaitingMessage) => {

        should.exist(userTaskWaitingMessage);
        // Store this for use in the second test, where we wait for the UserTaskFinished notification.
        userTaskToFinish = userTaskWaitingMessage;

        const userTaskList = await testFixtureProvider
          .managementApiClient
          .getUserTasksForProcessModel(defaultIdentity, processModelId);

        const listContainsUserTaskIdFromMessage = userTaskList.userTasks.some((userTask) => {
          return userTask.id === userTaskWaitingMessage.flowNodeId;
        });

        should(listContainsUserTaskIdFromMessage).be.true();

        resolve();
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClient
        .onUserTaskForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification when a UserTask for the given identity is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationReceived = false;

      const notificationReceivedCallback = async (userTaskFinishedMessage) => {
        should(userTaskFinishedMessage).not.be.undefined();
        should(userTaskFinishedMessage.flowNodeId).be.equal(userTaskToFinish.flowNodeId);
        should(userTaskFinishedMessage.processModelId).be.equal(userTaskToFinish.processModelId);
        should(userTaskFinishedMessage.correlationId).be.equal(userTaskToFinish.correlationId);
        notificationReceived = true;
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClient
        .onUserTaskForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      const processFinishedCallback = () => {
        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the finished UserTask!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);
      finishWaitingUserTask();
    });
  });

  it('should fail to subscribe for the UserTaskForIdentityWaiting notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClient
        .onUserTaskForIdentityWaiting({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the UserTaskForIdentityFinished notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClient
        .onUserTaskForIdentityFinished({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should no longer receive UserTaskWaiting notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClient
      .onUserTaskForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);
    eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should no longer receive UserTaskFinished notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClient
      .onUserTaskForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);
    eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive UserTaskWaiting notifications, if subscribeOnce is set to "false"', async () => {

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
        .onUserTaskForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);
      eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);
    });
  });

  it('should continuously receive UserTaskFinished notifications, if subscribeOnce is set to "false"', async () => {

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
        .onUserTaskForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);
      eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);
    });
  });

  it('should only receive UserTaskWaiting notifications about the users own UserTasks', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClient
      .onUserTaskForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);
    eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessageForDifferentUser);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the notifications are received.
    await processInstanceHandler.wait(500);

    await testFixtureProvider
      .managementApiClient
      .removeSubscription(defaultIdentity, subscription);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive UserTaskFinished notifications about the users own UserTasks', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClient
      .onUserTaskForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);
    eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessageForDifferentUser);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the notifications are received.
    await processInstanceHandler.wait(500);

    await testFixtureProvider
      .managementApiClient
      .removeSubscription(defaultIdentity, subscription);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one UserTaskWaiting notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClient
      .onUserTaskForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(userTaskWaitingMessagePath, sampleUserTaskMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one UserTaskFinished notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClient
      .onUserTaskForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(userTaskFinishedMessagePath, sampleUserTaskMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  async function finishWaitingUserTask() {
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const processInstanceId = userTaskToFinish.processInstanceId;
    const userTaskInstanceId = userTaskToFinish.flowNodeInstanceId;

    await testFixtureProvider
      .managementApiClient
      .finishUserTask(defaultIdentity, processInstanceId, userTaskToFinish.correlationId, userTaskInstanceId, userTaskResult);
  }
});
