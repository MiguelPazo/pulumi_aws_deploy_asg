/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";


const configPulumi = new pulumi.Config();
export const stack = pulumi.getStack();
export const project = configPulumi.get("project");
export const generalPrefix = `${project}-${stack}`;

export const generalTags = {
    project: project,
    env: stack,
    iac: 'pulumi',
    iac_version: '3.35.3'
}

export const ec2InstanceType = configPulumi.get("ec2InstanceType");
export const ec2AmiId = configPulumi.get("ec2AmiId");
export const ec2InstanceProfileName = configPulumi.get("ec2InstanceProfileName");
export const ec2SecurityGroupsIds: Array<string> = configPulumi.getObject("ec2SecurityGroupsIds");

export const albAccountId = configPulumi.get("albAccountId");

export const albDomain = configPulumi.get("albDomain");
export const albDomainCertArn = configPulumi.get("albDomainCertArn");
export const albDomainZoneId = configPulumi.get("albDomainZoneId");
export const albBucketLogs = configPulumi.get("albBucketLogs");

export const asgDesiredCapacity = configPulumi.getNumber("asgDesiredCapacity");
export const asgMaxSize = configPulumi.getNumber("asgMaxSize");
export const asgMinSize = configPulumi.getNumber("asgMinSize");

export const wafArn = configPulumi.get("wafArn");

const current = aws.getCallerIdentity({});
export const accountId = current.then(current => current.accountId);

export const vpcId = configPulumi.get("vpcId");
export const vpcSubnetPublicIds: Array<string> = configPulumi.getObject("vpcSubnetPublicIds");
export const vpcSubnetPrivateIds: Array<string> = configPulumi.getObject("vpcSubnetPrivateIds");