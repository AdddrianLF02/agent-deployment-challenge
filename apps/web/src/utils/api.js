/**
 * Utility function to perform API requests.
 * @param {string} endpoint - The API endpoint to fetch.
 * @param {RequestInit} [options={}] - Fetch options.
 * @returns {Promise<any>} The parsed JSON response.
 * @throws {Error} If the response is not ok.
 */
export async function fetchApi(endpoint, options = {}) {
  const { headers, ...rest } = options;

  const fetchOptions = {
    credentials: "include",
    ...rest,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };

  const response = await fetch(endpoint, fetchOptions);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}
