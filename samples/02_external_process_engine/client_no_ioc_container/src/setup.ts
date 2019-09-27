import {Logger} from 'loggerhythm';

import {IIdentity} from '@essential-projects/iam_contracts';
import {HttpClient} from '@essential-projects/http';

import {ManagementApiClient, ExternalAccessor} from '@process-engine/management_api_client';

const logger = Logger.createLogger('test:bootstrapper');

let httpClient: HttpClient;
let externalAccessor: ExternalAccessor;
let managementApiClient: ManagementApiClient;

/**
 * Creates the management api client and all its required components.
 *
 * @function initialize
 */
export function initialize(): void {

  const httpConfig = {
    url: 'http://localhost:6666',
  };

  logger.info('Creating new ManagementApiClient instance with an external accessor.');
  httpClient = new HttpClient();
  httpClient.config = httpConfig;

  externalAccessor = new ExternalAccessor(httpClient);
  managementApiClient = new ManagementApiClient(externalAccessor);
}

/**
 * Returns the ManagementApiClient.
 */
export function getManagementApiClient(): ManagementApiClient {
  return managementApiClient;
}

/**
 * This will create and return an identity for a sample user.
 * The identity is required for accessing ProcessModels
 * and must be provided to ALL management api functions.
 *
 * @function createIdentity
 * @async
 * @returns A sample identity.
 */
export async function createIdentity(): Promise<IIdentity> {

  return {
    token: 'ZHVtbXlfdG9rZW4=',
    userId: 'dummy_token',
  };
}
