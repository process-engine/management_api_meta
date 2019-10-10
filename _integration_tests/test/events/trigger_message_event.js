'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../dist/commonjs');

describe('Management API: POST  ->  /messages/:message_name/trigger', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelIdMessageEvent = 'test_management_api_message_event';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelIdMessageEvent]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should fail to trigger the event, when the user is unauthorized', async () => {

    const messageEventName = 'test_message_event';
    const payload = {};

    try {
      await testFixtureProvider
        .managementApiClient
        .triggerMessageEvent({}, messageEventName, payload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to trigger the event, when the user forbidden to retrieve it', async () => {

    const messageEventName = 'test_message_event';
    const payload = {};

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      await testFixtureProvider
        .managementApiClient
        .triggerMessageEvent(restrictedIdentity, messageEventName, payload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should successfully trigger the given message event, even if no process is currently listening for it.', async () => {

    const messageEventName = 'test_message_event';
    const payload = {};

    await testFixtureProvider
      .managementApiClient
      .triggerMessageEvent(defaultIdentity, messageEventName, payload);
  });

  it('should successfully trigger the given message event.', async () => {

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdMessageEvent);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId);

    const messageEventName = 'test_message_event';
    const payload = {};

    // To ensure that all works as expected, we must intercept the EndEvent notification that gets send by the Process instance.
    // Otherwise, there is no way to know for sure that the process has actually received the event we triggered.
    return new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      testFixtureProvider
        .managementApiClient
        .triggerMessageEvent(defaultIdentity, messageEventName, payload);
    });
  });

});
