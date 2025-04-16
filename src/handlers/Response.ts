import fs from 'fs';
import path from 'path';
import { HttpResponse } from '../uWebSockets/index';

/**
 * The `Response` class facilitates the management and sending of HTTP responses
 * using the uWebSockets library.
 */
export class Response {
  public ended: boolean = false; // Indicates if the response has already been ended.

  private _contentType?: string; // Optional content type for the response.

  constructor(private res: HttpResponse) {}

  /**
   * Sets the HTTP status code for the response.
   * @param code The HTTP status code (e.g., 200, 404, 500, etc.).
   * @returns The `Response` instance to allow method chaining.
   */
  public status(code: number): Response {
    this.res.writeStatus(String(code)); // Set the status code for the response.
    return this;
  }

  /**
   * Sets a header for the response.
   * @param name The header name (e.g., 'Content-Type').
   * @param value The value of the header (e.g., 'application/json').
   * @returns The `Response` instance to allow method chaining.
   */
  public setHeader(name: string, value: string): Response {
    this.res.writeHeader(name, value); // Write the header to the response.
    return this;
  }

  /**
   * Sends a message in the body of the response.
   * @param msg The message to send in the response body.
   * @returns `true` if the message was successfully sent, otherwise `false`.
   */
  public write(msg: string): boolean {
    return this.res.write(msg); // Write the message to the response body.
  }

  /**
   * Sends a message in the body of the response.
   * @param msg The message to send in the response body.
   * @returns `true` if the message was successfully sent, otherwise `false`.
   */
  public send(msg: string): boolean {
    return this.res.write(msg); // Write the message to the response body.
  }

  /**
   * Ends the response and sends the final message.
   * @param msg Optional message to send before ending the response.
   * @returns `true` if the response was successfully ended, otherwise `false`.
   */
  public end(msg?: unknown): boolean {
    if (this.ended) {
      throw new Error('Error: Answer already closed'); // Throws an error if the response has already been ended.
    }
    this.ended = true; // Mark the response as ended.
    return !!this.res.end((msg as string) ?? ''); // End the response with the optional message.
  }

  /**
   * Sends a response in JSON format.
   * Converts the provided object to JSON, sets the 'Content-Type' header to 'application/json',
   * and sends the response.
   * @param data The object to be converted to JSON and sent in the response body.
   * @returns `true` if the response was successfully sent, otherwise `false`.
   */
  public json(data: unknown): boolean {
    this.setHeader('Content-Type', 'application/json'); // Set the Content-Type header.
    return this.end(JSON.stringify(data)); // Convert data to JSON and end the response.
  }

  /**
   * Redirects the response to another URL.
   * Sets the status code to 302 (Found) and the 'Location' header to the provided URL.
   * @param url The URL to which the request should be redirected.
   * @returns `true` if the response was successfully redirected, otherwise `false`.
   */
  public redirect(url: string): boolean {
    this.status(302); // Set status to 302 (Redirect).
    this.setHeader('Location', url); // Set the Location header for the redirection.
    return this.end(`Redirecting to ${url}`); // End the response with the redirection message.
  }

  /**
   * Sends a file from the file system in the response.
   * Reads the file synchronously and sends it in the response.
   * The MIME type can be inferred from the file extension, or a custom type can be provided.
   * @param filePath The absolute or relative path to the file.
   * @param options Optional options to specify the content type and encoding.
   *   - `contentType`: MIME type (e.g., "image/png", "application/pdf").
   *   - `encoding`: File encoding (e.g., "utf8" for text files or `null` for binary).
   * @returns `true` if the file was successfully sent, or `false` if an error occurred.
   */
  public file(
    filePath: string,
    options?: { contentType?: string; encoding?: BufferEncoding | null },
  ): boolean {
    try {
      const data = fs.readFileSync(filePath, options?.encoding); // Read the file.
      const ext = path.extname(filePath).toLowerCase(); // Get the file extension.

      // If no content type is provided, infer it from the file extension.
      if (!options?.contentType) {
        this.setHeader('Content-Type', this.inferContentType(ext));
      } else {
        this.setHeader('Content-Type', options.contentType); // Use the provided content type.
      }

      return this.end(data); // Send the file data and end the response.
    } catch (error) {
      this.status(404); // Set status to 404 (File Not Found).
      return this.end('File not found'); // Send an error message if the file was not found.
    }
  }

  /**
   * Sends a file and forces its download in the browser.
   * Sets the 'Content-Disposition' header to indicate that the file should be downloaded.
   * @param filePath The path to the file.
   * @param filename The name to be used for the downloaded file.
   * @param options Optional options to specify content type and encoding.
   * @returns `true` if the file was successfully sent for download, otherwise `false`.
   */
  public download(
    filePath: string,
    filename: string,
    options?: { contentType?: string; encoding?: BufferEncoding | null },
  ): boolean {
    this.setHeader('Content-Disposition', `attachment; filename="${filename}"`); // Set the Content-Disposition header.
    return this.file(filePath, options); // Send the file for download.
  }

  /**
   * Infers the MIME type based on the file extension.
   * @param ext The file extension (e.g., ".png", ".txt").
   * @returns The corresponding MIME type for the file extension.
   */
  // eslint-disable-next-line class-methods-use-this
  private inferContentType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
    };

    return mimeTypes[ext] || 'application/octet-stream'; // Default to a binary stream MIME type if unknown.
  }

  /**
   * Enables CORS headers for public access.
   * Sets headers to allow any origin, method, headers, and disables credentials.
   */
  public enablePublicCors() {
    this.setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', '*')
      .setHeader('Access-Control-Allow-Headers', '*')
      .setHeader('Access-Control-Allow-Credentials', 'false');
  }
}
