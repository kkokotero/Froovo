/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-return-assign */
/* eslint-disable class-methods-use-this */

import { HttpRequest, HttpResponse } from '../uWebSockets/index';

/**
 * Represents a standalone HTTP request abstraction built on top of uWebSockets.js.
 * This class provides lazy parsing and access to headers, query parameters, cookies,
 * request body, and utility methods for interacting with the HTTP request and response.
 */
export class Request {
  private _url: string;

  private _method: string;

  private _headers: Record<string, string>;

  private _queryParams: Record<string, string>;

  private _cookies: Record<string, string>;

  private _bodyPromise: Promise<unknown> | null = null;

  /**
   * Initializes the Request object by synchronously parsing headers, query parameters, and cookies.
   * @param req HttpRequest object from uWebSockets
   * @param res HttpResponse object from uWebSockets
   */
  constructor(
    private readonly req: HttpRequest,
    private readonly res: HttpResponse,
  ) {
    // Capture and store all necessary properties synchronously upon construction
    this._url = req.getUrl();
    this._method = req.getMethod().toLowerCase();
    this._headers = this.parseHeadersSync();
    this._queryParams = this.parseQueryParamsSync();
    this._cookies = this.parseCookiesSync();
  }

  /** Returns the full request URL. */
  get url(): string {
    return this._url;
  }

  /** Returns the HTTP method in lowercase (e.g., 'get', 'post'). */
  get method(): string {
    return this._method;
  }

  /** Returns an object of parsed query parameters. */
  get query(): Record<string, string> {
    return this._queryParams;
  }

  /** Returns an object of parsed request headers (all keys are lowercased). */
  get headers(): Record<string, string> {
    return this._headers;
  }

  /** Returns the Content-Type header (empty if not set). */
  get contentType(): string {
    return this.headers['content-type'] || '';
  }

  /** Returns an object of parsed cookies from the Cookie header. */
  get cookies(): Record<string, string> {
    return this._cookies;
  }

  /** Returns the remote client's IP address as a string. */
  get ip(): string {
    return Buffer.from(this.res.getRemoteAddressAsText()).toString();
  }

  /** Returns the User-Agent header, if present. */
  get userAgent(): string {
    return this.headers['user-agent'] || '';
  }

  /** Lazily parses and returns the body of the request based on its Content-Type. */
  get body(): Promise<unknown> {
    if (!this._bodyPromise) {
      this._bodyPromise = this.parseBody();
    }
    return this._bodyPromise;
  }

  /**
   * Returns a URL parameter by name or index.
   * @param nameOrIndex Parameter name (string) or index (number)
   */
  param(nameOrIndex: string | number): string | undefined {
    return this.req.getParameter(nameOrIndex) || undefined;
  }

  /**
   * Returns all route parameters as an object with keys like "param0", "param1", etc.
   */
  get params(): Record<string, string> {
    const params: Record<string, string> = {};
    let index = 0;
    let paramValue: string | undefined;
    // Iteratively collect indexed parameters until undefined
    // eslint-disable-next-line no-cond-assign, no-plusplus
    while ((paramValue = this.req.getParameter(index++))) {
      params[`param${index - 1}`] = paramValue;
    }
    return Object.keys(params).length ? params : {};
  }

  /**
   * Retrieves a header by name (case-insensitive).
   * @param name Header name
   */
  getHeader(name: string): string {
    return this.headers[name.toLowerCase()] || '';
  }

  /**
   * Sets or overwrites a response header using cork for batching.
   * @param name Header name
   * @param value Header value
   */
  setHeader(name: string, value: string): void {
    this.res.cork(() => {
      this.res.writeHeader(name, value);
    });
  }

  /**
   * Removes a header by setting it to an empty value.
   * @param name Header name
   */
  removeHeader(name: string): void {
    this.res.cork(() => {
      this.res.writeHeader(name, '');
    });
  }

  /**
   * Checks whether a specific header is present.
   * @param name Header name
   */
  hasHeader(name: string): boolean {
    return name.toLowerCase() in this.headers;
  }

  /**
   * Reads and parses the body based on its Content-Type.
   * - application/json → parsed JSON
   * - application/x-www-form-urlencoded → key-value object
   * - multipart/form-data → parsed fields
   * - otherwise → raw string
   */
  private async parseBody(): Promise<unknown> {
    const raw = await this.readBody();

    if (raw === '') return {};

    if (this.contentType.includes('application/json')) {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    } else if (this.contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(raw);
      return params.size > 0 ? Object.fromEntries(params) : {};
    } else if (this.contentType.includes('multipart/form-data')) {
      const boundaryMatch = this.contentType.match(/boundary=(.+)/);
      const parsed = boundaryMatch
        ? this.parseMultipart(raw, boundaryMatch[1])
        : {};
      return Object.keys(parsed).length ? parsed : {};
    } else {
      return raw || {};
    }
  }

  /**
   * Reads the request body as a string from the HTTP stream.
   * Collects chunks until the final chunk is received.
   */
  private readBody(): Promise<string> {
    return new Promise((resolve) => {
      const buffer: Buffer[] = [];
      this.res.onData((chunk, isLast) => {
        buffer.push(Buffer.from(chunk));
        if (isLast) resolve(Buffer.concat(buffer).toString());
      });
    });
  }

  /**
   * Parses multipart/form-data input using the provided boundary string.
   * Extracts field names and values from each part.
   * @param body Raw request body
   * @param boundary Multipart boundary string
   */
  private parseMultipart(
    body: string,
    boundary: string,
  ): Record<string, unknown> {
    const parts = body.split(`--${boundary}`);
    const data: Record<string, unknown> = {};

    for (const part of parts) {
      if (part.trim() === '' || part.trim() === '--') continue;

      const [rawHeaders, ...rest] = part.split('\r\n\r\n');
      const content = rest.join('\r\n\r\n').trim();

      const headers: Record<string, string> = {};
      for (const line of rawHeaders.split('\r\n')) {
        const [key, value] = line.split(':').map((v) => v.trim());
        if (key && value) headers[key.toLowerCase()] = value;
      }

      const disposition = headers['content-disposition'];
      const nameMatch = disposition?.match(/name="([^"]+)"/);
      if (nameMatch) {
        const fieldName = nameMatch[1];
        data[fieldName] = content;
      }
    }

    return data;
  }

  /**
   * Synchronously parses headers from the incoming request.
   * Keys are normalized to lowercase.
   */
  private parseHeadersSync(): Record<string, string> {
    const headers: Record<string, string> = {};
    this.req.forEach((key, value) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }

  /**
   * Synchronously parses query parameters from the URL.
   */
  private parseQueryParamsSync(): Record<string, string> {
    const query = this.req.getQuery();
    return query ? Object.fromEntries(new URLSearchParams(query)) : {};
  }

  /**
   * Synchronously parses cookies from the Cookie header.
   * Returns a dictionary of cookie names and values.
   */
  private parseCookiesSync(): Record<string, string> {
    const cookieHeader = this.req.getHeader('cookie') || '';
    return cookieHeader.split(';').reduce(
      (acc, pair) => {
        const [key, value] = pair.split('=').map((s) => s.trim());
        if (key) acc[key] = decodeURIComponent(value ?? '');
        return acc;
      },
      {} as Record<string, string>,
    );
  }
}
