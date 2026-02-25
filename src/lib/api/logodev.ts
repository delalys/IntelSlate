/**
 * Logo.dev API Client
 *
 * Fetches company logos from the Logo.dev service.
 * Documentation: https://logo.dev/
 *
 * @module lib/api/logodev
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the Logo.dev client
 */
export interface ILogoDevConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the Logo.dev API */
  baseUrl?: string;
}

/**
 * Result of a logo fetch operation
 */
export interface ILogoFetchResult {
  /** The URL of the logo image, or null if not found */
  logoUrl: string | null;
  /** The domain that was queried */
  domain: string;
  /** Whether the fetch was successful */
  success: boolean;
  /** Error message if fetch failed */
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[LogoDev]';
const DEFAULT_BASE_URL = 'https://img.logo.dev';
const PROXY_BASE_PATH = '/api/logo';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [LogoDev] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [LogoDev] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

// =============================================================================
// Logo.dev Client
// =============================================================================

/**
 * Creates a Logo.dev API client instance
 *
 * @param config - Configuration options for the client
 * @returns An object with methods to interact with the Logo.dev API
 *
 * @example
 * ```typescript
 * const client = createLogoDevClient({
 *   apiKey: process.env.LOGO_DEV_API_KEY!
 * });
 *
 * const result = await client.fetchLogo('apple.com');
 * if (result.success) {
 *   console.log('Logo URL:', result.logoUrl);
 * }
 * ```
 */
export function createLogoDevClient(config: ILogoDevConfig) {
  const { apiKey, baseUrl = DEFAULT_BASE_URL } = config;

  if (!apiKey) {
    logError('API key is required but not provided');
    throw new Error(`${LOG_PREFIX} API key is required`);
  }

  /**
   * Constructs the Logo.dev URL for a given domain
   */
  function getLogoUrl(domain: string): string {
    // Clean the domain (remove protocol if present)
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    return `${baseUrl}/${cleanDomain}?token=${apiKey}`;
  }

  /**
   * Constructs a proxy URL that does not expose the API key
   */
  function getProxyUrl(domain: string): string {
    return `${PROXY_BASE_PATH}/${encodeURIComponent(domain)}`;
  }

  /**
   * Fetches a logo URL for a given domain
   *
   * @param domain - The company domain (e.g., "apple.com")
   * @returns A promise resolving to the fetch result
   */
  async function fetchLogo(domain: string): Promise<ILogoFetchResult> {
    const cleanDomain = domain
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    // Validate domain is not empty
    if (!cleanDomain) {
      logError('Empty domain provided');
      return {
        logoUrl: null,
        domain: '',
        success: false,
        error: 'Domain is required',
      };
    }

    log(`Fetching logo for domain: ${cleanDomain}`);

    try {
      const logoUrl = getLogoUrl(cleanDomain);

      // Validate that the logo exists using GET request
      // Note: Using GET instead of HEAD as many CDN/image services don't support HEAD
      const response = await fetch(logoUrl, { method: 'GET' });

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 404) {
          log(`Logo not found for domain: ${cleanDomain}`);
          return {
            logoUrl: null,
            domain: cleanDomain,
            success: false,
            error: 'Logo not found',
          };
        }

        if (response.status === 429) {
          logError(`Rate limit exceeded for domain: ${cleanDomain}`);
          return {
            logoUrl: null,
            domain: cleanDomain,
            success: false,
            error: 'Rate limit exceeded',
          };
        }

        if (response.status === 401 || response.status === 403) {
          logError(`Authentication failed for domain: ${cleanDomain}`);
          return {
            logoUrl: null,
            domain: cleanDomain,
            success: false,
            error: 'Invalid API key',
          };
        }

        logError(
          `Failed to fetch logo for ${cleanDomain}: HTTP ${response.status}`,
        );
        return {
          logoUrl: null,
          domain: cleanDomain,
          success: false,
          error: `HTTP error: ${response.status}`,
        };
      }

      log(`Successfully fetched logo for domain: ${cleanDomain}`);
      return {
        logoUrl: getProxyUrl(cleanDomain),
        domain: cleanDomain,
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError(`Error fetching logo for ${cleanDomain}:`, errorMessage);

      return {
        logoUrl: null,
        domain: cleanDomain,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Gets the direct logo URL without validation
   * Useful when you want to use the URL directly without checking availability
   *
   * @param domain - The company domain
   * @returns The logo URL string
   */
  function getDirectLogoUrl(domain: string): string {
    return getLogoUrl(domain);
  }

  return {
    fetchLogo,
    getDirectLogoUrl,
  };
}

// =============================================================================
// Default Client Instance
// =============================================================================

/**
 * Creates a default Logo.dev client using environment variables
 *
 * @returns A Logo.dev client instance, or null if API key is not configured
 *
 * @example
 * ```typescript
 * const client = getDefaultLogoDevClient();
 * if (client) {
 *   const result = await client.fetchLogo('apple.com');
 * }
 * ```
 */
export function getDefaultLogoDevClient() {
  const apiKey = process.env.LOGO_DEV_API_KEY;

  if (!apiKey) {
    logError('LOGO_DEV_API_KEY environment variable is not set');
    return null;
  }

  return createLogoDevClient({ apiKey });
}

// =============================================================================
// Convenience Exports
// =============================================================================

export type TLogoDevClient = ReturnType<typeof createLogoDevClient>;
