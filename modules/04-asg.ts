/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */
import * as aws from "@pulumi/aws";
import * as config from "./00-config";
import {project} from "./00-config";
import * as fs from 'fs';
import * as pulumi from "@pulumi/pulumi";
import {local} from "@pulumi/command";


const main = async (vpc, securityGroups, alb, amiId) => {
    const userData = fs.readFileSync(__dirname + '/ec2/userData.sh', 'utf8');

    const launchTemplate = new aws.ec2.LaunchTemplate(`${config.project}-launch-template`, {
        name: `${config.generalPrefix}-launch-template-`,
        imageId: amiId,
        iamInstanceProfile: {
            name: config.ec2InstanceProfileName
        },
        instanceType: config.ec2InstanceType,
        vpcSecurityGroupIds: [
            securityGroups.securityGroupInstances.securityGroup.id,
            securityGroups.securityGroupFromAlb.securityGroup.id,
        ].concat(config.ec2SecurityGroupsIds),
        userData: Buffer.from(userData).toString('base64'),
        blockDeviceMappings: [
            {
                deviceName: '/dev/sda1',
                ebs: {
                    volumeSize: 10
                }
            }
        ],
        tagSpecifications: [
            {
                resourceType: 'instance',
                tags: {
                    ...config.generalTags,
                    Name: `${config.generalPrefix}-webserver-asg`
                }
            },
            {
                resourceType: 'volume',
                tags: {
                    ...config.generalTags,
                    Name: `${config.generalPrefix}-volume`
                }
            }
        ],
        tags: {
            ...config.generalTags,
            Name: `${config.generalPrefix}-launch-template`
        }
    });

    const asgName = `${config.generalPrefix}-asg`;

    const asg = new aws.autoscaling.Group(`${config.project}-asg`, {
        name: asgName,
        vpcZoneIdentifiers: vpc.privateSubnetIds,
        desiredCapacity: config.asgDesiredCapacity,
        maxSize: config.asgMaxSize,
        minSize: config.asgMinSize,
        launchTemplate: {
            id: launchTemplate.id,
            version: `$Latest`,
        },
        healthCheckType: "ELB",
        healthCheckGracePeriod: 300,
        defaultCooldown: 300,
        waitForCapacityTimeout: "30m",
        targetGroupArns: [alb.targetGroup.targetGroup.arn],
        enabledMetrics: [
            "GroupDesiredCapacity",
            "GroupInServiceInstances",
            "GroupMaxSize",
            "GroupMinSize",
            "GroupPendingInstances",
            "GroupStandbyInstances",
            "GroupTerminatingInstances",
            "GroupTotalInstances"
        ],
        terminationPolicies: ["OldestInstance"],
        instanceRefresh: {
            strategy: "Rolling",
            preferences: {
                minHealthyPercentage: 90,
            },
            triggers: ["tag"],
        },
        tags: [
            {
                key: 'project',
                propagateAtLaunch: false,
                value: config.generalTags.project
            },
            {
                key: 'env',
                propagateAtLaunch: false,
                value: config.generalTags.env
            },
            {
                key: 'iac',
                propagateAtLaunch: false,
                value: config.generalTags.iac
            },
            {
                key: 'iac_version',
                propagateAtLaunch: false,
                value: config.generalTags.iac_version
            }
        ]
    });

    new aws.autoscaling.Policy(`${config.project}-asg-policy-cpu`, {
        autoscalingGroupName: asg.name,
        policyType: "TargetTrackingScaling",
        estimatedInstanceWarmup: 180,
        targetTrackingConfiguration: {
            predefinedMetricSpecification: {
                predefinedMetricType: "ASGAverageCPUUtilization",
            },
            targetValue: 80.0,
        },
    });

    const rlRequests = pulumi.all([alb.alb.loadBalancer.arnSuffix, alb.targetGroup.targetGroup.arnSuffix]).apply(x => {
        return `${x[0]}/${x[1]}`
    })

    new aws.autoscaling.Policy(`${config.project}-asg-policy-requests`, {
        autoscalingGroupName: asg.name,
        policyType: "TargetTrackingScaling",
        estimatedInstanceWarmup: 180,
        targetTrackingConfiguration: {
            predefinedMetricSpecification: {
                predefinedMetricType: "ALBRequestCountPerTarget",
                resourceLabel: rlRequests
            },
            targetValue: 1200.0,
        },
    });

    const instanceRefresh = new local.Command(`${config.project}-instance-refresh`, {
            update: `aws autoscaling  start-instance-refresh --auto-scaling-group-name ${asgName} --strategy Rolling`
        }
        , {
            dependsOn: [asg]
        }
    );

    instanceRefresh.stderr.apply((stderr) => {
        console.log('stderr:');
        console.log(stderr);
    });

    instanceRefresh.stdout.apply((stdout) => {
        console.log('stdout:');
        console.log(stdout);
    });

    return Promise.all([asg]);
}


export const mainTask = main