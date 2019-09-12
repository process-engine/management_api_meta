'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

// NOTE: All main functionality is located in the Consumer API.
// Therefore, we just need to ensure that communication with the API is working correctly.
describe('Management API:   Get waiting Events', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelIdSignalEvent = 'test_management_api_signal_event';
  const eventNameToTriggerAfterTest = 'test_signal_event';

  let correlationId;
  let processInstanceId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelIdSignalEvent]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdSignalEvent);
    correlationId = result.correlationId;
    processInstanceId = result.processInstanceId;
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a correlation\'s events by its correlation_id through the ManagementAPI', async () => {

    const eventList = await testFixtureProvider
      .managementApiClient
      .getWaitingEventsForCorrelation(defaultIdentity, correlationId);

    should(eventList).have.property('events');

    should(eventList.events).be.an.instanceOf(Array);
    should(eventList.events).have.a.lengthOf(1);

    eventList.events.forEach((event) => {
      should(event).have.property('id');
      should(event).have.property('processInstanceId');
      should(event).have.property('flowNodeInstanceId');
      should(event).have.property('correlationId');
      should(event).have.property('processModelId');
      should(event).have.property('bpmnType');
      should(event).have.property('eventType');
      should(event).have.property('eventName');
    });
  });

  it('should return a list of events for a given process model in a given correlation', async () => {

    const eventList = await testFixtureProvider
      .managementApiClient
      .getWaitingEventsForProcessModelInCorrelation(defaultIdentity, processModelIdSignalEvent, correlationId);

    should(eventList).have.property('events');

    should(eventList.events).be.an.instanceOf(Array);
    should(eventList.events.length).be.greaterThan(0);

    eventList.events.forEach((event) => {
      should(event).have.property('id');
      should(event).have.property('processInstanceId');
      should(event).have.property('flowNodeInstanceId');
      should(event).have.property('correlationId');
      should(event).have.property('processModelId');
      should(event).have.property('bpmnType');
      should(event).have.property('eventType');
      should(event).have.property('eventName');
    });
  });

  it('should return a process models events by its process_model_id through the ManagementAPI', async () => {

    const eventList = await testFixtureProvider
      .managementApiClient
      .getWaitingEventsForProcessModel(defaultIdentity, processModelIdSignalEvent);

    should(eventList).have.property('events');

    should(eventList.events).be.an.instanceOf(Array);
    should(eventList.events.length).be.greaterThan(0);

    eventList.events.forEach((event) => {
      should(event).have.property('id');
      should(event).have.property('processInstanceId');
      should(event).have.property('flowNodeInstanceId');
      should(event).have.property('correlationId');
      should(event).have.property('processModelId');
      should(event).have.property('bpmnType');
      should(event).have.property('eventType');
      should(event).have.property('eventName');
    });
  });
});
