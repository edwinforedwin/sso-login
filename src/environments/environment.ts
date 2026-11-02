import { HttpInterceptorFn } from '@angular/common/http';

/** Production build: all /api calls go to the real backend. */
export const environment = {
  apiInterceptors: [] as HttpInterceptorFn[],
};
