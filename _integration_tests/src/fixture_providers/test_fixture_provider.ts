/* eslint-disable @typescript-eslint/member-naming */
import * as fs from 'fs';
import * as jsonwebtoken from 'jsonwebtoken';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {HttpExtension} from '@essential-projects/http_extension';
import {IIdentity, TokenBody} from '@essential-projects/iam_contracts';

import {IDeploymentApi} from '@process-engine/deployment_api_contracts';
import {IManagementApi} from '@process-engine/management_api_contracts';

import {initializeBootstrapper} from './setup_ioc_container';

const logger: Logger = Logger.createLogger('test:bootstrapper');

export type IdentityCollection = {[userName: string]: IIdentity};

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

    await this.initializeBootstrapper();

    await this.bootstrapper.start();

    await this.createMockIdentities();

    this._deploymentApiService = await this.resolveAsync<IDeploymentApi>('DeploymentApiService');
    this._managementApiClientService = await this.resolveAsync<IManagementApi>('ManagementApiClientService');
  }

  public async tearDown(): Promise<void> {
    const httpExtension = await this.container.resolveAsync<HttpExtension>('HttpExtension');
    await httpExtension.close();
    await this.bootstrapper.stop();
  }

  public resolve<TModule>(moduleName: string, args?: any): TModule {
    return this.container.resolve<TModule>(moduleName, args);
  }

  public async resolveAsync<TModule>(moduleName: string, args?: any): Promise<TModule> {
    return this.container.resolveAsync<TModule>(moduleName, args);
  }

  public async importProcessFiles(processFileNames: Array<string>): Promise<void> {

    for (const processFileName of processFileNames) {
      await this.registerProcess(processFileName);
    }
  }

  public readProcessModelFile(processFileName: string): string {

    const bpmnFolderPath = this.getBpmnDirectoryPath();
    const fullFilePath = path.join(bpmnFolderPath, `${processFileName}.bpmn`);

    const fileContent = fs.readFileSync(fullFilePath, 'utf-8');

    return fileContent;
  }

  public getBpmnDirectoryPath(): string {

    const bpmnDirectoryName = 'bpmn';
    let rootDirPath = process.cwd();
    const integrationTestDirName = '_integration_tests';

    if (!rootDirPath.endsWith(integrationTestDirName)) {
      rootDirPath = path.join(rootDirPath, integrationTestDirName);
    }

    return path.join(rootDirPath, bpmnDirectoryName);
  }

  private async initializeBootstrapper(): Promise<void> {

    try {
      this.container = await initializeBootstrapper();

      const appPath = path.resolve(__dirname);
      this.bootstrapper = await this.container.resolveAsync<AppBootstrapper>('AppBootstrapper', [appPath]);

      logger.info('Bootstrapper started.');
    } catch (error) {
      logger.error('Failed to start bootstrapper!', error);
      throw error;
    }
  }

  private async createMockIdentities(): Promise<void> {

    this._identities = {
      // all access user
      defaultUser: await this.createIdentity('defaultUser'),
      secondDefaultUser: await this.createIdentity('secondDefaultUser'),
      superAdmin: await this.createIdentity('superAdmin'),
      // no access user
      restrictedUser: await this.createIdentity('restrictedUser'),
    };
  }

  private async createIdentity(userId: string): Promise<IIdentity> {

    const tokenBody: TokenBody = {
      sub: userId,
      name: 'hellas',
    };

    const signOptions: jsonwebtoken.SignOptions = {
      expiresIn: 60,
    };

    const encodedToken = jsonwebtoken.sign(tokenBody, 'randomkey', signOptions);

    return {
      token: encodedToken,
      userId: userId,
    };
  }

  private async registerProcess(processFileName: string): Promise<void> {

    const bpmnDirectoryPath = this.getBpmnDirectoryPath();
    const processFilePath = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    const processName = path.parse(processFileName).name;

    await this.deploymentApiService.importBpmnFromFile(this.identities.defaultUser, processFilePath, processName, true);
  }

}
