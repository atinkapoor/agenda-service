const AWS = require('aws-sdk');
const moment = require('moment-timezone');

const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION_NAME,
});
const documentClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION_NAME,
});

const insertRow = async (request, tableName) => {
  const timestamp = moment.tz(process.env.EVENT_TIME_ZONE).format();
  const timestampUnix = Math.round(new Date().getTime() / 1000);

  request.Item.insertTime = {
    S: timestamp,
  };
  request.Item.timestampUnix = {
    N: String(timestampUnix),
  };
  request.TableName = tableName;
  const response = await ddb.putItem(request).promise();
  return response;
};

const insertItem = async (request) => {
  const timestamp = moment.tz(process.env.EVENT_TIME_ZONE).format();
  const timestampUnix = Math.round(new Date().getTime() / 1000);
  request.Item.insertTime = timestamp;
  request.Item.timestampUnix = timestampUnix;

  const response = await documentClient.put(request).promise();
  return response;
};

const updateRow = async (request, tableName) => {
  request.TableName = tableName;
  const response = await ddb.updateItem(request).promise();
  return response;
};

const updateItem = async (request) => {
  const response = await documentClient.update(request).promise();
  return response;
};

const getRow = async (request, tableName) => {
  request.TableName = tableName;
  const response = await ddb.getItem(request).promise();
  return response;
};

const deleteRow = async (request, tableName) => {
  request.TableName = tableName;
  const response = await ddb.deleteItem(request).promise();
  return response;
};

const deleteItem = async (request) => {
  const response = await documentClient.delete(request).promise();
  return response;
};

const query = async (request, tableName) => {
  request.TableName = tableName;
  const response = await ddb.query(request).promise();
  return response;
};

const queryPaging = async (
  request,
  tableName,
  LastEvaluatedKey,
  response = {}
) => {
  const scanRequest = request;
  if (typeof LastEvaluatedKey !== 'undefined' && LastEvaluatedKey) {
    scanRequest.ExclusiveStartKey = LastEvaluatedKey;
  }
  scanRequest.TableName = tableName;
  const scanResponse = await ddb.query(scanRequest).promise();
  if ('Items' in response) {
    response.Items = response.Items.concat(scanResponse.Items);
    response.Count = response.Items.length;
    response.ScannedCount = response.Items.length;
  } else {
    response.Items = scanResponse.Items;
    response.Count = scanResponse.Count;
    response.ScannedCount = scanResponse.ScannedCount;
  }

  if (
    typeof scanResponse.LastEvaluatedKey !== 'undefined' &&
    scanResponse.LastEvaluatedKey
  ) {
    await queryPaging(
      request,
      tableName,
      scanResponse.LastEvaluatedKey,
      response
    );
  }
  return response;
};

const scan = async (request, tableName) => {
  request.TableName = tableName;
  const response = await ddb.scan(request).promise();
  return response;
};

const scanPaging = async (
  request,
  tableName,
  LastEvaluatedKey,
  response = {}
) => {
  const scanRequest = request;
  if (typeof LastEvaluatedKey !== 'undefined' && LastEvaluatedKey) {
    scanRequest.ExclusiveStartKey = LastEvaluatedKey;
  }
  scanRequest.TableName = tableName;
  const scanResponse = await ddb.scan(scanRequest).promise();
  if ('Items' in response) {
    response.Items = response.Items.concat(scanResponse.Items);
    response.Count = response.Items.length;
    response.ScannedCount = response.Items.length;
  } else {
    response.Items = scanResponse.Items;
    response.Count = scanResponse.Count;
    response.ScannedCount = scanResponse.ScannedCount;
  }

  if (
    typeof scanResponse.LastEvaluatedKey !== 'undefined' &&
    scanResponse.LastEvaluatedKey
  ) {
    await scanPaging(
      request,
      tableName,
      scanResponse.LastEvaluatedKey,
      response
    );
  }
  return response;
};

const scanItem = async (params) => {
  const response = await documentClient.scan(params).promise();
  return response;
};

module.exports = {
  insertRow,
  insertItem,
  updateRow,
  updateItem,
  getRow,
  deleteRow,
  deleteItem,
  query,
  queryPaging,
  scan,
  scanItem,
  scanPaging,
};
