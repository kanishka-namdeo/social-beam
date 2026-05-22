import { onboardingGraphPromise } from './lib/agent/graph';
import { HumanMessage } from '@langchain/core/messages';

async function main() {
  console.log('=== Testing LangGraph Onboarding Agent ===');

  const input = {
    messages: [new HumanMessage('Hello, let\'s get started with onboarding')],
    userId: 'test-user-1',
    workspaceId: 'test-workspace-1',
  };

  console.log('Streaming events from onboarding graph...');

  const eventStream = (await onboardingGraphPromise).streamEvents(input, { version: 'v2' });

  for await (const event of eventStream) {
    const eventType = event.event;
    console.log(`\n--- Event: ${eventType} ---`);
    
    if (eventType === 'on_chat_model_stream') {
      const chunk = event.data?.chunk as Record<string, unknown> | undefined;
      const token = chunk?.content ?? '';
      if (token) {
        process.stdout.write(token.toString());
      }
    }
    
    if (eventType === 'on_chain_end') {
      const output = event.data?.output as Record<string, unknown> | undefined;
      if (output) {
        console.log('\nChain output:');
        console.log(`  currentStep: ${output.currentStep}`);
        console.log(`  completed: ${output.completed}`);
      }
    }
  }

  console.log('\n\n=== Graph execution complete ===');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
