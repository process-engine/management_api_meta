import * as fs from 'fs';
import * as path from 'path';

import {InvocationContainer} from 'addict-ioc';
import {Logger} from 'loggerhythm';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';

import {IDeploymentApi} from '@process-engine/deployment_api_contracts';
import {IManagementApi} from '@process-engine/management_api_contracts';
import {ExecutionContext, IExecutionContextFacade, IExecutionContextFacadeFactory} from '@process-engine/process_engine_contracts';

const logger: Logger = Logger.createLogger('test:bootstrapper');

const iocModuleNames: Array<string> = [
  '@essential-projects/bootstrapper',
  '@essential-projects/bootstrapper_node',
  '@essential-projects/event_aggregator',
  '@essential-projects/http_extension',
  '@essential-projects/services',
  '@essential-projects/timing',
  '@process-engine/consumer_api_core',
  '@process-engine/correlations.repository.sequelize',
  '@process-engine/deployment_api_core',
  '@process-engine/flow_node_instance.repository.sequelize',
  '@process-engine/iam',
  '@process-engine/kpi_api_core',
  '@process-engine/kpi_api_http',
  '@process-engine/logging_api_core',
  '@process-engine/logging_api_http',
  '@process-engine/logging.repository.file_system',
  '@process-engine/management_api_core',
  '@process-engine/management_api_http',
  '@process-engine/metrics_api_core',
  '@process-engine/metrics.repository.file_system',
  '@process-engine/process_engine_core',
  '@process-engine/process_model.repository.sequelize',
  '@process-engine/timers.repository.sequelize',
  '@process-engine/token_history_api_core',
  '@process-engine/token_history_api_http',
  '../../',
];

const iocModules: Array<any> = iocModuleNames.map((moduleName: string): any => {
  return require(`${moduleName}/ioc_module`);
});

export class TestFixtureProvider {
  private httpBootstrapper: AppBootstrapper;
  private _deploymentApiService: IDeploymentApi;
  private _managementApiClientService: IManagementApi;

  private container: InvocationContainer;

  private _identity: IIdentity;

  public get identity(): IIdentity {
    return this._identity;
  }

  private get deploymentApiService(): IDeploymentApi {
    return this._deploymentApiService;
  }

  public get managementApiClientService(): IManagementApi {
    return this._managementApiClientService;
  }

  public async initializeAndStart(): Promise<void> {
    await this._initializeBootstrapper();
    await this.httpBootstrapper.start();
    this._createMockIdentity();
    this._managementApiClientService = await this.resolveAsync<IManagementApi>('ManagementApiClientService');
  }

  public async tearDown(): Promise<void> {
    const httpExtension: any = await this.container.resolveAsync('HttpExtension');
    await httpExtension.close();
  }

  public async resolveAsync<T>(moduleName: string, args?: any): Promise<any> {
    return this.container.resolveAsync<T>(moduleName, args);
  }

  public async importProcessFiles(processFileNames: Array<string>): Promise<void> {

    this._deploymentApiService = await this.resolveAsync<IDeploymentApi>('DeploymentApiService');

    for (const processFileName of processFileNames) {
      await this._registerProcess(processFileName);
    }
  }

  public readProcessModelFromFile(fileName: string): string {

    const bpmnFolderLocation: string = this._getBpmnDirectoryPath();
    const processModelPath: string = path.join(bpmnFolderLocation, `${fileName}.bpmn`);

    const processModelAsXml: string = fs.readFileSync(processModelPath, 'utf-8');

    return processModelAsXml;
  }

  public async getExecutionContextFacade(): Promise<IExecutionContextFacade> {

    const executionContext: ExecutionContext = new ExecutionContext(this.identity);

    const executionContextFacadeFactory: IExecutionContextFacadeFactory =
      await this.resolveAsync<IExecutionContextFacadeFactory>('ExecutionContextFacadeFactory');

    return executionContextFacadeFactory.create(executionContext);
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

  private _createMockIdentity(): void {
    // Note: Since the iam service is mocked, it doesn't matter what kind of token is used here.
    // It only matters that one is present.
    this._identity = <IIdentity> {
      token: 'defaultUser',
    };
  }

  private async _registerProcess(processFileName: string): Promise<void> {

    const bpmnDirectoryPath: string = this._getBpmnDirectoryPath();
    const processFilePath: string = path.join(bpmnDirectoryPath, `${processFileName}.bpmn`);

    const processName: string = path.parse(processFileName).name;

    await this.deploymentApiService.importBpmnFromFile(this.identity, processFilePath, processName, true);
  }

  /**
   * Generate an absoulte path, which points to the bpmn directory.
   *
   * Checks if the cwd is '_integration_tests'. If not, that directory name is appended.
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
