import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      'GitHubToken',
      'github-token'
    );

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            runtime_versions: {
              nodejs: 20,
            },
            commands: [
              'npm install -g aws-cdk',
              'npm install',
            ],
          },
          build: {
            commands: [
              'npx tsc',
              'cdk deploy AwsCloudPlatformStack --require-approval never --app "node bin/aws-cloud-platform.js"',
            ],
          },
        },
      }),
    });

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['*'],
        resources: ['*'],
        effect: iam.Effect.ALLOW,
      })
    );

    new codepipeline.Pipeline(this, 'AppPipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: 'gich254',
              repo: 'aws-cloud-platform',
              branch: 'main',
              oauthToken: githubToken.secretValueFromJson('token'),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build_and_Deploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Deploy',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });
  }
}
