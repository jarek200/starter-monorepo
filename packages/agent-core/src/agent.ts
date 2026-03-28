/**
 * Amazon Bedrock AgentCore runtime entry (Strands).
 * @see https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-toolkit-typescript.html
 */
import { Agent } from '@strands-agents/sdk';
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime';

const agent = new Agent();

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (payload, context) => {
      const prompt = (payload as { prompt?: string }).prompt ?? 'Hello!';
      console.log(`Session ${context.sessionId} - Received prompt:`, prompt);

      const result = await agent.invoke(prompt);
      return result;
    },
  },
});

app.run();
