/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */
import * as aws from "@pulumi/aws";
import * as config from "./00-config";
import * as awsx from "@pulumi/awsx";


const main = async (vpc, securityGroupAlb) => {
    let enableDeletionProtection = false;
    let accessLogs = {
        bucket: '',
        enabled: false,
        prefix: '',
    };

    if (['production'].indexOf(config.stack) !== -1) {
        enableDeletionProtection = true;
        accessLogs = {
            bucket: config.albBucketLogs,
            enabled: true,
            prefix: config.albDomain
        }
    }

    const alb = new awsx.lb.ApplicationLoadBalancer(`${config.project}-alb`, {
        name: `${config.generalPrefix}-alb`,
        vpc: vpc,
        securityGroups: [securityGroupAlb.id],
        accessLogs,
        tags: {
            ...config.generalTags,
            Name: `${config.generalPrefix}-alb`
        }
    });

    const targetGroupAlb = alb.createTargetGroup(`${config.project}-alb-tg`, {
        name: `${config.generalPrefix}-alb-tg`,
        protocol: "HTTP",
        targetType: "instance",
        healthCheck: {
            healthyThreshold: 3,
            interval: 15,
            path: "/",
            timeout: 10,
            unhealthyThreshold: 5,
            matcher: "200"
        },
        tags: {
            ...config.generalTags,
            Name: `${config.generalPrefix}-alb-tg`
        }
    });

    targetGroupAlb.createListener(`${config.project}-alb-listenerHttp`, {
        port: 80,
        protocol: "HTTP",
        defaultAction: {
            type: "redirect",
            redirect: {
                protocol: "HTTPS",
                port: "443",
                statusCode: "HTTP_301",
            },
        },
    });

    targetGroupAlb.createListener(`${config.project}-alb-https`, {
        port: 443,
        protocol: "HTTPS",
        sslPolicy: "ELBSecurityPolicy-TLS-1-2-2017-01",
        certificateArn: config.albDomainCertArn
    });

    createAliasRecord(config.albDomain, config.albDomainZoneId, alb);

    new aws.wafv2.WebAclAssociation(`${config.project}-acl-association`, {
        resourceArn: alb.loadBalancer.arn,
        webAclArn: config.wafArn
    }, {
        dependsOn: alb
    })

    return Promise.all([alb, targetGroupAlb]);
}


const createAliasRecord = (targetDomain: string, zoneId: any, alb: awsx.lb.ApplicationLoadBalancer): aws.route53.Record => {
    return new aws.route53.Record(
        `${targetDomain}-alb-record`,
        {
            name: `${targetDomain}.`,
            zoneId: zoneId,
            type: aws.route53.RecordTypes.A,
            aliases: [
                {
                    name: alb.loadBalancer.dnsName,
                    zoneId: alb.loadBalancer.zoneId,
                    evaluateTargetHealth: true,
                },
            ],
        });
}


export const mainTask = main