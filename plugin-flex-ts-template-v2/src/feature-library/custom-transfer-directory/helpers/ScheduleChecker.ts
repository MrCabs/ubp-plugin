import { ExternalDirectoryEntry } from '../types/DirectoryEntry';

interface ScheduleResponse {
  isOpen: boolean;
  closedReason?: string;
  error?: string;
}

class ScheduleChecker {
  private scheduleCache: Map<string, { isOpen: boolean; timestamp: number }> = new Map();

  private CACHE_TTL = 60000; // 1 minute cache

  async checkSchedule(entry: ExternalDirectoryEntry): Promise<boolean> {
    const config = entry.check_schedule;

    if (!config || !config.enabled) {
      return true; // If no schedule check is configured, assume available
    }

    // Generate a cache key based on schedule config
    const cacheKey = `${config.environment}-${config.schedule_name}`;

    // Check cache first
    const cachedResult = this.scheduleCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < this.CACHE_TTL) {
      return cachedResult.isOpen;
    }

    try {
      // The correct endpoint is /check-schedule
      const url = `${config.serverless_domain}/check-schedule`;

      const params = new URLSearchParams({
        name: config.schedule_name,
      });

      // Adding parameters as query string
      const requestUrl = `${url}?${params.toString()}`;

      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add authentication if needed
      if (config.api_key && config.api_secret) {
        const authString = btoa(`${config.api_key}:${config.api_secret}`);
        options.headers = {
          ...options.headers,
          Authorization: `Basic ${authString}`,
        };
      }

      const response = await fetch(requestUrl, options);
      const data = (await response.json()) as ScheduleResponse;

      // Cache the result
      this.scheduleCache.set(cacheKey, {
        isOpen: data.isOpen,
        timestamp: Date.now(),
      });

      return data.isOpen;
    } catch (error) {
      console.error('Error checking schedule:', error);
      return true; // In case of error, default to available
    }
  }
}

export default new ScheduleChecker();
