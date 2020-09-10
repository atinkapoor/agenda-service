const AWS = require('aws-sdk');
const Promise = require('bluebird');
const AmazonS3URI = require('amazon-s3-uri');
const { scan, query } = require('./dynamodb');
const cognitofunctions = require('../common/cognito');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION_NAME,
  apiVersion: '2012-08-10',
});

const formatUserObject = async (userObject, groupName, type) => {
  let responseItem;
  if (typeof userObject === 'undefined') {
    responseItem = {};
  } else {
    const isPresenter = groupName === process.env.COGNITO_PRESENTER_GROUP_NAME;
    let status;
    if (userObject.UserStatus === 'CONFIRMED' && userObject.Enabled === true) {
      status = 'CONFIRMED';
    } else {
      status = 'NOT_CONFIRMED';
    }
    const userAttributes = [];
    userObject.Attributes.forEach((attributedata) => {
      userAttributes[attributedata.Name] = attributedata.Value;
    });
    let userName = userAttributes.name;
    if (!userName) {
      const userNameStr = `${
        typeof userAttributes.given_name !== 'undefined' &&
        userAttributes.given_name
          ? userAttributes.given_name
          : ''
      } ${
        typeof userAttributes.family_name !== 'undefined' &&
        userAttributes.family_name
          ? userAttributes.family_name
          : ''
      }`;
      userName = userNameStr.trim();
    }
    const email = type === 'all' ? userAttributes.email : undefined;
    responseItem = {
      userId: userAttributes.sub,
      name: userName,
      picture: userAttributes.picture,
      isPresenter,
      status,
      email,
    };
  }
  return responseItem;
};

const getAllCognitoUsers = async (
  groupName,
  cognitoUserPoolId,
  NextToken,
  responseArr
) => {
  const users = await cognitofunctions.getUsersInGroup(
    groupName,
    cognitoUserPoolId,
    NextToken
  );
  users.Users.forEach(async (itemdata) => {
    if (groupName === process.env.COGNITO_ATTENDEE_GROUP_NAME) {
      if (itemdata.UserStatus === 'CONFIRMED' && itemdata.Enabled === true) {
        const userFormattedObject = await formatUserObject(itemdata, groupName);
        responseArr.push(userFormattedObject);
      }
    } else {
      const userFormattedObject = await formatUserObject(itemdata, groupName);
      responseArr.push(userFormattedObject);
    }
  });
  if (typeof users.NextToken !== 'undefined' && users.NextToken) {
    await getAllCognitoUsers(
      groupName,
      cognitoUserPoolId,
      users.NextToken,
      responseArr
    );
  }
  return responseArr;
};

const getFileDownloadURL = async (fileUrl, detailEndPoint) => {
  let fileURL;
  if (detailEndPoint === true) {
    try {
      // eslint-disable-next-line no-unused-vars
      const { region, bucket, key } = AmazonS3URI(fileUrl);
      const req = {
        Bucket: process.env.WEBINAR_FILES_BUCKET_NAME,
        Key: key,
        Expires: 3600,
      };
      const s3GetObjectUrl = await s3.getSignedUrlPromise('getObject', req);
      fileURL = s3GetObjectUrl;
    } catch (e) {
      fileURL = '';
    }
  }
  return fileURL;
};

const getFileNameFromURL = (url) => {
  if (url) {
    const filename = url.substring(url.lastIndexOf('/') + 1);
    return filename;
  }
  return '';
};

const getFilesList = async (filesData, detailEndPoint) => {
  const fileUrls = await Promise.map(filesData, async (item) => {
    const fileItem = {
      fileUrl: await getFileDownloadURL(item.M.fileUrl.S, detailEndPoint),
      fileName: getFileNameFromURL(item.M.fileUrl.S),
      access: item.M.access.S,
    };
    return fileItem;
  });
  return fileUrls;
};


module.exports = {
  getAllCognitoUsers,
  formatUserObject,
  getFileDownloadURL,
  getFileNameFromURL,
  getFilesList,
};
