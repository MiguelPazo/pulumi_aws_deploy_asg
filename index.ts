/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */
import * as pulumi from "@pulumi/pulumi";
import * as config from "./modules/00-config";
import * as modNetwork from "./modules/01-network";
import * as modSecGroups from "./modules/02-secgroups";
import * as modAlb from "./modules/03-alb";
import * as modAsg from "./modules/04-asg";


const network = pulumi.all([modNetwork.mainTask()]).apply(x => {
    return {
        vpc: x[0][0],
        availabilityZones: x[0][1],
    }
});

const securityGroups = pulumi.all([modSecGroups.mainTask(network.vpc)]).apply(x => {
    return {
        securityGroupAlb: x[0][0],
        securityGroupFromAlb: x[0][1],
        securityGroupInstances: x[0][2]
    }
});

const alb = pulumi.all([modAlb.mainTask(network.vpc, securityGroups.securityGroupAlb)]).apply(x => {
    return {
        alb: x[0][0],
        targetGroup: x[0][1],
    }
});

const asg = pulumi.all([modAsg.mainTask(network.vpc, securityGroups, alb, config.ec2AmiId)]);