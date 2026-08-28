import { EnvelopeError } from './common-error-response';

export interface ApiResponseEnvelope<T> {
  value?: T;
  isSuccess: boolean;
  statusCode: number;
  validationErrors: EnvelopeError[];
}
