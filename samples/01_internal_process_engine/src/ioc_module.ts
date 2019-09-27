import {InvocationContainer} from 'addict-ioc';

import {InternalAccessor, ManagementApiClient} from '@process-engine/management_api_client';

import {IamServiceMock} from './iam_service_mock';

// This function will be called by the setup, when registering ioc modules at the container.
export function registerInContainer(container: InvocationContainer): void {

  // This removes the necessity for having a running IdentityServer during sample execution.
  container.register('IamService', IamServiceMock);

  // Creates a custom ioc registration for the ManagementApiClient and its dependencies.
  container.register('ManagementApiInternalAccessor', InternalAccessor)
    .dependencies(
      'ManagementApiCorrelationService',
      'ManagementApiCronjobService',
      'ManagementApiEmptyActivityService',
      'ManagementApiEventService',
      'ManagementApiFlowNodeInstanceService',
      'ManagementApiKpiService',
      'ManagementApiLoggingService',
      'ManagementApiManualTaskService',
      'ManagementApiNotificationService',
      'ManagementApiProcessModelService',
      'ManagementApiTokenHistoryService',
      'ManagementApiUserTaskService',
    );

  container.register('ManagementApiClient', ManagementApiClient)
    .dependencies('ManagementApiInternalAccessor');
}
