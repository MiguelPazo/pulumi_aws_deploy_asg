/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */
import * as config from "./00-config";
import * as awsx from "@pulumi/awsx";


const main = async (vpc) => {
    const securityGroupAlb = new awsx.ec2.SecurityGroup(`${config.project}-alb-sg`, {
        vpc,
        egress: [
            {protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"]}
        ],
        tags: {
            ...config.generalTags,
            Name: `${config.generalPrefix}-alb-sg`
        }
    });

    const securityGroupInstances = new awsx.ec2.SecurityGroup(`${config.project}-instances-sg`, {
        vpc,
        egress: [
            {protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"]}
        ],
        tags: {
            ...config.generalTags,
            Name: `${config.generalPrefix}-instances-sg`
        }
    });

    const securityGroupFromAlb = new awsx.ec2.SecurityGroup(`${config.project}-fromalb-sg`, {
        vpc,
        ingress: [
            {protocol: "tcp", fromPort: 80, toPort: 80, sourceSecurityGroupId: securityGroupAlb.id}
        ],
        tags: {
            ...config.generalTags,
            Name: `${config.generalPrefix}-fromalb-sg`
        }
    });

    return Promise.all([
        securityGroupAlb,
        securityGroupFromAlb,
        securityGroupInstances,
    ]);
}


export const mainTask = main