import { Server } from './handlers/Server';

import type { AppOptions } from './uWebSockets/index';

export { Router } from './handlers/Router';
export { Server } from './handlers/Server';
export type { Socket, Next, Callback } from './handlers/Server';
export type { Request } from './handlers/Request';
export type { Response } from './handlers/Response';

export default (options: AppOptions = {}) => {
  return new Server(options);
};
