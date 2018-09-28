import {InvocationContainer} from 'addict-ioc';

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
  '.',
];

const iocModules: Array<any> = iocModuleNames.map((moduleName: string): any => {
  return require(`${moduleName}/ioc_module`);
});

export async function initializeBootstrapper(): Promise<InvocationContainer> {

  const container: InvocationContainer = new InvocationContainer({
    defaults: {
      conventionCalls: ['initialize'],
    },
  });

  for (const iocModule of iocModules) {
    iocModule.registerInContainer(container);
  }

  container.validateDependencies();

  return container;
}