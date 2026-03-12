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
    }

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onMouseDown(e) {
        if (this.isAnimating || this.viewMode === '3d') return;
        const pos = this.getPos(e);
        const nodeId = this.graph.getNodeAtPosition(pos.x, pos.y, this.nodeRadius);

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
                    const edge = this.graph.getEdgeAtPosition(pos.x, pos.y);
                    if (edge) {
                        this.graph.removeEdge(edge.from, edge.to);
                        this.showToast(`Sisi dihapus!`, 'error');
                        this.updateStats();
                        this.update3DView();
                    }
                }
                break;
        }
    }

    onMouseMove(e) {
        if (this.viewMode === '3d') return;
        const pos = this.getPos(e);
        this.hoveredNode = this.graph.getNodeAtPosition(pos.x, pos.y, this.nodeRadius);

        if (this.draggingNode !== null) {
            this.graph.moveNode(this.draggingNode, pos.x, pos.y);
        } else if (this.edgeStartNode !== null) {
            this.tempEdgeEnd = pos;
        }

        if (this.currentTool === 'move') {
            this.canvas.style.cursor = this.hoveredNode ? 'grab' : 'default';
        } else if (this.currentTool === 'delete') {
            this.canvas.style.cursor = this.hoveredNode || this.graph.getEdgeAtPosition(pos.x, pos.y) ? 'pointer' : 'default';
        } else {
            this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'crosshair';
        }
    }

    onMouseUp(e) {
        if (this.viewMode === '3d') return;
        const pos = this.getPos(e);

        if (this.edgeStartNode !== null) {
            const endNodeId = this.graph.getNodeAtPosition(pos.x, pos.y, this.nodeRadius);
            if (endNodeId && endNodeId !== this.edgeStartNode && !this.graph.hasEdge(this.edgeStartNode, endNodeId)) {
                this.graph.addEdge(this.edgeStartNode, endNodeId);
                this.showToast(`Sisi ${this.edgeStartNode}-${endNodeId} ditambahkan!`, 'success');
                this.updateStats();
                this.update3DView();
            }
            this.edgeStartNode = null;
            this.tempEdgeEnd = null;
            this.selectedNode = null;
        }

        if (this.draggingNode !== null) {
            this.draggingNode = null;
            this.canvas.style.cursor = 'grab';
            this.update3DView();
        }
    }

    onMouseLeave() {
        this.edgeStartNode = null;
        this.tempEdgeEnd = null;
        this.draggingNode = null;
        this.hoveredNode = null;
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

        // Tool buttons
        const tools = ['addNodeTool', 'addEdgeTool', 'moveTool', 'deleteTool'];
        const toolModes = ['addNode', 'addEdge', 'move', 'delete'];
        const toolNames = ['Tambah Simpul', 'Tambah Sisi', 'Pindah', 'Hapus'];
        const toolInstr = [
            'Klik canvas untuk menambah simpul',
            'Klik dan tarik antar simpul untuk membuat sisi',
            'Klik dan tarik simpul untuk memindahkan',
            'Klik simpul atau sisi untuk menghapus'
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
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(139, 115, 85, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
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
        const fromNode = this.graph.nodes.get(edge.from);
        const toNode = this.graph.nodes.get(edge.to);
        if (!fromNode || !toNode) return;

        const edgeKey = `${edge.from}-${edge.to}`;
        const baseColor = this.edgeColors.get(edgeKey) || '#A69076';
        const color = isElectric ? electricColor : baseColor;

        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const startX = fromNode.x + Math.cos(angle) * this.nodeRadius;
        const startY = fromNode.y + Math.sin(angle) * this.nodeRadius;
        const endX = toNode.x - Math.cos(angle) * this.nodeRadius;
        const endY = toNode.y - Math.sin(angle) * this.nodeRadius;

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
    }

    // ==================== MODALS ====================
    showResultModal(content) {
        document.getElementById('resultModalContent').innerHTML = content;
        document.getElementById('resultModal').classList.add('show');
    }

    hideResultModal() {
        document.getElementById('resultModal').classList.remove('show');
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
                    <label>🚀 Pilih Simpul Awal:</label>
                    <div class="node-buttons" id="nodesA">
                        ${nodes.map(n => `<button class="node-btn" data-node="${n}">${n}</button>`).join('')}
                    </div>
                </div>
                <div class="node-select-group">
                    <label>🎯 Pilih Simpul Tujuan:</label>
                    <div class="node-buttons" id="nodesB">
                        ${nodes.map(n => `<button class="node-btn" data-node="${n}">${n}</button>`).join('')}
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="node-select-group">
                    <label>🎯 Pilih Simpul:</label>
                    <div class="node-buttons" id="nodesA">
                        ${nodes.map(n => `<button class="node-btn" data-node="${n}">${n}</button>`).join('')}
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
            <h3>🔍 DFS Traversal</h3>
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
            <h3>🌊 BFS Traversal</h3>
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
                <h3>❌ Tidak Ada Jalur</h3>
                <p>Simpul <strong>${startNode}</strong> dan <strong>${endNode}</strong> tidak terhubung.</p>
            `);
        } else {
            const pathHtml = result.path.map(n => `<span class="path-node">${n}</span>`).join('<span class="path-arrow">-></span>');
            this.showResultModal(`
                <h3>📏 Jalur Terpendek Ditemukan!</h3>
                <p>Dari simpul <strong>${startNode}</strong> ke simpul <strong>${endNode}</strong></p>
                <p>Jarak minimum: <strong>${result.distance}</strong> sisi</p>
                <div class="path-display">${pathHtml}</div>
            `);
        }
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
                <h3>✅ Graf Terhubung!</h3>
                <p>Semua <strong>${this.graph.nodes.size}</strong> simpul saling terhubung.</p>
            `);
        } else {
            this.showResultModal(`
                <h3>⚠️ Graf Tidak Terhubung</h3>
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
            <h3>📐 Ukuran Komponen</h3>
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
            <h3>#️⃣ Analisis Komponen</h3>
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
            <h3>🏆 Komponen Terbesar</h3>
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
                <h3>🎨 Graf adalah Bipartite!</h3>
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
                <h3>❌ Graf Bukan Bipartite</h3>
                <p>Graf ini <strong>tidak bipartite</strong> — terdapat siklus ganjil sehingga tidak dapat dibagi menjadi 2 himpunan.</p>
                <p style="margin-top:12px;color:var(--text-muted);font-size:0.95rem">💡 Sebuah graf adalah bipartite jika dan hanya jika tidak memiliki siklus dengan panjang ganjil.</p>
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
                <h3>⚠️ Graf Tidak Terhubung</h3>
                <p>Diameter tidak terdefinisi karena graf <strong>tidak terhubung</strong>.</p>
                <p>Diameter = <strong>∞ (tak hingga)</strong></p>
                <p style="margin-top:12px;color:var(--text-muted);font-size:0.95rem">💡 Diameter hanya terdefinisi pada graf terhubung. Hubungkan semua komponen terlebih dahulu.</p>
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
            <h3>📐 Diameter Graf</h3>
            <p>Diameter: <strong>${result.diameter}</strong> sisi</p>
            <p>Jalur terpanjang dari simpul <strong>${result.from}</strong> ke simpul <strong>${result.to}</strong></p>
            <div class="path-display">${pathHtml}</div>
            <p style="margin-top:16px;color:var(--text-muted);font-size:0.9rem">💡 Diameter adalah jarak terpanjang di antara semua pasangan simpul terpendek dalam graf.</p>
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
                <h3>🔄 Siklus Ditemukan!</h3>
                <p>Graf memiliki <strong>siklus</strong> dengan panjang <strong>${displayCycle.length}</strong> sisi.</p>
                <div class="path-display">${cycleHtml}</div>
                <p style="margin-top:16px;color:var(--text-muted);font-size:0.9rem">💡 Siklus adalah jalur tertutup yang dimulai dan berakhir di simpul yang sama tanpa mengulang sisi.</p>
            `);
        } else {
            // No cycle - color all green
            for (const id of this.graph.nodes.keys()) {
                this.nodeColors.set(id, '#4A7C59');
            }

            this.isAnimating = false;

            this.showResultModal(`
                <h3>✅ Tidak Ada Siklus</h3>
                <p>Graf ini <strong>tidak memiliki siklus</strong> (merupakan hutan/pohon).</p>
                <p>Simpul: <strong>${this.graph.nodes.size}</strong> | Sisi: <strong>${this.graph.edges.length}</strong></p>
                <p style="margin-top:12px;color:var(--text-muted);font-size:0.9rem">💡 Graf tanpa siklus disebut hutan. Jika terhubung, disebut pohon.</p>
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
                <h3>⭕ Girth Tidak Terdefinisi</h3>
                <p>Graf ini <strong>tidak memiliki siklus</strong>, sehingga girth = <strong>∞ (tak hingga)</strong>.</p>
                <p style="margin-top:12px;color:var(--text-muted);font-size:0.9rem">💡 Girth adalah panjang siklus terpendek. Jika tidak ada siklus, girth tidak terdefinisi.</p>
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
                <h3>⭕ Girth (Sabuk) Graf</h3>
                <p>Girth: <strong>${result.girth}</strong> sisi</p>
                <p>Siklus terpendek yang ditemukan:</p>
                <div class="path-display">${cycleHtml}</div>
                <p style="margin-top:16px;color:var(--text-muted);font-size:0.9rem">💡 Girth adalah panjang siklus terpendek dalam graf. Siklus di atas memiliki ${displayCycle.length} simpul dan ${result.girth} sisi.</p>
            `);
        }
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

        // Next lines: edge data (from to)
        for (const edge of this.graph.edges) {
            lines.push(`${edge.from} ${edge.to}`);
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
                        const fromNew = nodeIdMap.get(fromOld);
                        const toNew = nodeIdMap.get(toOld);

                        if (fromNew !== undefined && toNew !== undefined) {
                            if (this.graph.addEdge(fromNew, toNew)) {
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
