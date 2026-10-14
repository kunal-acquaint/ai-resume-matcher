import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../auth.constants.js';

/** Opts a route (or controller) out of the global authentication guard. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
