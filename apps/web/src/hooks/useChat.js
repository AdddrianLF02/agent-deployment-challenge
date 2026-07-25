import { useState } from 'react';
import { fetchApi } from '../utils/api.js';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    setSending(true);
    setError(null);
    setDraft('');

    const newMessages = [...messages, { role: 'user', content: trimmedDraft }];
    setMessages(newMessages);

    try {
      const data = await fetchApi('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: newMessages }),
      });

      // Handle typical API response formats
      const responseMessage = data.message || data;
      setMessages((prev) => [...prev, responseMessage]);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setSending(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    draft,
    setDraft,
    sending,
    error,
    sendMessage,
    clearMessages,
  };
}
