import {IContainer} from 'addict-ioc';

import {
  ManagementApiClientService,
  ExternalAccessor as ManagementApiExternalAccessor,
  InternalAccessor as ManagementApiInternalAccessor,
} from '@process-engine/management_api_client';
import {IamServiceMock} from '../mocks/index';

export function registerInContainer(container: IContainer): void {

  const accessManagementApiExternally = process.env.MANAGEMENT_API_ACCESS_TYPE === 'external';

  if (accessManagementApiExternally) {
    container.register('ManagementApiExternalAccessor', ManagementApiExternalAccessor)
      .dependencies('HttpClient')
      .configure('management_api:external_accessor');

    container.register('ManagementApiClient', ManagementApiClientService)
      .dependencies('ManagementApiExternalAccessor');
  } else {
    container.register('ManagementApiInternalAccessor', ManagementApiInternalAccessor)
      .dependencies('ManagementApiService');

    container.register('ManagementApiClient', ManagementApiClientService)
      .dependencies('ManagementApiInternalAccessor');
  }

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
}
