import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'kizuna:isPublic';

/** Marks a route as public (skips AuthGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
