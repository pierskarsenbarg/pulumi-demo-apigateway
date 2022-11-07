import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const stackName = pulumi.getStack();

const stackref = new pulumi.StackReference(`pierskarsenbarg/api/${stackName}`);

const apiId = stackref.getOutput("apiId");
const apiRootResourceId = stackref.getOutput("apiRootResourceId");

const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.LambdaPrincipal),
    managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole]
});

const fn = new aws.lambda.Function("lambda", {
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./app")
    }),
    runtime: aws.lambda.Runtime.NodeJS16dX,
    architectures: ["arm64"],
    handler: "index.handler",
    role: lambdaRole.arn
});

const method = new aws.apigateway.Method("method", {
    httpMethod: "GET",
    resourceId: apiRootResourceId,
    restApi: apiId,
    authorization: "none"
});

const integration = new aws.apigateway.Integration("integration", {
    httpMethod: method.httpMethod,
    resourceId: apiRootResourceId,
    restApi: apiId,
    integrationHttpMethod: "POST",
    uri: fn.invokeArn,
    type: "AWS_PROXY"
});

const deployment = new aws.apigateway.Deployment("deployment", {
    restApi: apiId
}, {dependsOn: [method, integration]}); // need depends on because you can't create a deployment without these

const stage = new aws.apigateway.Stage("stage", {
    restApi: apiId,
    stageName: stackName,
    deployment: deployment.id
});

const permission = new aws.lambda.Permission("permission", {
    function: fn.name,
    action: "lambda:InvokeFunction",
    principal: "apigateway.amazonaws.com",
    sourceArn: pulumi.interpolate`arn:aws:execute-api:${aws.getRegionOutput().name}:${aws.getCallerIdentity().then(x => x.accountId)}:${apiId}/*/${method.httpMethod}/`
});

export const url = stage.invokeUrl;