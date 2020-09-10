const AWS = require('aws-sdk');

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION_NAME,
  apiVersion: '2016-04-18',
});

const getUserDetails = async (sub, UserPoolId) => {
  try {
    const subName = sub.replace('"', '');
    const request = {
      UserPoolId,
      Filter: `sub = "${subName}"`,
      Limit: 1,
    };
    const users = await cognito.listUsers(request).promise();
    return users;
  } catch (err) {
    return err;
  }
};

const getAllUsers = async (UserPoolId, PaginationToken, response = {}) => {
  try {
    let request;
    if (typeof PaginationToken !== 'undefined' && PaginationToken) {
      request = { UserPoolId, PaginationToken };
    } else {
      request = { UserPoolId };
    }
    const users = await cognito.listUsers(request).promise();
    if ('Users' in response) {
      response.Users = response.Users.concat(users.Users);
    } else {
      response.Users = users.Users;
    }
    if (typeof users.PaginationToken !== 'undefined' && users.PaginationToken) {
      await getAllUsers(UserPoolId, users.PaginationToken, response);
    }
    return response;
  } catch (err) {
    return err;
  }
};

module.exports = {
  getUserDetails,
  getAllUsers,
};
