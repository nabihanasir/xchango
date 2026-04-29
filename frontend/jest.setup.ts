import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

class MockResponse {
  status: number;
  url: string;

  constructor(_body?: unknown, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    this.url = '';
  }
}

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  Response: MockResponse,
});
