/**
 * Lambda Handler: Create User Profile
 *
 * Triggered by Cognito post-confirmation event when a user signs up.
 * Creates a user profile in DynamoDB.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { PostConfirmationTriggerHandler } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME;

if (!TABLE_NAME) {
  throw new Error('TABLE_NAME environment variable is required');
}

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('CreateUserProfile handler invoked', {
    userId: event.request.userAttributes.sub,
    email: event.request.userAttributes.email,
  });

  try {
    const userId = event.request.userAttributes.sub;
    const email = event.request.userAttributes.email || '';
    const username = email.includes('@') ? email.split('@')[0] : 'user';
    const createdAt = new Date().toISOString();

    // Create user profile in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
          userId,
          username,
          email,
          name: null,
          bio: null,
          avatar: null,
          createdAt,
          updatedAt: createdAt,
          // GSI1: User-centric queries
          GSI1PK: `USER#${userId}`,
          GSI1SK: 'PROFILE',
          // GSI2: Global queries (if needed)
          GSI2PK: 'USER',
          GSI2SK: createdAt,
        },
      })
    );

    console.log('User profile created successfully', { userId, email });

    return event;
  } catch (error) {
    console.error('Error creating user profile:', error);
    // Don't throw - allow user creation to succeed even if profile creation fails
    // The profile can be created later via GraphQL mutation
    return event;
  }
};
