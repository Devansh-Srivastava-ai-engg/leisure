export function renderDashboardHtml(metrics: {
  uptime: number;
  customers: number;
  transactions: number;
  inventory: number;
  vendors: number;
  syncEvents: number;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DukaanKhata Backend API | MVC Server Dashboard</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: #1f2937;
      --accent: #10b981;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .logo {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669, #0d9488);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 900;
      color: white;
    }
    h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
    }
    .card-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }
    .card-value {
      font-size: 28px;
      font-weight: 900;
      margin-top: 6px;
      color: white;
    }
    .routes {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
    }
    .route-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
    }
    .route-item:last-child { border-bottom: none; }
    .method {
      font-weight: 800;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .method-get { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .method-post { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    a { color: #60a5fa; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">₹</div>
      <div>
        <h1>DukaanKhata Backend API <span class="badge"><span class="badge-dot"></span> MVC Architecture</span></h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">
          Offline-First Delta Sync Engine & SQLite WAL Persistent Storage
        </p>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Customers</div>
        <div class="card-value">${metrics.customers}</div>
      </div>
      <div class="card">
        <div class="card-title">Transactions</div>
        <div class="card-value">${metrics.transactions}</div>
      </div>
      <div class="card">
        <div class="card-title">Inventory Items</div>
        <div class="card-value">${metrics.inventory}</div>
      </div>
      <div class="card">
        <div class="card-title">Suppliers</div>
        <div class="card-value">${metrics.vendors}</div>
      </div>
      <div class="card">
        <div class="card-title">Sync Events</div>
        <div class="card-value">${metrics.syncEvents}</div>
      </div>
      <div class="card">
        <div class="card-title">Uptime</div>
        <div class="card-value">${metrics.uptime}s</div>
      </div>
    </div>

    <div class="routes">
      <h3 style="margin-top: 0; font-size: 15px;">MVC API Endpoints (Ready for Counter PWA & Cloud Backup)</h3>
      <div class="route-item">
        <div><span class="method method-get">GET</span> <a href="/api/health" target="_blank">/api/health</a></div>
        <span style="color: var(--text-muted);">System status & SQLite diagnostics</span>
      </div>
      <div class="route-item">
        <div><span class="method method-post">POST</span> <code>/api/sync</code></div>
        <span style="color: var(--text-muted);">Delta push batched mutations</span>
      </div>
      <div class="route-item">
        <div><span class="method method-get">GET</span> <a href="/api/pull" target="_blank">/api/pull</a></div>
        <span style="color: var(--text-muted);">Multi-device delta pull changes</span>
      </div>
      <div class="route-item">
        <div><span class="method method-get">GET</span> <a href="/api/customers" target="_blank">/api/customers</a></div>
        <span style="color: var(--text-muted);">List all customer ledgers</span>
      </div>
      <div class="route-item">
        <div><span class="method method-get">GET</span> <a href="/api/inventory" target="_blank">/api/inventory</a></div>
        <span style="color: var(--text-muted);">List inventory with loose unit counts</span>
      </div>
      <div class="route-item">
        <div><span class="method method-get">GET</span> <a href="/api/registers/today" target="_blank">/api/registers/today</a></div>
        <span style="color: var(--text-muted);">Today's cash drawer tally & reconciliation</span>
      </div>
      <div class="route-item">
        <div><span class="method method-get">GET</span> <a href="/api/vendors" target="_blank">/api/vendors</a></div>
        <span style="color: var(--text-muted);">Wholesale supplier payables</span>
      </div>
      <div class="route-item">
        <div><span class="method method-get">GET</span> <a href="/api/backup" target="_blank">/api/backup</a></div>
        <span style="color: var(--text-muted);">Export complete JSON cloud backup</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
