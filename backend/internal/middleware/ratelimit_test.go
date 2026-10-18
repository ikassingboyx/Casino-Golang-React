package middleware

import "testing"

func TestLimiter(t *testing.T) {
	l := &limiter{rate: 1, burst: 3, buckets: map[string]*bucket{}}
	for i := 0; i < 3; i++ {
		if !l.allow("a") {
			t.Fatalf("request %d within the burst was refused", i+1)
		}
	}
	if l.allow("a") {
		t.Fatal("request over the burst was allowed")
	}
	if !l.allow("b") {
		t.Fatal("another client was limited by the first one's requests")
	}
}
