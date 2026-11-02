import { HttpInterceptorFn } from '@angular/common/http';
import { mockApiInterceptor } from '../app/mock/mock-api.interceptor';

/**
 * Development build: /api calls are answered in the browser by the mock API.
 * Swapped in through fileReplacements, so the mock never reaches a production bundle.
 * To use a real backend locally, empty this array and add a dev-server proxy for /api.
 */
export const environment = {
  apiInterceptors: [mockApiInterceptor] as HttpInterceptorFn[],
};
