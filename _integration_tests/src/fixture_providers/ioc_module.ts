'use strict';

import {IamServiceMock} from '../mocks/index';

import {
  ExternalAccessor as ManagementApiExternalAccessor,
  InternalAccessor as ManagementApiInternalAccessor,
  ManagementApiClientService,
} from '@process-engine/management_api_client';

export function registerInContainer(container: any): void {

  const accessManagementApiInternally: boolean = process.env.MANAGEMENT_API_ACCESS_TYPE === 'internal';

  if (accessManagementApiInternally) {
    container.register('ManagementApiInternalAccessor', ManagementApiInternalAccessor)
      .dependencies('ManagementApiService');

    container.register('ManagementApiClientService', ManagementApiClientService)
      .dependencies('ManagementApiInternalAccessor');
  } else {
    container.register('ManagementApiExternalAccessor', ManagementApiExternalAccessor)
      .dependencies('HttpService')
      .configure('management_api:external_accessor');

    container.register('ManagementApiClientService', ManagementApiClientService)
      .dependencies('ManagementApiExternalAccessor');
  }

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
}
