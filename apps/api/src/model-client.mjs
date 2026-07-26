export class ModelRequestError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "ModelRequestError";
    this.status = status;
  }
}

export async function requestCompletion({ model, messages, tools, fetchImpl = fetch }) {
  const headers = { "content-type": "application/json" };
  if (model.apiKey) headers.authorization = `Bearer ${model.apiKey}`;

  let response;

  try {
    const body = {
      model: model.name,
      messages: messages.some(m => m.role === "system") 
        ? messages 
        : [{ role: "system", content: model.systemPrompt }, ...messages],
    };
    
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    response = await fetchImpl(`${model.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(model.timeoutMs || 60000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new ModelRequestError("The model request timed out", 504);
    }
    throw new ModelRequestError("The model endpoint could not be reached");
  }

  if (!response.ok) {
    throw new ModelRequestError("The model endpoint rejected the request");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ModelRequestError("The model endpoint returned invalid JSON");
  }

  const message = payload?.choices?.[0]?.message;
  if (!message) {
    throw new ModelRequestError("The model endpoint returned an empty response");
  }

  return {
    content: message.content || "",
    tool_calls: message.tool_calls || [],
    message: message
  };
}
