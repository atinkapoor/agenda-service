const withSentry = require('serverless-sentry-lib');
const Sentry = require('@sentry/node');
const AWS = require('aws-sdk');
const crypto = require('crypto');
const {
  isValidImageContentType,
  // getSupportedContentTypes,
} = require('../common/mime-types');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION_NAME,
  apiVersion: '2012-08-10',
});

module.exports.handler = withSentry(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const { body } = event;
  const { cognitoPoolClaims } = event;
  const { sub } = cognitoPoolClaims;

  if (!isValidImageContentType(body.contentType, 'image')) {
    return {
      error: {
        type: 'validation',
        messages: ['Invalid image type'],
      },
    };
  }

  let result;
  try {
    // Create the PutObjectRequest that will be embedded in the signed URL
    const photoString = `${body.imageName}${sub}${new Date()}`;
    const photoMd5 = crypto.createHash('md5').update(photoString).digest('hex');
    const photoPath1 = photoMd5.substring(0, 2);
    const photoPath2 = photoMd5.substring(2, 4);
    const photoURL = `photos/${photoPath1}/${photoPath2}/${body.imageName}`;
    const req = {
      Bucket: process.env.USER_PHOTOS_BUCKET_NAME,
      Key: photoURL,
      ContentType: body.contentType,
      ACL: 'public-read',
      // Set Metadata fields to be retrieved post-upload and stored in Cognito
      Metadata: {
        imageName: body.imageName,
        contentType: body.contentType,
        photoURL,
        userId: sub,
      },
    };
    // Get the signed URL from S3 and return to client
    const s3PutObjectUrl = await s3.getSignedUrlPromise('putObject', req);

    result = {
      imageName: body.imageName,
      s3PutObjectUrl,
    };
  } catch (e) {
    Sentry.captureException(e);
    result = {
      error: {
        type: 'general',
        messages: [
          process.env.ERROR_DEBUG === 'true'
            ? e.message
            : 'Error generating signed URL',
        ],
      },
    };
  }

  return result;
});
