'use strict';

import * as uuid from 'uuid';

import {IEventAggregator} from '@essential-projects/event_aggregator_contracts';
import {
  ProcessStartRequestPayload,
  ProcessStartResponsePayload,
  StartCallbackType,
} from '@process-engine/consumer_api_contracts';

import {IFlowNodeInstanceService} from '@process-engine/process_engine_contracts';

import {TestFixtureProvider} from './test_fixture_provider';

/**
 * This class handles the creation of process instances and waits for a process instance to reach a user task.
 *
 * Only to be used in conjunction with the user task tests.
 */
export class ProcessInstanceHandler {

  private _eventAggregator: IEventAggregator;
  private _testFixtureProvider: TestFixtureProvider;

  constructor(testFixtureProvider: TestFixtureProvider) {
    this._testFixtureProvider = testFixtureProvider;
  }

  private get eventAggregator(): IEventAggregator {
    if (!this._eventAggregator) {
      this._eventAggregator = this.testFixtureProvider.resolve<IEventAggregator>('EventAggregator');
    }

    return this._eventAggregator;
  }

  private get testFixtureProvider(): TestFixtureProvider {
    return this._testFixtureProvider;
  }

  public async startProcessInstanceAndReturnCorrelationId(processModelId: string, correlationId?: string, inputValues?: any): Promise<string> {

    const startEventId: string = 'StartEvent_1';
    const startCallbackType: StartCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload: ProcessStartRequestPayload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: inputValues || {},
    };

    const result: ProcessStartResponsePayload = await this.testFixtureProvider
      .managementApiClientService
      .startProcessInstance(this.testFixtureProvider.identities.defaultUser, processModelId, startEventId, payload, startCallbackType);

    return result.correlationId;
  }

  public async waitForProcessInstanceToReachSuspendedTask(correlationId: string, processModelId?: string): Promise<void> {

    const maxNumberOfRetries: number = 60;
    const delayBetweenRetriesInMs: number = 200;

    const flowNodeInstanceService: IFlowNodeInstanceService = this.testFixtureProvider.resolve<IFlowNodeInstanceService>('FlowNodeInstanceService');

    for (let i: number = 0; i < maxNumberOfRetries; i++) {

      await this.wait(delayBetweenRetriesInMs);

      let flowNodeInstances: Array<any> = await flowNodeInstanceService.querySuspendedByCorrelation(correlationId);

      if (processModelId) {
        flowNodeInstances = flowNodeInstances.filter((fni: any) => {
          return fni.tokens[0].processModelId === processModelId;
        });
      }

      if (flowNodeInstances.length >= 1) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance like failed to start!`);
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
  public waitForProcessInstanceToEnd(correlationId: string, processModelId: string, resolveFunc: Function): void {
    const endMessageToWaitFor: string = `/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`;
    this.eventAggregator.subscribeOnce(endMessageToWaitFor, resolveFunc);
  }

  public async wait(delayTimeInMs: number): Promise<void> {
    await new Promise((resolve: Function): void => {
      setTimeout(() => {
        resolve();
      }, delayTimeInMs);
    });
  }

}
