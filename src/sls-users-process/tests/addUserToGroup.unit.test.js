const cognitofunctions = require('../../common/cognito');

const userName = 'testuser@agendapi.com';
const groupName = process.env.COGNITO_ATTENDEE_GROUP_NAME;
const UserPoolId = process.env.COGNITO_USER_POOL_ID;

describe('test event for assign user to group', () => {
  test('user is initially not assigned to the group', async () => {
    const userGroups = await cognitofunctions.getUserGroupArray(
      userName,
      UserPoolId
    );
    expect(userGroups).not.toContain(groupName);
  });

  test('should return correct group after assignment', async () => {
    await cognitofunctions.addUserToGroup(userName, groupName, UserPoolId);

    const userGroups = await cognitofunctions.getUserGroupArray(
      userName,
      UserPoolId
    );
    expect(userGroups).toContain(groupName);
  });

  afterAll(async () => {
    await cognitofunctions.removeUserFromGroup(userName, groupName, UserPoolId);
    return true;
  });
});
