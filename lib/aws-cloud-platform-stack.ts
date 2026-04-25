import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class AwsCloudPlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. SSM Parameter
    const configParam = new ssm.StringParameter(this, 'AppGreeting', {
      parameterName: '/app/config/greeting',
      stringValue: 'Hello from CI/CD Automated Infrastructure!',
    });

    // 2. Lambda Function (fixed: using logGroup instead of logRetention)
    const logGroup = new logs.LogGroup(this, 'WorkflowTaskLogGroup', {
      logGroupName: '/aws/lambda/WorkflowTask',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const workflowLambda = new lambda.Function(this, 'WorkflowTask', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      timeout: cdk.Duration.seconds(30),
      logGroup: logGroup,
    });

    // Grant Lambda permission to read SSM
    configParam.grantRead(workflowLambda);

    // 3. Step Functions
    const startState = new stepfunctions.Pass(this, 'StartExecution', {
      comment: 'Workflow started',
    });

    const invokeTask = new tasks.LambdaInvoke(this, 'InvokeWorkflowTask', {
      lambdaFunction: workflowLambda,
      outputPath: '$.Payload',
    });

    invokeTask.addRetry({
      maxAttempts: 2,
      interval: cdk.Duration.seconds(5),
      backoffRate: 2,
    });

    const failState = new stepfunctions.Fail(this, 'WorkflowFailed', {
      cause: 'Lambda invocation failed after retries',
    });

    invokeTask.addCatch(failState, {
      resultPath: '$.error',
    });

    // Fixed: using definitionBody instead of deprecated definition
    new stepfunctions.StateMachine(this, 'MyStateMachine', {
      definitionBody: stepfunctions.DefinitionBody.fromChainable(
        startState.next(invokeTask)
      ),
      timeout: cdk.Duration.minutes(5),
      tracingEnabled: true,
    });
  }
}
