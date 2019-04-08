def cleanup_workspace() {
  cleanWs();
  dir("${env.WORKSPACE}@tmp") {
    deleteDir();
  }
  dir("${env.WORKSPACE}@script") {
    deleteDir();
  }
  dir("${env.WORKSPACE}@script@tmp") {
    deleteDir();
  }
}

@NonCPS
def slack_send_summary(testlog, test_failed, database_type) {
  def passing_regex = /\d+ passing/;
  def failing_regex = /\d+ failing/;
  def pending_regex = /\d+ pending/;

  def passing_matcher = testlog =~ passing_regex;
  def failing_matcher = testlog =~ failing_regex;
  def pending_matcher = testlog =~ pending_regex;

  def passing = passing_matcher.count > 0 ? passing_matcher[0] : '0 passing';
  def failing = failing_matcher.count > 0 ? failing_matcher[0] : '0 failing';
  def pending = pending_matcher.count > 0 ? pending_matcher[0] : '0 pending';

  def color_string     =  '"color":"good"';
  def markdown_string  =  '"mrkdwn_in":["text","title"]';
  def title_string     =  "\"title\":\":white_check_mark: Management API Integration Tests against ${database_type} for ${BRANCH_NAME} Succeeded!\"";
  def result_string    =  "\"text\":\"${passing}\\n${failing}\\n${pending}\"";
  def action_string    =  "\"actions\":[{\"name\":\"open_jenkins\",\"type\":\"button\",\"text\":\"Open this run\",\"url\":\"${RUN_DISPLAY_URL}\"}]";

  if (test_failed == true) {
    color_string = '"color":"danger"';
    title_string =  "\"title\":\":boom: Management API Integration Tests against ${database_type} for ${BRANCH_NAME} Failed!\"";
  }

  slackSend(attachments: "[{$color_string, $title_string, $markdown_string, $result_string, $action_string}]");
}

def slack_send_testlog(testlog) {
  withCredentials([string(credentialsId: 'slack-file-poster-token', variable: 'SLACK_TOKEN')]) {

    def requestBody = [
      "token=${SLACK_TOKEN}",
      "content=${testlog}",
      "filename=management_api_integration_tests.txt",
      "channels=process-engine_ci"
    ];

    httpRequest(
      url: 'https://slack.com/api/files.upload',
      httpMode: 'POST',
      contentType: 'APPLICATION_FORM',
      requestBody: requestBody.join('&')
    );
  }
}

pipeline {
  agent any
  tools {
    nodejs "node-lts"
  }
  environment {
    NPM_RC_FILE = 'process-engine-ci-token'
    NODE_JS_VERSION = 'node-lts'
  }

  stages {
    stage('Prepare') {
      steps {
        dir('_integration_tests') {
          script {
            echo("Branch is '${BRANCH_NAME}'")
          }
          nodejs(configId: NPM_RC_FILE, nodeJSInstallationName: NODE_JS_VERSION) {
            sh('node --version')
            sh('npm install --no-package-lock')
            sh('npm run build')
          }

          stash(includes: '*, **/**', name: 'post_build');
        }
      }
    }
    stage('Management API Tests') {
      parallel {
        stage('SQLite') {
          agent any
          options {
            skipDefaultCheckout()
          }
          steps {
            dir('_integration_tests') {
              unstash('post_build');

              script {

                // Node environment settings
                def node_env = 'NODE_ENV=sqlite';
                def management_api_mode = 'MANAGEMENT_API_ACCESS_TYPE=internal ';
                def junit_report_path = 'JUNIT_REPORT_PATH=management_api_test_results_sqlite.xml';
                def config_path = 'CONFIG_PATH=config';

                def node_env_settings = "${node_env} ${management_api_mode} ${junit_report_path} ${config_path}"

                // SQLite Config
                // def db_storage_folder_path = "$WORKSPACE/process_engine_databases";
                // def db_storage_path_correlation = "process_engine__correlation_repository__storage=$db_storage_folder_path/correlation.sqlite";
                // def db_storage_path_external_task = "process_engine__external_task_repository__storage=$db_storage_folder_path/external_task.sqlite";
                // def db_storage_path_process_model = "process_engine__process_model_repository__storage=$db_storage_folder_path/process_model.sqlite";
                // def db_storage_path_flow_node_instance = "process_engine__flow_node_instance_repository__storage=$db_storage_folder_path/flow_node_instance.sqlite";

                // def db_environment_settings = "jenkinsDbStoragePath=${db_storage_folder_path} ${db_storage_path_correlation} ${db_storage_path_external_task} ${db_storage_path_process_model} ${db_storage_path_flow_node_instance}";

                // def npm_test_command = "node ./node_modules/.bin/cross-env ${node_env_settings} ${db_environment_settings} ./node_modules/.bin/mocha -t 20000 test/**/*.js test/**/**/*.js";
                def npm_test_command = "node ./node_modules/.bin/cross-env ${node_env_settings} ./node_modules/.bin/mocha -t 20000 test/**/*.js test/**/**/*.js";

                docker.image("node:${NODE_VERSION_NUMBER}").inside("--env PATH=$PATH:/$WORKSPACE/node_modules/.bin") {
                  sqlite_exit_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit | tee management_api_test_results_sqlite.txt", returnStatus: true);

                  sqlite_testresults = sh(script: "cat management_api_test_results_sqlite.txt", returnStdout: true).trim();
                  junit 'management_api_test_results_sqlite.xml'
                };

                sh('cat management_api_test_results_sqlite.txt');

                sqlite_tests_failed = sqlite_exit_code > 0;
              }
            }
          }
        }
        stage('PostgreSQL') {
          agent {
            label 'macos'
          }
          options {
            skipDefaultCheckout()
          }
          steps {
            dir('_integration_tests') {
              unstash('post_build');

              script {

                // Node Environment settings
                def node_env = 'NODE_ENV=postgres';
                def management_api_mode = 'MANAGEMENT_API_ACCESS_TYPE=internal ';
                def junit_report_path = 'JUNIT_REPORT_PATH=management_api_test_results_postgres.xml';
                def config_path = 'CONFIG_PATH=config';

                def node_env_settings = "${node_env} ${management_api_mode} ${junit_report_path} ${config_path}"

                // Postgres Config
                def postgres_host = "postgres";
                def postgres_username = "admin";
                def postgres_password = "admin";
                def postgres_database = "processengine";

                def db_database_host_correlation = "process_engine__correlation_repository__host=${postgres_host}";
                def db_database_host_external_task = "process_engine__external_task_repository__host=${postgres_host}";
                def db_database_host_process_model = "process_engine__process_model_repository__host=${postgres_host}";
                def db_database_host_flow_node_instance = "process_engine__flow_node_instance_repository__host=${postgres_host}";

                def db_environment_settings = "${db_database_host_correlation} ${db_database_host_external_task} ${db_database_host_process_model} ${db_database_host_flow_node_instance}";

                def postgres_settings = "--env POSTGRES_USER=${postgres_username} --env POSTGRES_PASSWORD=${postgres_password} --env POSTGRES_DB=${postgres_database}";

                docker.image('postgres:11').withRun("${postgres_settings}") { c ->

                  docker.image('postgres:11').inside("--link ${c.id}:${postgres_host}") {
                    sh "while ! pg_isready --host ${postgres_host} --username ${postgres_username} --dbname ${postgres_database}; do sleep 1; done"
                  };

                  docker.image("node:${NODE_VERSION_NUMBER}").inside("--link ${c.id}:${postgres_host} --env PATH=$PATH:/$WORKSPACE/node_modules/.bin") {

                    def npm_test_command = "node ./node_modules/.bin/cross-env ${node_env_settings} ${db_environment_settings} ./node_modules/.bin/mocha -t 20000 test/**/*.js test/**/**/*.js";

                    postgres_exit_code = sh(script: "${npm_test_command} --colors --reporter mocha-jenkins-reporter --exit > management_api_test_results_postgres.txt", returnStatus: true);

                    postgres_testresults = sh(script: "cat management_api_test_results_postgres.txt", returnStdout: true).trim();
                    junit 'management_api_test_results_postgres.xml'
                  };

                };

                sh('cat management_api_test_results_postgres.txt');

                postgres_test_failed = postgres_exit_code > 0;
              }
            }
          }
        }
      }
    }
    stage('Check test results') {
      steps {
        script {
          if (sqlite_tests_failed || postgres_test_failed) {
            currentBuild.result = 'FAILURE';

            if (sqlite_tests_failed) {
              echo "SQLite tests failed";
            }
            if (postgres_test_failed) {
              echo "PostgreSQL tests failed";
            }
          } else {
            currentBuild.result = 'SUCCESS';
            echo "All tests succeeded!"
          }
        }
      }
    }
    stage('Send Test Results to Slack') {
      steps {
        script {
          // Failure to send the slack message should not result in build failure.
          try {
            slack_send_summary(sqlite_testresults, sqlite_tests_failed, 'SQLite');
            slack_send_testlog(sqlite_testresults);
          } catch (Exception error) {
            echo "Failed to send slack report: $error";
          }

          // Failure to send the slack message should not result in build failure.
          try {
            slack_send_summary(postgres_testresults, postgres_test_failed, 'PostgreSQL');
            slack_send_testlog(postgres_testresults);
          } catch (Exception error) {
            echo "Failed to send slack report: $error";
          }
        }
      }
    }
    stage('Cleanup') {
      steps {
        script {
          // This stage just exists, so the cleanup work that happens
          // in the post script will show up in its own stage in Blue Ocean.
          sh(script: ':', returnStdout: true);
        }
      }
    }
  }
  post {
    always {
      script {
        cleanup_workspace();
        // Ignore errors that may occur during cleanup.
        try {
          sh(script: "docker rmi ${server_image_id}");
        } catch (Exception error) {
          echo "Failed to cleanup docker $error";
        }
      }
    }
  }
}
