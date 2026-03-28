/**
 * Lambda Handler: Vend AWS Account (Step Functions task)
 *
 * Called once per account in the Map state. Submits an account-creation
 * request to AWS Organizations and polls until the account is ACTIVE.
 * Idempotent: if the account was already created for this project+name,
 * returns the existing account ID without creating a duplicate.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  CreateAccountCommand,
  DescribeCreateAccountStatusCommand,
  ListAccountsCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME!;

const orgClient = new OrganizationsClient({ region: 'us-east-1' }); // Organizations API is us-east-1 only
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface VendAccountInput {
  name: string;
  email: string;
  projectId: string;
}

interface VendAccountOutput {
  name: string;
  email: string;
  accountId: string;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 60; // Up to 10 minutes

async function findExistingAccount(email: string): Promise<string | null> {
  let nextToken: string | undefined;

  do {
    const response = await orgClient.send(new ListAccountsCommand({ NextToken: nextToken }));
    const match = response.Accounts?.find((a) => a.Email === email && a.Status === 'ACTIVE');
    if (match?.Id) return match.Id;
    nextToken = response.NextToken;
  } while (nextToken);

  return null;
}

async function pollUntilActive(requestId: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const response = await orgClient.send(
      new DescribeCreateAccountStatusCommand({ CreateAccountRequestId: requestId })
    );

    const status = response.CreateAccountStatus;

    if (status?.State === 'SUCCEEDED' && status.AccountId) {
      return status.AccountId;
    }

    if (status?.State === 'FAILED') {
      throw new Error(`Account creation failed: ${status.FailureReason}`);
    }

    // Still IN_PROGRESS — wait before next poll
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('Account creation timed out after polling');
}

export const handler = async (event: VendAccountInput): Promise<VendAccountOutput> => {
  const { name, email, projectId } = event;

  console.log(`Vending account: name=${name}, email=${email}, project=${projectId}`);

  // Idempotency: check if account with this email already exists
  const existingId = await findExistingAccount(email);
  if (existingId) {
    console.log(`Account already exists: ${existingId} (${email})`);
    return { name, email, accountId: existingId };
  }

  // Create new account
  const createResponse = await orgClient.send(
    new CreateAccountCommand({
      AccountName: name,
      Email: email,
      IamUserAccessToBilling: 'ALLOW',
    })
  );

  const requestId = createResponse.CreateAccountStatus?.Id;
  if (!requestId) {
    throw new Error('No request ID returned from CreateAccount');
  }

  // Poll until account is active
  const accountId = await pollUntilActive(requestId);
  console.log(`Account created: ${accountId} (${name})`);

  return { name, email, accountId };
};
