import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const api = new aws.apigateway.RestApi("api");

export const apiId = api.id;
export const apiRootResourceId = api.rootResourceId;


