/**
 * Lambda Handler: Update Provisioning Status
 *
 * Called by the Step Functions state machine at each phase transition to
 * write progress back to DynamoDB so the admin UI can poll for updates.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

type ProvisioningPhase = 'BILLING' | 'ACCOUNTS' | 'GITHUB' | 'DONE' | 'FAILED';

interface ProvisionedAccount {
  name: string;
  email: string;
  accountId: string;
  roleArn: string;
}

interface UpdateStatusInput {
  projectId: string;
  phase: ProvisioningPhase;
  progress?: number;
  /** Populated when phase = ACCOUNTS: updated account list with real IDs + ARNs */
  accounts?: ProvisionedAccount[];
  /** Populated when phase = DONE: final GitHub repo URL */
  githubUrl?: string;
  /** Populated when phase = FAILED */
  sfnError?: { Error: string; Cause: string };
}

const PHASE_PROGRESS: Record<ProvisioningPhase, number> = {
  BILLING: 5,
  ACCOUNTS: 66,
  GITHUB: 80,
  DONE: 100,
  FAILED: 0,
};

export const handler = async (event: UpdateStatusInput): Promise<void> => {
  const { projectId, phase, accounts, githubUrl, sfnError } = event;
  const now = new Date().toISOString();
  const progress = event.progress ?? PHASE_PROGRESS[phase];

  const updateExpressionParts = [
    '#phase = :phase',
    '#progress = :progress',
    '#updatedAt = :updatedAt',
  ];
  const expressionNames: Record<string, string> = {
    '#phase': 'provisioningPhase',
    '#progress': 'provisioningProgress',
    '#updatedAt': 'updatedAt',
  };
  const expressionValues: Record<string, unknown> = {
    ':phase': phase,
    ':progress': progress,
    ':updatedAt': now,
  };

  if (accounts && accounts.length > 0) {
    updateExpressionParts.push('#accounts = :accounts');
    expressionNames['#accounts'] = 'accounts';
    expressionValues[':accounts'] = accounts.map((a) => ({
      name: a.name,
      email: a.email,
      accountId: a.accountId,
      roleArn: a.roleArn,
      awsSignInUrl: `https://signin.aws.amazon.com/console`,
    }));
  }

  if (githubUrl) {
    updateExpressionParts.push('#githubUrl = :githubUrl');
    expressionNames['#githubUrl'] = 'githubUrl';
    expressionValues[':githubUrl'] = githubUrl;
  }

  if (sfnError) {
    updateExpressionParts.push('#error = :error');
    expressionNames['#error'] = 'error';
    expressionValues[':error'] = `${sfnError.Error}: ${sfnError.Cause}`;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PROJECT#${projectId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    })
  );

  console.log(`Project ${projectId} phase → ${phase} (${progress}%)`);
};
