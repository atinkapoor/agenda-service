const AWS = require('aws-sdk');
const cognitofunctions = require('../common/cognito');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION_NAME,
  apiVersion: '2012-08-10',
});

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const s3Record = event.Records[0].s3;

  // First fetch metadata from S3
  const s3Object = await s3
    .headObject({ Bucket: s3Record.bucket.name, Key: s3Record.object.key })
    .promise();
  if (!s3Object.Metadata) {
    // Shouldn't get here
    const errorMessage = 'Cannot process photo as no metadata is set for it';
    throw new Error(errorMessage);
  }

  // S3 metadata field names are converted to lowercase, so need to map them out carefully
  const { userid } = s3Object.Metadata;
  const photoURL = `https://${s3Record.bucket.name}.s3.amazonaws.com/${s3Object.Metadata.photourl}`;
  // const photoURL = `https://${process.env.USER_PHOTOS_CLOUDFRONT_URL}/${s3Object.Metadata.photoURL}`;

  // update user attribute
  await cognitofunctions.updateUserAttribute(
    'picture',
    photoURL,
    userid,
    process.env.COGNITO_USER_POOL_ID
  );

  return true;
};
