const uuid = require('uuid');
const moment = require('moment');
const Promise = require('bluebird');
const {
  queryPaging,
  scanPaging,
  insertItem,
  updateItem,
} = require('../common/dynamodb');
const { getDateTimeObject } = require('../common/dateTimeUtils');
const cognitofunctions = require('../common/cognito');
const {
  formatUserObject,
  getPresentationDetails,
} = require('../common/commonUtils');
const validation = require('../common/validation');

const questionAddUpdate = async (body, tableName) => {
  let { questionId } = body;
  const timestamp = moment.tz(process.env.EVENT_TIME_ZONE).format('X');

  // if status is passed in body (in case of moderator, its check is done initially) then set the same status
  // otherwise check if the question is posted by the presenter of this presentation, then set status as directly ACCEPTED
  // otherwise set the staus as PENDING
  let status = 'PENDING';
  if (body.status) {
    // eslint-disable-next-line prefer-destructuring
    status = body.status;
  } else {
    const isPresentationPresenter = await validation.validatePresentationPresenter(
      body.userId,
      body.presentationId,
      process.env.COGNITO_USER_POOL_ID,
      process.env.COGNITO_PRESENTER_GROUP_NAME
    );
    if (isPresentationPresenter) {
      status = 'ACCEPTED';
    }
  }
  let statusResponse = '';

  if (typeof questionId === 'undefined' || !questionId) {
    questionId = uuid.v4();
    const saveQuestionData = {
      TableName: tableName,
      Item: {
        questionId,
        question: body.question,
        submitTimestamp: parseInt(timestamp, 10),
        presentationId: body.presentationId,
        userId: body.userId,
        status,
      },
    };
    await insertItem(saveQuestionData);
    statusResponse = 'Question submitted!';
  } else {
    const updateQuestionData = {
      TableName: tableName,
      Key: { questionId },
      UpdateExpression:
        'set #question = :question, #submitTimestamp = :submitTimestamp, #presentationId = :presentationId, #userId = :userId, #status = :status',
      ExpressionAttributeValues: {
        ':question': body.question,
        ':submitTimestamp': parseInt(timestamp, 10),
        ':presentationId': body.presentationId,
        ':userId': body.userId,
        ':status': status,
      },
      ExpressionAttributeNames: {
        '#question': 'question',
        '#submitTimestamp': 'submitTimestamp',
        '#presentationId': 'presentationId',
        '#userId': 'userId',
        '#status': 'status',
      },
    };
    await updateItem(updateQuestionData);
    statusResponse = 'Question updated!';
  }

  return {
    status: statusResponse,
  };
};

const getQuestionDetails = async (
  listType,
  tableName,
  presentationTableName
) => {
  const status = 'ACCEPTED';
  let readRequest;
  let readResponse;
  let presentationDetail;
  let allUsers;
  if (listType === 'all') {
    readRequest = {};
    readResponse = await scanPaging(readRequest, tableName);
    allUsers = await cognitofunctions.getAllUsers(
      process.env.COGNITO_USER_POOL_ID
    );
  } else {
    const presentationId = listType;
    readRequest = {
      IndexName: 'presentationId-status-Index',
      KeyConditionExpression:
        '#presentationId = :presentationId and #status = :status',
      ExpressionAttributeNames: {
        '#presentationId': 'presentationId',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':presentationId': { S: presentationId },
        ':status': { S: status },
      },
    };
    readResponse = await queryPaging(readRequest, tableName);
    // get presentation details
    presentationDetail = await getPresentationDetails(
      presentationId,
      presentationTableName
    );
  }

  readResponse.Items.sort((a, b) =>
    a.submitTimestamp.N < b.submitTimestamp.N ? 1 : -1
  );
  const responseArr = await Promise.map(
    readResponse.Items,
    async (itemdata) => {
      // get user details
      let userObject;
      if (listType === 'all') {
        userObject = allUsers.Users.filter(
          (item) => itemdata.userId.S === item.Username
        );
      } else {
        const userCognitoObject = await cognitofunctions.getUserDetails(
          itemdata.userId.S,
          process.env.COGNITO_USER_POOL_ID
        );
        userObject = userCognitoObject.Users;
      }
      let userFormattedObject;
      if (typeof userObject === 'undefined') {
        userFormattedObject = {};
      } else {
        userFormattedObject = await formatUserObject(userObject[0], '', 'all');
      }
      // get presentation details
      if (listType === 'all') {
        presentationDetail = await getPresentationDetails(
          itemdata.presentationId.S,
          presentationTableName
        );
      }

      return {
        questionId: itemdata.questionId.S,
        question: itemdata.question.S,
        presentation: presentationDetail,
        user: userFormattedObject,
        submitTimestamp: getDateTimeObject(itemdata.submitTimestamp.N, 'UNIX'),
        status: itemdata.status.S,
      };
    }
  );
  return responseArr;
};

module.exports = {
  questionAddUpdate,
  getQuestionDetails,
};
