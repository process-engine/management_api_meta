'use strict';

const should = require('should');
const uuid = require('uuid');

const TestFixtureProvider = require('../../dist/commonjs/test_fixture_provider').TestFixtureProvider;

// NOTE:
// The deployment api alrady contains extensive testing for this, so there is no need to cover this here.
// We just need to ensure that everything gets passed correctly to the deployment api and leave the rest to it.
describe('Management API:   POST  ->  /process_models/:process_model_id/update', () => {

  let testFixtureProvider;

  const processModelId = 'generic_sample';
  let processModelAsXml;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    processModelAsXml = testFixtureProvider.readProcessModelFromFile(processModelId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully import the process model, if it does not yet exist and overwriteExisting is set to false', async () => {

    // This is to ensure that any existing process models will not falsify the results.
    const uniqueImportName = uuid.v4();

    const importPayload = {
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    await testFixtureProvider.managementApiClientService.updateProcessModelById(testFixtureProvider.context, uniqueImportName, importPayload);

    await assertThatImportWasSuccessful();
  });

  async function assertThatImportWasSuccessful() {

    const executionContextFacade = await testFixtureProvider.createExecutionContextFacadeForContext(testFixtureProvider.context);

    const processModelService = await testFixtureProvider.resolveAsync('ProcessModelService');

    const existingProcessModel = await processModelService.getProcessModelById(executionContextFacade, processModelId);

    should.exist(existingProcessModel);
  }

});
