import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';
import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity, IIdentityService} from '@essential-projects/iam_contracts';

import {IManagementApiService, ManagementContext} from '@process-engine/management_api_contracts';
import {ExecutionContext, IImportProcessService} from '@process-engine/process_engine_contracts';

const logger: Logger = Logger.createLogger('test:bootstrapper');

const iocModuleNames: Array<string> = [
  '@essential-projects/bootstrapper',
  '@essential-projects/bootstrapper_node',
  '@essential-projects/event_aggregator',
  '@essential-projects/http_extension',
  '@essential-projects/services',
  '@process-engine/consumer_api_core', // Required by the process engine's UserTask handler
  '@process-engine/flow_node_instance.repository.sequelize',
  '@process-engine/iam',
  '@process-engine/management_api_core',
  '@process-engine/management_api_http',
  '@process-engine/process_engine',
  '@process-engine/process_model.repository.sequelize',
  '@process-engine/timers.repository.sequelize',
  '../../',
];

const iocModules: Array<any> = iocModuleNames.map((moduleName: string): any => {
  return require(`${moduleName}/ioc_module`);
});

export class TestFixtureProvider {
  private httpBootstrapper: AppBootstrapper;
  private _managementApiClientService: IManagementApiService;

  private container: InvocationContainer;

  private _managementContext: ManagementContext = undefined;

  public get context(): ManagementContext {
    return this._managementContext;
  }

  public get managementApiClientService(): IManagementApiService {
    return this._managementApiClientService;
  }

  public async initializeAndStart(): Promise<void> {
    await this._initializeBootstrapper();
    await this.httpBootstrapper.start();
    this._createMockContext();
    this._managementApiClientService = await this.resolveAsync<IManagementApiService>('ManagementApiClientService');
  }

  public async tearDown(): Promise<void> {
    const httpExtension: any = await this.container.resolveAsync('HttpExtension');
    await httpExtension.close();
  }

  public async resolveAsync<T>(moduleName: string, args?: any): Promise<any> {
    return this.container.resolveAsync<T>(moduleName, args);
  }

  public async importProcessFiles(processFileNames: Array<string>): Promise<void> {

    const importService: IImportProcessService = await this.resolveAsync<IImportProcessService>('ImportProcessService');

    const identityService: IIdentityService = await this.resolveAsync<IIdentityService>('IdentityService');

    const dummyIdentity: IIdentity = await identityService.getIdentity('dummyToken');
    const dummyContext: ExecutionContext = new ExecutionContext(dummyIdentity);

    for (const processFileName of processFileNames) {
      await this._registerProcess(dummyContext, processFileName, importService);
    }
  }

  private async _initializeBootstrapper(): Promise<void> {

    try {
      this.container = new InvocationContainer({
        defaults: {
          conventionCalls: ['initialize'],
        },
      });

      for (const iocModule of iocModules) {
        iocModule.registerInContainer(this.container);
      }

      this.container.validateDependencies();

      const appPath: string = path.resolve(__dirname);
      this.httpBootstrapper = await this.resolveAsync<AppBootstrapper>('AppBootstrapper', [appPath]);

      logger.info('Bootstrapper started.');
    } catch (error) {
      logger.error('Failed to start bootstrapper!', error);
      throw error;
    }
  }

  private _createMockContext(): void {

    // Note: Since the iam service is mocked, it doesn't matter what kind of token is used here.
    // It only matters that one is present.
    const identity: IIdentity = {
      token: 'randomtoken',
    };

    this._managementContext = <ManagementContext> {
      identity: 'randomtoken',
    };
  }

  private async _registerProcess(dummyContext: ExecutionContext, processFileName: string, importService: IImportProcessService): Promise<void> {

    const bpmnDirectoryPath: string = this._getBpmnDirectoryPath();
    const processFilePath: string = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    await importService.importBpmnFromFile(dummyContext, processFilePath, true);
  }

  /**
   * Generate an absoulte path, which points to the bpmn directory.
   *
   * Checks if the cwd is "_integration_tests". If not, that directory name is appended.
   * This is necessary, because Jenkins uses a different cwd than the local machines do.
   */
  private _getBpmnDirectoryPath(): string {

    const bpmnDirectoryName: string = 'bpmn';
    let rootDirPath: string = process.cwd();
    const integrationTestDirName: string = '_integration_tests';

    if (!rootDirPath.endsWith(integrationTestDirName)) {
      rootDirPath = path.join(rootDirPath, integrationTestDirName);
    }

    return path.join(rootDirPath, bpmnDirectoryName);
  }
}
