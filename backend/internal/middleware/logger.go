package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger logs each request like gin's default logger, but without the query
// string: the WebSocket URL carries the login token (/ws?token=…), which must
// never end up in logs. Health checks are not logged.
func Logger() gin.HandlerFunc {
	return gin.LoggerWithConfig(gin.LoggerConfig{SkipPaths: []string{"/healthz"}, Formatter: func(p gin.LogFormatterParams) string {
		return fmt.Sprintf("[GIN] %v | %3d | %13v | %15s | %-7s %s\n%s",
			p.TimeStamp.Format(time.DateTime),
			p.StatusCode,
			p.Latency,
			p.ClientIP,
			p.Method,
			p.Request.URL.Path,
			p.ErrorMessage,
		)
	}})
}
