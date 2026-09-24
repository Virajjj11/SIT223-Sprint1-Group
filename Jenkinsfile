// SIT223 7.3HD - Unit Task Tracker CI/CD pipeline
// Stages: Build -> Test -> Code Quality -> Security -> Deploy (staging) -> Release (production) -> Monitoring
pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    // Check GitHub for new commits every 2 minutes
    triggers {
        pollSCM('H/2 * * * *')
    }

    parameters {
        booleanParam(name: 'SIMULATE_INCIDENT', defaultValue: false,
            description: 'Send a burst of server errors to production to prove the HighErrorRate alert fires')
    }

    environment {
        APP_NAME     = 'unit-task-tracker'
        HOST         = 'host.docker.internal'   // how the Jenkins container reaches ports published on the Docker host
        STAGING_URL  = 'http://host.docker.internal:3001'
        PROD_URL     = 'http://host.docker.internal:3000'
        PROM_URL     = 'http://host.docker.internal:9090'
        SCANNER_HOME = '/var/jenkins_home/tools/sonar-scanner-5.0.1.3006'
        TRIVY_IMAGE  = 'aquasec/trivy:latest'
        GIT_REPO     = 'github.com/Virajjj11/SIT223-Sprint1-Group.git'
    }

    stages {

        stage('Build') {
            steps {
                script {
                    // Version = major.minor from package.json + Jenkins build number, e.g. 1.0.15
                    def base = sh(returnStdout: true, script: "node -p \"require('./package.json').version.split('.').slice(0,2).join('.')\"").trim()
                    env.VERSION   = "${base}.${env.BUILD_NUMBER}"
                    env.GIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    currentBuild.displayName = "#${env.BUILD_NUMBER} v${env.VERSION}"
                }
                echo "Building ${APP_NAME} version ${VERSION} (commit ${GIT_SHORT})"
                sh 'npm ci'
                sh '''
                    docker build \
                      --build-arg APP_VERSION=$VERSION \
                      -t $APP_NAME:$VERSION \
                      -t $APP_NAME:$GIT_SHORT \
                      .
                '''
                // Build artefacts: npm package + build metadata, stored with the Jenkins build
                sh '''
                    mkdir -p dist
                    npm pack --pack-destination dist
                    cat > dist/build-info.json <<EOF
{ "app": "$APP_NAME", "version": "$VERSION", "commit": "$GIT_SHORT",
  "build": "$BUILD_NUMBER", "image": "$APP_NAME:$VERSION", "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
EOF
                    docker image ls $APP_NAME
                '''
            }
            post {
                success { archiveArtifacts artifacts: 'dist/**', fingerprint: true }
            }
        }

        stage('Test') {
            steps {
                // Unit + integration tests with Jest/Supertest.
                // Fails the build if any test fails or coverage drops below 80% lines / 70% branches.
                sh 'npm test -- --ci'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/lcov.info', allowEmptyArchive: true
                }
            }
        }

        stage('Code Quality') {
            steps {
                sh '''
                    if [ ! -d "$SCANNER_HOME" ]; then
                      mkdir -p /var/jenkins_home/tools
                      curl -sSLo /tmp/sonar-scanner.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006.zip
                      unzip -o -q /tmp/sonar-scanner.zip -d /var/jenkins_home/tools
                    fi
                '''
                withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_TOKEN')]) {
                    // qualitygate.wait=true makes the pipeline stop here if the SonarCloud quality gate fails
                    sh '''
                        $SCANNER_HOME/bin/sonar-scanner \
                          -Dsonar.token=$SONAR_TOKEN \
                          -Dsonar.projectVersion=$VERSION \
                          -Dsonar.qualitygate.wait=true \
                          -Dsonar.qualitygate.timeout=300
                    '''
                }
            }
        }

        stage('Security') {
            steps {
                sh 'mkdir -p reports'
                // 1) Dependency scan (SCA). Full report kept for review; the gate only checks production deps.
                sh 'npm audit --json > reports/npm-audit.json || true'
                sh 'npm audit || true'
                echo 'Gate: fail if any HIGH or CRITICAL vulnerability exists in production dependencies'
                sh 'npm audit --omit=dev --audit-level=high'

                // 2) Container image scan with Trivy (OS packages + Node modules inside the image)
                sh '''
                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v trivy-cache:/root/.cache/ \
                      $TRIVY_IMAGE image --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed \
                      --no-progress --format table $APP_NAME:$VERSION | tee reports/trivy-report.txt
                '''
                echo 'Gate: fail if the image has any fixable CRITICAL vulnerability'
                sh '''
                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v trivy-cache:/root/.cache/ \
                      $TRIVY_IMAGE image --scanners vuln --severity CRITICAL --ignore-unfixed \
                      --no-progress --exit-code 1 --quiet $APP_NAME:$VERSION
                '''
            }
            post {
                always { archiveArtifacts artifacts: 'reports/npm-audit.json, reports/trivy-report.txt', allowEmptyArchive: true }
            }
        }

        stage('Deploy') {
            steps {
                echo "Deploying ${APP_NAME}:${VERSION} to STAGING (Docker Compose, port 3001)"
                sh 'IMAGE_TAG=$VERSION docker compose -p tracker-staging --env-file deploy/staging.env -f deploy/docker-compose.yml up -d'
                sh 'sh deploy/wait-for-health.sh $STAGING_URL/health 30'
                echo 'Running smoke tests against staging'
                sh 'BASE_URL=$STAGING_URL sh tests/smoke/smoke.sh'
            }
            post {
                failure { sh 'docker logs --tail 50 tracker-staging || true' }
            }
        }

        stage('Release') {
            steps {
                script {
                    // Remember the version currently in production, so we can roll back
                    env.PREVIOUS_VERSION = sh(returnStdout: true,
                        script: "docker inspect -f '{{index .Config.Labels \"org.opencontainers.image.version\"}}' tracker-production 2>/dev/null || echo none").trim()
                    echo "Current production version: ${env.PREVIOUS_VERSION}. Promoting ${env.VERSION}."

                    sh 'docker tag $APP_NAME:$VERSION $APP_NAME:production'
                    sh 'IMAGE_TAG=$VERSION docker compose -p tracker-production --env-file deploy/production.env -f deploy/docker-compose.yml up -d'

                    def healthy = sh(returnStatus: true, script: 'sh deploy/wait-for-health.sh $PROD_URL/health 30 && BASE_URL=$PROD_URL sh tests/smoke/smoke.sh') == 0
                    if (!healthy) {
                        if (env.PREVIOUS_VERSION != 'none') {
                            echo "Production check FAILED - rolling back to ${env.PREVIOUS_VERSION}"
                            sh 'IMAGE_TAG=$PREVIOUS_VERSION docker compose -p tracker-production --env-file deploy/production.env -f deploy/docker-compose.yml up -d'
                            sh 'docker tag $APP_NAME:$PREVIOUS_VERSION $APP_NAME:production'
                        }
                        error("Release of ${env.VERSION} failed its production health check")
                    }
                }
                // Tag the exact commit that is now in production, and push the tag to GitHub
                withCredentials([usernamePassword(credentialsId: 'github-token', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
                    sh '''
                        git -c user.name="Jenkins" -c user.email="jenkins@localhost" \
                          tag -a "v$VERSION" -m "Release v$VERSION (build $BUILD_NUMBER, commit $GIT_SHORT)"
                        git push "https://$GH_USER:$GH_TOKEN@$GIT_REPO" "v$VERSION"
                    '''
                }
                echo "Released v${VERSION} to production: http://localhost:3000"
            }
        }

        stage('Monitoring') {
            steps {
                echo 'Starting / updating the monitoring stack (Prometheus + Grafana)'
                sh 'docker compose -p monitoring -f monitoring/docker-compose.yml up -d --build'
                sh 'sh deploy/wait-for-health.sh $PROM_URL/-/ready 30'
                // Normal traffic so the dashboard has data
                sh 'for i in $(seq 1 20); do curl -s -o /dev/null $PROD_URL/api/tasks; done'
                script {
                    if (params.SIMULATE_INCIDENT) {
                        echo 'INCIDENT SIMULATION: sending 30 server errors to production over 15 seconds'
                        sh 'for i in $(seq 1 30); do curl -s -o /dev/null $PROD_URL/api/simulate-error; sleep 0.5; done'
                    }
                    def waitSeconds = params.SIMULATE_INCIDENT ? 90 : 0
                    def status = sh(returnStatus: true, script: "WAIT_FOR_ALERTS=${waitSeconds} node monitoring/check-monitoring.js")
                    if (status == 1) {
                        error('Monitoring: production is DOWN')
                    } else if (status == 2) {
                        unstable('Monitoring: Prometheus alerts are FIRING - see the console output and Grafana')
                    }
                }
                echo 'Grafana dashboard: http://localhost:3002/d/tracker  |  Prometheus alerts: http://localhost:9090/alerts'
            }
        }
    }

    post {
        success  { echo "Pipeline SUCCESS - v${env.VERSION} is live in production" }
        unstable { echo "Pipeline UNSTABLE - v${env.VERSION} deployed but monitoring alerts are firing" }
        failure  { echo "Pipeline FAILED at build ${env.BUILD_NUMBER} - production was not changed (or was rolled back)" }
    }
}
