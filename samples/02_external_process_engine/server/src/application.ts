import * as Bluebird from 'bluebird';
import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';
import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';

import {IProcessModelService} from '@process-engine/process_model.contracts';

// The ProcessEngine uses Bluebird as its default Promise library.
// So we need to override the global Promise variable with Bluebird here.
Bluebird.config({
  cancellation: true,
});

global.Promise = Bluebird;

const logger = Logger.createLogger('ssample:external:server');

// These are the names of the modules, whose ioc_modules will be included in the ioc container.
const iocModuleNames = [
  '@essential-projects/bootstrapper',
  '@essential-projects/bootstrapper_node',
  '@essential-projects/event_aggregator',
  '@essential-projects/http_extension',
  '@essential-projects/sequelize_connection_manager',
  '@essential-projects/timing',
  '@process-engine/correlation.service',
  '@process-engine/correlations.repository.sequelize',
  '@process-engine/cronjob_history.service',
  '@process-engine/cronjob_history.repository.sequelize',
  '@process-engine/external_task.repository.sequelize',
  '@process-engine/flow_node_instance.repository.sequelize',
  '@process-engine/flow_node_instance.service',
  '@process-engine/iam',
  '@process-engine/logging_api_core',
  '@process-engine/logging.repository.file_system',
  '@process-engine/management_api_core',
  '@process-engine/management_api_http',
  '@process-engine/metrics_api_core',
  '@process-engine/metrics.repository.file_system',
  '@process-engine/process_engine_core',
  '@process-engine/process_model.repository.sequelize',
  '@process-engine/process_model.service',
  '@process-engine/process_model.use_case',
  '../../', // This points to the top-level ioc module located in this sample.
];

// This imports all the listed ioc modules and stores them.
const iocModules = iocModuleNames.map<any>((moduleName: string): void => {
  // eslint-disable-next-line
  return require(`${moduleName}/ioc_module`);
});

let bootstrapper: AppBootstrapper;

let container: InvocationContainer;

/**
 * Initializes the IoC container, starts the bootstrapper
 * and creates sample users for authentication purposes.
 *
 * @function start
 * @async
 */
async function start(): Promise<void> {

  try {
    // Create a new IoC container.
    // Using the InvocationContainer allows us to perform functions for each registered component,
    // whenever a new instance for that component is created.
    // In this case, we want the container to run the 'initialze' function for each registered component.
    container = new InvocationContainer({
      defaults: {
        conventionCalls: ['initialize'],
      },
    });

    // Register all the listed ioc modules at the container.
    for (const iocModule of iocModules) {
      iocModule.registerInContainer(container);
    }

    // Calling 'validateDependencies' ensures data consistency and detects misconfigurations
    // with the registered components, like circular-dependencies.
    container.validateDependencies();

    const appPath = path.resolve(__dirname);

    bootstrapper = await container.resolveAsync<AppBootstrapper>('AppBootstrapper', [appPath]);

    await bootstrapper.start();
    await importSampleProcess();

    logger.info('Bootstrapper started.');
  } catch (error) {
    logger.error('Failed to start bootstrapper!', error);
    throw error;
  }
}

/**
 * Imports the sample process into the database.
 */
async function importSampleProcess(): Promise<void> {

  const processFileName = 'sample_process';

  const dummyIdentity: IIdentity = {
    token: 'ZHVtbXlfdG9rZW4=',
    userId: 'dummy_token',
  };

  const xml = readProcessModelFromFile(processFileName);

  // Get the ProcessModelService, which ahndles the import of ProcessModels.
  const processModelService = await container.resolveAsync<IProcessModelService>('ProcessModelService');

  // Save the ProcessModel.
  await processModelService.persistProcessDefinitions(dummyIdentity, processFileName, xml, true);
}

/**
 * Reads the content of the given ProcessModelFile and imports it into the
 * database.
 *
 * @param fileName The name of the ProcessModelFile to read.
 */
function readProcessModelFromFile(fileName: string): string {

  const bpmnFolderLocation = getBpmnDirectoryPath();
  const processModelPath = path.join(bpmnFolderLocation, `${fileName}.bpmn`);

  const processModelAsXml = fs.readFileSync(processModelPath, 'utf-8');

  return processModelAsXml;
}

/**
 * Generate an absoulte path, which points to the bpmn directory of this sample.
 */
function getBpmnDirectoryPath(): string {

  const bpmnDirectoryName = 'bpmn';
  const rootDirPath = process.cwd();

  return path.join(rootDirPath, bpmnDirectoryName);
}

start();
