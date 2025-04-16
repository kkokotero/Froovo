/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-return-assign */
/* eslint-disable class-methods-use-this */

import { HttpRequest, HttpResponse } from '../uWebSockets/index';

/**
 * The `Request` class encapsulates an HTTP request in a more manageable form,
 * providing convenient access to common request properties like headers, query
 * parameters, cookies, body, etc. This class abstracts the interaction with the
 * underlying HTTP request and provides utility methods for easier access to request data.
 */
export class Request {
  private _url?: string;

  private _method?: string;

  private _queryParams?: Record<string, string>;

  private _headers?: Record<string, string>;

  private _contentType?: string;

  private parsedBody?: unknown;

  /**
   * Constructs a new `Request` instance.
   * @param req The underlying HTTP request object.
   * @param res The HTTP response object.
   */
  constructor(
    private readonly req: HttpRequest,
    private readonly res: HttpResponse,
  ) {}

  /**
   * Retrieves the URL of the request.
   * @returns The URL of the request.
   */
  get url(): string {
    return (this._url ??= this.req.getUrl());
  }

  /**
   * Retrieves the HTTP method of the request (GET, POST, etc.).
   * @returns The HTTP method (e.g., 'get', 'post').
   */
  get method(): string {
    return (this._method ??= this.req.getMethod().toLowerCase());
  }

  /**
   * Retrieves the query parameters as a key-value record.
   * @returns An object representing the query parameters.
   */
  get query(): Record<string, string> {
    return (this._queryParams ??= this.parseQueryParams());
  }

  /**
   * Retrieves the headers of the request as a key-value record.
   * @returns An object representing the headers.
   */
  get headers(): Record<string, string> {
    return (this._headers ??= this.parseHeaders());
  }

  /**
   * Retrieves the content type of the request.
   * @returns The content type of the request.
   */
  get contentType(): string {
    return (this._contentType ??=
      this.req.getHeader('content-type')?.toLowerCase() ?? '');
  }

  /**
   * Retrieves the cookies as a key-value record.
   * @returns An object representing the cookies.
   */
  get cookies(): Record<string, string> {
    return this.parseCookies();
  }

  /**
   * Retrieves the IP address of the client making the request.
   * @returns The IP address of the client.
   */
  get ip(): string {
    return Buffer.from(this.res.getRemoteAddressAsText()).toString();
  }

  /**
   * Retrieves the 'user-agent' header from the request.
   * @returns The user-agent string of the client.
   */
  get userAgent(): string {
    return this.getHeader('user-agent');
  }

  /**
   * Retrieves the body of the request, parsed based on its content type.
   * @returns A promise that resolves to the parsed body.
   */
  get body(): Promise<unknown> {
    return this.parseBody();
  }

  /**
   * Retrieves a specific parameter from the request (either query or path parameters).
   * @param nameOrIndex The name or index of the parameter.
   * @returns The parameter's value or undefined if not found.
   */
  param(nameOrIndex: string | number): string | undefined {
    return this.req.getParameter(nameOrIndex);
  }

  /**
   * Retrieves a specific header from the request.
   * @param name The name of the header.
   * @returns The value of the header or an empty string if not found.
   */
  getHeader(name: string): string {
    return this.headers[name.toLowerCase()] || '';
  }

  /**
   * Sets a header for the response.
   * @param name The header name.
   * @param value The header value.
   */
  setHeader(name: string, value: string): void {
    this.res.writeHeader(name, value);
  }

  /**
   * Removes a header from the response.
   * @param name The header name to remove.
   */
  removeHeader(name: string): void {
    this.res.writeHeader(name, '');
  }

  /**
   * Checks if a specific header is present in the request.
   * @param name The name of the header to check.
   * @returns True if the header exists, otherwise false.
   */
  hasHeader(name: string): boolean {
    return name.toLowerCase() in this.headers;
  }

  // ================================
  // Body Parsing
  // ================================

  /**
   * Parses the body of the request based on its content type.
   * This function handles different content types like JSON, form data, and multipart data.
   * @returns A promise that resolves to the parsed body.
   */
  private async parseBody(): Promise<unknown> {
    if (this.parsedBody !== undefined) return this.parsedBody;

    const raw = await this.readBody();

    if (this.contentType.includes('application/json')) {
      try {
        this.parsedBody = JSON.parse(raw);
      } catch {
        this.parsedBody = {};
      }
    } else if (this.contentType.includes('application/x-www-form-urlencoded')) {
      this.parsedBody = Object.fromEntries(new URLSearchParams(raw));
    } else if (this.contentType.includes('multipart/form-data')) {
      const boundaryMatch = this.contentType.match(/boundary=(.+)/);
      this.parsedBody = boundaryMatch
        ? this.parseMultipart(raw, boundaryMatch[1])
        : {};
    } else {
      this.parsedBody = raw;
    }

    return this.parsedBody;
  }

  /**
   * Reads the raw body data from the request.
   * @returns A promise that resolves to the raw body string.
   */
  private readBody(): Promise<string> {
    return new Promise((resolve) => {
      let raw = '';
      this.res.onData((chunk, isLast) => {
        raw += Buffer.from(chunk).toString();
        if (isLast) resolve(raw);
      });
    });
  }

  /**
   * Parses the multipart/form-data body.
   * @param body The raw body data.
   * @param boundary The boundary string to split the parts.
   * @returns A record representing the parsed form fields.
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
   * Parses the query parameters from the URL.
   * @returns A record representing the query parameters.
   */
  private parseQueryParams(): Record<string, string> {
    const queryParams: Record<string, string> = {};
    const raw = this.req.getQuery();

    for (const pair of raw.split('&')) {
      const [key, value] = pair.split('=').map(decodeURIComponent);
      if (key) queryParams[key] = value ?? '';
    }

    return queryParams;
  }

  /**
   * Parses the headers of the request.
   * @returns A record representing the request headers.
   */
  private parseHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    this.req.forEach((key, value) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }

  /**
   * Parses the cookies from the 'cookie' header.
   * @returns A record representing the cookies.
   */
  private parseCookies(): Record<string, string> {
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
