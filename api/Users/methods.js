'use strict';

const createResponse = require('./../../lib/createResponse');

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const jwt = require('jsonwebtoken');
const uuid = require('uuid');

//Will use the native nodeJS crypto module, and use sha256 as the hashing function
const crypto = require('crypto');
const HASHING_FUNCTION_NAME = 'sha256';

const USER_TABLE_NAME = process.env.DYNAMODB_TABLE;

AWS.config.update({
  "accessKeyId": "abcde",
  "secretAccessKey": "abcde",
  "region": process.env.REGION,
  "endpoint": "http://localhost:8000"
});

const dynamo = new AWS.DynamoDB.DocumentClient();

function getUser(Email, callback) {
  //Query for users with that Email
  const query = {
    TableName: USER_TABLE_NAME,
    Key: {
      Email,
    }, 
  }
  dynamo.get(query, (err, data) => {
      callback(err, data.Item);
  });
};

function hashPassword(password, salt) {
  const hashFunction = crypto.createHash(HASHING_FUNCTION_NAME);
  //Logic specific to the crypto module 
  //(https://nodejs.org/api/crypto.html#crypto_hash_update_data_input_encoding)
  return hashFunction.update(password + salt).digest('base64');
};

function createNewUser(Email, Password, callback) {
  const timestamp = new Date().getTime();
  
  const salt = uuid.v4();
  const passwordHash = hashPassword(Password, salt);

  const params = {
    TableName: USER_TABLE_NAME,
    Item: {
      Email,
      Password: passwordHash,
      Salt: salt,
      CreatedAt: timestamp,
      UpdatedAt: timestamp,
    },
  };
  dynamo.put(params, (error, result) => {
    callback(error, result);
  });
};

function loginUser(Email, Password, callback) {
  getUser(Email, (error, user) => {
    if (error) {
      console.error(error);
      return callback(error);      
    }

    if (!user) {
      return callback("Invalid Email");
    }

    const passwordHash = hashPassword(Password, user.Salt);
    if (user.Password === passwordHash) {
      callback(null, user);
    } else {
      callback('Incorrect password!');
    }
  });
};

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

  if (typeof data.Email !== 'string') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t create the User. Email field required.'));
    return;
  }
  
  const Email = data.Email;
  const Password = data.Password;

  // call method
  getUser(Email, (error, data) => {
    if (error) {
      const response = createResponse({ 
        body: { status: 'failed' },
        statusCode: 400
      });
      callback(null, response);
      return;
    }

    if (data) {
      const response = createResponse({ 
        body: { message: 'Email already taken!' },
        statusCode: 400
      });
      callback(null, response);
      return;
    }

    // call method
    createNewUser(Email, Password, (error, result) => {
      // handle potential errors
      if (error) {
        console.error(error);
        const response = createResponse({ 
          body: { status: 'failed' },
          statusCode: 400
        });
        callback(null, response);
        return;
      }

      // create a response
      const response = createResponse({ 
        body: { status: 'success' } 
      });
      callback(null, response);
    }); // createNewUser
  }); // getUser
};

module.exports.token = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const Email = data.Email;
  const Password = data.Password;

  if (!Email || !Password) {
    const response = {
      statusCode: 400,
      message: 'Need Email and Password',
    };
    callback(null, response);    
    return;
  }

  // call method
  loginUser(Email, Password, (error, user) => {
    if (error) {
      const response = createResponse({ 
        body: { success: false, message: 'Invalid username or password' },
        statusCode: 400
      });
      callback(null, response);      
      return;
    }

    // if user is found and password is right
    // create a token
    const token = jwt.sign(user, process.env.APP_SECRET);    

    // create a response
    const response = createResponse({ 
      body: { status: 'success', Token: token }
    });
    callback(null, response);
  }); // loginUser
};
