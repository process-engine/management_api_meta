import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';
const logger: Logger = Logger.createLogger('test:bootstrapper');

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';

import {IDeploymentApi} from '@process-engine/deployment_api_contracts';
import {IManagementApi} from '@process-engine/management_api_contracts';

import {initializeBootstrapper} from './setup_ioc_container';

export type IdentityCollection = {
  defaultUser: IIdentity;
  restrictedUser: IIdentity;
};

export class TestFixtureProvider {

  private bootstrapper: AppBootstrapper;
  private container: InvocationContainer;

  private _deploymentApiService: IDeploymentApi;
  private _managementApiClientService: IManagementApi;

  private _identities: IdentityCollection;

  public get identities(): IdentityCollection {
    return this._identities;
  }

  public get deploymentApiService(): IDeploymentApi {
    return this._deploymentApiService;
  }

  public get managementApiClientService(): IManagementApi {
    return this._managementApiClientService;
  }

  public async initializeAndStart(): Promise<void> {

    await this._initializeBootstrapper();

    await this.bootstrapper.start();

    await this._createMockIdentities();

    this._deploymentApiService = await this.resolveAsync<IDeploymentApi>('DeploymentApiService');
    this._managementApiClientService = await this.resolveAsync<IManagementApi>('ManagementApiClientService');
  }

  public async tearDown(): Promise<void> {
    const httpExtension: any = await this.container.resolveAsync('HttpExtension');
    await httpExtension.close();
    await this.bootstrapper.stop();
  }

  public async resolveAsync<T>(moduleName: string, args?: any): Promise<any> {
    return this.container.resolveAsync<T>(moduleName, args);
  }

  public async importProcessFiles(processFileNames: Array<string>): Promise<void> {

    for (const processFileName of processFileNames) {
      await this._registerProcess(processFileName);
    }
  }

  public readProcessModelFile(processFileName: string): string {

    const bpmnFolderPath: string = this.getBpmnDirectoryPath();
    const fullFilePath: string = path.join(bpmnFolderPath, `${processFileName}.bpmn`);

    const fileContent: string = fs.readFileSync(fullFilePath, 'utf-8');

    return fileContent;
  }

  public getBpmnDirectoryPath(): string {

    const bpmnDirectoryName: string = 'bpmn';
    let rootDirPath: string = process.cwd();
    const integrationTestDirName: string = '_integration_tests';

    if (!rootDirPath.endsWith(integrationTestDirName)) {
      rootDirPath = path.join(rootDirPath, integrationTestDirName);
    }

    return path.join(rootDirPath, bpmnDirectoryName);
  }

  private async _initializeBootstrapper(): Promise<void> {

    try {
      this.container = await initializeBootstrapper();

      const appPath: string = path.resolve(__dirname);
      this.bootstrapper = await this.container.resolveAsync<AppBootstrapper>('AppBootstrapper', [appPath]);

      logger.info('Bootstrapper started.');
    } catch (error) {
      logger.error('Failed to start bootstrapper!', error);
      throw error;
    }
  }

  private async _createMockIdentities(): Promise<void> {

    this._identities = {
      // all access user
      defaultUser: await this._createIdentity('defaultUser'),
      // no access user
      restrictedUser: await this._createIdentity('restrictedUser'),
    };
  }

  private async _createIdentity(username: string): Promise<IIdentity> {

    // Note: Since the iam facade is mocked, it doesn't matter what type of token is used here.
    // It only matters that one is present.
    return <IIdentity> {
      token: username,
    };
  }

  private async _registerProcess(processFileName: string): Promise<void> {

    const bpmnDirectoryPath: string = this.getBpmnDirectoryPath();
    const processFilePath: string = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    const processName: string = path.parse(processFileName).name;

    await this.deploymentApiService.importBpmnFromFile(this.identities.defaultUser, processFilePath, processName, true);
  }
}
