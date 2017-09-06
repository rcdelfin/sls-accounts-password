'use strict';

const createResponse = require('./../../lib/createResponse');

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
AWS.config.update({ region: 'us-west-1' });

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);


  if (typeof data.Email !== 'string') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t create the User. Email field required.'));
    return;
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuid.v1(),
      Email: data.Email,
      Password: data.Password,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      const response = createResponse({ body: { message: 'failed' } });
      callback(null, response);
      return;
    }

    console.log("User:", params.Item);

    // create a response
    const response = createResponse({ body: { message: 'success' } });
    callback(null, response);
  });
};
