import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Message } from '../../src/components/chat/Message.jsx';

test('Message component - user role', () => {
  const message = { role: 'user', content: 'Hello world' };
  const html = renderToString(<Message message={message} index={0} />);
  assert.ok(html.includes('user-text-content'), 'Should render user message container');
  assert.ok(html.includes('Hello world'), 'Should contain message text');
});

test('Message component - assistant role', () => {
  const message = { role: 'assistant', content: '**Bold text**\n```js\nconst a = 1;\n```' };
  const html = renderToString(<Message message={message} index={0} />);
  assert.ok(html.includes('message-content'), 'Should render assistant message wrapper');
  // Check that markdown is parsed
  assert.ok(html.includes('<strong>Bold text</strong>'), 'Should parse bold text');
  // Check code block
  assert.ok(html.includes('code-block-container'), 'Should render custom code block');
});
