import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Arc, Polygon, Rectangle
import matplotlib.patheffects as pe
import os

OUTPUT_DIR = r'C:\Users\USER\Desktop\Taktill-POS\diagrams'
os.makedirs(OUTPUT_DIR, exist_ok=True)

FIGW = 10
FIGH = 7
DPI = 150

def save(fig, name):
    path = os.path.join(OUTPUT_DIR, name)
    fig.savefig(path, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"  Saved: {path}")
    return path

# ════════════════════════════════════════════
# 1. Frontend Component Architecture
# ════════════════════════════════════════════
def draw_frontend_architecture():
    fig, ax = plt.subplots(figsize=(FIGW, FIGH))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    ax.axis('off')
    ax.set_facecolor('white')

    def box(x, y, w, h, text, color='#e3f2fd', ec='#1565c0', fs=9):
        r = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.08",
                           facecolor=color, edgecolor=ec, linewidth=1.5)
        ax.add_patch(r)
        ax.text(x, y, text, ha='center', va='center', fontsize=fs,
                fontweight='bold', color='#1a1a1a')

    def arrow(x1, y1, x2, y2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color='#666', lw=1.5))

    # Root
    box(5, 7.5, 1.8, 0.5, 'App (Root)', '#bbdefb', '#1565c0', 9)

    arrow(5, 7.0, 5, 6.3)

    # Layout
    box(5, 5.8, 2.2, 0.6, 'AppLayout', '#bbdefb', '#1565c0', 9)

    # Sidebar + Header + Content
    box(2.0, 4.5, 2.0, 0.5, 'Sidebar', '#e3f2fd', '#1976d2', 8)
    box(5.0, 4.5, 2.0, 0.5, 'Header', '#e3f2fd', '#1976d2', 8)
    box(8.0, 4.5, 2.0, 0.5, 'Main Content', '#e3f2fd', '#1976d2', 8)

    # Arrows from AppLayout to children
    plt.plot([5, 2], [5.5, 5.0], 'k-', lw=1, color='#666')
    plt.plot([5, 5], [5.5, 5.0], 'k-', lw=1, color='#666')
    plt.plot([5, 8], [5.5, 5.0], 'k-', lw=1, color='#666')

    # Page components
    pages = ['Login', 'Dashboard', 'POS', 'Inventory', 'Reports', 'Settings']
    px_pos = [1.0, 2.6, 4.2, 5.8, 7.4, 9.0]
    for i, (name, px) in enumerate(zip(pages, px_pos)):
        box(px, 3.2, 1.3, 0.45, name, '#fff3e0', '#e65100', 7.5)

    # Connecting lines to Main Content
    for px in px_pos:
        plt.plot([px, 8], [3.45, 4.0], 'k-', lw=0.8, color='#999')

    # Shared UI components
    ui_comps = ['Button', 'Modal', 'Table', 'Badge', 'Toast']
    ui_pos = [1.5, 3.2, 5.0, 6.8, 8.5]
    for name, ux in zip(ui_comps, ui_pos):
        box(ux, 1.5, 1.2, 0.4, name, '#e8f5e9', '#2e7d32', 7)

    # Connecting to pages
    for ux in ui_pos:
        for px in px_pos:
            plt.plot([ux, px], [1.7, 2.75], 'k-', lw=0.5, color='#ccc', alpha=0.5)

    ax.text(5, 0.5, 'Frontend Component Architecture',
            ha='center', fontsize=11, fontweight='bold', color='#333',
            style='italic')
    save(fig, 'frontend_architecture.png')

# ════════════════════════════════════════════
# 2. Backend Middleware Pipeline
# ════════════════════════════════════════════
def draw_middleware_pipeline():
    fig, ax = plt.subplots(figsize=(FIGW, 3.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 3.5)
    ax.axis('off')
    ax.set_facecolor('white')

    stages = [
        ('Request', '#fff'),
        ('JSON Body\nParser', '#e3f2fd'),
        ('Rate\nLimiter', '#fff3e0'),
        ('Auth\nResolver', '#e8f5e9'),
        ('Role\nAuth', '#fce4ec'),
        ('Route\nHandler', '#f3e5f5'),
        ('Response', '#fff'),
    ]
    xs = [0.5, 2.0, 3.5, 5.0, 6.5, 8.0, 9.5]

    for i, (label, color) in enumerate(stages):
        x = xs[i]
        w = 1.2 if i in [0, 6] else 1.3
        r = FancyBboxPatch((x-w/2, 1.0), w, 1.2, boxstyle="round,pad=0.08",
                           facecolor=color, edgecolor='#333', linewidth=1.5 if i in [0,6] else 1.2)
        ax.add_patch(r)
        ax.text(x, 1.6, label, ha='center', va='center', fontsize=8,
                fontweight='bold', color='#1a1a1a')

    for i in range(len(xs)-1):
        ax.annotate('', xy=(xs[i+1]-0.65, 1.6), xytext=(xs[i]+0.65, 1.6),
                    arrowprops=dict(arrowstyle='->', color='#1565c0', lw=2))

    # Annotation for auth skip
    ax.annotate('(public routes skip auth)',
                xy=(5.0, 0.5), ha='center', fontsize=7, color='#888', fontstyle='italic')

    # Error handler below
    r = FancyBboxPatch((3.5, -0.1), 3, 0.7, boxstyle="round,pad=0.08",
                       facecolor='#ffebee', edgecolor='#c62828', linewidth=1.5)
    ax.add_patch(r)
    ax.text(5.0, 0.25, 'Global Error Handler', ha='center', va='center',
            fontsize=8, fontweight='bold', color='#c62828')
    ax.annotate('', xy=(5.0, 0.8), xytext=(5.0, 0.4),
                arrowprops=dict(arrowstyle='->', color='#c62828', lw=1.5, linestyle='dashed'))

    ax.text(5, 3.0, 'Backend Middleware Pipeline',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'middleware_pipeline.png')

# ════════════════════════════════════════════
# 3. Database Entity-Relationship Diagram
# ════════════════════════════════════════════
def draw_er_diagram():
    fig, ax = plt.subplots(figsize=(FIGW, 8))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')
    ax.set_facecolor('white')

    def table(x, y, name, cols, color='#e3f2fd'):
        w = 2.8
        h = 0.4 + 0.25 * len(cols)
        r = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.05",
                           facecolor=color, edgecolor='#1565c0', linewidth=1.5)
        ax.add_patch(r)
        ax.text(x, y + h/2 - 0.25, name, ha='center', va='center',
                fontsize=8, fontweight='bold', color='#fff',
                bbox=dict(boxstyle='round,pad=0.08', facecolor='#1565c0', edgecolor='none'))
        for i, col in enumerate(cols):
            yp = y + h/2 - 0.55 - i * 0.25
            ax.text(x, yp, col, ha='center', va='center',
                    fontsize=6.5, color='#333')
        return (x, y, w, h)

    # Tables
    t_biz = table(2.0, 7.0, 'businesses', ['id (PK)', 'name', 'address', 'phone', 'currency', 'created_at'])
    t_users = table(6.0, 7.0, 'users', ['id (PK)', 'name', 'email', 'role (enum)', 'business_id (FK)', 'created_at'])
    t_cashiers = table(10.0, 7.0, 'cashiers', ['id (PK)', 'name', 'pin_hash', 'is_active', 'business_id (FK)', 'created_at'])
    t_products = table(2.0, 4.5, 'products', ['id (PK)', 'name', 'sku (UQ)', 'price', 'stock', 'category', 'business_id (FK)', 'is_active', 'created_at'])
    t_sales = table(6.0, 4.5, 'sales', ['id (PK)', 'receipt_no (UQ)', 'subtotal', 'discount', 'grand_total', 'payment_method (enum)', 'cashier_id (FK)', 'business_id (FK)', 'created_at'])
    t_csessions = table(10.0, 4.5, 'cashier_sessions', ['id (PK)', 'cashier_id (FK)', 'token_hash', 'expires_at', 'created_at'])
    t_items = table(4.0, 2.0, 'sale_items', ['id (PK)', 'sale_id (FK)', 'product_id (FK)', 'qty', 'unit_price', 'line_total', 'product_name', 'product_sku'])
    t_adjust = table(8.0, 2.0, 'stock_adjustments', ['id (PK)', 'product_id (FK)', 'user_id (FK)', 'qty_change', 'reason (enum)', 'before_qty', 'after_qty', 'created_at'])

    # Arrow helper
    def connect(t1, t2, label=''):
        x1, y1, w1, h1 = t1
        x2, y2, w2, h2 = t2
        ax.annotate('', xy=(x2, y2-h2/2), xytext=(x1, y1-h1/2),
                    arrowprops=dict(arrowstyle='->', color='#666', lw=1, connectionstyle='arc3,rad=0.2'))
        if label:
            mx, my = (x1+x2)/2, (y1+y2)/2 - 0.3
            ax.text(mx, my, label, ha='center', va='center',
                    fontsize=6, color='#666', fontstyle='italic')

    connect(t_biz, t_users, '1:N')
    connect(t_biz, t_cashiers, '1:N')
    connect(t_biz, t_products, '1:N')
    connect(t_biz, t_sales, '1:N')
    connect(t_cashiers, t_csessions, '1:N')
    connect(t_cashiers, t_sales, '1:N')
    connect(t_sales, t_items, '1:N')
    connect(t_products, t_items, '1:N')
    connect(t_products, t_adjust, '1:N')

    ax.text(6, 0.3, 'Database Entity-Relationship Diagram',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'er_diagram.png')

# ════════════════════════════════════════════
# 4. Use Case Diagram
# ════════════════════════════════════════════
def draw_usecase_diagram():
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 9)
    ax.axis('off')
    ax.set_facecolor('white')

    def actor(x, y, name):
        # Stick figure
        ax.plot(x, y+0.3, 'o', markersize=6, color='#333')
        ax.plot([x, x], [y-0.2, y+0.1], 'k-', lw=1.5, color='#333')
        ax.plot([x-0.15, x+0.15], [y-0.05, y-0.05], 'k-', lw=1.5, color='#333')
        ax.plot([x-0.1, x+0.1], [y-0.2, y-0.1], 'k-', lw=1.5, color='#333')
        ax.text(x, y-0.4, name, ha='center', fontsize=8, fontweight='bold')

    def ellipse(x, y, w, h, text):
        e = plt.Circle((x, y), h/2, facecolor='#e8f5e9', edgecolor='#2e7d32', lw=1.5)
        ax.add_patch(e)
        ax.text(x, y, text, ha='center', va='center', fontsize=6.5)

    def system_box(x, y, w, h, text):
        r = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.1",
                           facecolor='none', edgecolor='#1565c0', lw=2, linestyle='--')
        ax.add_patch(r)
        ax.text(x, y+h/2-0.2, text, ha='center', fontsize=9, fontweight='bold', color='#1565c0')

    # Actors
    actor(1, 4.5, 'Cashier')
    actor(1, 2.5, 'Manager')
    actor(1, 0.5, 'Owner')

    # Inheritance arrows
    ax.annotate('', xy=(1.2, 0.8), xytext=(1.2, 2.2),
                arrowprops=dict(arrowstyle='->', color='#666', lw=1))
    ax.annotate('', xy=(1.2, 2.8), xytext=(1.2, 4.2),
                arrowprops=dict(arrowstyle='->', color='#666', lw=1))
    ax.text(1.5, 1.5, 'includes', fontsize=6, color='#666')
    ax.text(1.5, 3.5, 'includes', fontsize=6, color='#666')

    # System box
    system_box(7.5, 4.5, 11, 8, 'Taktill POS System')

    # Use cases
    use_cases = [
        (4, 7.0, 'Login'),
        (4, 5.5, 'Process Sale'),
        (4, 4.0, 'Apply Discount'),
        (6, 7.0, 'View Receipt'),
        (6, 5.5, 'Manage Products'),
        (6, 4.0, 'Adjust Stock'),
        (8.5, 7.0, 'View Dashboard'),
        (8.5, 5.5, 'Daily Summary'),
        (8.5, 4.0, 'Product Reports'),
        (11, 7.0, 'Manage Users'),
        (11, 5.5, 'Manage Cashiers'),
        (11, 4.0, 'Business Settings'),
    ]
    for ux, uy, text in use_cases:
        ellipse(ux, uy, 1.4, 0.4, text)

    # Connect actors to use cases
    cashier_ucs = [(4,7.0), (4,5.5), (4,4.0), (6,7.0)]
    mgr_ucs = [(6,5.5), (6,4.0), (8.5,7.0), (8.5,5.5), (8.5,4.0)]
    owner_ucs = [(11,7.0), (11,5.5), (11,4.0)]

    for u in cashier_ucs:
        ax.plot([1.3, u[0]-0.6], [4.3, u[1]], 'k-', lw=0.8, color='#999')
    for u in mgr_ucs:
        ax.plot([1.3, u[0]-0.6], [2.3, u[1]], 'k-', lw=0.8, color='#999')
    for u in owner_ucs:
        ax.plot([1.3, u[0]-0.6], [0.3, u[1]], 'k-', lw=0.8, color='#999')

    ax.text(7, 0.3, 'Use Case Diagram',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'usecase_diagram.png')

# ════════════════════════════════════════════
# 5. System Architecture Diagram (3-tier)
# ════════════════════════════════════════════
def draw_system_architecture():
    fig, ax = plt.subplots(figsize=(FIGW, 5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.axis('off')
    ax.set_facecolor('white')

    def tier_box(y, w, h, label, items, color):
        x = 5
        r = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.1",
                           facecolor=color, edgecolor='#333', lw=2)
        ax.add_patch(r)
        ax.text(x, y+h/2-0.25, label, ha='center', va='center',
                fontsize=10, fontweight='bold', color='#fff')
        for i, item in enumerate(items):
            ax.text(x, y-h/2+0.5+i*0.4, item, ha='center', va='center',
                    fontsize=7, color='#1a1a1a')

    # Tier 3 - Data
    tier_box(0.8, 4, 1.2, 'Tier 3: Database',
             ['PostgreSQL (Neon)', 'Drizzle ORM', 'SQLite (dev)'], '#1565c0')

    # Tier 2 - API
    tier_box(2.5, 5, 1.2, 'Tier 2: API Server',
             ['Express 5 REST API', 'Middleware Pipeline', 'Business Logic Services'], '#e65100')

    # Tier 1 - Client
    tier_box(4.2, 6, 1.0, 'Tier 1: Client',
             ['React 19 SPA', 'Zustand Store', 'Tailwind CSS UI', 'ApexCharts'], '#2e7d32')

    # Arrows
    for y1, y2, label, lx in [(3.1, 1.4, 'SQL queries', 7.5), (4.0, 3.1, 'HTTP JSON API', 7.5)]:
        ax.annotate('', xy=(5, y2), xytext=(5, y1),
                    arrowprops=dict(arrowstyle='<->', color='#666', lw=1.5))
        ax.text(5.4, (y1+y2)/2, label, fontsize=7, color='#666', fontstyle='italic')

    # Vercel annotation
    ax.annotate('Deployed on Vercel (CDN + Serverless Functions)',
                xy=(2, 4.7), fontsize=7, color='#888', fontstyle='italic',
                bbox=dict(boxstyle='round,pad=0.1', facecolor='#f5f5f5', edgecolor='#ccc'))

    ax.text(5, 0.1, 'System Architecture Diagram (Three-Tier)',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'system_architecture.png')

# ════════════════════════════════════════════
# 6. Sale Transaction Sequence (simplified)
# ════════════════════════════════════════════
def draw_sale_sequence():
    fig, ax = plt.subplots(figsize=(FIGW, 7))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    ax.axis('off')
    ax.set_facecolor('white')

    actors = ['Client\n(Frontend)', 'Middleware\nPipeline', 'Route\nHandler', 'completeSale\n(Service)', 'PostgreSQL\n(DB)']
    xs = [0.7, 2.3, 3.9, 5.7, 8.0]

    for i, (name, x) in enumerate(zip(actors, xs)):
        # Actor box
        r = FancyBboxPatch((x-0.6, 6.2), 1.2, 0.5, boxstyle="round,pad=0.05",
                           facecolor='#e3f2fd', edgecolor='#1565c0')
        ax.add_patch(r)
        ax.text(x, 6.45, name, ha='center', va='center', fontsize=6.5, fontweight='bold')
        # Lifeline
        ax.plot([x, x], [0.3, 6.0], 'k--', lw=0.8, color='#999', alpha=0.5)

    messages = [
        (0, 1, 'POST /sales', 5.7),
        (1, 2, 'validate body (Zod)', 4.7),
        (2, 3, 'completeSale()', 3.8),
        (3, 4, 'BEGIN TRANSACTION', 2.8),
        (4, 3, 'tx started', 2.6),
        (3, 4, 'SELECT ... FOR UPDATE', 1.9),
        (3, 4, 'INSERT sale', 1.3),
        (3, 4, 'INSERT sale_items', 0.9),
        (3, 4, 'UPDATE products', 0.5),
        (3, 4, 'COMMIT', 0.2),
    ]

    for src, dst, label, y in messages:
        x1, x2 = xs[src], xs[dst]
        ax.annotate('', xy=(x2-0.3, y), xytext=(x1+0.3, y),
                    arrowprops=dict(arrowstyle='->', color='#1565c0', lw=1.2))
        midx = (x1+x2)/2
        ax.text(midx, y+0.08, label, ha='center', va='bottom',
                fontsize=6, color='#333', fontstyle='italic')

    ax.text(5, 0.05, 'Sale Transaction Sequence Diagram',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'sale_sequence.png')

# ════════════════════════════════════════════
# 7. Authentication Flow Diagram
# ════════════════════════════════════════════
def draw_auth_flow():
    fig, ax = plt.subplots(figsize=(FIGW, 6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')
    ax.set_facecolor('white')

    def box(x, y, w, h, text, color='#e3f2fd', ec='#1565c0', fs=7.5):
        r = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.06",
                           facecolor=color, edgecolor=ec, lw=1.5)
        ax.add_patch(r)
        ax.text(x, y, text, ha='center', va='center', fontsize=fs,
                fontweight='bold', color='#1a1a1a')

    def flow_arrow(x1, y1, x2, y2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color='#1565c0', lw=1.5))

    # Left: Owner/Manager flow
    box(2.5, 5.3, 2.5, 0.5, 'Owner / Manager Login', '#bbdefb', '#1565c0')
    box(2.5, 4.2, 2.5, 0.5, 'Email + Password', '#e3f2fd', '#1976d2')
    box(2.5, 3.1, 2.5, 0.5, 'Better Auth\nValidate Credentials', '#fff3e0', '#e65100')
    box(2.5, 2.0, 2.5, 0.5, 'Create Session (8h TTL)\nHTTP-only Cookie', '#e8f5e9', '#2e7d32')
    box(2.5, 0.9, 2.5, 0.5, 'Authenticated API\nAccess', '#c8e6c9', '#1b5e20')

    flow_arrow(2.5, 5.0, 2.5, 4.5)
    flow_arrow(2.5, 3.9, 2.5, 3.4)
    flow_arrow(2.5, 2.8, 2.5, 2.3)
    flow_arrow(2.5, 1.7, 2.5, 1.2)

    # Right: Cashier flow
    box(7.5, 5.3, 2.5, 0.5, 'Cashier Login', '#bbdefb', '#1565c0')
    box(7.5, 4.2, 2.5, 0.5, 'Select Name + 4-digit PIN', '#e3f2fd', '#1976d2')
    box(7.5, 3.1, 2.8, 0.5, 'bcrypt Verify PIN Hash', '#fff3e0', '#e65100')
    box(7.5, 2.0, 2.8, 0.5, 'Generate 64-char Token\nStore SHA-256 hash', '#e8f5e9', '#2e7d32')
    box(7.5, 0.9, 2.5, 0.5, 'Bearer Token in\nAuthorization Header', '#c8e6c9', '#1b5e20')

    flow_arrow(7.5, 5.0, 7.5, 4.5)
    flow_arrow(7.5, 3.9, 7.5, 3.4)
    flow_arrow(7.5, 2.8, 7.5, 2.3)
    flow_arrow(7.5, 1.7, 7.5, 1.2)

    # Label
    ax.text(5, 5.6, 'Dual-Mode Authentication', ha='center', fontsize=11,
            fontweight='bold', color='#333', style='italic')
    ax.text(2.5, 5.65, 'Users (Owner/Manager)', ha='center', fontsize=7, color='#1976d2')
    ax.text(7.5, 5.65, 'Staff (Cashier)', ha='center', fontsize=7, color='#1976d2')

    save(fig, 'auth_flow.png')

# ════════════════════════════════════════════
# 8. Test Pyramid Diagram
# ════════════════════════════════════════════
def draw_test_pyramid():
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.set_xlim(0, 8)
    ax.set_ylim(0, 6)
    ax.axis('off')
    ax.set_facecolor('white')

    layers = [
        (6.0, 'E2E Tests', 'Playwright\nComplete workflows', '#ef9a9a', '#c62828'),
        (4.5, 'Integration Tests', 'Supertest\nAPI + Database', '#fff59d', '#f57f17'),
        (2.5, 'Unit Tests', 'Vitest\nMoney, Cart, Utils', '#a5d6a7', '#2e7d32'),
    ]

    for top_h, label, desc, color, ec in layers:
        base_w = top_h * 1.1
        x0 = 4 - base_w/2
        y0 = 0
        triangle = Polygon([(x0, y0), (8-x0, y0), (4, top_h)], facecolor=color, edgecolor=ec, lw=2, alpha=0.8)
        ax.add_patch(triangle)
        ax.text(4, top_h - 0.3, label, ha='center', va='center',
                fontsize=9, fontweight='bold', color='#1a1a1a')
        ax.text(4, top_h - 0.7, desc, ha='center', va='center',
                fontsize=7, color='#333')

    ax.text(4, -0.2, 'Test Pyramid',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')

    # Arrow pointing up
    ax.annotate('', xy=(4.3, 5.8), xytext=(4.3, 0.2),
                arrowprops=dict(arrowstyle='->', color='#666', lw=1))
    ax.text(4.6, 3, 'Speed', fontsize=7, color='#666', rotation=90, fontstyle='italic')

    ax.annotate('', xy=(3.7, 0.2), xytext=(3.7, 5.8),
                arrowprops=dict(arrowstyle='->', color='#666', lw=1))
    ax.text(3.4, 3, 'Scope', fontsize=7, color='#666', rotation=90, fontstyle='italic')

    save(fig, 'test_pyramid.png')

# ════════════════════════════════════════════
# 9. Vercel Deployment Architecture
# ════════════════════════════════════════════
def draw_deployment_architecture():
    fig, ax = plt.subplots(figsize=(FIGW, 5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.axis('off')
    ax.set_facecolor('white')

    def box(x, y, w, h, text, color='#e3f2fd', ec='#1565c0', fs=8):
        r = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.06",
                           facecolor=color, edgecolor=ec, lw=1.5)
        ax.add_patch(r)
        ax.text(x, y, text, ha='center', va='center', fontsize=fs, fontweight='bold')

    def arr(x1, y1, x2, y2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color='#1565c0', lw=1.5))

    # Top: Git push
    box(5, 4.5, 2, 0.5, 'Git Push\nto main', '#bbdefb', '#1565c0')

    # Vercel Build
    box(5, 3.3, 3, 0.6, 'Vercel Build\n(npm run build)', '#fff3e0', '#e65100')

    # Two paths
    box(2.5, 2.0, 2.5, 0.6, 'Frontend Assets\nVercel CDN', '#e8f5e9', '#2e7d32')
    box(7.5, 2.0, 2.5, 0.6, 'API Serverless\nFunction (512 MB)', '#e8f5e9', '#2e7d32')

    # Bottom: User
    box(2.5, 0.5, 2, 0.5, 'Browser', '#c8e6c9', '#1b5e20', 9)
    box(7.5, 0.5, 2.5, 0.5, 'Neon PostgreSQL', '#c8e6c9', '#1b5e20', 8)

    # Connections
    arr(5, 4.2, 5, 3.6)
    ax.annotate('', xy=(3.5, 2.3), xytext=(4.5, 3.0),
                arrowprops=dict(arrowstyle='->', color='#1565c0', lw=1.5))
    ax.annotate('', xy=(6.5, 2.3), xytext=(5.5, 3.0),
                arrowprops=dict(arrowstyle='->', color='#1565c0', lw=1.5))
    ax.annotate('', xy=(2.5, 1.7), xytext=(2.5, 1.0),
                arrowprops=dict(arrowstyle='->', color='#1565c0', lw=1.5))
    ax.annotate('', xy=(7.5, 1.7), xytext=(7.5, 1.0),
                arrowprops=dict(arrowstyle='<->', color='#1565c0', lw=1.5))

    ax.text(5, -0.1, 'Vercel Deployment Architecture',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'deployment_architecture.png')


# ════════════════════════════════════════════
# Run all
# ════════════════════════════════════════════
# ════════════════════════════════════════════
# 10. POS Interface Mockup
# ════════════════════════════════════════════
def draw_pos_mockup():
    fig, ax = plt.subplots(figsize=(FIGW+2, FIGH))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')
    ax.set_facecolor('#f5f5f5')

    def rbox(x, y, w, h, color='#fff', ec='#ddd', label=''):
        r = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08",
                           facecolor=color, edgecolor=ec, lw=1)
        ax.add_patch(r)
        if label:
            ax.text(x+w/2, y+h-0.15, label, ha='center', fontsize=7, fontweight='bold', color='#333')

    def nav_btn(x, y, text):
        r = FancyBboxPatch((x, y), 0.8, 0.3, boxstyle="round,pad=0.03",
                           facecolor='#1565c0', edgecolor='#0d47a1', lw=0.8)
        ax.add_patch(r)
        ax.text(x+0.4, y+0.15, text, ha='center', fontsize=5, fontweight='bold', color='#fff')

    # Sidebar nav
    rbox(0.1, 0.3, 1.2, 7.4, '#1a237e', '#0d47a1')
    ax.text(0.1+0.6, 7.2, 'Taktill\nPOS', ha='center', fontsize=7, fontweight='bold', color='#fff')
    nav_items = ['Dashboard', 'POS', 'Products', 'Reports', 'Settings']
    for i, item in enumerate(nav_items):
        rbox(0.2, 5.8-i*0.5, 1.0, 0.4, '#283593' if item == 'POS' else '#1a237e', '#0d47a1')
        ax.text(0.7, 6.0-i*0.5, item, ha='center', fontsize=6, color='#fff' if item == 'POS' else '#b0bec5')

    # Header bar
    rbox(1.5, 7.2, 10.2, 0.6, '#fff', '#ddd')
    ax.text(9.5, 7.5, 'Cashier: John  |  Tue, Jun 15 2026', ha='right', fontsize=6, color='#666')

    # Left panel: Product browser
    rbox(1.5, 0.3, 5.6, 6.7, '#fff', '#ddd', 'Product Browser')

    # Search bar
    rbox(1.7, 6.5, 5.2, 0.4, '#f5f5f5', '#ccc')
    ax.text(1.9, 6.7, 'Search products...', fontsize=6, color='#999')

    # Category tabs
    cats = ['All', 'Beverages', 'Food', 'Snacks', 'Other']
    for i, c in enumerate(cats):
        cx = 1.7 + i*1.0
        rbox(cx, 5.95, 0.9, 0.3, '#e3f2fd' if i==0 else '#f5f5f5', '#1565c0' if i==0 else '#ddd')
        ax.text(cx+0.45, 6.1, c, ha='center', fontsize=5, color='#1565c0' if i==0 else '#666')

    # Product grid (4 mock products)
    prods = [('Water 500ml', '1,000', '50'), ('Soda Can', '2,500', '30'),
             ('Chips', '3,000', '15'), ('Bread Loaf', '4,500', '8')]
    for i, (pname, price, stock) in enumerate(prods):
        px = 1.7 + (i%2)*2.6
        py = 4.5 - (i//2)*1.5
        rbox(px, py, 2.4, 1.3, '#fafafa', '#e0e0e0')
        ax.text(px+1.2, py+1.0, pname, ha='center', fontsize=6, fontweight='bold')
        ax.text(px+1.2, py+0.7, f'UGX {price}', ha='center', fontsize=5, color='#2e7d32')
        ax.text(px+1.2, py+0.3, f'Stock: {stock}', ha='center', fontsize=5, color='#888')

    # Right panel: Cart
    rbox(7.3, 0.3, 4.4, 6.7, '#fff', '#ddd', 'Shopping Cart')
    items = [('Water 500ml', 2, '2,000'), ('Soda Can', 1, '2,500'), ('Chips', 3, '9,000')]
    for i, (iname, qty, total) in enumerate(items):
        iy = 5.5 - i*0.9
        rbox(7.5, iy, 4.0, 0.7, '#fafafa', '#eee')
        ax.text(7.7, iy+0.5, iname, fontsize=6, fontweight='bold')
        ax.text(7.7, iy+0.2, f'Qty: {qty}', fontsize=5, color='#666')
        ax.text(11.3, iy+0.35, total, ha='right', fontsize=6, color='#333')

    # Totals
    rbox(7.5, 2.0, 4.0, 1.8, '#f5f5f5', '#ddd')
    ax.text(7.7, 3.5, 'Subtotal:', fontsize=6, color='#666')
    ax.text(11.3, 3.5, '13,500', ha='right', fontsize=6)
    ax.text(7.7, 3.1, 'Discount:', fontsize=6, color='#666')
    ax.text(11.3, 3.1, '-500', ha='right', fontsize=6, color='#c62828')
    ax.text(7.7, 2.7, 'Grand Total:', fontsize=7, fontweight='bold')
    ax.text(11.3, 2.7, '13,000', ha='right', fontsize=7, fontweight='bold', color='#1565c0')

    # Payment & checkout
    rbox(7.5, 1.2, 4.0, 0.6, '#fff', '#ccc')
    ax.text(7.7, 1.5, 'Payment: Cash', fontsize=6, color='#333')
    rbox(8.5, 0.4, 2.8, 0.6, '#2e7d32', '#1b5e20')
    ax.text(9.9, 0.7, 'COMPLETE SALE', ha='center', fontsize=7, fontweight='bold', color='#fff')

    ax.text(6, 0.05, 'POS Interface Mockup',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'pos_mockup.png')

# ════════════════════════════════════════════
# 11. Dashboard Screenshot Mockup
# ════════════════════════════════════════════
def draw_dashboard_mockup():
    fig, ax = plt.subplots(figsize=(FIGW+2, FIGH))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')
    ax.set_facecolor('#f5f5f5')

    def card(x, y, w, h, title, value, color='#fff', icon=''):
        r = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.06",
                           facecolor=color, edgecolor='#e0e0e0', lw=1)
        ax.add_patch(r)
        ax.text(x+w/2, y+h-0.3, title, ha='center', fontsize=6, color='#888')
        ax.text(x+w/2, y+h/2-0.1, value, ha='center', fontsize=11,
                fontweight='bold', color='#1a237e')

    # Sidebar
    rbox = lambda x, y, w, h, c='#1a237e', ec='#0d47a1': (
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08",
                                     facecolor=c, edgecolor=ec, lw=1)))
    rbox(0.1, 0.3, 1.2, 7.4, '#1a237e', '#0d47a1')
    ax.text(0.7, 7.2, 'Taktill\nPOS', ha='center', fontsize=7, fontweight='bold', color='#fff')
    nav_items = ['Dashboard', 'POS', 'Products', 'Reports', 'Settings']
    for i, item in enumerate(nav_items):
        c = '#283593' if item == 'Dashboard' else '#1a237e'
        rbox(0.2, 5.8-i*0.5, 1.0, 0.4, c, '#0d47a1')
        color = '#fff' if item == 'Dashboard' else '#b0bec5'
        ax.text(0.7, 6.0-i*0.5, item, ha='center', fontsize=6, color=color)

    # Header
    rbox(1.5, 7.2, 10.2, 0.6, '#fff', '#ddd')
    ax.text(9.5, 7.5, 'Manager: Admin  |  Dashboard', ha='right', fontsize=6, color='#666')

    # 4 metric cards
    metrics = [("Today's Revenue", 'UGX 185,000'), ('Today Sales', '24'),
               ('Low Stock Items', '3'), ('Total Products', '25')]
    for i, (title, val) in enumerate(metrics):
        cx = 1.7 + i*2.5
        card(cx, 5.8, 2.2, 0.9, title, val)

    # Chart area
    rbox(1.5, 0.3, 10.2, 5.2, '#fff', '#ddd')
    ax.text(6.5, 5.1, '7-Day Revenue Trend', ha='center', fontsize=7, fontweight='bold')

    # Mock line chart (scaled to fit y-axis 1-7)
    days = 7
    x_vals = [1.8 + i*1.35 for i in range(days)]
    rev_vals = [120, 145, 138, 160, 155, 172, 185]
    y_vals = [0.8 + (v-100)/15 for v in rev_vals]
    ax.plot(x_vals, y_vals, '-o', color='#1565c0', lw=2, markersize=5)
    for x, y, v in zip(x_vals, y_vals, rev_vals):
        ax.text(x, y+0.2, f'UGX {v}k', ha='center', fontsize=5.5, color='#1565c0')

    day_labels = ['Jun 9', 'Jun 10', 'Jun 11', 'Jun 12', 'Jun 13', 'Jun 14', 'Jun 15']
    for x, label in zip(x_vals, day_labels):
        ax.text(x, 0.5, label, ha='center', fontsize=5.5, color='#666')

    ax.text(6, 0.05, 'Dashboard Mockup',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'dashboard_mockup.png')

# ════════════════════════════════════════════
# 12. Unit Test Results Mockup
# ════════════════════════════════════════════
def draw_test_results():
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.set_xlim(0, 8)
    ax.set_ylim(0, 6)
    ax.axis('off')
    ax.set_facecolor('#1e1e2e')  # Dark terminal background

    def txt(x, y, text, fs=7, c='#cdd6f4', bold=False):
        ax.text(x, y, text, fontsize=fs, color=c, fontfamily='monospace',
                fontweight='bold' if bold else 'normal', va='top')

    # Header
    txt(0.3, 5.7, '> npx vitest run', 8, '#89b4fa', True)
    txt(0.3, 5.3, ' RERUN  ./server/lib/money.test.ts x1', 7, '#fab387')
    txt(0.3, 4.9, ' RERUN  ./server/lib/cart.test.ts x1', 7, '#fab387')

    # Money tests
    txt(0.3, 4.3, ' ✓  lib/money.test.ts (8 tests)', 7, '#a6e3a1', True)
    tests = ['  ✓ d() creates Decimal from string', '  ✓ d() creates Decimal from number',
             '  ✓ d() creates Decimal from Decimal', '  ✓ calcDiscount() percentage',
             '  ✓ calcDiscount() flat', '  ✓ calcDiscount() never exceeds base',
             '  ✓ calcDiscount() zero value', '  ✓ calcDiscount() edge cases']
    for i, t in enumerate(tests):
        txt(0.5, 3.7 - i*0.25, t, 6, '#a6e3a1')

    # Cart tests
    txt(0.3, 1.5, ' ✓  lib/cart.test.ts (6 tests)', 7, '#a6e3a1', True)
    cart_tests = ['  ✓ add item to empty cart', '  ✓ duplicate product increments qty',
                  '  ✓ remove item from cart', '  ✓ quantity respects stock limit',
                  '  ✓ line-item discount calculated', '  ✓ mutual exclusivity enforced']
    for i, t in enumerate(cart_tests):
        txt(0.5, 0.9 - i*0.25, t, 6, '#a6e3a1')

    # Summary
    txt(0.3, -0.5, ' Test Files  2 passed (2)', 7, '#a6e3a1')
    txt(0.3, -0.9, ' Tests  14 passed (14)', 7, '#a6e3a1')
    txt(4.0, -0.5, ' Duration  1.24s', 7, '#cdd6f4')

    ax.text(4, -1.5, 'Unit Test Results (Vitest)',
            ha='center', fontsize=11, fontweight='bold', color='#333', style='italic')
    save(fig, 'test_results.png')


# ════════════════════════════════════════════
# Run all
# ════════════════════════════════════════════
if __name__ == '__main__':
    print("Generating diagrams...")
    draw_frontend_architecture()
    draw_middleware_pipeline()
    draw_er_diagram()
    draw_usecase_diagram()
    draw_system_architecture()
    draw_sale_sequence()
    draw_auth_flow()
    draw_test_pyramid()
    draw_deployment_architecture()
    draw_pos_mockup()
    draw_dashboard_mockup()
    draw_test_results()
    print(f"\nAll diagrams saved to: {OUTPUT_DIR}")
