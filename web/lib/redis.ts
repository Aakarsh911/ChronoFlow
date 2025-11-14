import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient && redisClient.isOpen) {
    return redisClient
  }

  // Create Redis client
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.warn('Redis: Max reconnection attempts reached, giving up')
          return false // Stop trying to reconnect
        }
        return Math.min(retries * 100, 1000)
      },
      connectTimeout: 5000, // 5 second timeout
    },
  })

  // Error handling
  client.on('error', (err) => {
    console.warn('Redis Client Error:', err.message)
  })

  client.on('connect', () => {
    console.log('✓ Redis: Connected')
  })

  client.on('reconnecting', () => {
    console.log('Redis: Reconnecting...')
  })

  // Connect to Redis
  try {
    await client.connect()
    redisClient = client as RedisClientType
    return redisClient
  } catch (error) {
    console.warn('⚠️  Redis unavailable, continuing without cache:', (error as Error).message)
    return null
  }
}

// Cache utility functions
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient()
      if (!client) return null // Redis unavailable, skip caching
      
      const data = await client.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.warn('Redis get error:', error)
      return null
    }
  },

  /**
   * Set a value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const client = await getRedisClient()
      if (!client) return false // Redis unavailable, skip caching
      
      const serialized = JSON.stringify(value)
      
      if (ttl) {
        await client.setEx(key, ttl, serialized)
      } else {
        await client.set(key, serialized)
      }
      
      return true
    } catch (error) {
      console.warn('Redis set error:', error)
      return false
    }
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      if (!client) return false // Redis unavailable, skip caching
      
      await client.del(key)
      return true
    } catch (error) {
      console.warn('Redis del error:', error)
      return false
    }
  },

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const client = await getRedisClient()
      if (!client) return 0 // Redis unavailable, skip caching
      
      const keys = await client.keys(pattern)
      
      if (keys.length === 0) {
        return 0
      }
      
      await client.del(keys)
      return keys.length
    } catch (error) {
      console.warn('Redis delPattern error:', error)
      return 0
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      if (!client) return false // Redis unavailable, skip caching
      
      const result = await client.exists(key)
      return result === 1
    } catch (error) {
      console.warn('Redis exists error:', error)
      return false
    }
  },

  /**
   * Set expiration time for a key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const client = await getRedisClient()
      if (!client) return false // Redis unavailable, skip caching
      
      await client.expire(key, seconds)
      return true
    } catch (error) {
      console.warn('Redis expire error:', error)
      return false
    }
  },
}

// Helper to generate cache keys
export const cacheKeys = {
  calendar: (userId: string, startDate: string, endDate: string) => 
    `calendar:${userId}:${startDate}:${endDate}`,
  
  calendarUser: (userId: string) => 
    `calendar:${userId}:*`,
  
  emails: (userId: string, date: string) => 
    `emails:${userId}:${date}`,
  
  emailsUser: (userId: string) => 
    `emails:${userId}:*`,
  
  integrations: (userId: string) => 
    `integrations:${userId}`,
  
  tasks: (userId: string) => 
    `tasks:${userId}`,
  
  jiraIssues: (userId: string) => 
    `jira:issues:${userId}`,
}

// Default TTL values (in seconds)
export const cacheTTL = {
  calendar: 300,      // 5 minutes
  emails: 300,        // 5 minutes
  integrations: 600,  // 10 minutes
  tasks: 300,         // 5 minutes
  jiraIssues: 600,    // 10 minutes
}

// Shorthand functions for easier imports
export const getCache = cache.get
export const setCache = cache.set
export const deleteCache = cache.del
export const invalidateCache = cache.del  // Alias for deleteCache
export const deleteCachePattern = cache.delPattern
