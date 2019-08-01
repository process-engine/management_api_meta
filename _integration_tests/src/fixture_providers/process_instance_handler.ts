import * as uuid from 'node-uuid';

import {EventReceivedCallback, IEventAggregator} from '@essential-projects/event_aggregator_contracts';
import {IIdentity} from '@essential-projects/iam_contracts';

import {FlowNodeInstance, IFlowNodeInstanceService} from '@process-engine/flow_node_instance.contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {TestFixtureProvider} from './test_fixture_provider';

/**
 * This class handles the creation of process instances and waits for a process instance to reach a user task.
 *
 * Only to be used in conjunction with the user task tests.
 */
export class ProcessInstanceHandler {

  private eventAggregator: IEventAggregator;
  private testFixtureProvider: TestFixtureProvider;

  constructor(testFixtureProvider: TestFixtureProvider) {
    this.testFixtureProvider = testFixtureProvider;
    this.eventAggregator = this.testFixtureProvider.resolve<IEventAggregator>('EventAggregator');
  }

  public async startProcessInstanceAndReturnCorrelationId(
    processModelId: string,
    correlationId?: string,
    inputValues?: any,
    identity?: IIdentity,
  ): Promise<string> {

    const startEventId = 'StartEvent_1';
    const startCallbackType = DataModels.ProcessModels.StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: inputValues || {},
    };

    const identityToUse = identity || this.testFixtureProvider.identities.defaultUser;

    const result = await this.testFixtureProvider
      .managementApiClient
      .startProcessInstance(identityToUse, processModelId, payload, startCallbackType, startEventId);

    return result.correlationId;
  }

  public async startProcessInstanceAndReturnResult(
    processModelId: string,
    correlationId?: string,
    inputValues?: any,
    identity?: IIdentity,
  ): Promise<DataModels.ProcessModels.ProcessStartResponsePayload> {

    const startEventId = 'StartEvent_1';
    const startCallbackType = DataModels.ProcessModels.StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: inputValues || {},
    };

    const identityToUse = identity || this.testFixtureProvider.identities.defaultUser;

    const result = await this.testFixtureProvider
      .managementApiClient
      .startProcessInstance(identityToUse, processModelId, payload, startCallbackType, startEventId);

    return result;
  }

  public async waitForProcessInstanceToReachSuspendedTask(
    correlationId: string,
    processModelId?: string,
    expectedNumberOfWaitingTasks: number = 1,
  ): Promise<void> {

    const maxNumberOfRetries = 60;
    const delayBetweenRetriesInMs = 200;

    const flowNodeInstanceService = this.testFixtureProvider.resolve<IFlowNodeInstanceService>('FlowNodeInstanceService');

    for (let i = 0; i < maxNumberOfRetries; i++) {

      await this.wait(delayBetweenRetriesInMs);

      let flowNodeInstances = await flowNodeInstanceService.querySuspendedByCorrelation(correlationId);

      if (processModelId) {
        flowNodeInstances = flowNodeInstances.filter((fni: FlowNodeInstance): boolean => {
          return fni.tokens[0].processModelId === processModelId;
        });
      }

      const enoughWaitingTasksFound = flowNodeInstances.length >= expectedNumberOfWaitingTasks;
      if (enoughWaitingTasksFound) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance likely failed to start!`);
  }

  /**
   * There is a gap between the finishing of ManualTasks/UserTasks and the end
   * of the ProcessInstance.
   * Mocha resolves and disassembles the backend BEFORE the process was finished,
   * which leads to inconsistent database entries.
   * To avoid a messed up database that could break other tests, we must wait for
   * each ProcessInstance to finishe before progressing.
   *
   * @param correlationId  The correlation in which the process runs.
   * @param processModelId The id of the process model to wait for.
   * @param resolveFunc    The function to call when the process was finished.
   */
  public waitForProcessInstanceToEnd(correlationId: string, processModelId: string, resolveFunc: EventReceivedCallback): void {
    const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`;
    this.eventAggregator.subscribeOnce(endMessageToWaitFor, resolveFunc);
  }

  public waitForProcessWithInstanceIdToEnd(processInstanceId: string, resolveFunc: EventReceivedCallback): void {
    const endMessageToWaitFor = `/processengine/process/${processInstanceId}/ended`;
    this.eventAggregator.subscribeOnce(endMessageToWaitFor, resolveFunc);
  }

  public async wait(delayTimeInMs: number): Promise<void> {
    await new Promise((resolve: Function): void => {
      setTimeout((): void => {
        resolve();
      }, delayTimeInMs);
    });
  }

}
