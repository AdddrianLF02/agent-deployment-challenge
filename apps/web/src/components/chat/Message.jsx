import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const customSchema = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames.filter(
    (tagName) => !['script', 'iframe'].includes(tagName)
  ),
};

export function Message({ message, index }) {
  const isUser = message.role === "user";
  const actor = isUser ? "Tú" : "Agente";

  return (
    <article className={`message message--${message.role}`}>
      <header>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{actor}</strong>
      </header>
      {isUser ? (
        <p className="user-text-content">{message.content}</p>
      ) : (
        <div className="message-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeSanitize, customSchema]]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <div className="code-block-container">
                    <div className="code-block-header">
                      <span className="code-block-language">{match[1]}</span>
                    </div>
                    <pre className="code-block-pre">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <code className="code-inline" {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </article>
  );
}
