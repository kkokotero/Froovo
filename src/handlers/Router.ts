/* eslint-disable no-plusplus */
import { WebSocketBehavior } from '../uWebSockets/index';

import { Callback } from './Server';

/**
 * The `Router` class provides static methods for defining routes and WebSocket handlers.
 * It is used to create routing configurations that can be later used by the server to handle
 * HTTP methods or WebSocket connections.
 */
export class Router {
  /**
   * Creates a GET route configuration.
   * @param path The path for the GET request.
   * @param callbacks The middlewares to apply for the GET request.
   * @returns An object representing the route configuration for GET.
   */
  static get(path: string, ...callbacks: Callback[]) {
    return { method: 'get', path, middlewares: [...callbacks] };
  }

  /**
   * Creates a POST route configuration.
   * @param path The path for the POST request.
   * @param callbacks The middlewares to apply for the POST request.
   * @returns An object representing the route configuration for POST.
   */
  static post(path: string, ...callbacks: Callback[]) {
    return { method: 'post', path, middlewares: [...callbacks] };
  }

  /**
   * Creates a PUT route configuration.
   * @param path The path for the PUT request.
   * @param callbacks The middlewares to apply for the PUT request.
   * @returns An object representing the route configuration for PUT.
   */
  static put(path: string, ...callbacks: Callback[]) {
    return { method: 'put', path, middlewares: [...callbacks] };
  }

  /**
   * Creates a DELETE route configuration.
   * @param path The path for the DELETE request.
   * @param callbacks The middlewares to apply for the DELETE request.
   * @returns An object representing the route configuration for DELETE.
   */
  static delete(path: string, ...callbacks: Callback[]) {
    return { method: 'delete', path, middlewares: [...callbacks] };
  }

  /**
   * Creates a PATCH route configuration.
   * @param path The path for the PATCH request.
   * @param callbacks The middlewares to apply for the PATCH request.
   * @returns An object representing the route configuration for PATCH.
   */
  static patch(path: string, ...callbacks: Callback[]) {
    return { method: 'patch', path, middlewares: [...callbacks] };
  }

  /**
   * Creates an OPTIONS route configuration.
   * @param path The path for the OPTIONS request.
   * @param callbacks The middlewares to apply for the OPTIONS request.
   * @returns An object representing the route configuration for OPTIONS.
   */
  static options(path: string, ...callbacks: Callback[]) {
    return { method: 'options', path, middlewares: [...callbacks] };
  }

  /**
   * Creates a WebSocket route configuration.
   * @param path The WebSocket route path.
   * @param config The WebSocket behavior configuration.
   * @returns An object representing the WebSocket route configuration.
   */
  static ws(path: string, config: WebSocketBehavior<unknown>) {
    return { method: 'ws', path, config };
  }
}
