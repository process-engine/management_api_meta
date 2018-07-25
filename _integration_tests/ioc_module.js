'use strict';

const {
  ManagementApiClientService,
  ExternalAccessor,
  InternalAccessor,
} = require('@process-engine/management_api_client');

const {IamServiceMock} = require('./dist/commonjs/index');

const registerInContainer = (container) => {

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);

  const accessManagementApiInternally = process.env.MANAGEMENT_API_ACCESS_TYPE === 'internal';

  if (accessManagementApiInternally) {
    container.register('ManagementApiInternalAccessor', InternalAccessor)
      .dependencies('ManagementApiService');

    container.register('ManagementApiClientService', ManagementApiClientService)
      .dependencies('ManagementApiInternalAccessor');
  } else {
    container.register('ManagementApiExternalAccessor', ExternalAccessor)
      .dependencies('HttpService');

    container.register('ManagementApiClientService', ManagementApiClientService)
      .dependencies('ManagementApiExternalAccessor');
  }
};

module.exports.registerInContainer = registerInContainer;
