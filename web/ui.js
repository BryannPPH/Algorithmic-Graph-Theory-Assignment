class GraphVisualizer {
    constructor() {
        this.graph = new Graph();
        this.algorithms = new GraphAlgorithms(this.graph);
        
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = document.getElementById('canvasContainer');
        
        this.currentTool = 'addNode';
        this.selectedNode = null;
        this.draggingNode = null;
        this.edgeStartNode = null;
        this.tempEdgeEnd = null;
        this.hoveredNode = null;
        
        this.animationSpeed = 500;
        this.isAnimating = false;
        
        this.nodeColors = new Map();
        this.edgeColors = new Map();
        this.nodeRadius = 28;
        this.pulsePhase = 0;
        this.particles = [];
        this.viewport = {
            scale: 1,
            minScale: 0.35,
            maxScale: 3,
            offsetX: 0,
            offsetY: 0
        };
        this.isPanning = false;
        this.panLastScreenPos = null;
        
        // Electric animation state
        this.electricNodes = new Set();
        this.electricEdges = new Set();
        this.electricParticles = [];
        this.lightningBolts = [];
        this.shockwaves = [];
        
        // View mode: '2d' or '3d'
        this.viewMode = '2d';
        this.graph3DView = null;
        this.is3DInitialized = false;
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupThemeToggle();
        this.setupCanvasEvents();
        this.setupUIEvents();
        this.setupViewToggle();
        this.animate();
    }

    setupThemeToggle() {
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        if (!this.themeToggleBtn) return;

        const savedTheme = localStorage.getItem('graph-theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

        this.applyTheme(initialTheme, false);

        this.themeToggleBtn.onclick = () => {
            const isDark = document.body.classList.contains('dark-mode');
            this.applyTheme(isDark ? 'light' : 'dark');
        };
    }

    applyTheme(theme, persist = true) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);

        if (this.themeToggleBtn) {
            const text = this.themeToggleBtn.querySelector('.theme-text');
            if (text) {
                text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
            }

            const nextModeLabel = isDark ? 'light mode' : 'dark mode';
            this.themeToggleBtn.setAttribute('aria-label', `Aktifkan ${nextModeLabel}`);
            this.themeToggleBtn.setAttribute('title', `Aktifkan ${nextModeLabel}`);
            this.themeToggleBtn.classList.toggle('is-dark', isDark);
        }

        if (persist) {
            localStorage.setItem('graph-theme', theme);
        }
    }

    // ==================== VIEW TOGGLE ====================
    setupViewToggle() {
        const view2DBtn = document.getElementById('view2DBtn');
        const view3DBtn = document.getElementById('view3DBtn');
        const canvas3DContainer = document.getElementById('canvas3DContainer');

        view2DBtn.onclick = () => this.switchTo2D();
        view3DBtn.onclick = () => this.switchTo3D();

        // 3D Controls
        const resetCamera = document.getElementById('resetCamera3D');
        const toggleRotate = document.getElementById('toggleAutoRotate3D');
        const toggleWireframe = document.getElementById('toggleWireframe3D');

        if (resetCamera) {
            resetCamera.onclick = () => {
                if (this.graph3DView) {
                    this.graph3DView.resetCamera();
                    this.showToast('Kamera direset!', 'info');
                }
            };
        }

        if (toggleRotate) {
            toggleRotate.onclick = () => {
                if (this.graph3DView) {
                    const isRotating = this.graph3DView.toggleAutoRotate();
                    toggleRotate.classList.toggle('active', isRotating);
                    this.showToast(isRotating ? 'Auto-rotate ON' : 'Auto-rotate OFF', 'info');
                }
            };
        }

        if (toggleWireframe) {
            toggleWireframe.onclick = () => {
                if (this.graph3DView) {
                    const isWireframe = this.graph3DView.toggleWireframe();
                    toggleWireframe.classList.toggle('active', isWireframe);
                    this.showToast(isWireframe ? 'Wireframe ON' : 'Wireframe OFF', 'info');
                }
            };
        }
    }

    switchTo2D() {
        this.viewMode = '2d';
        
        document.getElementById('view2DBtn').classList.add('active');
        document.getElementById('view3DBtn').classList.remove('active');
        document.getElementById('canvas3DContainer').classList.remove('active');
        
        if (this.graph3DView) {
            this.graph3DView.stop();
        }
        
        this.showToast('Tampilan 2D aktif', 'info');
    }

    switchTo3D() {
        if (this.graph.nodes.size === 0) {
            this.showToast('Tambahkan simpul terlebih dahulu!', 'warning');
            return;
        }

        this.viewMode = '3d';
        
        document.getElementById('view2DBtn').classList.remove('active');
        document.getElementById('view3DBtn').classList.add('active');
        document.getElementById('canvas3DContainer').classList.add('active');
        
        // Initialize 3D view if not already
        if (!this.is3DInitialized) {
            this.graph3DView = new Graph3DView();
            this.graph3DView.init('threejs-inline-container');
            this.is3DInitialized = true;
        }
        
        this.graph3DView.loadGraph(this.graph);
        this.graph3DView.start();
        
        this.showToast('Tampilan 3D aktif', 'info');
    }

    // Update 3D view when graph changes
    update3DView() {
        if (this.viewMode === '3d' && this.graph3DView) {
            this.graph3DView.loadGraph(this.graph);
        }
    }

    // Highlight nodes in 3D view
    highlight3DNodes(nodeIds, color) {
        if (this.graph3DView && this.viewMode === '3d') {
            this.graph3DView.highlightNodes(nodeIds, color);
        }
    }

    // ==================== COLOR UTILITIES ====================
    hexToRgb(hex) {
        // Handle both #RGB and #RRGGBB formats
        let result;
        if (hex.length === 4) {
            // #RGB format
            result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
            if (result) {
                return {
                    r: parseInt(result[1] + result[1], 16),
                    g: parseInt(result[2] + result[2], 16),
                    b: parseInt(result[3] + result[3], 16)
                };
            }
        }
        // #RRGGBB format
        result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 139, g: 115, b: 85 }; // default color
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    lightenColor(color, amount) {
        const rgb = this.hexToRgb(color);
        return this.rgbToHex(
            rgb.r + amount,
            rgb.g + amount,
            rgb.b + amount
        );
    }

    darkenColor(color, amount) {
        const rgb = this.hexToRgb(color);
        return this.rgbToHex(
            rgb.r - amount,
            rgb.g - amount,
            rgb.b - amount
        );
    }

    formatWeight(weight) {
        const numericWeight = Number(weight);
        if (!Number.isFinite(numericWeight)) return '1';
        if (Number.isInteger(numericWeight)) return numericWeight.toString();
        return numericWeight.toFixed(2).replace(/\.?0+$/, '');
    }

    parseWeight(value) {
        const normalized = String(value ?? '').replace(',', '.').trim();
        if (!normalized) return null;

        const numericWeight = Number(normalized);
        if (!Number.isFinite(numericWeight) || numericWeight < 0) {
            return null;
        }

        return numericWeight;
    }

    shouldShowEdgeWeights() {
        return this.graph.edges.some(edge => this.graph.normalizeWeight(edge.weight) !== 1);
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        const safeRadius = Math.min(radius, width / 2, height / 2);

        ctx.beginPath();
        ctx.moveTo(x + safeRadius, y);
        ctx.lineTo(x + width - safeRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        ctx.lineTo(x + width, y + height - safeRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        ctx.lineTo(x + safeRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        ctx.lineTo(x, y + safeRadius);
        ctx.quadraticCurveTo(x, y, x + safeRadius, y);
        ctx.closePath();
    }

    getIconMarkup(name, classes = 'ui-icon ui-icon-md') {
        const icons = {
            start: '<circle cx="6" cy="12" r="2"/><path d="M8 12h10"/><path d="M14 8l4 4-4 4"/>',
            target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/>',
            dfs: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
            bfs: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
            route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18c4 0 4-6 8-6"/>',
            'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
            'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
            alert: '<path d="M12 3l9 16H3L12 3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
            ruler: '<path d="M4 19L19 4"/><path d="M14 5l5 5"/><path d="M8 11l2 2"/><path d="M5 14l2 2"/>',
            nodes: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/>',
            star: '<path d="M12 3.5l2.7 5.47 6.03.88-4.36 4.24 1.03 5.99L12 17.25 6.6 20.08l1.03-5.99-4.36-4.24 6.03-.88L12 3.5z"/>',
            bipartite: '<circle cx="7" cy="7" r="4"/><circle cx="17" cy="17" r="4"/><path d="M10 10l4 4"/>',
            diameter: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>',
            cycle: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/><path d="M21 3v6h-6"/>',
            ring: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
            info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/>'
        };

        const markup = icons[name] || icons.info;
        return `<svg class="${classes}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markup}</svg>`;
    }

    getResultHeading(iconName, title) {
        return `<h3>${this.getIconMarkup(iconName, 'ui-icon ui-icon-lg')}<span>${title}</span></h3>`;
    }

    getResultNote(text, style = '') {
        const styleAttr = style ? ` style="${style}"` : '';
        return `<p class="result-note"${styleAttr}>${this.getIconMarkup('info', 'ui-icon ui-icon-md')}<span>${text}</span></p>`;
    }

    getModalLabel(iconName, text) {
        return `<label class="modal-label-with-icon">${this.getIconMarkup(iconName, 'ui-icon ui-icon-md')}<span>${text}</span></label>`;
    }

    // ==================== EXISTING METHODS ====================
    resizeCanvas() {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        if (this.graph3DView && this.is3DInitialized) {
            this.graph3DView.onResize();
        }
    }

    animate() {
        this.pulsePhase += 0.05;
        this.updateParticles();
        this.updateElectricEffects();
        if (this.viewMode === '2d') {
            this.render();
        }
        requestAnimationFrame(() => this.animate());
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            p.size *= 0.98;
            return p.life > 0;
        });
    }

    addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 6 + 2,
                color,
                life: 1
            });
        }
    }

    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    getScreenPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.viewport.offsetX) / this.viewport.scale,
            y: (y - this.viewport.offsetY) / this.viewport.scale
        };
    }

    getPos(e) {
        const pos = this.getScreenPos(e);
        return this.screenToWorld(pos.x, pos.y);
    }

    getVisibleWorldBounds(padding = 0) {
        const left = (-this.viewport.offsetX) / this.viewport.scale - padding;
        const top = (-this.viewport.offsetY) / this.viewport.scale - padding;
        const right = (this.canvas.width - this.viewport.offsetX) / this.viewport.scale + padding;
        const bottom = (this.canvas.height - this.viewport.offsetY) / this.viewport.scale + padding;

        return { left, top, right, bottom };
    }

    startPan(screenPos) {
        this.isPanning = true;
        this.panLastScreenPos = screenPos;
        this.hoveredNode = null;
        this.canvas.style.cursor = 'grabbing';
    }

    stopPan() {
        this.isPanning = false;
        this.panLastScreenPos = null;
    }

    zoomAt(screenX, screenY, zoomFactor) {
        const previousScale = this.viewport.scale;
        const nextScale = Math.max(
            this.viewport.minScale,
            Math.min(this.viewport.maxScale, previousScale * zoomFactor)
        );

        if (nextScale === previousScale) return;

        const worldX = (screenX - this.viewport.offsetX) / previousScale;
        const worldY = (screenY - this.viewport.offsetY) / previousScale;

        this.viewport.scale = nextScale;
        this.viewport.offsetX = screenX - worldX * nextScale;
        this.viewport.offsetY = screenY - worldY * nextScale;
    }

    hasReciprocalDirectedEdge(edge) {
        return this.graph.directed && this.graph.hasEdge(edge.to, edge.from);
    }

    getEdgeGeometry(edge) {
        const fromNode = this.graph.nodes.get(edge.from);
        const toNode = this.graph.nodes.get(edge.to);
        if (!fromNode || !toNode) return null;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const length = Math.hypot(dx, dy);
        if (!length) return null;

        const unitX = dx / length;
        const unitY = dy / length;
        const normalX = -unitY;
        const normalY = unitX;

        let offsetX = 0;
        let offsetY = 0;

        if (this.hasReciprocalDirectedEdge(edge)) {
            const firstId = Math.min(edge.from, edge.to);
            const secondId = Math.max(edge.from, edge.to);
            const firstNode = this.graph.nodes.get(firstId);
            const secondNode = this.graph.nodes.get(secondId);

            if (firstNode && secondNode) {
                const pairDx = secondNode.x - firstNode.x;
                const pairDy = secondNode.y - firstNode.y;
                const pairLength = Math.hypot(pairDx, pairDy);

                if (pairLength) {
                    const pairNormalX = -pairDy / pairLength;
                    const pairNormalY = pairDx / pairLength;
                    const offsetDistance = Math.max(16, this.nodeRadius * 0.7);
                    const offsetSign = edge.from === firstId && edge.to === secondId ? 1 : -1;
                    offsetX = pairNormalX * offsetDistance * offsetSign;
                    offsetY = pairNormalY * offsetDistance * offsetSign;
                }
            }
        }

        const offsetDistance = Math.hypot(offsetX, offsetY);
        const trimmedRadius = offsetDistance < this.nodeRadius
            ? Math.sqrt(this.nodeRadius * this.nodeRadius - offsetDistance * offsetDistance)
            : this.nodeRadius * 0.4;

        const startX = fromNode.x + unitX * trimmedRadius + offsetX;
        const startY = fromNode.y + unitY * trimmedRadius + offsetY;
        const endX = toNode.x - unitX * trimmedRadius + offsetX;
        const endY = toNode.y - unitY * trimmedRadius + offsetY;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const labelDistance = this.hasReciprocalDirectedEdge(edge) ? 10 : 18;

        return {
            fromNode,
            toNode,
            angle: Math.atan2(dy, dx),
            startX,
            startY,
            endX,
            endY,
            midX,
            midY,
            labelX: midX + normalX * labelDistance,
            labelY: midY + normalY * labelDistance,
            normalX,
            normalY
        };
    }

    getEdgeLabelText(edge) {
        const weight = this.graph.normalizeWeight(edge.weight);
        return this.formatWeight(weight);
    }

    getEdgeLabelBounds(edge, geometry = null) {
        if (!this.shouldShowEdgeWeights()) return null;

        const targetGeometry = geometry || this.getEdgeGeometry(edge);
        if (!targetGeometry) return null;

        const label = this.getEdgeLabelText(edge);
        const ctx = this.ctx;
        ctx.save();
        ctx.font = '600 12px Inter, sans-serif';
        const labelWidth = ctx.measureText(label).width + 16;
        ctx.restore();

        return {
            label,
            x: targetGeometry.labelX - labelWidth / 2,
            y: targetGeometry.labelY - 12,
            width: labelWidth,
            height: 24
        };
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;

        if (!lengthSq) {
            return Math.hypot(px - x1, py - y1);
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        return Math.hypot(px - closestX, py - closestY);
    }

    getEdgeAtWorldPosition(x, y) {
        let closestEdge = null;
        let closestDistance = Infinity;
        const threshold = 10 / this.viewport.scale;

        for (let i = this.graph.edges.length - 1; i >= 0; i--) {
            const edge = this.graph.edges[i];
            const geometry = this.getEdgeGeometry(edge);
            if (!geometry) continue;

            const labelBounds = this.getEdgeLabelBounds(edge, geometry);
            if (
                labelBounds &&
                x >= labelBounds.x &&
                x <= labelBounds.x + labelBounds.width &&
                y >= labelBounds.y &&
                y <= labelBounds.y + labelBounds.height
            ) {
                return edge;
            }

            const distance = this.pointToSegmentDistance(
                x,
                y,
                geometry.startX,
                geometry.startY,
                geometry.endX,
                geometry.endY
            );

            if (distance <= threshold && distance < closestDistance) {
                closestEdge = edge;
                closestDistance = distance;
            }
        }

        return closestEdge;
    }

    onWheel(e) {
        if (this.viewMode === '3d') return;

        e.preventDefault();

        const screenPos = this.getScreenPos(e);
        const deltaMultiplier =
            e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.canvas.height : 1;
        const normalizedDelta = e.deltaY * deltaMultiplier;
        const zoomDelta = Math.max(-70, Math.min(70, normalizedDelta));
        const zoomFactor = Math.exp(-zoomDelta * 0.0028);
        this.zoomAt(screenPos.x, screenPos.y, zoomFactor);
    }

    updateCanvasCursor(worldPos = null) {
        if (this.viewMode === '3d') return;

        if (this.isPanning || this.draggingNode !== null) {
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        const targetPos = worldPos;
        const hoveredNode = targetPos
            ? this.graph.getNodeAtPosition(targetPos.x, targetPos.y, this.nodeRadius)
            : this.hoveredNode;
        const hoveredEdge = targetPos
            ? this.getEdgeAtWorldPosition(targetPos.x, targetPos.y)
            : null;

        if (this.currentTool === 'move') {
            this.canvas.style.cursor = hoveredNode ? 'grab' : 'move';
        } else if (this.currentTool === 'delete' || this.currentTool === 'weight') {
            this.canvas.style.cursor = hoveredNode || hoveredEdge ? 'pointer' : 'default';
        } else {
            this.canvas.style.cursor = hoveredNode ? 'pointer' : 'crosshair';
        }
    }

    onMouseDown(e) {
        if (this.isAnimating || this.viewMode === '3d') return;

        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
            this.startPan(this.getScreenPos(e));
            return;
        }

        if (e.button !== 0) return;

        const pos = this.getPos(e);
        const nodeId = this.graph.getNodeAtPosition(pos.x, pos.y, this.nodeRadius);

        if (this.currentTool === 'move' && !nodeId) {
            e.preventDefault();
            this.startPan(this.getScreenPos(e));
            return;
        }

        switch (this.currentTool) {
            case 'addNode':
                if (!nodeId) {
                    const newId = this.graph.addNode(pos.x, pos.y);
                    this.addParticles(pos.x, pos.y, '#4A7C59', 15);
                    this.showToast(`Simpul ${newId} ditambahkan!`, 'success');
                    this.updateStats();
                    this.update3DView();
                }
                break;
            case 'addEdge':
                if (nodeId) {
                    this.edgeStartNode = nodeId;
                    this.tempEdgeEnd = pos;
                    this.selectedNode = nodeId;
                }
                break;
            case 'move':
                if (nodeId) {
                    this.draggingNode = nodeId;
                    this.canvas.style.cursor = 'grabbing';
                }
                break;
            case 'delete':
                if (nodeId) {
                    const node = this.graph.nodes.get(nodeId);
                    this.addParticles(node.x, node.y, '#B56B6B', 20);
                    this.graph.removeNode(nodeId);
                    this.showToast(`Simpul ${nodeId} dihapus!`, 'error');
                    this.updateStats();
                    this.update3DView();
                } else {
                    const edge = this.getEdgeAtWorldPosition(pos.x, pos.y);
                    if (edge) {
                        this.graph.removeEdge(edge.from, edge.to);
                        this.showToast(`Sisi dihapus!`, 'error');
                        this.updateStats();
                        this.update3DView();
                    }
                }
                break;
            case 'weight':
                if (!nodeId) {
                    const edge = this.getEdgeAtWorldPosition(pos.x, pos.y);
                    if (edge) {
                        this.showEdgeWeightModal(edge, (weight) => {
                            edge.weight = weight;
                            const edgeLabel = this.graph.directed
                                ? `${edge.from}->${edge.to}`
                                : `${edge.from}-${edge.to}`;
                            this.showToast(`Bobot sisi ${edgeLabel} = ${this.formatWeight(weight)}`, 'success');
                            this.update3DView();
                        });
                    } else {
                        this.showToast('Klik pada sebuah sisi!', 'warning');
                    }
                }
                break;
        }
    }

    onMouseMove(e) {
        if (this.viewMode === '3d') return;

        const screenPos = this.getScreenPos(e);

        if (this.isPanning && this.panLastScreenPos) {
            this.viewport.offsetX += screenPos.x - this.panLastScreenPos.x;
            this.viewport.offsetY += screenPos.y - this.panLastScreenPos.y;
            this.panLastScreenPos = screenPos;
            this.hoveredNode = null;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        const pos = this.getPos(e);
        this.hoveredNode = this.graph.getNodeAtPosition(pos.x, pos.y, this.nodeRadius);

        if (this.draggingNode !== null) {
            this.graph.moveNode(this.draggingNode, pos.x, pos.y);
        } else if (this.edgeStartNode !== null) {
            this.tempEdgeEnd = pos;
        }

        this.updateCanvasCursor(pos);
    }

    onMouseUp(e) {
        if (this.viewMode === '3d') return;

        const pos = this.getPos(e);

        if (this.isPanning) {
            this.stopPan();
            this.updateCanvasCursor(pos);
            return;
        }

        if (e.button !== 0) return;

        if (this.edgeStartNode !== null) {
            const startNodeId = this.edgeStartNode;
            const endNodeId = this.graph.getNodeAtPosition(pos.x, pos.y, this.nodeRadius);
            if (endNodeId && endNodeId !== startNodeId && !this.graph.hasEdge(startNodeId, endNodeId)) {
                if (this.graph.addEdge(startNodeId, endNodeId, 1)) {
                    this.showToast(`Sisi ${startNodeId}-${endNodeId} ditambahkan!`, 'success');
                    this.updateStats();
                    this.update3DView();
                }
            }
            this.edgeStartNode = null;
            this.tempEdgeEnd = null;
            this.selectedNode = null;
        }

        if (this.draggingNode !== null) {
            this.draggingNode = null;
            this.update3DView();
        }

        this.updateCanvasCursor(pos);
    }

    onMouseLeave() {
        this.stopPan();
        this.edgeStartNode = null;
        this.tempEdgeEnd = null;
        this.draggingNode = null;
        this.hoveredNode = null;
        this.canvas.style.cursor = 'default';
    }

    setupGraphPresetEvents() {
        const presetSelect = document.getElementById('graphPresetSelect');
        const loadButton = document.getElementById('loadPresetGraph');
        if (!presetSelect || !loadButton) return;

        presetSelect.onchange = () => this.updateGraphPresetForm();
        loadButton.onclick = () => this.loadSelectedGraphPreset();
        this.updateGraphPresetForm();
    }

    getGraphPresetDefinitions() {
        return {
            complete: {
                hint: 'K_n lengkap dengan setiap pasangan simpul terhubung.',
                params: { n: { label: 'n', value: 6, min: 2 } }
            },
            completeBipartite: {
                hint: 'K_m,n lengkap bipartit dengan sisi dari setiap simpul partisi kiri ke partisi kanan.',
                params: {
                    m: { label: 'm', value: 3, min: 1 },
                    n: { label: 'n', value: 3, min: 1 }
                }
            },
            tree: {
                hint: 'T_n dibuat sebagai pohon biner kecil; biasanya tidak punya tur Hamiltonian.',
                params: { n: { label: 'n', value: 8, min: 2 } }
            },
            cycle: {
                hint: 'C_n adalah siklus sederhana dengan n simpul.',
                params: { n: { label: 'n', value: 8, min: 3 } }
            },
            path: {
                hint: 'P_n adalah lintasan sederhana; berguna untuk test kasus tanpa tur.',
                params: { n: { label: 'n', value: 8, min: 2 } }
            },
            wheel: {
                hint: 'W_n memakai n simpul total: satu pusat dan C_(n-1).',
                params: { n: { label: 'n', value: 7, min: 4 } }
            },
            prism: {
                hint: 'Prisma n-gonal memiliki 2n simpul.',
                params: { n: { label: 'n', value: 5, min: 3 } }
            },
            petersen: {
                hint: 'Petersen graph standar memiliki 10 simpul.'
            },
            generalizedPetersen: {
                hint: 'P(n,k) memiliki 2n simpul; gunakan 1 <= k < n/2.',
                params: {
                    n: { label: 'n', value: 5, min: 3 },
                    k: { label: 'k', value: 2, min: 1 }
                }
            },
            circulant: {
                hint: 'C_n(a1,a2) menghubungkan tiap simpul ke +/-a1 dan +/-a2.',
                params: {
                    n: { label: 'n', value: 8, min: 4 },
                    a1: { label: 'a1', value: 1, min: 1 },
                    a2: { label: 'a2', value: 3, min: 1 }
                }
            },
            hypercube: {
                hint: 'H(n) memiliki 2^n simpul.',
                params: { n: { label: 'n', value: 3, min: 1 } }
            },
            grid: {
                hint: 'G(m,n) memakai m baris dan n kolom.',
                params: {
                    m: { label: 'm', value: 2, min: 1 },
                    n: { label: 'n', value: 5, min: 1 }
                }
            }
        };
    }

    updateGraphPresetForm() {
        const presetSelect = document.getElementById('graphPresetSelect');
        if (!presetSelect) return;

        const definitions = this.getGraphPresetDefinitions();
        const definition = definitions[presetSelect.value] || definitions.complete;
        const params = definition.params || {};
        const paramContainer = document.querySelector('.preset-params');
        const paramIds = ['n', 'm', 'k', 'a1', 'a2'];

        for (const paramId of paramIds) {
            const field = document.querySelector(`.preset-field[data-param="${paramId}"]`);
            const input = document.getElementById(`preset${paramId.toUpperCase()}`);
            const label = document.getElementById(`preset${paramId.toUpperCase()}Label`);
            if (!field || !input || !label) continue;

            const config = params[paramId];
            field.hidden = !config;

            if (config) {
                label.textContent = config.label;
                input.min = config.min;
                if (Number.isFinite(config.max)) {
                    input.max = config.max;
                } else {
                    input.removeAttribute('max');
                }
                input.value = config.value;
            }
        }

        if (paramContainer) {
            paramContainer.hidden = Object.keys(params).length === 0;
        }

        const hint = document.getElementById('presetHint');
        if (hint) {
            hint.textContent = definition.hint || '';
        }
    }

    loadSelectedGraphPreset() {
        const presetSelect = document.getElementById('graphPresetSelect');
        if (!presetSelect) return;

        try {
            const definitions = this.getGraphPresetDefinitions();
            const definition = definitions[presetSelect.value] || definitions.complete;
            const params = this.readGraphPresetParams(definition);
            const preset = this.buildGraphPreset(presetSelect.value, params);

            if (this.graph.nodes.size > 0 && !confirm('Ganti graf saat ini dengan test case baru?')) {
                return;
            }

            this.applyGraphPreset(preset);
            this.showToast(`${preset.name} dimuat: ${preset.nodes.length} simpul, ${preset.edges.length} sisi`, 'success');
        } catch (error) {
            this.showToast(error.message || 'Gagal memuat test case graf.', 'error');
        }
    }

    readGraphPresetParams(definition) {
        const params = {};
        const paramConfig = definition.params || {};

        for (const [paramName, config] of Object.entries(paramConfig)) {
            const input = document.getElementById(`preset${paramName.toUpperCase()}`);
            const value = Number.parseInt(input ? input.value : config.value, 10);

            if (!Number.isInteger(value)) {
                throw new Error(`Parameter ${config.label} harus berupa bilangan bulat.`);
            }

            if (value < config.min || (Number.isFinite(config.max) && value > config.max)) {
                const rangeText = Number.isFinite(config.max)
                    ? `di antara ${config.min} dan ${config.max}`
                    : `minimal ${config.min}`;
                throw new Error(`Parameter ${config.label} harus ${rangeText}.`);
            }

            if (input) input.value = value;
            params[paramName] = value;
        }

        return params;
    }

    applyGraphPreset(preset) {
        this.graph.clear();
        this.graph.setDirected(false);
        this.resetVisualization();
        this.viewport.scale = 1;
        this.viewport.offsetX = 0;
        this.viewport.offsetY = 0;

        document.getElementById('undirectedBtn').classList.add('active');
        document.getElementById('directedBtn').classList.remove('active');

        const idByIndex = preset.nodes.map((node) => this.graph.addNode(node.x, node.y));
        for (const [fromIndex, toIndex, weight = 1] of preset.edges) {
            this.graph.addEdge(idByIndex[fromIndex], idByIndex[toIndex], weight);
        }

        this.updateStats();
        this.update3DView();
    }

    buildGraphPreset(type, params) {
        switch (type) {
            case 'complete':
                return this.buildCompleteGraphPreset(params.n);
            case 'completeBipartite':
                return this.buildCompleteBipartiteGraphPreset(params.m, params.n);
            case 'tree':
                return this.buildTreeGraphPreset(params.n);
            case 'cycle':
                return this.buildCycleGraphPreset(params.n);
            case 'path':
                return this.buildPathGraphPreset(params.n);
            case 'wheel':
                return this.buildWheelGraphPreset(params.n);
            case 'prism':
                return this.buildPrismGraphPreset(params.n);
            case 'petersen':
                return this.buildGeneralizedPetersenGraphPreset(5, 2, 'Petersen graph');
            case 'generalizedPetersen':
                return this.buildGeneralizedPetersenGraphPreset(params.n, params.k, `Generalized Petersen P(${params.n},${params.k})`);
            case 'circulant':
                return this.buildCirculantGraphPreset(params.n, params.a1, params.a2);
            case 'hypercube':
                return this.buildHypercubeGraphPreset(params.n);
            case 'grid':
                return this.buildGridGraphPreset(params.m, params.n);
            default:
                return this.buildCompleteGraphPreset(6);
        }
    }

    getPresetFrame() {
        const width = Math.max(360, this.canvas.width || this.canvasContainer.clientWidth || 800);
        const height = Math.max(320, this.canvas.height || this.canvasContainer.clientHeight || 520);

        return {
            width,
            height,
            centerX: width / 2,
            centerY: height / 2,
            radius: Math.max(92, Math.min(width, height) * 0.31)
        };
    }

    createCirclePresetNodes(count, radiusFactor = 1, startAngle = -Math.PI / 2) {
        const frame = this.getPresetFrame();
        const radius = frame.radius * radiusFactor;

        return Array.from({ length: count }, (_, index) => {
            const angle = startAngle + (index / count) * Math.PI * 2;
            return {
                x: frame.centerX + Math.cos(angle) * radius,
                y: frame.centerY + Math.sin(angle) * radius
            };
        });
    }

    createPresetEdgeCollector() {
        const edges = [];
        const seen = new Set();

        const add = (from, to, weight = 1) => {
            if (from === to) return;
            const a = Math.min(from, to);
            const b = Math.max(from, to);
            const key = `${a}-${b}`;
            if (seen.has(key)) return;
            seen.add(key);
            edges.push([from, to, weight]);
        };

        return { edges, add };
    }

    buildCompleteGraphPreset(n) {
        const nodes = this.createCirclePresetNodes(n);
        const { edges, add } = this.createPresetEdgeCollector();

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                add(i, j);
            }
        }

        return { name: `Graf lengkap K_${n}`, nodes, edges };
    }

    buildCompleteBipartiteGraphPreset(m, n) {
        const frame = this.getPresetFrame();
        const leftX = frame.centerX - Math.min(frame.width * 0.22, 180);
        const rightX = frame.centerX + Math.min(frame.width * 0.22, 180);
        const makeColumn = (count, x) => {
            const spacing = Math.min(82, (frame.height * 0.56) / Math.max(1, count - 1));
            return Array.from({ length: count }, (_, index) => ({
                x,
                y: frame.centerY + (index - (count - 1) / 2) * spacing
            }));
        };
        const nodes = [...makeColumn(m, leftX), ...makeColumn(n, rightX)];
        const { edges, add } = this.createPresetEdgeCollector();

        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                add(i, m + j);
            }
        }

        return { name: `Graf bipartit lengkap K_${m},${n}`, nodes, edges };
    }

    buildTreeGraphPreset(n) {
        const frame = this.getPresetFrame();
        const maxLevel = Math.floor(Math.log2(Math.max(1, n)));
        const top = frame.centerY - Math.min(frame.height * 0.27, 165);
        const ySpacing = maxLevel === 0 ? 0 : Math.min(105, (frame.height * 0.54) / maxLevel);
        const nodes = [];
        const { edges, add } = this.createPresetEdgeCollector();

        for (let index = 0; index < n; index++) {
            const level = Math.floor(Math.log2(index + 1));
            const firstIndexInLevel = (1 << level) - 1;
            const nodesOnLevel = Math.min(1 << level, n - firstIndexInLevel);
            const indexInLevel = index - firstIndexInLevel;
            const xSpacing = Math.min(120, (frame.width * 0.62) / Math.max(1, nodesOnLevel - 1));

            nodes.push({
                x: frame.centerX + (indexInLevel - (nodesOnLevel - 1) / 2) * xSpacing,
                y: top + level * ySpacing
            });

            if (index > 0) {
                add(Math.floor((index - 1) / 2), index);
            }
        }

        return { name: `Pohon T_${n}`, nodes, edges };
    }

    buildCycleGraphPreset(n) {
        const nodes = this.createCirclePresetNodes(n);
        const { edges, add } = this.createPresetEdgeCollector();

        for (let i = 0; i < n; i++) {
            add(i, (i + 1) % n);
        }

        return { name: `Siklus C_${n}`, nodes, edges };
    }

    buildPathGraphPreset(n) {
        const frame = this.getPresetFrame();
        const span = Math.min(frame.width * 0.68, 560);
        const nodes = Array.from({ length: n }, (_, index) => ({
            x: frame.centerX + (index - (n - 1) / 2) * (span / Math.max(1, n - 1)),
            y: frame.centerY
        }));
        const { edges, add } = this.createPresetEdgeCollector();

        for (let i = 0; i < n - 1; i++) {
            add(i, i + 1);
        }

        return { name: `Lintasan P_${n}`, nodes, edges };
    }

    buildWheelGraphPreset(n) {
        const frame = this.getPresetFrame();
        const outerCount = n - 1;
        const nodes = [
            { x: frame.centerX, y: frame.centerY },
            ...this.createCirclePresetNodes(outerCount)
        ];
        const { edges, add } = this.createPresetEdgeCollector();

        for (let i = 1; i <= outerCount; i++) {
            add(0, i);
            add(i, i === outerCount ? 1 : i + 1);
        }

        return { name: `Graf roda W_${n}`, nodes, edges };
    }

    buildPrismGraphPreset(n) {
        const frame = this.getPresetFrame();
        const radiusX = Math.min(frame.width * 0.23, 170);
        const radiusY = Math.min(frame.height * 0.13, 72);
        const verticalOffset = Math.min(frame.height * 0.14, 78);
        const nodes = [];
        const { edges, add } = this.createPresetEdgeCollector();

        for (let layer = 0; layer < 2; layer++) {
            const yOffset = layer === 0 ? -verticalOffset : verticalOffset;
            for (let i = 0; i < n; i++) {
                const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
                nodes.push({
                    x: frame.centerX + Math.cos(angle) * radiusX,
                    y: frame.centerY + yOffset + Math.sin(angle) * radiusY
                });
            }
        }

        for (let i = 0; i < n; i++) {
            add(i, (i + 1) % n);
            add(n + i, n + ((i + 1) % n));
            add(i, n + i);
        }

        return { name: `Graf prisma ${n}-gonal`, nodes, edges };
    }

    buildGeneralizedPetersenGraphPreset(n, k, name) {
        if (k < 1 || k >= n / 2) {
            throw new Error('Parameter k untuk P(n,k) harus memenuhi 1 <= k < n/2.');
        }

        const outerNodes = this.createCirclePresetNodes(n, 1);
        const innerNodes = this.createCirclePresetNodes(n, 0.46);
        const nodes = [...outerNodes, ...innerNodes];
        const { edges, add } = this.createPresetEdgeCollector();

        for (let i = 0; i < n; i++) {
            add(i, (i + 1) % n);
            add(i, n + i);
            add(n + i, n + ((i + k) % n));
        }

        return { name, nodes, edges };
    }

    buildCirculantGraphPreset(n, a1, a2) {
        const maxStep = Math.floor(n / 2);

        if (a1 === a2) {
            throw new Error('Parameter a1 dan a2 harus berbeda.');
        }
        if (a1 < 1 || a2 < 1 || a1 > maxStep || a2 > maxStep) {
            throw new Error(`Parameter a1 dan a2 harus di antara 1 dan ${maxStep}.`);
        }

        const nodes = this.createCirclePresetNodes(n);
        const { edges, add } = this.createPresetEdgeCollector();

        for (let i = 0; i < n; i++) {
            add(i, (i + a1) % n);
            add(i, (i + a2) % n);
        }

        return { name: `Circulant graph C_${n}(${a1},${a2})`, nodes, edges };
    }

    buildHypercubeGraphPreset(dimension) {
        const nodeCount = 1 << dimension;
        const frame = this.getPresetFrame();
        let nodes;

        if (dimension === 1) {
            nodes = [
                { x: frame.centerX - 125, y: frame.centerY },
                { x: frame.centerX + 125, y: frame.centerY }
            ];
        } else if (dimension === 2) {
            nodes = Array.from({ length: nodeCount }, (_, index) => ({
                x: frame.centerX + ((index & 1) ? 1 : -1) * 130,
                y: frame.centerY + ((index & 2) ? 1 : -1) * 100
            }));
        } else {
            nodes = Array.from({ length: nodeCount }, (_, index) => ({
                x: frame.centerX + ((index & 1) ? 1 : -1) * 125 + ((index & 4) ? 1 : -1) * 48,
                y: frame.centerY + ((index & 2) ? 1 : -1) * 88 + ((index & 4) ? 1 : -1) * 48
            }));
        }

        const { edges, add } = this.createPresetEdgeCollector();
        for (let node = 0; node < nodeCount; node++) {
            for (let bit = 0; bit < dimension; bit++) {
                const neighbor = node ^ (1 << bit);
                if (node < neighbor) {
                    add(node, neighbor);
                }
            }
        }

        return { name: `Hypercube H(${dimension})`, nodes, edges };
    }

    buildGridGraphPreset(rows, cols) {
        const nodeCount = rows * cols;
        const frame = this.getPresetFrame();
        const spacingX = Math.min(92, (frame.width * 0.62) / Math.max(1, cols - 1));
        const spacingY = Math.min(82, (frame.height * 0.54) / Math.max(1, rows - 1));
        const nodes = [];
        const { edges, add } = this.createPresetEdgeCollector();

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                nodes.push({
                    x: frame.centerX + (col - (cols - 1) / 2) * spacingX,
                    y: frame.centerY + (row - (rows - 1) / 2) * spacingY
                });
            }
        }

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col;
                if (col + 1 < cols) add(index, index + 1);
                if (row + 1 < rows) add(index, index + cols);
            }
        }

        return { name: `Grid graph G(${rows},${cols})`, nodes, edges };
    }

    setupUIEvents() {
        // Graph type buttons
        document.getElementById('undirectedBtn').onclick = () => {
            this.graph.setDirected(false);
            document.getElementById('undirectedBtn').classList.add('active');
            document.getElementById('directedBtn').classList.remove('active');
            this.showToast('Mode: Undirected', 'info');
            this.update3DView();
        };

        document.getElementById('directedBtn').onclick = () => {
            this.graph.setDirected(true);
            document.getElementById('directedBtn').classList.add('active');
            document.getElementById('undirectedBtn').classList.remove('active');
            this.showToast('Mode: Directed', 'info');
            this.update3DView();
        };

        this.setupGraphPresetEvents();

        // Tool buttons
        const tools = ['addNodeTool', 'addEdgeTool', 'moveTool', 'deleteTool', 'weightTool'];
        const toolModes = ['addNode', 'addEdge', 'move', 'delete', 'weight'];
        const toolNames = ['Tambah Simpul', 'Tambah Sisi', 'Pindah', 'Hapus', 'Set Bobot Sisi'];
        const toolInstr = [
            'Klik canvas untuk menambah simpul',
            'Klik dan tarik antar simpul untuk membuat sisi',
            'Klik dan tarik simpul untuk memindahkan',
            'Klik simpul atau sisi untuk menghapus',
            'Klik sisi untuk mengatur bobotnya'
        ];

        tools.forEach((id, i) => {
            document.getElementById(id).onclick = () => {
                this.currentTool = toolModes[i];
                tools.forEach(t => document.getElementById(t).classList.remove('active'));
                document.getElementById(id).classList.add('active');
                document.getElementById('currentMode').textContent = toolNames[i];
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    instructions.textContent = toolInstr[i];
                }
                
                // Switch to 2D for editing
                if (this.viewMode === '3d') {
                    this.switchTo2D();
                }
            };
        });

        // Operations - work in both 2D and 3D
        document.getElementById('opDFS').onclick = () => this.selectNodeAndRun('DFS Traversal', this.runDFS.bind(this));
        document.getElementById('opBFS').onclick = () => this.selectNodeAndRun('BFS Traversal', this.runBFS.bind(this));
        document.getElementById('opDistance').onclick = () => this.selectTwoNodesAndRun('Jarak Antar Simpul', this.runDistance.bind(this));
        document.getElementById('opConnected').onclick = () => this.runConnected();
        document.getElementById('opComponentSize').onclick = () => this.selectNodeAndRun('Ukuran Komponen', this.runComponentSize.bind(this));
        document.getElementById('opCountComponents').onclick = () => this.runCountComponents();
        document.getElementById('opLargestComponent').onclick = () => this.runLargestComponent();

        // Tugas 3 operations
        document.getElementById('opBipartite').onclick = () => this.runBipartite();
        document.getElementById('opDiameter').onclick = () => this.runDiameter();
        document.getElementById('opCycle').onclick = () => this.runDetectCycle();
        document.getElementById('opGirth').onclick = () => this.runGirth();
        document.getElementById('opShortestPath').onclick = () => this.selectTwoNodesAndRun('Lintasan Terpendek', this.runShortestPath.bind(this));
        document.getElementById('opMST').onclick = () => this.runMinimumSpanningTree();
        document.getElementById('opTSP').onclick = () => this.selectNodeAndRun('Travelling Salesman Problem (TSP)', this.runTSP.bind(this));

        // Actions
        document.getElementById('clearGraph').onclick = () => {
            if (confirm('Hapus semua?')) {
                this.graph.clear();
                this.resetVisualization();
                this.updateStats();
                if (this.viewMode === '3d' && this.graph3DView) {
                    this.graph3DView.clearScene();
                }
                this.showToast('Graf dihapus!', 'error');
            }
        };

        document.getElementById('resetColors').onclick = () => {
            this.resetVisualization();
            if (this.graph3DView) {
                this.graph3DView.resetColors();
            }
            this.showToast('Warna direset!', 'info');
        };

        // TXT import/export
        document.getElementById('exportTxt').onclick = () => this.exportTXT();
        document.getElementById('importTxt').onclick = () => document.getElementById('txtFileInput').click();
        document.getElementById('txtFileInput').onchange = (e) => this.importTXT(e);

        // Speed slider
        document.getElementById('speedSlider').oninput = (e) => {
            this.animationSpeed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = `${this.animationSpeed}ms`;
        };

        // Modals
        document.getElementById('closeResultModal').onclick = () => this.hideResultModal();
        document.getElementById('resultModal').onclick = (e) => {
            if (e.target.id === 'resultModal') this.hideResultModal();
        };

        document.getElementById('closeNodeSelect').onclick = () => this.hideNodeSelectModal();
        document.getElementById('cancelNodeSelect').onclick = () => this.hideNodeSelectModal();
        document.getElementById('nodeSelectModal').onclick = (e) => {
            if (e.target.id === 'nodeSelectModal') this.hideNodeSelectModal();
        };
    }

    updateStats() {
        document.getElementById('nodeCount').textContent = this.graph.nodes.size;
        document.getElementById('edgeCount').textContent = this.graph.edges.length;
    }

    resetVisualization() {
        this.nodeColors.clear();
        this.edgeColors.clear();
        this.electricNodes.clear();
        this.electricEdges.clear();
        this.isAnimating = false;
    }

    showToast(msg, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // ==================== RENDERING ====================
    render() {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.setTransform(
            this.viewport.scale,
            0,
            0,
            this.viewport.scale,
            this.viewport.offsetX,
            this.viewport.offsetY
        );
        this.drawGrid();
        this.drawParticles();

        // Draw edges
        for (const edge of this.graph.edges) {
            const edgeKey = `${edge.from}-${edge.to}`;
            const isElectric = this.electricEdges.has(edgeKey) || this.electricEdges.has(`${edge.to}-${edge.from}`);
            this.drawEdgeWithElectric(edge, isElectric);
        }

        // Draw temp edge
        if (this.edgeStartNode !== null && this.tempEdgeEnd) {
            const startNode = this.graph.nodes.get(this.edgeStartNode);
            if (startNode) {
                ctx.beginPath();
                ctx.moveTo(startNode.x, startNode.y);
                ctx.lineTo(this.tempEdgeEnd.x, this.tempEdgeEnd.y);
                ctx.strokeStyle = '#C4A35A';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 8]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw nodes
        for (const [id, node] of this.graph.nodes.entries()) {
            const isElectric = this.electricNodes.has(id);
            this.drawNodeWithElectric(id, node, isElectric);
        }

        // Draw electric effects on top
        this.drawElectricEffects();
        ctx.restore();
    }

    drawGrid() {
        const ctx = this.ctx;
        const gridSize = 30;
        const bounds = this.getVisibleWorldBounds(gridSize * 2);
        const startX = Math.floor(bounds.left / gridSize) * gridSize;
        const endX = Math.ceil(bounds.right / gridSize) * gridSize;
        const startY = Math.floor(bounds.top / gridSize) * gridSize;
        const endY = Math.ceil(bounds.bottom / gridSize) * gridSize;

        ctx.strokeStyle = 'rgba(139, 115, 85, 0.08)';
        ctx.lineWidth = 1 / this.viewport.scale;
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            const alpha = Math.floor(p.life * 255).toString(16).padStart(2, '0');
            ctx.fillStyle = p.color + alpha;
            ctx.fill();
        }
    }

    // ==================== ELECTRIC ANIMATION METHODS ====================
    
    createElectricParticle(x, y, color = '#4facfe') {
        const particle = {
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 4 + 2,
            color,
            life: 1,
            maxLife: 1,
            type: 'electric'
        };
        this.electricParticles.push(particle);
    }

    createLightningBolt(fromX, fromY, toX, toY, color = '#4facfe') {
        const bolt = {
            fromX, fromY, toX, toY,
            color,
            life: 1,
            segments: this.generateLightningSegments(fromX, fromY, toX, toY),
            branches: []
        };
        
        // Add random branches
        const numBranches = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numBranches; i++) {
            const t = Math.random() * 0.6 + 0.2;
            const branchStart = this.getLightningPoint(bolt.segments, t);
            const angle = Math.random() * Math.PI - Math.PI / 2;
            const length = Math.random() * 30 + 15;
            const endX = branchStart.x + Math.cos(angle) * length;
            const endY = branchStart.y + Math.sin(angle) * length;
            bolt.branches.push(this.generateLightningSegments(branchStart.x, branchStart.y, endX, endY, 3));
        }
        
        this.lightningBolts.push(bolt);
    }

    generateLightningSegments(fromX, fromY, toX, toY, detail = 6) {
        const segments = [{ x: fromX, y: fromY }];
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length;
        const perpY = dx / length;
        
        for (let i = 1; i < detail; i++) {
            const t = i / detail;
            const baseX = fromX + dx * t;
            const baseY = fromY + dy * t;
            const offset = (Math.random() - 0.5) * length * 0.15;
            segments.push({
                x: baseX + perpX * offset,
                y: baseY + perpY * offset
            });
        }
        
        segments.push({ x: toX, y: toY });
        return segments;
    }

    getLightningPoint(segments, t) {
        const index = Math.floor(t * (segments.length - 1));
        const localT = (t * (segments.length - 1)) - index;
        const p1 = segments[index];
        const p2 = segments[Math.min(index + 1, segments.length - 1)];
        return {
            x: p1.x + (p2.x - p1.x) * localT,
            y: p1.y + (p2.y - p1.y) * localT
        };
    }

    createShockwave(x, y, color = '#4facfe') {
        this.shockwaves.push({
            x, y, color,
            radius: 10,
            maxRadius: 80,
            life: 1
        });
    }

    updateElectricEffects() {
        // Update electric particles
        this.electricParticles = this.electricParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= 0.04;
            p.size *= 0.97;
            return p.life > 0;
        });

        // Update lightning bolts
        this.lightningBolts = this.lightningBolts.filter(bolt => {
            bolt.life -= 0.08;
            return bolt.life > 0;
        });

        // Update shockwaves
        this.shockwaves = this.shockwaves.filter(wave => {
            wave.radius += 4;
            wave.life -= 0.05;
            return wave.life > 0 && wave.radius < wave.maxRadius;
        });
    }

    drawElectricEffects() {
        const ctx = this.ctx;

        // Draw shockwaves
        this.shockwaves.forEach(wave => {
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = 3 * wave.life;
            ctx.globalAlpha = wave.life * 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        // Draw lightning bolts
        this.lightningBolts.forEach(bolt => {
            ctx.save();
            ctx.globalAlpha = bolt.life;
            
            // Main bolt
            this.drawLightningPath(ctx, bolt.segments, bolt.color, 4);
            
            // Glow effect
            ctx.shadowColor = bolt.color;
            ctx.shadowBlur = 20;
            this.drawLightningPath(ctx, bolt.segments, '#ffffff', 2);
            
            // Branches
            bolt.branches.forEach(branch => {
                this.drawLightningPath(ctx, branch, bolt.color, 2);
            });
            
            ctx.restore();
        });

        // Draw electric particles
        this.electricParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, p.color);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.globalAlpha = p.life;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    drawLightningPath(ctx, segments, color, width) {
        if (segments.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(segments[0].x, segments[0].y);
        
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x, segments[i].y);
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    // Enhanced node drawing with electric effect
    drawNodeWithElectric(id, node, isElectric = false, electricColor = '#4facfe') {
        const ctx = this.ctx;
        const color = this.nodeColors.get(id) || '#8B7355';
        const isHovered = this.hoveredNode === id;
        const isSelected = this.selectedNode === id;
        const radius = this.nodeRadius + (isHovered ? 4 : 0);

        // Shadow
        ctx.beginPath();
        ctx.arc(node.x + 4, node.y + 4, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Electric glow effect
        if (isElectric) {
            const time = Date.now() * 0.01;
            const glowIntensity = 0.5 + Math.sin(time) * 0.3;
            
            // Outer electric glow
            for (let i = 4; i >= 1; i--) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + i * 8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(79, 172, 254, ${glowIntensity * 0.1 / i})`;
                ctx.fill();
            }
            
            // Electric ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = electricColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = glowIntensity;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            
            // Spawn electric particles
            if (Math.random() > 0.7) {
                const angle = Math.random() * Math.PI * 2;
                const dist = radius + 10;
                this.createElectricParticle(
                    node.x + Math.cos(angle) * dist,
                    node.y + Math.sin(angle) * dist,
                    electricColor
                );
            }
        }

        // Hover/select glow
        if (isHovered || isSelected || isElectric) {
            const glowColor = isElectric ? electricColor : color;
            const gradient = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, radius + 20);
            gradient.addColorStop(0, glowColor + '80');
            gradient.addColorStop(1, glowColor + '00');
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 20, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Node gradient
        const nodeColor = isElectric ? electricColor : color;
        const nodeGradient = ctx.createRadialGradient(node.x - radius / 3, node.y - radius / 3, 0, node.x, node.y, radius);
        nodeGradient.addColorStop(0, this.lightenColor(nodeColor, 60));
        nodeGradient.addColorStop(0.5, nodeColor);
        nodeGradient.addColorStop(1, this.darkenColor(nodeColor, 40));

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeGradient;
        ctx.fill();

        // Border
        ctx.strokeStyle = isElectric ? '#ffffff' : this.darkenColor(nodeColor, 60);
        ctx.lineWidth = isElectric ? 3 : 2;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(node.x - radius / 3, node.y - radius / 3, radius / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = `bold ${isHovered ? 16 : 14}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText(node.label, node.x, node.y);
        ctx.shadowBlur = 0;
    }

    // Enhanced edge drawing with electric effect
    drawEdgeWithElectric(edge, isElectric = false, electricColor = '#4facfe') {
        const ctx = this.ctx;
        const geometry = this.getEdgeGeometry(edge);
        if (!geometry) return;

        const { angle, startX, startY, endX, endY } = geometry;

        const edgeKey = `${edge.from}-${edge.to}`;
        const baseColor = this.edgeColors.get(edgeKey) || '#A69076';
        const color = isElectric ? electricColor : baseColor;

        // Electric glow for edges
        if (isElectric) {
            ctx.save();
            ctx.shadowColor = electricColor;
            ctx.shadowBlur = 15;
            
            // Animated dash
            const time = Date.now() * 0.02;
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = -time;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = electricColor;
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Core line
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        } else {
            // Shadow
            ctx.beginPath();
            ctx.moveTo(startX + 2, startY + 2);
            ctx.lineTo(endX + 2, endY + 2);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Main line
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Arrow for directed graphs
        if (this.graph.directed) {
            const arrowLen = 12;
            const arrowAngle = Math.PI / 6;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - arrowLen * Math.cos(angle - arrowAngle), endY - arrowLen * Math.sin(angle - arrowAngle));
            ctx.lineTo(endX - arrowLen * Math.cos(angle + arrowAngle), endY - arrowLen * Math.sin(angle + arrowAngle));
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }

        if (this.shouldShowEdgeWeights()) {
            const label = this.getEdgeLabelText(edge);
            const labelBounds = this.getEdgeLabelBounds(edge, geometry);
            if (!labelBounds) return;

            ctx.save();
            ctx.font = '600 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            this.drawRoundedRect(ctx, labelBounds.x, labelBounds.y, labelBounds.width, labelBounds.height, 8);
            ctx.fillStyle = isElectric ? 'rgba(255, 255, 255, 0.96)' : 'rgba(250, 248, 245, 0.95)';
            ctx.fill();
            ctx.strokeStyle = isElectric ? electricColor : '#C4A35A';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = isElectric ? electricColor : '#5C5651';
            ctx.fillText(label, labelBounds.x + labelBounds.width / 2, labelBounds.y + labelBounds.height / 2 + 0.5);
            ctx.restore();
        }
    }

    // ==================== MODALS ====================
    showResultModal(content) {
        document.getElementById('resultModalContent').innerHTML = content;
        document.getElementById('resultModal').classList.add('show');
    }

    hideResultModal() {
        document.getElementById('resultModal').classList.remove('show');
    }

    showEdgeWeightModal(edge, callback) {
        const directionLabel = this.graph.directed ? `${edge.from} -> ${edge.to}` : `${edge.from} - ${edge.to}`;
        const currentWeight = this.formatWeight(this.graph.normalizeWeight(edge.weight));
        document.getElementById('nodeSelectTitle').textContent = 'Bobot Sisi';
        document.getElementById('nodeSelectBody').innerHTML = `
            <div class="node-select-group">
                <label>Masukkan bobot untuk sisi <strong>${directionLabel}</strong>:</label>
                <div class="edge-weight-panel">
                    <input id="edgeWeightInput" class="edge-weight-input" type="number" min="0" step="0.1" value="${currentWeight}">
                    <p class="edge-weight-hint">Gunakan bobot >= 0. Sisi yang sedang diedit adalah ${directionLabel}.</p>
                </div>
            </div>
        `;
        document.getElementById('nodeSelectModal').classList.add('show');

        const input = document.getElementById('edgeWeightInput');
        if (input) {
            setTimeout(() => {
                input.focus();
                input.select();
            }, 0);
        }

        const confirmWeight = () => {
            const weight = this.parseWeight(input ? input.value : 1);
            if (weight === null) {
                this.showToast('Bobot sisi harus berupa angka >= 0', 'warning');
                if (input) input.focus();
                return;
            }

            this.hideNodeSelectModal();
            callback(weight);
        };

        document.getElementById('confirmNodeSelect').onclick = confirmWeight;
        if (input) {
            input.onkeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmWeight();
                }
            };
        }
    }

    showNodeSelectModal(title, isTwoNode = false) {
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return false;
        }

        const nodes = Array.from(this.graph.nodes.keys()).sort((a, b) => a - b);
        let html = '';

        if (isTwoNode) {
            html = `
                <div class="node-select-group">
                    ${this.getModalLabel('start', 'Pilih Simpul Awal:')}
                    <div class="node-buttons" id="nodesA">
                        ${nodes.map(n => `<button class="node-btn" data-node="${n}"><span>${n}</span></button>`).join('')}
                    </div>
                </div>
                <div class="node-select-group">
                    ${this.getModalLabel('target', 'Pilih Simpul Tujuan:')}
                    <div class="node-buttons" id="nodesB">
                        ${nodes.map(n => `<button class="node-btn" data-node="${n}"><span>${n}</span></button>`).join('')}
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="node-select-group">
                    ${this.getModalLabel('target', 'Pilih Simpul:')}
                    <div class="node-buttons" id="nodesA">
                        ${nodes.map(n => `<button class="node-btn" data-node="${n}"><span>${n}</span></button>`).join('')}
                    </div>
                </div>
            `;
        }

        document.getElementById('nodeSelectTitle').textContent = title;
        document.getElementById('nodeSelectBody').innerHTML = html;
        document.getElementById('nodeSelectModal').classList.add('show');

        document.querySelectorAll('#nodesA .node-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('#nodesA .node-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            };
        });

        if (isTwoNode) {
            document.querySelectorAll('#nodesB .node-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('#nodesB .node-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });
        }

        return true;
    }

    hideNodeSelectModal() {
        document.getElementById('nodeSelectModal').classList.remove('show');
    }

    selectNodeAndRun(title, callback) {
        if (!this.showNodeSelectModal(title, false)) return;

        document.getElementById('confirmNodeSelect').onclick = () => {
            const selected = document.querySelector('#nodesA .node-btn.selected');
            if (selected) {
                this.hideNodeSelectModal();
                callback(parseInt(selected.dataset.node));
            } else {
                this.showToast('Pilih simpul!', 'warning');
            }
        };
    }

    selectTwoNodesAndRun(title, callback) {
        if (this.graph.nodes.size < 2) {
            this.showToast('Minimal 2 simpul!', 'error');
            return;
        }
        if (!this.showNodeSelectModal(title, true)) return;

        document.getElementById('confirmNodeSelect').onclick = () => {
            const selA = document.querySelector('#nodesA .node-btn.selected');
            const selB = document.querySelector('#nodesB .node-btn.selected');
            if (selA && selB) {
                const nodeA = parseInt(selA.dataset.node);
                const nodeB = parseInt(selB.dataset.node);
                if (nodeA === nodeB) {
                    this.showToast('Pilih simpul berbeda!', 'warning');
                    return;
                }
                this.hideNodeSelectModal();
                callback(nodeA, nodeB);
            } else {
                this.showToast('Pilih kedua simpul!', 'warning');
            }
        };
    }

    // ==================== ALGORITHM RUNNERS ====================
    async runDFS(startNode) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const order = [];
        const delay = () => new Promise(r => setTimeout(r, this.animationSpeed));
        const electricColor = '#667eea'; // DFS purple/blue

        // Start with shockwave
        const startNodeData = this.graph.nodes.get(startNode);
        if (startNodeData) {
            this.createShockwave(startNodeData.x, startNodeData.y, electricColor);
        }

        this.nodeColors.set(startNode, electricColor);
        this.electricNodes.add(startNode);
        
        // 3D highlight
        if (this.graph3DView && this.viewMode === '3d') {
            this.graph3DView.highlightNode(startNode, 0x667eea);
        }
        
        await delay();

        let prevNode = null;
        await this.algorithms.dfs(startNode, async (node) => {
            order.push(node);
            
            // Create lightning bolt from previous node
            if (prevNode !== null) {
                const fromNodeData = this.graph.nodes.get(prevNode);
                const toNodeData = this.graph.nodes.get(node);
                if (fromNodeData && toNodeData) {
                    this.createLightningBolt(fromNodeData.x, fromNodeData.y, toNodeData.x, toNodeData.y, electricColor);
                    this.electricEdges.add(`${prevNode}-${node}`);
                    
                    // 3D edge highlight
                    if (this.graph3DView && this.viewMode === '3d') {
                        this.graph3DView.highlightEdge(prevNode, node, 0x667eea);
                    }
                }
            }
            
            // Electric effect on current node
            this.nodeColors.set(node, electricColor);
            this.electricNodes.add(node);
            
            const nodeData = this.graph.nodes.get(node);
            if (nodeData) {
                // Create electric particles burst
                for (let i = 0; i < 8; i++) {
                    this.createElectricParticle(nodeData.x, nodeData.y, electricColor);
                }
                this.createShockwave(nodeData.x, nodeData.y, electricColor);
            }
            
            // 3D highlight
            if (this.graph3DView && this.viewMode === '3d') {
                this.graph3DView.highlightNode(node, 0x667eea);
            }
            
            prevNode = node;
            await delay();
        });

        // Clear electric effects
        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;
        const pathHtml = order.map(n => `<span class="path-node">${n}</span>`).join('<span class="path-arrow">-></span>');
        this.showResultModal(`
            ${this.getResultHeading('dfs', 'DFS Traversal')}
            <p>Pencarian dimulai dari simpul <strong>${startNode}</strong></p>
            <p>Total simpul dikunjungi: <strong>${order.length}</strong> simpul</p>
            <div class="path-display">${pathHtml}</div>
        `);
    }

    async runBFS(startNode) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const order = [];
        const delay = () => new Promise(r => setTimeout(r, this.animationSpeed));
        const electricColor = '#4facfe'; // BFS cyan

        // Start with shockwave
        const startNodeData = this.graph.nodes.get(startNode);
        if (startNodeData) {
            this.createShockwave(startNodeData.x, startNodeData.y, electricColor);
        }

        this.nodeColors.set(startNode, electricColor);
        this.electricNodes.add(startNode);
        
        if (this.graph3DView && this.viewMode === '3d') {
            this.graph3DView.highlightNode(startNode, 0x4facfe);
        }
        
        await delay();

        const visited = new Set([startNode]);
        const parent = new Map();
        
        await this.algorithms.bfs(startNode, async (node) => {
            order.push(node);
            
            // Create lightning from parent
            if (parent.has(node)) {
                const parentNode = parent.get(node);
                const fromNodeData = this.graph.nodes.get(parentNode);
                const toNodeData = this.graph.nodes.get(node);
                if (fromNodeData && toNodeData) {
                    this.createLightningBolt(fromNodeData.x, fromNodeData.y, toNodeData.x, toNodeData.y, electricColor);
                    this.electricEdges.add(`${parentNode}-${node}`);
                    
                    if (this.graph3DView && this.viewMode === '3d') {
                        this.graph3DView.highlightEdge(parentNode, node, 0x4facfe);
                    }
                }
            }
            
            // Electric effect on node
            this.nodeColors.set(node, electricColor);
            this.electricNodes.add(node);
            
            const nodeData = this.graph.nodes.get(node);
            if (nodeData) {
                for (let i = 0; i < 8; i++) {
                    this.createElectricParticle(nodeData.x, nodeData.y, electricColor);
                }
                this.createShockwave(nodeData.x, nodeData.y, electricColor);
            }
            
            if (this.graph3DView && this.viewMode === '3d') {
                this.graph3DView.highlightNode(node, 0x4facfe);
            }
            
            // Track parent for lightning
            const neighbors = this.graph.getNeighbors(node);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    parent.set(neighbor, node);
                }
            }
            
            await delay();
        });

        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;
        const pathHtml = order.map(n => `<span class="path-node">${n}</span>`).join('<span class="path-arrow">-></span>');
        this.showResultModal(`
            ${this.getResultHeading('bfs', 'BFS Traversal')}
            <p>Pencarian dimulai dari simpul <strong>${startNode}</strong></p>
            <p>Total simpul dikunjungi: <strong>${order.length}</strong> simpul</p>
            <div class="path-display">${pathHtml}</div>
        `);
    }

    async runDistance(startNode, endNode) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const delay = () => new Promise(r => setTimeout(r, this.animationSpeed));
        const searchColor = '#C4A35A';
        const pathColor = '#4facfe';

        // Mark start and end
        this.nodeColors.set(startNode, '#4A7C59');
        this.nodeColors.set(endNode, '#9E4A4A');
        this.electricNodes.add(startNode);
        this.electricNodes.add(endNode);
        
        const startData = this.graph.nodes.get(startNode);
        const endData = this.graph.nodes.get(endNode);
        if (startData) this.createShockwave(startData.x, startData.y, '#4A7C59');
        if (endData) this.createShockwave(endData.x, endData.y, '#9E4A4A');
        
        await delay();

        const result = await this.algorithms.distance(startNode, endNode, async (node) => {
            if (node !== startNode && node !== endNode) {
                this.nodeColors.set(node, searchColor);
                const nodeData = this.graph.nodes.get(node);
                if (nodeData) {
                    for (let i = 0; i < 4; i++) {
                        this.createElectricParticle(nodeData.x, nodeData.y, searchColor);
                    }
                }
            }
            await delay();
        });

        // Animate path with lightning
        if (result.distance !== -1) {
            for (let i = 0; i < result.path.length - 1; i++) {
                const from = result.path[i];
                const to = result.path[i + 1];
                
                const fromData = this.graph.nodes.get(from);
                const toData = this.graph.nodes.get(to);
                
                if (fromData && toData) {
                    this.createLightningBolt(fromData.x, fromData.y, toData.x, toData.y, pathColor);
                    this.electricEdges.add(`${from}-${to}`);
                }
                
                this.edgeColors.set(`${from}-${to}`, pathColor);
                this.edgeColors.set(`${to}-${from}`, pathColor);
                this.nodeColors.set(to, pathColor);
                this.electricNodes.add(to);
                
                if (this.graph3DView && this.viewMode === '3d') {
                    this.graph3DView.highlightEdge(from, to, 0x4facfe);
                    this.graph3DView.highlightNode(to, 0x4facfe);
                }
                
                await delay();
            }
            
            this.nodeColors.set(startNode, '#4A7C59');
            this.nodeColors.set(endNode, '#9E4A4A');
        }

        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;

        if (result.distance === -1) {
            this.showResultModal(`
                ${this.getResultHeading('x-circle', 'Tidak Ada Jalur')}
                <p>Simpul <strong>${startNode}</strong> dan <strong>${endNode}</strong> tidak terhubung.</p>
            `);
        } else {
            const pathHtml = result.path.map(n => `<span class="path-node">${n}</span>`).join('<span class="path-arrow">-></span>');
            this.showResultModal(`
                ${this.getResultHeading('route', 'Jalur Terpendek Ditemukan!')}
                <p>Dari simpul <strong>${startNode}</strong> ke simpul <strong>${endNode}</strong></p>
                <p>Jarak minimum: <strong>${result.distance}</strong> sisi</p>
                <div class="path-display">${pathHtml}</div>
            `);
        }
    }

    async runShortestPath(startNode, endNode) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const delay = () => new Promise(resolve => setTimeout(resolve, this.animationSpeed));
        const searchColor = '#C4A35A';
        const pathColor = '#43e97b';

        this.nodeColors.set(startNode, '#4A7C59');
        this.nodeColors.set(endNode, '#9E4A4A');
        this.electricNodes.add(startNode);
        this.electricNodes.add(endNode);

        const startData = this.graph.nodes.get(startNode);
        const endData = this.graph.nodes.get(endNode);
        if (startData) this.createShockwave(startData.x, startData.y, '#4A7C59');
        if (endData) this.createShockwave(endData.x, endData.y, '#9E4A4A');

        await delay();

        const result = await this.algorithms.shortestPathWeighted(startNode, endNode, async (node) => {
            if (node !== startNode && node !== endNode) {
                this.nodeColors.set(node, searchColor);
                const nodeData = this.graph.nodes.get(node);
                if (nodeData) {
                    for (let i = 0; i < 4; i++) {
                        this.createElectricParticle(nodeData.x, nodeData.y, searchColor);
                    }
                }
            }

            if (this.graph3DView && this.viewMode === '3d') {
                this.graph3DView.highlightNode(node, node === startNode ? 0x4A7C59 : (node === endNode ? 0x9E4A4A : 0xC4A35A));
            }

            await delay();
        });

        if (result.distance !== Infinity) {
            for (let i = 0; i < result.path.length - 1; i++) {
                const from = result.path[i];
                const to = result.path[i + 1];
                const fromDataNode = this.graph.nodes.get(from);
                const toDataNode = this.graph.nodes.get(to);

                if (fromDataNode && toDataNode) {
                    this.createLightningBolt(fromDataNode.x, fromDataNode.y, toDataNode.x, toDataNode.y, pathColor);
                    this.electricEdges.add(`${from}-${to}`);
                }

                this.edgeColors.set(`${from}-${to}`, pathColor);
                this.edgeColors.set(`${to}-${from}`, pathColor);
                this.nodeColors.set(to, pathColor);
                this.electricNodes.add(to);

                if (this.graph3DView && this.viewMode === '3d') {
                    this.graph3DView.highlightEdge(from, to, 0x43e97b);
                    this.graph3DView.highlightNode(to, 0x43e97b);
                }

                await delay();
            }

            this.nodeColors.set(startNode, '#4A7C59');
            this.nodeColors.set(endNode, '#9E4A4A');
        }

        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;

        if (result.distance === Infinity) {
            this.showResultModal(`
                <h3>Lintasan Terpendek Tidak Ditemukan</h3>
                <p>Tidak ada lintasan dari simpul <strong>${startNode}</strong> ke simpul <strong>${endNode}</strong>.</p>
            `);
            return;
        }

        const pathHtml = result.path.map(node => `<span class="path-node">${node}</span>`).join('<span class="path-arrow">-></span>');
        const edgeDetails = [];
        const edgeSymbol = this.graph.directed ? '->' : '-';
        for (let i = 0; i < result.path.length - 1; i++) {
            const from = result.path[i];
            const to = result.path[i + 1];
            edgeDetails.push(`<p><span class="color-dot" style="background:#43e97b"></span>${from} ${edgeSymbol} ${to} (bobot ${this.formatWeight(this.graph.getEdgeWeight(from, to))})</p>`);
        }

        this.showResultModal(`
            <h3>Lintasan Terpendek</h3>
            <p>Dari simpul <strong>${startNode}</strong> ke simpul <strong>${endNode}</strong></p>
            <p>Total bobot minimum: <strong>${this.formatWeight(result.distance)}</strong></p>
            <p>Jumlah sisi pada lintasan: <strong>${Math.max(0, result.path.length - 1)}</strong></p>
            <div class="path-display">${pathHtml}</div>
            <div class="component-list">${edgeDetails.join('')}</div>
        `);
    }

    runConnected() {
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }
        const isConnected = this.algorithms.isConnected();
        const count = this.algorithms.countComponents();

        if (isConnected) {
            for (const id of this.graph.nodes.keys()) {
                this.nodeColors.set(id, '#4A7C59');
                if (this.graph3DView) this.graph3DView.highlightNode(id, 0x4A7C59);
            }
            this.showResultModal(`
                ${this.getResultHeading('check-circle', 'Graf Terhubung!')}
                <p>Semua <strong>${this.graph.nodes.size}</strong> simpul saling terhubung.</p>
            `);
        } else {
            this.showResultModal(`
                ${this.getResultHeading('alert', 'Graf Tidak Terhubung')}
                <p>Graf memiliki <strong>${count}</strong> komponen terpisah.</p>
            `);
        }
    }

    runComponentSize(startNode) {
        this.resetVisualization();
        const result = this.algorithms.getComponentSize(startNode);

        for (const node of result.nodes) {
            this.nodeColors.set(node, '#6B8E6B');
            if (this.graph3DView) this.graph3DView.highlightNode(node, 0x6B8E6B);
        }
        this.nodeColors.set(startNode, '#4A7C59');
        if (this.graph3DView) this.graph3DView.highlightNode(startNode, 0x4A7C59);

        this.showResultModal(`
            ${this.getResultHeading('ruler', 'Ukuran Komponen')}
            <p>Komponen dengan simpul <strong>${startNode}</strong></p>
            <p>Ukuran: <strong>${result.size}</strong> simpul</p>
            <p>Anggota: <strong>${result.nodes.sort((a, b) => a - b).join(', ')}</strong></p>
        `);
    }

    runCountComponents() {
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }
        const components = this.algorithms.getAllComponents();
        const colors = ['#667eea', '#f093fb', '#43e97b', '#f5576c', '#4facfe', '#fda085'];
        const colors3D = [0x667eea, 0xf093fb, 0x43e97b, 0xf5576c, 0x4facfe, 0xfda085];

        components.forEach((comp, i) => {
            const color = colors[i % colors.length];
            const color3D = colors3D[i % colors3D.length];
            for (const node of comp) {
                this.nodeColors.set(node, color);
                if (this.graph3DView) this.graph3DView.highlightNode(node, color3D);
            }
        });

        const details = components.map((comp, i) =>
            `<p><span class="color-dot" style="background:${colors[i % colors.length]}"></span>Komponen ${i + 1}: ${comp.sort((a, b) => a - b).join(', ')}</p>`
        ).join('');

        this.showResultModal(`
            ${this.getResultHeading('nodes', 'Analisis Komponen')}
            <p>Total komponen: <strong>${components.length}</strong></p>
            <div class="component-list">${details}</div>
        `);
    }

    runLargestComponent() {
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }
        const result = this.algorithms.getLargestComponent();

        for (const node of result.nodes) {
            this.nodeColors.set(node, '#4A7C59');
            if (this.graph3DView) this.graph3DView.highlightNode(node, 0x4A7C59);
        }

        this.showResultModal(`
            ${this.getResultHeading('star', 'Komponen Terbesar')}
            <p>Ukuran: <strong>${result.size}</strong> simpul</p>
            <p>Anggota: <strong>${result.nodes.join(', ')}</strong></p>
        `);
    }

    // ==================== TUGAS 3: NEW ALGORITHM RUNNERS ====================

    async runBipartite() {
        if (this.isAnimating) return;
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }
        
        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const delay = () => new Promise(r => setTimeout(r, this.animationSpeed));
        const colorA = '#667eea'; // Purple-blue for set A
        const colorB = '#f093fb'; // Pink for set B

        const result = await this.algorithms.isBipartite(async (node, colorIdx) => {
            const c = colorIdx === 0 ? colorA : colorB;
            this.nodeColors.set(node, c);
            this.electricNodes.add(node);
            
            const nodeData = this.graph.nodes.get(node);
            if (nodeData) {
                for (let i = 0; i < 5; i++) {
                    this.createElectricParticle(nodeData.x, nodeData.y, c);
                }
                this.createShockwave(nodeData.x, nodeData.y, c);
            }
            
            if (this.graph3DView && this.viewMode === '3d') {
                this.graph3DView.highlightNode(node, colorIdx === 0 ? 0x667eea : 0xf093fb);
            }
            
            await delay();
        });

        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;

        if (result.isBipartite) {
            // Keep colors to show bipartition
            for (const node of result.setA) {
                this.nodeColors.set(node, colorA);
            }
            for (const node of result.setB) {
                this.nodeColors.set(node, colorB);
            }

            const setAHtml = result.setA.sort((a, b) => a - b).map(n => `<span class="path-node" style="background:linear-gradient(135deg, #667eea, #764ba2)">${n}</span>`).join(' ');
            const setBHtml = result.setB.sort((a, b) => a - b).map(n => `<span class="path-node" style="background:linear-gradient(135deg, #f093fb, #f5576c)">${n}</span>`).join(' ');

            this.showResultModal(`
                ${this.getResultHeading('bipartite', 'Graf adalah Bipartite!')}
                <p>Graf ini <strong>bipartite</strong> — dapat dibagi menjadi 2 himpunan tanpa sisi dalam satu himpunan.</p>
                <div style="margin-top:16px">
                    <p><strong>Himpunan A</strong> <span class="color-dot" style="background:#667eea;display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-left:6px"></span> (${result.setA.length} simpul):</p>
                    <div class="path-display">${setAHtml}</div>
                </div>
                <div style="margin-top:16px">
                    <p><strong>Himpunan B</strong> <span class="color-dot" style="background:#f093fb;display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-left:6px"></span> (${result.setB.length} simpul):</p>
                    <div class="path-display">${setBHtml}</div>
                </div>
            `);
        } else {
            // Highlight all nodes red
            for (const id of this.graph.nodes.keys()) {
                this.nodeColors.set(id, '#f5576c');
            }

            this.showResultModal(`
                ${this.getResultHeading('x-circle', 'Graf Bukan Bipartite')}
                <p>Graf ini <strong>tidak bipartite</strong> — terdapat siklus ganjil sehingga tidak dapat dibagi menjadi 2 himpunan.</p>
                ${this.getResultNote('Sebuah graf adalah bipartite jika dan hanya jika tidak memiliki siklus dengan panjang ganjil.')}
            `);
        }
    }

    async runDiameter() {
        if (this.isAnimating) return;
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }

        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const delay = () => new Promise(r => setTimeout(r, this.animationSpeed / 3));
        const searchColor = '#C4A35A';
        const pathColor = '#4facfe';

        // Show progress as we compute from each node
        let processed = 0;
        const total = this.graph.nodes.size;

        const result = await this.algorithms.getDiameter(async (node, currentMax) => {
            processed++;
            this.nodeColors.set(node, searchColor);
            
            const nodeData = this.graph.nodes.get(node);
            if (nodeData) {
                for (let i = 0; i < 3; i++) {
                    this.createElectricParticle(nodeData.x, nodeData.y, searchColor);
                }
            }
            
            await delay();
            
            // Reset color after processing
            setTimeout(() => {
                if (!this.electricNodes.has(node)) {
                    this.nodeColors.delete(node);
                }
            }, 200);
        });

        if (result.disconnected) {
            this.isAnimating = false;
            this.showResultModal(`
                ${this.getResultHeading('alert', 'Graf Tidak Terhubung')}
                <p>Diameter tidak terdefinisi karena graf <strong>tidak terhubung</strong>.</p>
                <p>Diameter = <strong>∞ (tak hingga)</strong></p>
                ${this.getResultNote('Diameter hanya terdefinisi pada graf terhubung. Hubungkan semua komponen terlebih dahulu.')}
            `);
            return;
        }

        // Animate the diameter path with lightning
        this.resetVisualization();
        
        if (result.path.length > 0) {
            this.nodeColors.set(result.from, '#4A7C59');
            this.nodeColors.set(result.to, '#9E4A4A');
            this.electricNodes.add(result.from);
            this.electricNodes.add(result.to);

            const startData = this.graph.nodes.get(result.from);
            const endData = this.graph.nodes.get(result.to);
            if (startData) this.createShockwave(startData.x, startData.y, '#4A7C59');
            if (endData) this.createShockwave(endData.x, endData.y, '#9E4A4A');

            await new Promise(r => setTimeout(r, this.animationSpeed));

            for (let i = 0; i < result.path.length - 1; i++) {
                const from = result.path[i];
                const to = result.path[i + 1];
                
                const fromData = this.graph.nodes.get(from);
                const toData = this.graph.nodes.get(to);
                
                if (fromData && toData) {
                    this.createLightningBolt(fromData.x, fromData.y, toData.x, toData.y, pathColor);
                    this.electricEdges.add(`${from}-${to}`);
                }
                
                this.edgeColors.set(`${from}-${to}`, pathColor);
                this.edgeColors.set(`${to}-${from}`, pathColor);
                if (to !== result.from && to !== result.to) {
                    this.nodeColors.set(to, pathColor);
                }
                this.electricNodes.add(to);
                
                if (this.graph3DView && this.viewMode === '3d') {
                    this.graph3DView.highlightEdge(from, to, 0x4facfe);
                    this.graph3DView.highlightNode(to, 0x4facfe);
                }
                
                await new Promise(r => setTimeout(r, this.animationSpeed));
            }

            this.nodeColors.set(result.from, '#4A7C59');
            this.nodeColors.set(result.to, '#9E4A4A');
        }

        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;

        const pathHtml = result.path.map((n, i) => {
            let style = '';
            if (i === 0) style = 'background:linear-gradient(135deg, #4A7C59, #3a6b48)';
            else if (i === result.path.length - 1) style = 'background:linear-gradient(135deg, #9E4A4A, #8a3d3d)';
            return `<span class="path-node" ${style ? `style="${style}"` : ''}>${n}</span>`;
        }).join('<span class="path-arrow">→</span>');

        this.showResultModal(`
            ${this.getResultHeading('diameter', 'Diameter Graf')}
            <p>Diameter: <strong>${result.diameter}</strong> sisi</p>
            <p>Jalur terpanjang dari simpul <strong>${result.from}</strong> ke simpul <strong>${result.to}</strong></p>
            <div class="path-display">${pathHtml}</div>
            ${this.getResultNote('Diameter adalah jarak terpanjang di antara semua pasangan simpul terpendek dalam graf.')}
        `);
    }

    async runDetectCycle() {
        if (this.isAnimating) return;
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }

        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const delay = () => new Promise(r => setTimeout(r, this.animationSpeed));
        const searchColor = '#C4A35A';
        const cycleColor = '#f5576c';

        const result = await this.algorithms.detectCycle(async (node, state) => {
            this.nodeColors.set(node, searchColor);
            
            const nodeData = this.graph.nodes.get(node);
            if (nodeData) {
                for (let i = 0; i < 4; i++) {
                    this.createElectricParticle(nodeData.x, nodeData.y, searchColor);
                }
            }
            
            await delay();
        });

        this.resetVisualization();

        if (result.hasCycle && result.cycle.length > 0) {
            // Animate the cycle with lightning
            for (let i = 0; i < result.cycle.length; i++) {
                const node = result.cycle[i];
                this.nodeColors.set(node, cycleColor);
                this.electricNodes.add(node);

                const nodeData = this.graph.nodes.get(node);
                if (nodeData) {
                    this.createShockwave(nodeData.x, nodeData.y, cycleColor);
                    for (let j = 0; j < 6; j++) {
                        this.createElectricParticle(nodeData.x, nodeData.y, cycleColor);
                    }
                }

                if (i < result.cycle.length - 1) {
                    const from = result.cycle[i];
                    const to = result.cycle[i + 1];
                    const fromData = this.graph.nodes.get(from);
                    const toData = this.graph.nodes.get(to);
                    
                    if (fromData && toData) {
                        this.createLightningBolt(fromData.x, fromData.y, toData.x, toData.y, cycleColor);
                        this.electricEdges.add(`${from}-${to}`);
                    }
                    
                    this.edgeColors.set(`${from}-${to}`, cycleColor);
                    this.edgeColors.set(`${to}-${from}`, cycleColor);
                    
                    if (this.graph3DView && this.viewMode === '3d') {
                        this.graph3DView.highlightEdge(from, to, 0xf5576c);
                        this.graph3DView.highlightNode(node, 0xf5576c);
                    }
                }

                await delay();
            }

            setTimeout(() => {
                this.electricNodes.clear();
                this.electricEdges.clear();
            }, 500);

            this.isAnimating = false;

            // Remove duplicate closing node for display
            const displayCycle = result.cycle.slice(0, -1);
            const cycleHtml = result.cycle.map(n => `<span class="path-node" style="background:linear-gradient(135deg, #f5576c, #f093fb)">${n}</span>`).join('<span class="path-arrow">→</span>');

            this.showResultModal(`
                ${this.getResultHeading('cycle', 'Siklus Ditemukan!')}
                <p>Graf memiliki <strong>siklus</strong> dengan panjang <strong>${displayCycle.length}</strong> sisi.</p>
                <div class="path-display">${cycleHtml}</div>
                ${this.getResultNote('Siklus adalah jalur tertutup yang dimulai dan berakhir di simpul yang sama tanpa mengulang sisi.')}
            `);
        } else {
            // No cycle - color all green
            for (const id of this.graph.nodes.keys()) {
                this.nodeColors.set(id, '#4A7C59');
            }

            this.isAnimating = false;

            this.showResultModal(`
                ${this.getResultHeading('check-circle', 'Tidak Ada Siklus')}
                <p>Graf ini <strong>tidak memiliki siklus</strong> (merupakan hutan/pohon).</p>
                <p>Simpul: <strong>${this.graph.nodes.size}</strong> | Sisi: <strong>${this.graph.edges.length}</strong></p>
                ${this.getResultNote('Graf tanpa siklus disebut hutan. Jika terhubung, disebut pohon.')}
            `);
        }
    }

    async runGirth() {
        if (this.isAnimating) return;
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }
        if (this.graph.edges.length === 0) {
            this.showToast('Tidak ada sisi!', 'error');
            return;
        }

        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const delay = () => new Promise(r => setTimeout(r, this.animationSpeed / 3));
        const searchColor = '#C4A35A';
        const girthColor = '#43e97b';

        let processed = 0;
        const result = await this.algorithms.getGirth(async (node, currentGirth) => {
            processed++;
            this.nodeColors.set(node, searchColor);
            
            const nodeData = this.graph.nodes.get(node);
            if (nodeData) {
                for (let i = 0; i < 3; i++) {
                    this.createElectricParticle(nodeData.x, nodeData.y, searchColor);
                }
            }
            
            await delay();
            
            setTimeout(() => {
                if (!this.electricNodes.has(node)) {
                    this.nodeColors.delete(node);
                }
            }, 200);
        });

        this.resetVisualization();

        if (result.girth === Infinity) {
            for (const id of this.graph.nodes.keys()) {
                this.nodeColors.set(id, '#4A7C59');
            }

            this.isAnimating = false;

            this.showResultModal(`
                ${this.getResultHeading('ring', 'Girth Tidak Terdefinisi')}
                <p>Graf ini <strong>tidak memiliki siklus</strong>, sehingga girth = <strong>∞ (tak hingga)</strong>.</p>
                ${this.getResultNote('Girth adalah panjang siklus terpendek. Jika tidak ada siklus, girth tidak terdefinisi.')}
            `);
        } else {
            // Animate the girth cycle
            for (let i = 0; i < result.cycle.length; i++) {
                const node = result.cycle[i];
                this.nodeColors.set(node, girthColor);
                this.electricNodes.add(node);

                const nodeData = this.graph.nodes.get(node);
                if (nodeData) {
                    this.createShockwave(nodeData.x, nodeData.y, girthColor);
                    for (let j = 0; j < 6; j++) {
                        this.createElectricParticle(nodeData.x, nodeData.y, girthColor);
                    }
                }

                if (i < result.cycle.length - 1) {
                    const from = result.cycle[i];
                    const to = result.cycle[i + 1];
                    const fromData = this.graph.nodes.get(from);
                    const toData = this.graph.nodes.get(to);
                    
                    if (fromData && toData) {
                        this.createLightningBolt(fromData.x, fromData.y, toData.x, toData.y, girthColor);
                        this.electricEdges.add(`${from}-${to}`);
                    }
                    
                    this.edgeColors.set(`${from}-${to}`, girthColor);
                    this.edgeColors.set(`${to}-${from}`, girthColor);
                    
                    if (this.graph3DView && this.viewMode === '3d') {
                        this.graph3DView.highlightEdge(from, to, 0x43e97b);
                        this.graph3DView.highlightNode(node, 0x43e97b);
                    }
                }

                await new Promise(r => setTimeout(r, this.animationSpeed));
            }

            setTimeout(() => {
                this.electricNodes.clear();
                this.electricEdges.clear();
            }, 500);

            this.isAnimating = false;

            const displayCycle = result.cycle.slice(0, -1);
            const cycleHtml = result.cycle.map(n => `<span class="path-node" style="background:linear-gradient(135deg, #43e97b, #38f9d7)">${n}</span>`).join('<span class="path-arrow">→</span>');

            this.showResultModal(`
                ${this.getResultHeading('ring', 'Girth (Sabuk) Graf')}
                <p>Girth: <strong>${result.girth}</strong> sisi</p>
                <p>Siklus terpendek yang ditemukan:</p>
                <div class="path-display">${cycleHtml}</div>
                ${this.getResultNote(`Girth adalah panjang siklus terpendek dalam graf. Siklus di atas memiliki ${displayCycle.length} simpul dan ${result.girth} sisi.`)}
            `);
        }
    }

    async runMinimumSpanningTree() {
        if (this.isAnimating) return;
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }
        if (this.graph.directed) {
            this.showResultModal(`
                <h3>Pohon Pembangun Minimal Tidak Tersedia</h3>
                <p>Fitur ini hanya berlaku untuk <strong>graf undirected</strong>.</p>
                <p>Ubah tipe graf ke undirected untuk menghitung pohon pembangun minimal.</p>
            `);
            return;
        }

        this.isAnimating = true;
        this.resetVisualization();
        this.electricNodes.clear();
        this.electricEdges.clear();

        const result = this.algorithms.getMinimumSpanningTree();
        const mstColor = '#43e97b';
        const delay = () => new Promise(resolve => setTimeout(resolve, this.animationSpeed));

        for (const edge of result.edges) {
            const fromNode = this.graph.nodes.get(edge.from);
            const toNode = this.graph.nodes.get(edge.to);

            this.edgeColors.set(`${edge.from}-${edge.to}`, mstColor);
            this.edgeColors.set(`${edge.to}-${edge.from}`, mstColor);
            this.nodeColors.set(edge.from, mstColor);
            this.nodeColors.set(edge.to, mstColor);
            this.electricEdges.add(`${edge.from}-${edge.to}`);
            this.electricNodes.add(edge.from);
            this.electricNodes.add(edge.to);

            if (fromNode && toNode) {
                this.createLightningBolt(fromNode.x, fromNode.y, toNode.x, toNode.y, mstColor);
                this.createShockwave(fromNode.x, fromNode.y, mstColor);
                this.createShockwave(toNode.x, toNode.y, mstColor);
            }

            if (this.graph3DView && this.viewMode === '3d') {
                this.graph3DView.highlightEdge(edge.from, edge.to, 0x43e97b);
                this.graph3DView.highlightNode(edge.from, 0x43e97b);
                this.graph3DView.highlightNode(edge.to, 0x43e97b);
            }

            await delay();
        }

        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;

        const edgeDetails = result.edges.map(edge =>
            `<p><span class="color-dot" style="background:#43e97b"></span>${edge.from} - ${edge.to} (bobot ${this.formatWeight(edge.weight)})</p>`
        ).join('');

        if (result.disconnected) {
            this.showResultModal(`
                <h3>Graf Tidak Terhubung</h3>
                <p>Graf ini tidak memiliki satu <strong>pohon pembangun minimal</strong> karena terdiri dari <strong>${result.componentCount}</strong> komponen.</p>
                <p>Yang ditampilkan adalah <strong>minimum spanning forest</strong> dengan total bobot <strong>${this.formatWeight(result.totalWeight)}</strong>.</p>
                <div class="component-list">${edgeDetails || '<p>Tidak ada sisi yang dapat dipilih.</p>'}</div>
            `);
            return;
        }

        this.showResultModal(`
            <h3>Pohon Pembangun Minimal</h3>
            <p>Total bobot minimum: <strong>${this.formatWeight(result.totalWeight)}</strong></p>
            <p>Jumlah sisi terpilih: <strong>${result.edges.length}</strong></p>
            <div class="component-list">${edgeDetails || '<p>Graf hanya memiliki satu simpul, sehingga MST tidak memerlukan sisi.</p>'}</div>
        `);
    }

    async runTSP(startNode) {
        if (this.isAnimating) return;
        if (this.graph.nodes.size === 0) {
            this.showToast('Tidak ada simpul!', 'error');
            return;
        }

        this.resetVisualization();
        this.isAnimating = true;
        this.electricNodes.clear();
        this.electricEdges.clear();

        const result = this.algorithms.solveTSPBruteForce(startNode);
        const delay = () => new Promise(resolve => setTimeout(resolve, this.animationSpeed));
        const routeColor = '#fda085';
        const startColor = '#4A7C59';
        const iterationCount = Number(result.iterations ?? 0).toLocaleString('id-ID');

        if (!result.hasTour) {
            this.isAnimating = false;

            let description = 'Tur TSP tidak dapat dibentuk dari graf saat ini.';
            if (result.reason === 'too-many-nodes') {
                description = `Mode brute force dibatasi sampai <strong>${result.maxNodes}</strong> simpul agar aplikasi tidak membeku.`;
            } else if (result.reason === 'no-hamiltonian-cycle') {
                description = `Tidak ditemukan <strong>Hamiltonian cycle</strong> yang berawal di simpul <strong>${result.startNode}</strong>, mengunjungi setiap simpul tepat satu kali, lalu kembali ke titik awal.`;
            }

            this.showResultModal(`
                <h3>Travelling Salesman Problem (TSP)</h3>
                <p>${description}</p>
                <p>Jumlah iterasi pencarian: <strong>${iterationCount}</strong></p>
                ${this.getResultNote('Versi ini memakai brute force exact pada sisi asli graf. Satu iterasi dihitung setiap kali satu state rekursif diperiksa.')}
            `);
            return;
        }

        this.nodeColors.set(startNode, startColor);
        this.electricNodes.add(startNode);

        const startData = this.graph.nodes.get(startNode);
        if (startData) {
            this.createShockwave(startData.x, startData.y, startColor);
            for (let i = 0; i < 6; i++) {
                this.createElectricParticle(startData.x, startData.y, startColor);
            }
        }

        if (this.graph3DView && this.viewMode === '3d') {
            this.graph3DView.highlightNode(startNode, 0x4A7C59);
        }

        if (result.visitOrder.length === 1) {
            this.electricNodes.clear();
            this.electricEdges.clear();
            this.isAnimating = false;
            this.showResultModal(`
                <h3>Travelling Salesman Problem (TSP)</h3>
                <p>Graf hanya memiliki satu simpul, jadi tur dimulai dan berakhir di simpul <strong>${startNode}</strong>.</p>
                <p>Total bobot tur: <strong>0</strong></p>
                <p>Jumlah iterasi pencarian: <strong>${iterationCount}</strong></p>
                <div class="path-display"><span class="path-node" style="background:linear-gradient(135deg, #4A7C59, #3a6b48)">${startNode}</span><span class="path-arrow">→</span><span class="path-node" style="background:linear-gradient(135deg, #4A7C59, #3a6b48)">${startNode}</span></div>
            `);
            return;
        }

        await delay();

        for (let segmentIndex = 0; segmentIndex < result.segments.length; segmentIndex++) {
            const segment = result.segments[segmentIndex];
            const isClosingSegment = segmentIndex === result.segments.length - 1;

            for (let i = 0; i < segment.path.length - 1; i++) {
                const from = segment.path[i];
                const to = segment.path[i + 1];
                const fromData = this.graph.nodes.get(from);
                const toData = this.graph.nodes.get(to);
                const currentNodeColor = to === startNode && isClosingSegment ? startColor : routeColor;

                this.edgeColors.set(`${from}-${to}`, routeColor);
                if (!this.graph.directed) {
                    this.edgeColors.set(`${to}-${from}`, routeColor);
                }
                this.electricEdges.add(`${from}-${to}`);

                this.nodeColors.set(to, currentNodeColor);
                this.electricNodes.add(to);

                if (fromData && toData) {
                    this.createLightningBolt(fromData.x, fromData.y, toData.x, toData.y, routeColor);
                }
                if (toData) {
                    this.createShockwave(toData.x, toData.y, currentNodeColor);
                    for (let j = 0; j < 5; j++) {
                        this.createElectricParticle(toData.x, toData.y, currentNodeColor);
                    }
                }

                if (this.graph3DView && this.viewMode === '3d') {
                    this.graph3DView.highlightEdge(from, to, 0xfda085);
                    this.graph3DView.highlightNode(to, to === startNode && isClosingSegment ? 0x4A7C59 : 0xfda085);
                }

                await delay();
            }
        }

        this.nodeColors.set(startNode, startColor);
        if (this.graph3DView && this.viewMode === '3d') {
            this.graph3DView.highlightNode(startNode, 0x4A7C59);
        }

        setTimeout(() => {
            this.electricNodes.clear();
            this.electricEdges.clear();
        }, 500);

        this.isAnimating = false;

        const cycleHtml = result.cycle.map((node, index) => {
            const isStartMarker = index === 0 || index === result.cycle.length - 1;
            const style = isStartMarker
                ? 'background:linear-gradient(135deg, #4A7C59, #3a6b48)'
                : 'background:linear-gradient(135deg, #fda085, #f6a55b)';
            return `<span class="path-node" style="${style}">${node}</span>`;
        }).join('<span class="path-arrow">→</span>');

        const segmentDetails = result.segments.map((segment, index) => {
            const dotColor = index === result.segments.length - 1 ? '#4A7C59' : routeColor;
            return `<p><span class="color-dot" style="background:${dotColor}"></span>${segment.from} → ${segment.to} (biaya ${this.formatWeight(segment.distance)})</p>`;
        }).join('');

        this.showResultModal(`
            <h3>Travelling Salesman Problem (TSP)</h3>
            <p>Titik awal: <strong>${startNode}</strong></p>
            <p>Total bobot tur: <strong>${this.formatWeight(result.totalWeight)}</strong></p>
            <p>Simpul unik yang dikunjungi: <strong>${result.visitOrder.length}</strong></p>
            <p>Jumlah iterasi pencarian: <strong>${iterationCount}</strong></p>
            <div class="path-display">${cycleHtml}</div>
            <div class="component-list">${segmentDetails}</div>
            ${this.getResultNote('Tur di atas adalah solusi exact terbaik yang ditemukan dengan brute force. Satu iterasi dihitung setiap kali satu state rekursif diperiksa.')}
        `);
    }

    // ==================== TXT IMPORT/EXPORT ====================

    exportTXT() {
        if (this.graph.nodes.size === 0) {
            this.showToast('Graf kosong!', 'warning');
            return;
        }

        const lines = [];

        // Line 1: directed or undirected
        lines.push(this.graph.directed ? 'directed' : 'undirected');

        // Line 2: number of nodes
        const nodes = Array.from(this.graph.nodes.entries());
        lines.push(nodes.length.toString());

        // Next lines: node data (id x y)
        for (const [id, node] of nodes) {
            lines.push(`${id} ${Math.round(node.x)} ${Math.round(node.y)}`);
        }

        // Next line: number of edges
        lines.push(this.graph.edges.length.toString());

        const hasCustomWeights = this.shouldShowEdgeWeights();

        // Next lines: edge data (from to)
        for (const edge of this.graph.edges) {
            const weight = this.formatWeight(this.graph.normalizeWeight(edge.weight));
            lines.push(hasCustomWeights ? `${edge.from} ${edge.to} ${weight}` : `${edge.from} ${edge.to}`);
        }

        const text = lines.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graph-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Graf diekspor ke TXT!', 'success');
    }

    importTXT(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result.trim();
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

                let cursor = 0;

                // Line 1: directed/undirected (optional — if not present, assume undirected)
                let directed = false;
                if (lines[cursor] === 'directed' || lines[cursor] === 'undirected') {
                    directed = lines[cursor] === 'directed';
                    cursor++;
                }

                // Number of nodes
                const numNodes = parseInt(lines[cursor]);
                if (isNaN(numNodes) || numNodes < 0) throw new Error('Jumlah node tidak valid');
                cursor++;

                // Clear current graph
                this.graph.clear();
                this.graph.setDirected(directed);
                this.resetVisualization();

                // Update UI toggle
                document.getElementById('undirectedBtn').classList.toggle('active', !directed);
                document.getElementById('directedBtn').classList.toggle('active', directed);

                // Read nodes
                const nodeIdMap = new Map(); // old id -> new id
                const canvasW = this.canvas.width;
                const canvasH = this.canvas.height;

                for (let i = 0; i < numNodes; i++) {
                    if (cursor >= lines.length) throw new Error(`Data node kurang, baru ${i} dari ${numNodes}`);

                    const parts = lines[cursor].split(/\s+/);
                    cursor++;

                    if (parts.length >= 3) {
                        // Format: id x y
                        const oldId = parseInt(parts[0]);
                        let x = parseFloat(parts[1]);
                        let y = parseFloat(parts[2]);

                        // Clamp to canvas
                        x = Math.max(40, Math.min(canvasW - 40, x));
                        y = Math.max(40, Math.min(canvasH - 40, y));

                        const newId = this.graph.addNode(x, y);
                        nodeIdMap.set(oldId, newId);
                    } else if (parts.length >= 1) {
                        // Format: id only — auto position
                        const oldId = parseInt(parts[0]);
                        const angle = (i / numNodes) * Math.PI * 2;
                        const radius = Math.min(canvasW, canvasH) * 0.3;
                        const x = canvasW / 2 + Math.cos(angle) * radius;
                        const y = canvasH / 2 + Math.sin(angle) * radius;

                        const newId = this.graph.addNode(x, y);
                        nodeIdMap.set(oldId, newId);
                    }
                }

                // Number of edges
                if (cursor >= lines.length) throw new Error('Data jumlah sisi tidak ditemukan');
                const numEdges = parseInt(lines[cursor]);
                if (isNaN(numEdges) || numEdges < 0) throw new Error('Jumlah sisi tidak valid');
                cursor++;

                // Read edges
                let edgesAdded = 0;
                for (let i = 0; i < numEdges; i++) {
                    if (cursor >= lines.length) throw new Error(`Data sisi kurang, baru ${i} dari ${numEdges}`);

                    const parts = lines[cursor].split(/\s+/);
                    cursor++;

                    if (parts.length >= 2) {
                        const fromOld = parseInt(parts[0]);
                        const toOld = parseInt(parts[1]);
                        const weight = parts.length >= 3 ? this.parseWeight(parts[2]) : 1;
                        if (weight === null) throw new Error(`Bobot sisi tidak valid pada baris: ${lines[cursor - 1]}`);
                        const fromNew = nodeIdMap.get(fromOld);
                        const toNew = nodeIdMap.get(toOld);

                        if (fromNew !== undefined && toNew !== undefined) {
                            if (this.graph.addEdge(fromNew, toNew, weight)) {
                                edgesAdded++;
                            }
                        }
                    }
                }

                this.updateStats();
                this.update3DView();
                this.showToast(`Import berhasil! ${numNodes} simpul, ${edgesAdded} sisi`, 'success');
            } catch (err) {
                this.showToast(`Gagal import: ${err.message}`, 'error');
                console.error('Import TXT error:', err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ...existing code...
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.graphVisualizer = new GraphVisualizer();
});
