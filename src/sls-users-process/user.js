const withSentry = require('serverless-sentry-lib');
const Sentry = require('@sentry/node');
const Promise = require('bluebird');
const { getAllCognitoUsers } = require('../common/commonUtils');
const { getAllGroups } = require('../common/cognito');

module.exports.handler = withSentry(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const { type } = event.path;
  let userType = 'all';
  if (typeof type !== 'undefined' && type) {
    userType = type.replace('"', '').toLowerCase();
  }

  let response;
  try {
    const allUsers = [];
    const allUsersIds = [];
    const allPresenters = await getAllCognitoUsers(
      process.env.COGNITO_PRESENTER_GROUP_NAME,
      process.env.COGNITO_USER_POOL_ID,
      '',
      []
    );
    allPresenters.forEach(async (user) => {
      allUsersIds.push(user.userId);
      allUsers.push(user);
    });

    if (userType !== process.env.COGNITO_PRESENTER_GROUP_NAME.toLowerCase()) {
      const allGroups = await getAllGroups(process.env.COGNITO_USER_POOL_ID);
      await Promise.map(allGroups.Groups, async (item) => {
        const allGroupUsers = await getAllCognitoUsers(
          item.GroupName,
          process.env.COGNITO_USER_POOL_ID,
          '',
          []
        );
        if (allGroupUsers !== 'undefined' && allGroupUsers.length > 0) {
          allGroupUsers.forEach(async (user) => {
            if (allUsersIds.indexOf(user.userId) === -1) {
              allUsersIds.push(user.userId);
              allUsers.push(user);
            }
          });
        }
      });
    }
    response = allUsers;
  } catch (e) {
    Sentry.captureException(e);
    response = {
      error: {
        type: 'general',
        messages: [
          process.env.ERROR_DEBUG === 'true'
            ? e.message
            : 'Error fetching users',
        ],
      },
    };
  }
  return response;
});
