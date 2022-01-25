# Bring APIs to Lambdas
## Why Lambdas?
- Lambdas scale with automatically.
- If there is a crash it will heal automatically.
- You dont have to manage servers like EC2.
- They are on-demand and are only created when needed.

AWS makes it easy to deploy Lambdas using AWS Amplify.

## Prepare codebase
If you're following along with the tutorial you will have a `front-end` and `back-end` folder. In this section we will combine the two into a single application folder. Bring the contents of the `front-end` folder out to your top level. Your new folder structure should look something like this:

```
/
  /backend
  /public
  /src
  package.json
  ...etc
```

Ok now lets get AWS Amplify up and running.

## Set up
Install the CLI
```
npm install -g @aws-amplify/cli
```

Configure the Amplify account. This will require you to have an AWS Account. Follow the instructions in the prompts.
```
amplify configure
```

## Start an Amplify project
```
amplify init
```

This command
- Creates our `amplify` directory where the backend definition is stored as a CloudFormation configuration.
- Adds `aws-exports.js` to the `src` directory. This is how AWS configures Amplify inside your front-end application.
- Modifies the .gitignore file to handle the new files created
- A cloud project is created that you can access by running `amplify console`.

## Create a Lambda function
Now we can add an API with Amplify.
```
amplify add api
```

During the prompts
- Select `REST`
- Pick a name for the resource like `blogapi`
- Pick a route. We're going to use `/api` which will handle our entire API.
- Pick a name for the Lambda function.
- Select NodeJS as the runtime
- Select `Serverless ExpressJS function (Integration with API Gateway)` for the function template.

Look at the files created. They look very similar to our own back-end. Lets test it as is.

Run `amplify push` to deploy the function. The url for the function will be displayed after it finishes running. Then you can test it from your command line.

```
curl https://yv6aggdnz6.execute-api.us-east-2.amazonaws.com/dev/api
```

Will result in
```
{"success":"get call succeed!","url":"/api"}
```

## Moving our API to Lambda
We are going to replace the Lambda's src folder with our api. Lets start by preparing our `back-end` folder.
- We need to include a new dependency to allow the Lambda to run ExpressJS `yarn add aws-serverless-express`
- For now lets comment out the DB connection, we will handle the DB connection later
```diff
-- await db.connect(DB_URL);
++ // await db.connect(DB_URL);
```
- Export the express app from `src/index.js`
```es6
export { app };
```

- Create a new `index.js` file to handle the lambda. We will add the dependencies in the next section.
```es6
require("core-js/stable");
require("regenerator-runtime/runtime");
const awsServerlessExpress = require('aws-serverless-express');
const { app } = require('./lib');

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  console.log(`handler called`);
  console.log(`EVENT: ${JSON.stringify(event)}`);
  return awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise;
};
```
- You'll note this file uses require instead of ES6 imports. That is because Lambdas dont handle ES6 imports well. We will use Babel to get past this.

### Babel
Lambdas do not handle ES6 imports very well by default. We need to include Babel to transpile our code down to a version of JS that the Lambda runtime can handle.
- Install Babel: `yarn add -D @babel/core @babel/preset-env core-js regenerator-runtime`
- Create a `babel.config.json` file with the following contents
```json
{
  "presets": ["@babel/preset-env"]
}
```
- Add the following to the `scripts` block of our `package.json`
```
  "build": "babel src -d lib"
```
- This will build into the lib folder, but we need build into the lambda folder.

### Build into the Lambda
- To begin, delete the contents of the lambda `src` folder
- Update the `back-end` build script to copy to the correct folder
```
"build": "yarn install && babel src -d ../amplify/backend/function/blogapi/src/lib && cp index.js ../amplify/backend/function/blogapi/src/index.js&& cp -r node_modules ../amplify/backend/function/blogapi/src/node_modules",
```
- This also moves index.js and node modules into the lambda folder

### Deploy and test
- `amplify push`
- `curl https://YOUR_ID.execute-api.us-east-2.amazonaws.com/dev/api/test`
- If errors arise, we can see them logged on [Cloudwatch](https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logsV2:log-groups).

## Allow database connections
### Configure security group
- Modify the inbound rules. Add a Custom TCP rule to port `27017` (MongoDB's port) from `0.0.0.0/0` (the internet). This will open the database to the internet so lets add another level of security

### Add admin user
- SSH into the EC2 instance and run `mongo`
- Run `use blog` to enter the blog database.
- Now we are going to add a database admin user
```js
db.createUser({
  user: 'blog',
  pwd: 'VCNXRA7dhgzekFmKuYmcoQwD!',
  roles: [{ role: 'readWrite', db:'blog' }]
})
```

### Update Mongo Configuration
- Next we need to modify the mongo.conf. Run `sudo vim /etc/mongod.conf`
- As is, only processes running at 127.0.0.1 can access mongo. Lets open that to the internet. Go down to the network interfaces section and make the following change
```diff
# network interfaces
net:
  port: 27017
--  bindIp: 127.0.0.1
++  bindIp: 0.0.0.0
```
- Now we need to edit the security section to allow username/password authorization. This is important because now the database will be accessible from the internet
```diff
# security
++security:
++  authorization: enabled
```
- Finally lets restart mongo `sudo service mongod restart`
- Get the public IP address of the mongodb instance from the AWS Console
- We can test by connecting with the following `mongo -u admin -p VCNXRA7dhgzekFmKuYmcoQwD PUBLIC_IP_ADDRESS/blog`

### Connect to Mongo from API
- Update the API to use the Production database

## Initialize Amplify in React
Install the React UI Dependencies
```
npm install aws-amplify @aws-amplify/ui-react
```

Inside your main React file, include the following code:
```
import Amplify from "aws-amplify";
import awsExports from "./aws-exports";

Amplify.configure(awsExports);
```

## Setting Amplify Studio up
Start by running
```
amplify console
```

Select the "Console" option, this will open the AWS Console with the Amplify project showing. Here you can enable the Amplify Studio for this project.

Once enabled, you can use the interface to invite users to the Amplify Studio project.

# Data
## Create data models
Inside Amplify Studio, we can create the Data Models that populate our application. Its a nice GUI