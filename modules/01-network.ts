/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */
import * as aws from "@pulumi/aws";
import * as config from "./00-config";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";


const main = async () => {
    const vpc = awsx.ec2.Vpc.fromExistingIds(`${config.project}-vpc`, {
        vpcId: config.vpcId,
        publicSubnetIds: config.vpcSubnetPublicIds,
        privateSubnetIds: config.vpcSubnetPrivateIds,
    });

    async function getAvailabilityZone(subnetId) {
        let res = await aws.ec2.getSubnet({
            id: subnetId,
        });

        return res.availabilityZone;
    }

    let availabilityZones = pulumi.all([vpc.publicSubnetIds]).apply(subnetIds => {
        subnetIds = [].concat.apply([], subnetIds);
        return Promise.all(subnetIds);
    });

    return Promise.all([vpc, availabilityZones]);
}


export const mainTask = main