export function getEnvVar(key: string): string | undefined {
  return Deno?.env.get(key) ?? process.env[key];
}
