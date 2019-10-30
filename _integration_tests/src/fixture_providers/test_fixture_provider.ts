/* eslint-disable @typescript-eslint/member-naming */
import * as fs from 'fs';
import * as jsonwebtoken from 'jsonwebtoken';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';

import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {HttpExtension} from '@essential-projects/http_extension';
import {IIdentity, TokenBody} from '@essential-projects/iam_contracts';

import {IManagementApiClient} from '@process-engine/management_api_contracts';
import {IProcessModelUseCases} from '@process-engine/persistence_api.contracts';

import {initializeBootstrapper} from './setup_ioc_container';

const logger: Logger = Logger.createLogger('test:bootstrapper');

process.on('unhandledRejection', (err: Error): void => logger.error('Unhandled Rejection Error: ', err));

export type IdentityCollection = {[userName: string]: IIdentity};

export class TestFixtureProvider {

  private bootstrapper: AppBootstrapper;
  private container: InvocationContainer;

  private _managementApiClient: IManagementApiClient;
  private _processModelUseCases: IProcessModelUseCases;

  private _identities: IdentityCollection;

  public get identities(): IdentityCollection {
    return this._identities;
  }

  public get managementApiClient(): IManagementApiClient {
    return this._managementApiClient;
  }

  public get processModelUseCases(): IProcessModelUseCases {
    return this._processModelUseCases;
  }

  public async initializeAndStart(): Promise<void> {

    await this.initializeBootstrapper();

    await this.bootstrapper.start();

    await this.createMockIdentities();

    this._managementApiClient = await this.resolveAsync<IManagementApiClient>('ManagementApiClient');
    this._processModelUseCases = await this.resolveAsync<IProcessModelUseCases>('ProcessModelUseCases');
  }

  public async tearDown(): Promise<void> {
    await this.clearDatabases();

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

  public async clearDatabases(): Promise<void> {

    const processModels = await this.processModelUseCases.getProcessModels(this.identities.superAdmin);

    for (const processModel of processModels) {
      logger.info(`Removing ProcessModel ${processModel.id} and all related data`);
      await this.processModelUseCases.deleteProcessModel(this.identities.superAdmin, processModel.id);
    }
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
    const xml = this.readProcessModelFromFile(processFileName);
    await this.processModelUseCases.persistProcessDefinitions(this.identities.defaultUser, processFileName, xml, true);
  }

  private readProcessModelFromFile(fileName: string): string {

    const bpmnDirectoryPath = this.getBpmnDirectoryPath();
    const processModelPath = path.join(bpmnDirectoryPath, `${fileName}.bpmn`);

    const processModelAsXml = fs.readFileSync(processModelPath, 'utf-8');

    return processModelAsXml;
  }

}
