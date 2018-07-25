'use strict';

const should = require('should');

const TestFixtureProvider = require('../../dist/commonjs/test_fixture_provider').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/active', () => {

  let testFixtureProvider;

  const processModelId = 'time_delayed_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    await testFixtureProvider.managementApiClientService.startProcessInstance(testFixtureProvider.context, processModelId, 'StartEvent_1', {});
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return all active correlations through the management api', async () => {

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getAllActiveCorrelations(testFixtureProvider.context);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
      should(correlation).have.property('id');
      should(correlation).have.property('processModelId');
    });
  });

  it('should fail to retrieve a list of correlations, when the user is unauthorized', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getAllActiveCorrelations({});

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
