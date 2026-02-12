# Security Hardening

This document describes the security measures implemented to protect the realtime markdown editor from common attacks and DoS vulnerabilities.

## Overview

The application implements defense-in-depth with multiple layers of protection:
1. **Edge (Caddy)** - Rate limiting, request size limits, security headers
2. **Application (Next.js)** - Input validation, complexity checks, body size limits
3. **Container (Docker)** - Resource limits, non-root user, health checks
4. **Infrastructure (Hetzner)** - Firewall, SSL/TLS, DDoS protection

---

## 1. Rate Limiting (Caddy)

### Purpose
Prevent Denial of Service (DoS) attacks by limiting request volume per IP address.

### Configuration

**Global Rate Limit:**
```caddy
rate_limit 100 {
  key "{http.request.remote.host}"
  window 1s
  events 100
  status 429
}
```
- **100 requests/second** per IP address
- Returns HTTP 429 (Too Many Requests) when exceeded
- Applies to all requests globally

**Upload Endpoint Rate Limit:**
```caddy
rate_limit @upload 10 {
  key "{http.request.remote.host}"
  window 1m
  events 10
  status 429
}
```
- **10 requests/minute** per IP address on `/api/upload`
- Stricter limit prevents upload spam and resource exhaustion
- Applies only to POST requests to upload endpoint

### How It Works

1. Caddy tracks requests per IP address in a sliding window
2. When limit is exceeded, connection is rejected with 429 status
3. Client should implement exponential backoff retry logic
4. Legitimate users won't be affected (100 req/sec is very high)

### Testing

```bash
# Test global rate limit (will be blocked after 100 requests in 1 second)
for i in {1..150}; do curl -s https://your-domain.here -o /dev/null -w "%{http_code}\n"; done

# Test upload rate limit (will be blocked after 10 requests in 1 minute)
for i in {1..15}; do
  curl -s -X POST https://your-domain.here/api/upload \
    -H "Content-Type: application/json" \
    -d '{"content":"test"}' \
    -w "%{http_code}\n"
done
```

---

## 2. Request Size Limits

### Purpose
Prevent memory exhaustion and storage DoS attacks.

### Limits

| Component | Limit | Purpose |
|-----------|-------|---------|
| **Caddy** | 50MB max body | Prevent huge requests |
| **Next.js** | 50MB max API body | Align with Caddy limit |
| **Upload API** | 10MB max content | Prevent huge document storage |
| **Node.js heap** | 512MB max | Prevent OOM crashes |

### Implementation

**Caddy (Caddyfile):**
```caddy
request_body {
  max_size 50MB
}
```

**Next.js (next.config.ts):**
```typescript
api: {
  bodyParser: {
    sizeLimit: '50MB',
  },
}
```

**Upload API (src/app/api/upload/route.ts):**
```typescript
const MAX_CONTENT_SIZE = 10 * 1024 * 1024 // 10MB
```

**Docker (Dockerfile):**
```dockerfile
CMD ["node", "--max-old-space-size=512", "-r", "tsx", "server.ts"]
```

### Error Handling

When limits are exceeded:
- **413 Payload Too Large** - HTTP response if body exceeds Caddy limit
- **400 Bad Request** - JSON error if content exceeds 10MB after parsing

Example error response:
```json
{
  "error": "Content exceeds maximum size of 10MB"
}
```

---

## 3. Input Complexity Validation

### Purpose
Prevent algorithmic DoS attacks from pathological markdown/input structures.

### Checks

The upload API validates markdown content for the following patterns:

#### 1. **Deeply Nested Structures** (Max 100 levels)
```javascript
// Rejected: Causes parser to stack overflow or timeout
[[[[[... (100+ levels) ...]]]]]
((((.... (100+ levels) ))))
```
**Check:**
```typescript
const MAX_NESTING_DEPTH = 100
// Counts bracket/paren/brace nesting
```

#### 2. **Repeated Character Sequences** (Max 10K identical chars)
```markdown
<!-- Rejected: Can cause memory exhaustion -->
```````````` ... (1M backticks) ... ``````````
```
**Check:**
```typescript
const repeatedChars = /(.)\1{10000,}/
```

#### 3. **Pathological Markdown Patterns**
```markdown
<!-- Rejected: Line with only brackets/parens over 1000 chars -->
[][][][][][][]...[][][] (1000+ chars)
()()()()()()()...() (1000+ chars)
```
**Check:**
```typescript
if (line.length > 1000 && /^[\[\({)\]\}]*$/.test(line.trim())) {
  return { valid: false }
}
```

### Error Responses

All validation errors return HTTP 400 with details:
```json
{
  "error": "Content has 150 levels of nesting (max 100)"
}
```

### Performance Impact

Validation runs in **O(n)** time (single pass through content):
- 1MB file: ~1ms
- 10MB file: ~10ms
- No noticeable impact on upload experience

---

## 4. Security Headers

### Purpose
Protect users from XSS, clickjacking, MIME sniffing, and other browser-based attacks.

### Headers Implemented

| Header | Value | Purpose |
|--------|-------|---------|
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Force HTTPS for 1 year, include subdomains, add to HSTS preload list |
| **Content-Security-Policy** | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ...` | Prevent inline scripts, only allow same-origin resources |
| **X-Frame-Options** | `SAMEORIGIN` | Allow embedding only in same domain (needed for collaborative editing) |
| **X-Content-Type-Options** | `nosniff` | Prevent MIME sniffing (e.g., .jpg treated as .html) |
| **X-XSS-Protection** | `1; mode=block` | Enable browser XSS filter (defense for older browsers) |
| **X-Permitted-Cross-Domain-Policies** | `none` | Prevent cross-domain Flash/PDF policies |
| **Permissions-Policy** | `geolocation=(), microphone=(), camera=(), ...` | Disable unnecessary browser features |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Only send referrer to same-origin requests |
| **X-DNS-Prefetch-Control** | `off` | Disable DNS prefetch to prevent privacy leaks |

### Content Security Policy (CSP) Explained

```
default-src 'self'                          // Only load from same origin by default
script-src 'self'                           // Scripts: only same-origin (no inline)
style-src 'self' 'unsafe-inline'            // Styles: same-origin + inline (needed for CodeMirror)
img-src 'self' data: https:                 // Images: same-origin, data URLs, HTTPS
font-src 'self'                             // Fonts: only same-origin
connect-src 'self' ws: wss:                 // Connections: same-origin + WebSockets
frame-ancestors 'self'                      // Embedding: only same-origin (SAMEORIGIN)
```

**Note:** `style-src 'unsafe-inline'` is needed for CodeMirror and github-markdown-css. Ideally this would be restricted further, but it's a tradeoff for functionality.

### HSTS Preload

The `preload` directive in HSTS tells browsers to include this domain in the HSTS preload list at https://hstspreload.org/. This means:
- All major browsers ship with your domain hardcoded to HTTPS-only
- Users can't opt out (protects against attacker stripping HTTPS)
- One-time submission required at hstspreload.org

To submit to HSTS preload list (one-time, after deployment):
```bash
# Visit: https://hstspreload.org/
# Enter your domain and submit
# Verification takes a few days
```

---

## 5. Container Security

### Resource Limits

Prevent resource exhaustion attacks by capping CPU and memory usage.

**Application Container (App):**
```yaml
deploy:
  resources:
    limits:
      cpus: '1'               # Max 1 CPU core
      memory: 1G              # Max 1GB RAM
    reservations:
      cpus: '0.5'             # Guaranteed 0.5 cores
      memory: 512M            # Guaranteed 512MB RAM
```

**Reverse Proxy Container (Caddy):**
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'             # Max 0.5 CPU cores
      memory: 256M            # Max 256MB RAM
    reservations:
      cpus: '0.25'            # Guaranteed 0.25 cores
      memory: 128M            # Guaranteed 128MB RAM
```

### Non-Root User

Container runs as `node` user (UID 1000), not `root`:
```dockerfile
USER node
```

Benefits:
- Limits damage if container is compromised
- Prevents writing to system files
- Can't access other containers' volumes

### Node.js Memory Limit

```dockerfile
CMD ["node", "--max-old-space-size=512", "-r", "tsx", "server.ts"]
```

Sets Node.js heap to max 512MB to prevent OOM kills on large uploads.

---

## 6. Network Security

### SSL/TLS (via Caddy)

- **Automatic HTTPS** - Let's Encrypt certificates issued automatically
- **Auto-renewal** - Certificates renewed before expiration
- **Modern protocols** - TLS 1.2+ only
- **Strong ciphers** - Uses Caddy's default cipher suite (very strong)

### HTTP/2

```caddy
protocols h2 http/1.1
```
- Enables HTTP/2 for better performance
- Falls back to HTTP/1.1 for older clients
- More efficient request multiplexing

### Gzip Compression

```caddy
encode gzip {
  level 6  // Compression level (0-11, 6 is good balance)
}
```
- Reduces bandwidth usage
- Level 6 balances compression ratio vs CPU usage

---

## 7. Input Validation at Upload

### JSON Parsing Errors

```typescript
try {
  const body = await request.json()
  // ...
} catch (error) {
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }
}
```

### Type Checking

```typescript
if (typeof content !== 'string') {
  return NextResponse.json(
    { error: 'Content must be a string' },
    { status: 400 }
  )
}
```

---

## 8. Hetzner-Level Security

### Firewall Configuration

Recommended UFW (Uncomplicated Firewall) rules on Hetzner server:

```bash
# Enable firewall
ufw enable

# Allow SSH (critical - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp    # For QUIC (HTTP/3)

# Block everything else
ufw default deny incoming
```

### DDoS Protection

Hetzner provides:
- Network-level DDoS mitigation (CloudFlare-like)
- Free basic protection for all VPS
- Option to upgrade to DDoS protection packages

### SSH Key Management

- Use SSH keys (no passwords)
- Keep private keys secure
- Consider SSH agent for key security
- Regular key rotation (yearly)

---

## 9. Monitoring & Maintenance

### Recommended Monitoring

```bash
# Check rate limit effectiveness
docker logs markdown-caddy | grep "429"

# Monitor container resource usage
docker stats markdown-editor

# Check for OOM kills
docker inspect markdown-editor | grep -i memory
```

### Log Monitoring

```bash
# View Caddy access logs
docker logs -f markdown-caddy

# View app errors
docker logs -f markdown-editor

# Check for suspicious patterns
docker logs markdown-caddy | grep "429"  # Rate limit hits
docker logs markdown-editor | grep "error"  # App errors
```

### Database Maintenance

```bash
# Backup database
docker-compose exec app cp /app/data/documents.db /app/data/documents.db.backup

# Verify database integrity
docker-compose exec app sqlite3 /app/data/documents.db "PRAGMA integrity_check;"
```

---

## 10. Security Checklist

Before production deployment, verify:

- [ ] Rate limiting is working (test with many requests)
- [ ] SSL certificate is valid (https://your-domain.here)
- [ ] Security headers are present (check with https://securityheaders.com)
- [ ] CSP is enforced (browser console should show no CSP violations)
- [ ] HSTS preload is submitted (if domain is stable)
- [ ] UFW firewall is enabled on Hetzner server
- [ ] SSH keys are used (no password auth)
- [ ] Database backups are scheduled
- [ ] Container resource limits are appropriate for your usage
- [ ] Docker daemon is updated regularly
- [ ] Node.js base image is up-to-date (check Dockerfile)

---

## 11. Attack Scenarios & Mitigations

### Scenario 1: Brute Force Document IDs
**Attack:** Attacker tries to guess random document URLs
**Mitigation:**
- Document IDs use cryptographically secure nanoid (64 bits entropy)
- ~190 years to brute force with 1000 req/sec
- Rate limiting: 100 req/sec per IP (enforced at Caddy)

### Scenario 2: Upload Bomb
**Attack:** Attacker uploads 100MB files repeatedly
**Mitigation:**
- Max 50MB per request (Caddy enforces)
- 10 upload requests per minute (rate limited)
- Max 10MB content after parsing (API validates)
- Result: Can't upload more than ~100MB per minute

### Scenario 3: Pathological Markdown
**Attack:** Attacker uploads deeply nested markdown to crash renderer
**Mitigation:**
- Max 100 nesting levels enforced
- Repeated character sequences limited to 10K
- Pathological patterns rejected at upload time
- Renderer has timeout protection (recommended)

### Scenario 4: Memory Exhaustion
**Attack:** Attacker sends massive edits via WebSocket
**Mitigation:**
- Container capped at 1GB RAM
- Node.js heap limited to 512MB
- Health checks detect and restart unhealthy containers
- Docker will kill container if it exceeds limits

### Scenario 5: DDoS Attack
**Attack:** Attacker floods server with requests
**Mitigation:**
- Rate limiting: 100 req/sec per IP
- Hetzner network DDoS protection
- Gzip compression reduces bandwidth
- Multiple concurrent requests blocked after rate limit

### Scenario 6: XSS Attack
**Attack:** Attacker injects malicious JavaScript
**Mitigation:**
- CSP `script-src 'self'` prevents inline scripts
- Markdown rendered as text, not HTML
- CodeMirror escapes user content
- No `eval()` or `dangerouslySetInnerHTML` in app code

### Scenario 7: Container Escape
**Attack:** Attacker exploits container vulnerability to access host
**Mitigation:**
- Container runs as non-root `node` user
- Volume is read-only where possible
- Resource limits prevent container from consuming host
- Alpine base image has minimal attack surface

---

## 12. Future Enhancements

Consider for future versions:

- [ ] **Web Application Firewall (WAF)** - Cloudflare or AWS WAF
- [ ] **Intrusion Detection System (IDS)** - Detect suspicious patterns
- [ ] **API Key Authentication** - For programmatic access
- [ ] **Rate Limiting by Document ID** - Prevent edit flooding on one doc
- [ ] **Audit Logging** - Track all changes with timestamps/IPs
- [ ] **Optional Password Protection** - For sensitive documents
- [ ] **Read-Only Sharing** - Share link without edit access
- [ ] **Encrypted Storage** - Encrypt documents at rest
- [ ] **Automatic Expiration** - Delete old documents after 30 days
- [ ] **Signed Commits** - GPG sign all document updates

---

## References

- **OWASP Top 10** - https://owasp.org/Top10/
- **Caddy Security** - https://caddyserver.com/docs/caddyfile/directives/rate_limit
- **Content Security Policy** - https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **HSTS Preload** - https://hstspreload.org/
- **Node.js Security** - https://nodejs.org/en/docs/guides/security/
- **Docker Security** - https://docs.docker.com/engine/security/

---

## Support

For security questions or to report vulnerabilities:
- Create an issue on GitHub (if not sensitive)
- Or email directly with security details
- For critical issues, please follow responsible disclosure

**Do not publicly disclose security vulnerabilities** - report them privately first.
