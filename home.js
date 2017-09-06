const createResponse = require('./lib/createResponse');

module.exports.index = (event, context, callback) => {
  const response = createResponse({ body: { message: 'Success!' } });
  console.log({ response });
  callback(null, response);
};
