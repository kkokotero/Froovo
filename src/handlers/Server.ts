/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
import {
  AppOptions,
  HttpRequest,
  HttpResponse,
  TemplatedApp,
  WebSocketBehavior,
  WebSocket,
} from '../uWebSockets/index';
import { App, SSLApp } from '../uWebSockets/ESM_wrapper.mjs';

import { Request } from './Request';
import { Response } from './Response';

// Type Definitions for Middleware and Socket
export type Next = () => Promise<void> | void;
export type Callback =
  | (() => unknown)
  | ((req: Request) => unknown)
  | ((req: Request, res: Response) => unknown)
  | ((req: Request, res: Response, next: Next) => unknown);

export type Socket = WebSocket<unknown>;

/**
 * The `Server` class is a custom HTTP/WS server that supports synchronous and asynchronous middlewares.
 * It provides methods for handling HTTP routes, WebSocket connections, and managing request/response headers.
 */
export class Server {
  private app: TemplatedApp;

  /**
   * Constructor to initialize the `Server` instance.
   * It creates either an HTTP or an SSL (HTTPS) app based on the provided options.
   * @param option Configuration options for the app (optional).
   */
  constructor(private readonly option: AppOptions = {}) {
    this.app = this.createApp();
    this.app.any('/*', (res: HttpResponse, req: HttpRequest) => {
      res.writeStatus('404 Not Found').end(`
            <h1>File Not Found</h1>
            <hr/>
            <i>The page you are looking for does not exist. Method: ${req.getMethod().toUpperCase()} ${req.getUrl()}</i>
      `);
    });
  }

  /**
   * Creates an HTTP or SSL (HTTPS) app based on the presence of `key_file_name` and `cert_file_name`.
   * @returns {TemplatedApp} The created app instance.
   */
  private createApp(): TemplatedApp {
    return this.option.key_file_name && this.option.cert_file_name
      ? SSLApp(this.option) // Creates an SSLApp for HTTPS
      : App(); // Creates an App for HTTP
  }

  /**
   * Handles various HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS) by setting up middleware and routing.
   * @param method The HTTP method (GET, POST, etc.)
   * @param path The route path for this method.
   * @param callbacks The list of middlewares to handle the request.
   */
  // Server.ts (modificación en handleMethod)
  private handleMethod(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'any',
    path: string,
    ...callbacks: Callback[]
  ) {
    this.app[method](path, (res: HttpResponse, req: HttpRequest) => {
      const request = new Request(req, res);
      const response = new Response(res);
      let aborted = false;

      let index = 0;

      res.onAborted(() => {
        aborted = true;
        response.ended = true;
      });

      const dispatch = async (): Promise<void> => {
        if (aborted || response.ended) return;

        const mw = callbacks[index++];

        if (!mw) {
          if (!response.ended) response.end();
          return;
        }

        try {
          const result = mw(request, response, () => dispatch());

          if (result instanceof Promise) {
            await result;
          }
        } catch (e) {
          console.error('Middleware Error:', e);
          if (!response.ended) {
            response.status(500).end();
          }
        }

        if (!response.ended) await dispatch();
      };

      (async () => {
        await dispatch();
        if (!aborted && !response.ended) {
          response.end();
        }
      })();
    });
    return this;
  }

  /**
   * A flexible routing function to handle both standard routes and WebSocket routes.
   * @param config Configuration object containing method, path, and middlewares.
   * @returns The current instance of the Server.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public route(...configs: Record<string, any>[]) {
    // eslint-disable-next-line no-unreachable-loop
    for (const config of configs) {
      const { method, path } = config;

      if (method === 'ws') {
        return this.ws(path, config['config']);
      }

      const middlewares = config['middlewares'] ?? [];

      this.handleMethod(method, path, ...middlewares);
    }
    return this;
  }

  // Convenience methods for each HTTP method (GET, POST, PUT, DELETE, PATCH, OPTIONS)
  public get(path: string, ...callbacks: Callback[]) {
    return this.handleMethod('get', path, ...callbacks);
  }

  public post(path: string, ...callbacks: Callback[]) {
    return this.handleMethod('post', path, ...callbacks);
  }

  public put(path: string, ...callbacks: Callback[]) {
    return this.handleMethod('put', path, ...callbacks);
  }

  public delete(path: string, ...callbacks: Callback[]) {
    return this.handleMethod('delete', path, ...callbacks);
  }

  public patch(path: string, ...callbacks: Callback[]) {
    return this.handleMethod('patch', path, ...callbacks);
  }

  public options(path: string, ...callbacks: Callback[]) {
    return this.handleMethod('options', path, ...callbacks);
  }

  public any(path: string, ...callbacks: Callback[]) {
    return this.handleMethod('any', path, ...callbacks);
  }

  /**
   * Configures a WebSocket handler for the given path.
   * @param path The WebSocket route path.
   * @param config The WebSocket behavior configuration.
   * @returns The current instance of the Server.
   */
  public ws(path: string, config: WebSocketBehavior<unknown>) {
    return this.app.ws(path, config);
  }

  /**
   * Listens on a specified port and executes callbacks once the server starts.
   * @param port The port to listen on (either number or string).
   * @param callbacks The list of callback functions to be executed after the server starts.
   * @returns The current instance of the Server.
   */
  public listen(port: number | string, ...callbacks: (() => void)[]): this {
    const parsedPort = Number(port);

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(parsedPort)) {
      throw new Error(`Invalid port: ${port}`);
    }

    this.app.listen(parsedPort, (listenSocket) => {
      if (listenSocket) {
        callbacks.forEach((callback) => {
          try {
            callback();
          } catch (error) {
            console.error('Listen callback error:', error);
          }
        });
      }
    });
    return this;
  }

  /**
   * Closes the server and executes provided callbacks.
   * @param callbacks The list of callback functions to be executed after the server is closed.
   * @returns The current instance of the Server.
   */
  public close(...callbacks: (() => void)[]) {
    try {
      this.app.close();
      callbacks.forEach((callback) => callback());
    } catch (error) {
      console.error('Server close error:', error);
    }
    return this;
  }

  /**
   * Publishes a message to a specific topic in the server.
   * @param topic The topic to publish to.
   * @param message The message to send.
   * @returns The result of the publish operation.
   */
  public publish(topic: string, message: string) {
    return this.app.publish(topic, message);
  }

  /**
   * Returns the number of subscribers to a given topic.
   * @param topic The topic to check.
   * @returns The number of subscribers to the topic.
   */
  public subscribers(topic: string) {
    return this.app.numSubscribers(topic);
  }
}
