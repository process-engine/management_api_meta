import {InvocationContainer} from 'addict-ioc';

import {
  ManagementApiClient,
  ExternalAccessor,
} from '@process-engine/management_api_client';

export function registerInContainer(container: InvocationContainer): void {

  container.register('ManagementApiExternalAccessor', ExternalAccessor)
    .dependencies('HttpClient');

  container.register('ManagementApiClient', ManagementApiClient)
    .dependencies('ManagementApiExternalAccessor');
}
