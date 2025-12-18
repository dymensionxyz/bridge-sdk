/**
 * Get required environment variable or exit
 */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

/**
 * Get optional environment variable
 */
export function optionalEnv(name: string): string | undefined {
  return process.env[name];
}

/**
 * Check if DRY_RUN mode is enabled
 */
export function isDryRun(): boolean {
  return process.env.DRY_RUN === 'true';
}
