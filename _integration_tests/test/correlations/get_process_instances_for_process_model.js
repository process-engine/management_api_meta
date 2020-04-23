'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../dist/commonjs/').TestFixtureProvider;

describe('ManagementAPI: GetProcessInstancesForProcessModel', () => {

  let testFixtureProvider;
  let defaultIdentity;
  let secondIdentity;
  let superAdmin;

  const processModelId = 'test_management_api_generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondIdentity = testFixtureProvider.identities.secondDefaultUser;
    superAdmin = testFixtureProvider.identities.superAdmin;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      await createFinishedProcessInstance(defaultIdentity);
      await createFinishedProcessInstance(secondIdentity);
    });

    after(async () => {
      // The ProcessInstances must be removed, so they won't interfere with the pagination tests.
      await testFixtureProvider.clearDatabases();
    });

    it('should return all ProcessInstances with a matching ProcessModelId for the default user', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(defaultIdentity, processModelId);

        should(processInstanceList.processInstances).be.an.Array();
        should(processInstanceList.processInstances).have.a.lengthOf(1);

      processInstanceList.processInstances.forEach((processInstance) => {
        should(processInstance).have.property('correlationId');
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processModelId');
        should(processInstance.processModelId).be.equal(processModelId);
        should(processInstance).have.property('processInstanceId');
        should(processInstance).have.property('hash');
        should(processInstance).have.property('xml');
        should(processInstance).have.property('state');
        should(processInstance).have.property('identity');
        should(processInstance.identity).be.eql(defaultIdentity);
        should(processInstance).have.property('createdAt');
      });
    });

    it('should return all ProcessInstances with a matching ProcessModelId for all users, if the request is made by a superAdmin', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(superAdmin, processModelId);

        should(processInstanceList.processInstances).be.an.Array();
        should(processInstanceList.processInstances).have.a.lengthOf(2);

      processInstanceList.processInstances.forEach((processInstance) => {
        should(processInstance).have.property('correlationId');
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processModelId');
        should(processInstance.processModelId).be.equal(processModelId);
        should(processInstance).have.property('processInstanceId');
        should(processInstance).have.property('hash');
        should(processInstance).have.property('xml');
        should(processInstance).have.property('state');
        should(processInstance).have.property('identity');
        should(processInstance).have.property('createdAt');
      });
    });

    it('should return an empty Array, if no ProcessInstances for the given ProcessModelId exist', async () => {
      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(superAdmin, 'some_id_with_no_instances');

      should(processInstanceList.processInstances).be.an.Array();
      should(processInstanceList.processInstances).be.empty();
    });
  });

  describe('Pagination', () => {

    const processModelId = 'test_management_api_generic_sample';

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      // This will create 10 sample ProcessInstances.
      for (let i = 0; i < 10; i++) {
        await createFinishedProcessInstance(defaultIdentity, processModelId);
      }
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(defaultIdentity, processModelId, 5);

      should(processInstanceList.processInstances).be.an.Array();
      should(processInstanceList.processInstances).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(defaultIdentity, processModelId, 0, 2);

      should(processInstanceList.processInstances).be.an.Array();
      should(processInstanceList.processInstances).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(defaultIdentity, processModelId, 5, 2);

      should(processInstanceList.processInstances).be.an.Array();
      should(processInstanceList.processInstances).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(defaultIdentity, processModelId, 7, 5);

      should(processInstanceList.processInstances).be.an.Array();
      should(processInstanceList.processInstances).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(defaultIdentity, processModelId, 0, 20);

      should(processInstanceList.processInstances).be.an.Array();
      should(processInstanceList.processInstances).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesForProcessModel(defaultIdentity, processModelId, 1000);

      should(processInstanceList.processInstances).be.an.Array();
      should(processInstanceList.processInstances).be.empty();
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve the ProcessInstances, if the user is unauthorized', async () => {
      try {
        const processInstanceList = await testFixtureProvider
          .managementApiClient
          .getProcessInstancesForProcessModel({}, processModelId);

        should.fail(processInstanceList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });

  async function createFinishedProcessInstance(identity) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(identity, processModelId, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

});
