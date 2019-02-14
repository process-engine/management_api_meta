'use strict';

import {IamServiceMock} from '../mocks/index';

import {
  ExternalAccessor as ManagementApiExternalAccessor,
  InternalAccessor as ManagementApiInternalAccessor,
  ManagementApiClientService,
} from '@process-engine/management_api_client';

export function registerInContainer(container: any): void {

  const accessManagementApiExternally: boolean = process.env.MANAGEMENT_API_ACCESS_TYPE === 'external';

  if (accessManagementApiExternally) {
    container.register('ManagementApiExternalAccessor', ManagementApiExternalAccessor)
      .dependencies('HttpClient')
      .configure('management_api:external_accessor');

    container.register('ManagementApiClientService', ManagementApiClientService)
      .dependencies('ManagementApiExternalAccessor');
  } else {
    container.register('ManagementApiInternalAccessor', ManagementApiInternalAccessor)
      .dependencies('ManagementApiService');

    container.register('ManagementApiClientService', ManagementApiClientService)
      .dependencies('ManagementApiInternalAccessor');
  }

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
}
