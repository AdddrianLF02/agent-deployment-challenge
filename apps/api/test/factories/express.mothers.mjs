import { mock } from 'node:test';

export class ExpressMother {
  /**
   * Creates a mock Express request object.
   * @param {Object} overrides - Properties to override the default request.
   * @returns {Object} A mock Express request.
   */
  static createMockReq(overrides = {}) {
    return {
      body: {},
      query: {},
      params: {},
      headers: {},
      ...overrides
    };
  }

  /**
   * Creates a mock Express response object using node:test mock functions.
   * @returns {Object} A mock Express response.
   */
  static createMockRes() {
    const res = {};
    res.status = mock.fn(() => res);
    res.json = mock.fn(() => res);
    res.send = mock.fn(() => res);
    res.end = mock.fn(() => res);
    res.set = mock.fn(() => res);
    res.setHeader = mock.fn(() => res);
    return res;
  }

  /**
   * Creates a mock Express next function.
   * @returns {Function} A mock next function.
   */
  static createMockNext() {
    return mock.fn();
  }
}
