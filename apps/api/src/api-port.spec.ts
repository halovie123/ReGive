import { resolveApiPort } from './api-port';

describe('resolveApiPort', () => {
  it('keeps port 3000 available for the web app by default', () => {
    expect(resolveApiPort(undefined)).toBe(3001);
  });

  it('honors an explicitly configured API port', () => {
    expect(resolveApiPort('4100')).toBe('4100');
  });
});
