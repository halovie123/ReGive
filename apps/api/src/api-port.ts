export const DEFAULT_API_PORT = 3001;

export function resolveApiPort(
  configuredPort: string | undefined,
): string | number {
  return configuredPort ?? DEFAULT_API_PORT;
}
