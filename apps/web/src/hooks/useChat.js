import { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api.js';

export function useChat(isAuthenticated) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const data = await fetchApi('/api/chat/history');
          if (isMounted) {
            setMessages(data.messages || []);
          }
        } catch (err) {
          if (isMounted) {
            console.error('Failed to load chat history:', err);
            // Non-blocking error for history load
          }
        } finally {
          if (isMounted) {
            setIsLoadingHistory(false);
          }
        }
      };
      
      fetchHistory();
    } else {
      setMessages([]);
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

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
    isLoadingHistory,
    sendMessage,
    clearMessages,
  };
}
