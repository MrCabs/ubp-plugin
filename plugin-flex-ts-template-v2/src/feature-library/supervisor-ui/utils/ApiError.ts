export class ApiError extends Error {
  status?: number;

  details?: any;

  error?: string;

  static create(error: string | object, status?: number): ApiError {
    const apiError = new ApiError();
    apiError.name = 'ApiError';

    if (typeof error === 'string') {
      apiError.message = error;
    } else if (typeof error === 'object') {
      const errorObj = error as any;
      apiError.message = errorObj.error || errorObj.message || 'Unknown error';
      apiError.error = errorObj.error;
      apiError.details = errorObj.details;
    }

    apiError.status = status;
    return apiError;
  }
}
