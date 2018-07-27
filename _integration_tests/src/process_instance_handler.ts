'use strict';

import * as uuid from 'uuid';

import {
  ProcessStartRequestPayload,
  ProcessStartResponsePayload,
  StartCallbackType,
} from '@process-engine/consumer_api_contracts';
import {
  ExecutionContext,
  IExecutionContextFacade,
  IExecutionContextFacadeFactory,
  IFlowNodeInstanceService,
} from '@process-engine/process_engine_contracts';

import {IIdentity} from '@essential-projects/iam_contracts';

import {TestFixtureProvider} from './test_fixture_provider';

/**
 * This class handles the creation of process instances and waits for a process instance to reach a user task.
 *
 * Only to be used in conjunction with the user task tests.
 */
export class ProcessInstanceHandler {

  private _testFixtureProvider: TestFixtureProvider;

  constructor(testFixtureProvider: TestFixtureProvider) {
    this._testFixtureProvider = testFixtureProvider;
  }

  private get testFixtureProvider(): TestFixtureProvider {
    return this._testFixtureProvider;
  }

  public async startProcessInstanceAndReturnCorrelationId(processModelId: string, correlationId?: string): Promise<string> {

    const startEventId: string = 'StartEvent_1';
    const startCallbackType: StartCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload: ProcessStartRequestPayload = {
      correlationId: correlationId || uuid.v4(),
      inputValues: {},
    };

    const result: ProcessStartResponsePayload = await this.testFixtureProvider
      .managementApiClientService
      .startProcessInstance(this.testFixtureProvider.context, processModelId, startEventId, payload, startCallbackType);

    return result.correlationId;
  }

  public async waitForProcessInstanceToReachUserTask(correlationId: string): Promise<void> {

    const maxNumberOfRetries: number = 10;
    const delayBetweenRetriesInMs: number = 500;

    const executionContextFacade: IExecutionContextFacade = await this._getExecutionContextFacade();

    const flowNodeInstanceService: IFlowNodeInstanceService =
      await this.testFixtureProvider.resolveAsync<IFlowNodeInstanceService>('FlowNodeInstanceService');

    for (let i: number = 0; i < maxNumberOfRetries; i++) {

      await this.wait(delayBetweenRetriesInMs);

      const flowNodeInstances: Array<any> =
        await flowNodeInstanceService.querySuspendedByCorrelation(executionContextFacade, correlationId);

      if (flowNodeInstances && flowNodeInstances.length >= 1) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance like failed to start!`);
  }

  public async wait(delayTimeInMs: number): Promise<void> {
    await new Promise((resolve: Function): void => {
      setTimeout(() => {
        resolve();
      }, delayTimeInMs);
    });
  }

  private async _getExecutionContextFacade(): Promise<IExecutionContextFacade> {

    const executionContextFacadeFactory: IExecutionContextFacadeFactory =
      await this.testFixtureProvider.resolveAsync<IExecutionContextFacadeFactory>('ExecutionContextFacadeFactory');

    const identity: IIdentity = {
      token: this.testFixtureProvider.context.identity,
    };
    const executionContext: ExecutionContext = new ExecutionContext(identity);
    const executionContextFacade: IExecutionContextFacade = executionContextFacadeFactory.create(executionContext);

    return executionContextFacade;
  }

}
