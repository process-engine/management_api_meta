import * as Bluebird from 'bluebird';
import {Logger} from 'loggerhythm';
import * as uuid from 'node-uuid';

import {DataModels, IManagementApiClient} from '@process-engine/management_api_contracts';

import * as setup from './setup';

// The ProcessEngine uses Bluebird as its default Promise library.
// So we need to override the global Promise variable with Bluebird here.
Bluebird.config({
  cancellation: true,
});

global.Promise = Bluebird;

const logger = Logger.createLogger('management_api_sample:internal_process_engine');

/**
 * This sample will use the ManagementApiClient to do the following:
 * - Start a ProcessInstance with the given processModelId.
 * - Retrieve a list of waiting UserTasks.
 * - Finish a waiting UserTask with the given result.
 * - Wait for the process to finish and the retrieve the result.
 */
// tslint:disable:no-magic-numbers
async function executeSample(): Promise<void> {

  // The id of the ProcessModel to start.
  const processModelId = 'sample_process';

  // Wait for the setup to finish and the bootstrapper to start
  await setup.start();

  // Import the sample process into the database.
  await setup.registerProcess(processModelId);

  const identity = await setup.createIdentity();

  // Retrieve the managementApiClient.
  // It will be using an InternalAccessor for accessing a ProcessEngine
  // that is included with the application.
  const managementApiClient = await setup.resolveAsync<IManagementApiClient>('ManagementApiClient');

  // The id of the StartEvent with which to start the ProcessInstance.
  const startEventId = 'StartEvent_1';

  // The correlationId is used to associate multiple ProcessInstances with one another.
  // This is currently the case when using subprocesses.
  // Adding a correlationId here is optional. If none is provided, the Management API will generate one.
  // The property 'inputValues' can be used to provide parameters to the ProcessInstance's initial token.
  const payload: DataModels.ProcessModels.ProcessStartRequestPayload = {
    correlationId: uuid.v4(),
    inputValues: {},
  };

  // This will tell the Management API to resolve immediately after the process was started.
  // Note that this is the only way to handle waiting UserTasks.
  // If you were to set this callback to 'CallbackOnProcessInstanceFinished' or 'CallbackOnEndEventReached',
  // the Management API would wait to resolve until the process is finished.
  // Which is not possible, if there is an interrupting UserTask.
  const startCallbackType = DataModels.ProcessModels.StartCallbackType.CallbackOnProcessInstanceCreated;

  // Start the ProcessInstance and wait for the service to resolve.
  // The result returns the id of the correlation that the ProcessInstance was added to.
  const processStartResult =
    await managementApiClient.startProcessInstance(identity, processModelId, payload, startCallbackType, startEventId);

  const correlationId = processStartResult.correlationId;
  const processInstanceId = processStartResult.processInstanceId;

  // Allow for the ProcessInstance execution to reach the UserTask.
  await wait(500);

  // Get a list of all waiting UserTasks, using the ProcessModelId and the CorrelationId.
  const waitingUserTasks = await managementApiClient.getUserTasksForProcessModelInCorrelation(identity, processModelId, correlationId);

  // There should be one waiting UserTask.
  const userTask = waitingUserTasks.userTasks[0];

  // Set a UserTask result and finish the UserTask.
  // Note that the IDs contained in 'formFields' must each reflect a form field of the UserTask you want to finish.
  const userTaskResult: DataModels.UserTasks.UserTaskResult = {
    formFields: {
      TaskWasSuccessful: true,
    },
  };

  await managementApiClient.finishUserTask(identity, processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskResult);

  // Now wait for the process to finish
  await wait(500);

  // Lastly, retrieve the result through the Management API and print it.
  const processInstance = await managementApiClient.getProcessInstanceById(identity, processInstanceId);

  logger.info('The ProcessInstance was finished with the following state:', processInstance.state);
}

async function wait(timeoutDuration: number): Promise<void> {

  // Allow for the ProcessInstance to proceed to the UserTask.
  await new Promise((resolve: Function, reject: Function): void => {
    setTimeout((): void => {
      resolve();
    }, timeoutDuration);
  });
}

executeSample()
  .then((): void => {
    process.exit(0);
  })
  .catch((error: Error): void => {
    logger.error('Something went wrong while running the sample!', error.message);
    process.exit(0);
  });
