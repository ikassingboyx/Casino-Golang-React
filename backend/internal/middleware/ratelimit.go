package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimit allows each client `burst` requests at once, refilled at `perSecond`.
// Clients are the logged-in user (set by Auth) or else the client IP.
func RateLimit(perSecond float64, burst int) gin.HandlerFunc {
	l := &limiter{rate: perSecond, burst: float64(burst), buckets: map[string]*bucket{}}
	go l.sweep()
	return func(c *gin.Context) {
		key := c.GetString("userID")
		if key == "" {
			key = "ip:" + c.ClientIP()
		}
		if !l.allow(key) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, slow down"})
			return
		}
		c.Next()
	}
}

type bucket struct {
	tokens float64
	last   time.Time
}

type limiter struct {
	mu      sync.Mutex
	rate    float64
	burst   float64
	buckets map[string]*bucket
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: l.burst, last: now}
		l.buckets[key] = b
	}
	b.tokens = min(l.burst, b.tokens+now.Sub(b.last).Seconds()*l.rate)
	b.last = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// sweep forgets clients whose bucket has refilled, so memory stays bounded.
func (l *limiter) sweep() {
	full := time.Duration(l.burst/l.rate*float64(time.Second)) + time.Minute
	for range time.Tick(time.Minute) {
		l.mu.Lock()
		for k, b := range l.buckets {
			if time.Since(b.last) > full {
				delete(l.buckets, k)
			}
		}
		l.mu.Unlock()
	}
}
