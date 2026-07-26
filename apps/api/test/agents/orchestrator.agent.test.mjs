import test from 'node:test';
import assert from 'node:assert';
import { buildSystemPrompt, runOrchestrator } from '../../src/agents/orchestrator.agent.mjs';

test('orchestrator.agent', async (t) => {
  await t.test('buildSystemPrompt wraps historical context in xml tags', () => {
    const historical = [
      { content: 'context1' },
      { content: 'context2' }
    ];
    const prompt = buildSystemPrompt(historical);
    assert.ok(prompt.includes('<historical_context>'));
    assert.ok(prompt.includes('</historical_context>'));
    assert.ok(prompt.includes('context1'));
    assert.ok(prompt.includes('context2'));
  });

  await t.test('runOrchestrator wraps user input in xml tags and calls LLM', async () => {
    // We mock requestCompletion in the module-level by mocking global fetch or we can't easily mock it without DI.
    // Let's test the formatting first.
    // Actually, we need to test the while loop execution of runOrchestrator.
    // To do this reliably, we can mock `requestCompletion` inside `model-client.mjs` via node:test module mocking or global fetch.
    // For simplicity, let's mock global.fetch
    let fetchCallCount = 0;
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      fetchCallCount++;
      const body = JSON.parse(options.body);
      const lastMessage = body.messages[body.messages.length - 1];

      if (fetchCallCount === 1) {
        // Assert user input is wrapped in <user_input>
        assert.ok(lastMessage.content.includes('<user_input>'));
        assert.ok(lastMessage.content.includes('hello system'));
        
        // Return a tool call
        return {
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'get_system_status',
                    arguments: JSON.stringify({ service: 'database' })
                  }
                }]
              }
            }]
          })
        };
      } else {
        // Assert tool result was injected
        assert.strictEqual(lastMessage.role, 'tool');
        assert.ok(lastMessage.content.includes('ok'));

        // Return final text
        return {
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                role: 'assistant',
                content: 'The database is ok.'
              }
            }]
          })
        };
      }
    };

    const config = { model: { name: 'test', baseUrl: 'http://test' } };
    const response = await runOrchestrator({
      userInput: 'hello system',
      historicalContext: [],
      conversationMessages: [],
      config
    });

    assert.strictEqual(response.role, 'assistant');
    assert.strictEqual(response.content, 'The database is ok.');
    assert.strictEqual(fetchCallCount, 2);
    
    global.fetch = originalFetch;
  });

  await t.test('runOrchestrator stops after 5 iterations', async () => {
    let fetchCallCount = 0;
    const originalFetch = global.fetch;
    global.fetch = async () => {
      fetchCallCount++;
      // Always return a tool call
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: `call_${fetchCallCount}`,
                type: 'function',
                function: {
                  name: 'get_system_status',
                  arguments: JSON.stringify({ service: 'database' })
                }
              }]
            }
          }]
        })
      };
    };

    const config = { model: { name: 'test', baseUrl: 'http://test' } };
    const response = await runOrchestrator({
      userInput: 'hello system',
      historicalContext: [],
      conversationMessages: [],
      config
    });

    assert.strictEqual(response.role, 'assistant');
    assert.ok(response.content.includes('límite'));
    assert.strictEqual(fetchCallCount, 5);
    
    global.fetch = originalFetch;
  });
});
