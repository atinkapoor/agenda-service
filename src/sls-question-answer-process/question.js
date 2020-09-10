const withSentry = require('serverless-sentry-lib');
const Sentry = require('@sentry/node');
const validation = require('../common/validation');
const questionFunctions = require('./questionFunctions');

module.exports.handler = withSentry(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const { method } = event;
  const { body } = event;
  const { cognitoPoolClaims } = event;
  const { sub } = cognitoPoolClaims;
  const { type } = event.path;
  let questionType = 'all';
  if (typeof type !== 'undefined' && type) {
    questionType = type;
  }

  let response;
  try {
    const isAdminOrModerator = await validation.validateUserGroup(
      sub,
      process.env.COGNITO_USER_POOL_ID,
      [
        process.env.COGNITO_ADMIN_GROUP_NAME,
        process.env.COGNITO_MODERATOR_GROUP_NAME,
      ]
    );
    if (method === 'POST') {
      // if question is posted from user side, user's sub is the userId
      if (!isAdminOrModerator) {
        body.userId = sub;
      }
      if ((body.status && isAdminOrModerator) || !body.status) {
        const validationResult = await validation.validateQuestion(body);
        if (validationResult.type === 'VALID') {
          response = await questionFunctions.questionAddUpdate(
            body,
            process.env.QUESTION_ANSWER_TABLE_NAME
          );
        } else {
          response = {
            error: {
              type: 'validation',
              messages: validationResult.messages,
            },
          };
        }
      } else {
        response = {
          error: {
            type: 'authorisation',
            messages: ['Unauthorised access'],
          },
        };
      }
    } else {
      let questionDetails;
      if (questionType === 'all') {
        if (isAdminOrModerator) {
          questionDetails = await questionFunctions.getQuestionDetails(
            questionType,
            process.env.QUESTION_ANSWER_TABLE_NAME,
            process.env.PRESENTATION_TABLE_NAME
          );
          response = {
            question: questionDetails,
          };
        } else {
          response = {
            error: {
              type: 'authorisation',
              messages: ['Unauthorised access'],
            },
          };
        }
      } else {
        questionDetails = await questionFunctions.getQuestionDetails(
          questionType,
          process.env.QUESTION_ANSWER_TABLE_NAME,
          process.env.PRESENTATION_TABLE_NAME
        );
        response = {
          question: questionDetails,
        };
      }
    }
  } catch (e) {
    Sentry.captureException(e);
    response = {
      error: {
        type: 'general',
        messages: [
          process.env.ERROR_DEBUG === 'true'
            ? e.message
            : 'Error managing questions',
        ],
      },
    };
  }
  return response;
});
