---
name: whatsapp-integration
description: Integrates the deployed agent with Meta WhatsApp Cloud API. Use when implementing, extending or debugging WhatsApp messaging, webhooks or Graph API communication. Do not use for Telegram, Discord, Slack or generic REST APIs.
---

# WhatsApp Integration

## Workflow

1. Receive the incoming webhook from Meta.

2. Validate the webhook request.

3. Resolve the internal user from the sender phone number.

4. Invoke the Agent Orchestrator using the resolved identity.

5. Persist the conversation in the shared memory.

6. Build the outbound payload.

If the payload format is required, read:

assets/outbound-message.json

7. Send the response through Meta Graph API.

## References

If the integration architecture is required:

references/architecture.md

If Graph API details are required:

references/graph-api.md

If platform limitations apply:

references/limitations.md

## Error Handling

- Reject invalid webhook signatures.
- Return HTTP 200 immediately and process asynchronously.
- Retry transient Graph API failures.
- Reject unknown users or require registration.