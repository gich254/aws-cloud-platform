#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsCloudPlatformStack } from '../lib/aws-cloud-platform-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

new AwsCloudPlatformStack(app, 'AwsCloudPlatformStack');
new PipelineStack(app, 'PipelineStack');
