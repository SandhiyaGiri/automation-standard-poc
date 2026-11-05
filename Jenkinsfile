pipeline {
  agent any
  options { disableConcurrentBuilds(); timestamps(); timeout(time: 30, unit: 'MINUTES') }

  parameters {
    string(name: 'TAGS',     defaultValue: '@Regression', description: 'Cucumber tag expression')
    choice(name: 'ENV',      choices: ['QA'],   description: 'Target environment')
    choice(name: 'TENANT',   choices: ['DEMO'], description: 'Tenant')
    string(name: 'RETRY',    defaultValue: '1',  description: 'Retry count (0-2)')
    string(name: 'JIRA_KEY', defaultValue: '',   description: 'Jira issue to update (blank = skip Jira)')
  }

  environment { CI = '1' }

  stages {
    stage('Validate') {
      steps {
        script {
          if (params.JIRA_KEY && !(params.JIRA_KEY ==~ /^[A-Z][A-Z0-9]+-\d+$/)) { error 'Invalid JIRA_KEY' }
          if (!(params.RETRY ==~ /^[0-2]$/)) { error 'RETRY must be 0-2' }
          if (!(params.TAGS ==~ /^[@A-Za-z0-9_\-\s()]+$/)) { error 'Invalid TAGS' }
        }
      }
    }
    stage('Install') {
      steps { sh 'npm ci && npx playwright install chromium' }
    }
    stage('Test') {
      steps {
        sh "npm test -- --tags '${params.TAGS}' --retry ${params.RETRY}"
      }
    }
  }

  post {
    always {
      // Test result (build status) is already decided; reporting must never change it.
      script {
        try {
          withEnv(["TAGS=${params.TAGS}", "ENV=${params.ENV}", "TENANT=${params.TENANT}", "JIRA_KEY=${params.JIRA_KEY}"]) {
            sh 'node scripts/jira-report.mjs && node scripts/generate-pdf.mjs'
            if (params.JIRA_KEY) {
              withCredentials([
                string(credentialsId: 'jira-base-url',  variable: 'JIRA_BASE_URL'),
                string(credentialsId: 'jira-email',     variable: 'JIRA_EMAIL'),
                string(credentialsId: 'jira-api-token', variable: 'JIRA_API_TOKEN')
              ]) { sh 'node scripts/jira-notify.mjs' }
            }
          }
        } catch (e) {
          echo "Reporting step failed (build result preserved): ${e.class.simpleName}"
        }
      }
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
  }
}
