# ============================================================
# LUCIUSPROXY — DEPLOYMENT INSTRUCTIONS
# Run these on the DigitalOcean droplet (ssh root@167.172.130.167)
# ============================================================

# ── Step 1: Install DNS library ──────────────────────────────────────────────
su - lucius
cd /opt/lucius
source venv/bin/activate
pip install dnslib requests

# ── Step 2: Copy sentinel/dns_proxy.py to the server ─────────────────────────
# From your LOCAL machine (PowerShell):
# scp sentinel/dns_proxy.py root@167.172.130.167:/opt/lucius/sentinel/dns_proxy.py
# scp api/routes/proxy.py root@167.172.130.167:/opt/lucius/api/routes/proxy.py
# Or just git push and git pull on the server

# ── Step 3: Register proxy routes in main.py ─────────────────────────────────
# Add to api/main.py after the other route imports:
#   from api.routes import proxy
# Add to the router registration loop:
#   app.include_router(proxy.router, prefix="/api/v1")

# ── Step 4: Update api/api/client.js ─────────────────────────────────────────
# Add these methods to the api object in src/api/client.js:
#
#   getProxySummary:  ()     => request('/api/v1/proxy/summary'),
#   getProxyEvents:   (page) => request(`/api/v1/proxy/events?page=${page}`),
#   getProxyConfig:   ()     => request('/api/v1/proxy/config'),
#   updateProxyConfig:(body) => request('/api/v1/proxy/config', { method: 'POST', body: JSON.stringify(body) }),
#   getBlocklist:     ()     => request('/api/v1/proxy/blocklist'),
#   addToBlocklist:   (body) => request('/api/v1/proxy/blocklist', { method: 'POST', body: JSON.stringify(body) }),
#   removeFromBlocklist:(id) => request(`/api/v1/proxy/blocklist/${id}/remove`, { method: 'POST' }),
#
# Note: LuciusProxy.jsx uses api.request() directly — add this helper to client.js:
#   request: (path, options = {}) => request(path, options),

# ── Step 5: Add LuciusProxy to sidebar ───────────────────────────────────────
# In src/components/Sidebar.jsx, add to NAVS array:
#   { id: 'proxy', icon: '⬢', label: 'Proxy' }
#
# In src/App.jsx, add the import and route:
#   import LuciusProxy from './modules/proxy/LuciusProxy'
#   { id: 'proxy', Component: LuciusProxy }

# ── Step 6: Run Supabase migration ───────────────────────────────────────────
# Paste supabase/migrations/002_lucius_proxy.sql into Supabase SQL Editor → Run

# ── Step 7: Create systemd service for DNS proxy ─────────────────────────────
# On the server as root:

cat > /etc/systemd/system/lucius-dns.service << 'EOF'
[Unit]
Description=LuciusProxy DNS Engine
After=network.target lucius-api.service

[Service]
User=lucius
Group=lucius
WorkingDirectory=/opt/lucius
Environment="PATH=/opt/lucius/venv/bin"
ExecStart=/opt/lucius/venv/bin/python sentinel/dns_proxy.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable lucius-dns
systemctl start lucius-dns
systemctl status lucius-dns

# ── Step 8: Open DNS port on the droplet firewall ────────────────────────────
ufw allow 5353/udp
ufw allow 5353/tcp
ufw status

# Note: Port 5353 is used (not 53) to avoid root permission requirements.
# SMBs configure their router to use IP:5353 as the DNS server.
# If you want standard port 53, run the service as root or use authbind.

# ── Step 9: Test the DNS proxy ───────────────────────────────────────────────
# From your local machine:
# nslookup google.com 167.172.130.167 -port=5353
# nslookup malware-c2.example.com 167.172.130.167 -port=5353  (should return NXDOMAIN)

# ── Step 10: Restart the API and redeploy frontend ───────────────────────────
systemctl restart lucius-api

# Then from local machine:
# git add . && git commit -m "feat: LuciusProxy DNS interception module" && git push origin main
# Cloudflare Pages will auto-deploy the new frontend

# ============================================================
# WHAT THIS GIVES YOU
# ============================================================
#
# 1. DNS proxy running on 167.172.130.167:5353
#    - Blocks malicious domains before connections are made
#    - Logs every blocked attempt to Supabase
#    - Custom blocklist per org
#    - DGA heuristic detection
#    - Suspicious TLD blocking
#
# 2. LuciusProxy dashboard module
#    - Setup tab: step-by-step DNS configuration guide
#    - Traffic tab: real-time feed of blocked domains (polls every 10s)
#    - Blocklist tab: add/remove custom domain rules
#    - Toggle protection on/off
#    - Advanced settings (TLD blocking, DGA detection, notifications)
#
# 3. 4 new API endpoints
#    GET  /api/v1/proxy/summary
#    GET  /api/v1/proxy/events
#    GET  /api/v1/proxy/config
#    POST /api/v1/proxy/config
#    GET  /api/v1/proxy/blocklist
#    POST /api/v1/proxy/blocklist
#    POST /api/v1/proxy/blocklist/{id}/remove
#
# 4. 4 new Supabase tables
#    proxy_blocklist, proxy_events, proxy_daily_stats, proxy_config
#
# ============================================================
# UPGRADE PATH
# ============================================================
#
# Tier 2 (Sprint 4): Windows/Mac agent
#   - Electron app that sets system DNS to 167.172.130.167:5353
#   - Per-device traffic visibility
#   - No router config required
#
# Tier 3 (Sprint 5): Full HTTPS inspection
#   - mitmproxy as the engine
#   - Browser extension to install Lucius root CA
#   - Full request/response logging
#   - The Caido/Burp Suite experience