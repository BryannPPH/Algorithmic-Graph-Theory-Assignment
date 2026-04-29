class TSPPage {
    constructor() {
        this.nodes = [];
        this.nextNodeId = 1;
        this.route = [];
        this.routeDistance = null;
        this.currentTool = 'addNode';
        this.draggingNodeId = null;
        this.hoveredNodeId = null;
        this.isPanning = false;
        this.panLastScreenPos = null;
        this.nodeRadius = 8;
        this.hitRadius = 16;
        this.maxExactNodes = 20;
        this.maxMatrixHeuristicNodes = 320;
        this.isSolving = false;
        this.routeReveal = 1;
        this.routeRevealTarget = 1;
        this.routeAnimationSpeed = 1;
        this.routeRevealBaseStep = 0.035;
        this.lastAnimationTime = performance.now();
        this.algorithmLabel = '-';
        this.viewport = {
            scale: 1,
            minScale: 0.4,
            maxScale: 3,
            offsetX: 0,
            offsetY: 0
        };

        this.canvas = document.getElementById('tspCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = document.getElementById('canvasContainer');

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupThemeToggle();
        this.setupCanvasEvents();
        this.setupUIEvents();
        this.updateStats();
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

    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.canvas.addEventListener('mouseup', (event) => this.onMouseUp(event));
        this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
        this.canvas.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
        this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
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
        const maxExact = this.maxExactNodes;

        return {
            complete: {
                hint: 'K_n lengkap dengan n titik pada lingkaran.',
                params: { n: { label: 'n', value: 8, min: 2, max: maxExact } }
            },
            completeBipartite: {
                hint: 'K_m,n ditata sebagai dua partisi titik.',
                params: {
                    m: { label: 'm', value: 4, min: 1, max: maxExact },
                    n: { label: 'n', value: 4, min: 1, max: maxExact }
                }
            },
            tree: {
                hint: 'T_n ditata sebagai pohon biner kecil.',
                params: { n: { label: 'n', value: 10, min: 2, max: maxExact } }
            },
            cycle: {
                hint: 'C_n ditata sebagai siklus pada lingkaran.',
                params: { n: { label: 'n', value: 10, min: 3, max: maxExact } }
            },
            path: {
                hint: 'P_n ditata sebagai lintasan lurus.',
                params: { n: { label: 'n', value: 10, min: 2, max: maxExact } }
            },
            wheel: {
                hint: 'W_n memakai satu titik pusat dan n-1 titik luar.',
                params: { n: { label: 'n', value: 9, min: 4, max: maxExact } }
            },
            prism: {
                hint: 'Prisma n-gonal memiliki 2n titik.',
                params: { n: { label: 'n', value: 6, min: 3, max: Math.floor(maxExact / 2) } }
            },
            petersen: {
                hint: 'Petersen graph standar memiliki 10 titik.'
            },
            generalizedPetersen: {
                hint: 'P(n,k) memiliki 2n titik; gunakan 1 <= k < n/2.',
                params: {
                    n: { label: 'n', value: 5, min: 3, max: Math.floor(maxExact / 2) },
                    k: { label: 'k', value: 2, min: 1, max: 9 }
                }
            },
            circulant: {
                hint: 'C_n(a1,a2) ditata pada lingkaran dengan parameter langkah.',
                params: {
                    n: { label: 'n', value: 10, min: 4, max: maxExact },
                    a1: { label: 'a1', value: 1, min: 1, max: 10 },
                    a2: { label: 'a2', value: 3, min: 1, max: 10 }
                }
            },
            hypercube: {
                hint: 'H(n) memiliki 2^n titik.',
                params: { n: { label: 'n', value: 4, min: 1, max: Math.floor(Math.log2(maxExact)) } }
            },
            grid: {
                hint: 'G(m,n) ditata sebagai grid baris dan kolom.',
                params: {
                    m: { label: 'm', value: 4, min: 1, max: maxExact },
                    n: { label: 'n', value: 5, min: 1, max: maxExact }
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
                input.max = config.max;
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

            if (this.nodes.length > 0 && !confirm('Ganti titik saat ini dengan input test baru?')) {
                return;
            }

            this.applyGraphPreset(preset);
            this.showToast(`${preset.name} dimuat: ${preset.nodes.length} simpul`, 'success');
        } catch (error) {
            this.showToast(error.message || 'Gagal memuat input test.', 'error');
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

            if (value < config.min || value > config.max) {
                throw new Error(`Parameter ${config.label} harus di antara ${config.min} dan ${config.max}.`);
            }

            if (input) input.value = value;
            params[paramName] = value;
        }

        return params;
    }

    applyGraphPreset(preset) {
        this.nodes = preset.nodes.map((node, index) => ({
            id: index + 1,
            x: node.x,
            y: node.y
        }));
        this.nextNodeId = this.nodes.length + 1;
        this.viewport.scale = 1;
        this.viewport.offsetX = 0;
        this.viewport.offsetY = 0;
        this.clearRoute(false);
        this.updateStats();
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
                return this.buildCompleteGraphPreset(8);
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

    assertPresetNodeLimit(count) {
        if (count > this.maxExactNodes) {
            throw new Error(`Input test halaman ini dibatasi maksimal ${this.maxExactNodes} simpul.`);
        }
    }

    buildCompleteGraphPreset(n) {
        this.assertPresetNodeLimit(n);
        return {
            name: `Graf lengkap K_${n}`,
            nodes: this.createCirclePresetNodes(n)
        };
    }

    buildCompleteBipartiteGraphPreset(m, n) {
        this.assertPresetNodeLimit(m + n);
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

        return {
            name: `Graf bipartit lengkap K_${m},${n}`,
            nodes: [...makeColumn(m, leftX), ...makeColumn(n, rightX)]
        };
    }

    buildTreeGraphPreset(n) {
        this.assertPresetNodeLimit(n);
        const frame = this.getPresetFrame();
        const maxLevel = Math.floor(Math.log2(Math.max(1, n)));
        const top = frame.centerY - Math.min(frame.height * 0.27, 165);
        const ySpacing = maxLevel === 0 ? 0 : Math.min(105, (frame.height * 0.54) / maxLevel);
        const nodes = [];

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
        }

        return { name: `Pohon T_${n}`, nodes };
    }

    buildCycleGraphPreset(n) {
        this.assertPresetNodeLimit(n);
        return {
            name: `Siklus C_${n}`,
            nodes: this.createCirclePresetNodes(n)
        };
    }

    buildPathGraphPreset(n) {
        this.assertPresetNodeLimit(n);
        const frame = this.getPresetFrame();
        const span = Math.min(frame.width * 0.68, 560);

        return {
            name: `Lintasan P_${n}`,
            nodes: Array.from({ length: n }, (_, index) => ({
                x: frame.centerX + (index - (n - 1) / 2) * (span / Math.max(1, n - 1)),
                y: frame.centerY
            }))
        };
    }

    buildWheelGraphPreset(n) {
        this.assertPresetNodeLimit(n);
        const frame = this.getPresetFrame();
        const outerCount = n - 1;

        return {
            name: `Graf roda W_${n}`,
            nodes: [
                { x: frame.centerX, y: frame.centerY },
                ...this.createCirclePresetNodes(outerCount)
            ]
        };
    }

    buildPrismGraphPreset(n) {
        this.assertPresetNodeLimit(n * 2);
        const frame = this.getPresetFrame();
        const radiusX = Math.min(frame.width * 0.23, 170);
        const radiusY = Math.min(frame.height * 0.13, 72);
        const verticalOffset = Math.min(frame.height * 0.14, 78);
        const nodes = [];

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

        return { name: `Graf prisma ${n}-gonal`, nodes };
    }

    buildGeneralizedPetersenGraphPreset(n, k, name) {
        this.assertPresetNodeLimit(n * 2);
        if (k < 1 || k >= n / 2) {
            throw new Error('Parameter k untuk P(n,k) harus memenuhi 1 <= k < n/2.');
        }

        return {
            name,
            nodes: [
                ...this.createCirclePresetNodes(n, 1),
                ...this.createCirclePresetNodes(n, 0.46)
            ]
        };
    }

    buildCirculantGraphPreset(n, a1, a2) {
        this.assertPresetNodeLimit(n);
        const maxStep = Math.floor(n / 2);

        if (a1 === a2) {
            throw new Error('Parameter a1 dan a2 harus berbeda.');
        }
        if (a1 < 1 || a2 < 1 || a1 > maxStep || a2 > maxStep) {
            throw new Error(`Parameter a1 dan a2 harus di antara 1 dan ${maxStep}.`);
        }

        return {
            name: `Circulant graph C_${n}(${a1},${a2})`,
            nodes: this.createCirclePresetNodes(n)
        };
    }

    buildHypercubeGraphPreset(dimension) {
        const nodeCount = 1 << dimension;
        this.assertPresetNodeLimit(nodeCount);
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

        return { name: `Hypercube H(${dimension})`, nodes };
    }

    buildGridGraphPreset(rows, cols) {
        const nodeCount = rows * cols;
        this.assertPresetNodeLimit(nodeCount);
        const frame = this.getPresetFrame();
        const spacingX = Math.min(92, (frame.width * 0.62) / Math.max(1, cols - 1));
        const spacingY = Math.min(82, (frame.height * 0.54) / Math.max(1, rows - 1));
        const nodes = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                nodes.push({
                    x: frame.centerX + (col - (cols - 1) / 2) * spacingX,
                    y: frame.centerY + (row - (rows - 1) / 2) * spacingY
                });
            }
        }

        return { name: `Grid graph G(${rows},${cols})`, nodes };
    }

    setupUIEvents() {
        const toolButtons = [
            { id: 'addNodeTool', tool: 'addNode', label: 'Tambah Simpul' },
            { id: 'moveTool', tool: 'move', label: 'Pindah' },
            { id: 'deleteTool', tool: 'delete', label: 'Hapus' }
        ];

        toolButtons.forEach(({ id, tool, label }) => {
            const button = document.getElementById(id);
            button.onclick = () => {
                this.currentTool = tool;
                toolButtons.forEach(({ id: buttonId }) => {
                    document.getElementById(buttonId).classList.remove('active');
                });
                button.classList.add('active');
                document.getElementById('currentMode').textContent = label;
                this.updateCanvasCursor();
            };
        });

        document.getElementById('solveTspBtn').onclick = () => this.runTSP();
        this.setupSpeedControl();
        this.setupGraphPresetEvents();
        document.getElementById('importTxt').onclick = () => document.getElementById('txtFileInput').click();
        document.getElementById('txtFileInput').onchange = (event) => this.importTXT(event);
        document.getElementById('resetRoute').onclick = () => {
            this.clearRoute();
            this.showToast('Rute direset!', 'info');
        };
        document.getElementById('clearGraph').onclick = () => {
            if (!this.nodes.length || confirm('Hapus semua simpul?')) {
                this.nodes = [];
                this.nextNodeId = 1;
                this.clearRoute(false);
                this.updateStats();
                this.showToast('Semua simpul dihapus!', 'error');
            }
        };

        document.getElementById('closeResultModal').onclick = () => this.hideResultModal();
        document.getElementById('resultModal').onclick = (event) => {
            if (event.target.id === 'resultModal') {
                this.hideResultModal();
            }
        };
    }

    resizeCanvas() {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.canvas.width = Math.max(1, Math.floor(rect.width));
        this.canvas.height = Math.max(1, Math.floor(rect.height));
    }

    setupSpeedControl() {
        const speedSlider = document.getElementById('tspSpeedSlider');
        const speedValue = document.getElementById('tspSpeedValue');
        if (!speedSlider || !speedValue) return;

        const updateSpeed = () => {
            const speed = Number.parseFloat(speedSlider.value);
            this.routeAnimationSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
            speedValue.textContent = `${this.formatSpeedValue(this.routeAnimationSpeed)}x`;
        };

        speedSlider.addEventListener('input', updateSpeed);
        updateSpeed();
    }

    formatSpeedValue(value) {
        return Number.isInteger(value)
            ? value.toString()
            : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    }

    animate(timestamp = performance.now()) {
        const elapsedFrames = Math.min(4, (timestamp - this.lastAnimationTime) / (1000 / 60));
        this.lastAnimationTime = timestamp;

        if (this.routeReveal < this.routeRevealTarget) {
            const revealStep = this.routeRevealBaseStep * this.routeAnimationSpeed * elapsedFrames;
            this.routeReveal = Math.min(this.routeRevealTarget, this.routeReveal + revealStep);
        }

        this.render();
        requestAnimationFrame((nextTimestamp) => this.animate(nextTimestamp));
    }

    getScreenPos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.viewport.offsetX) / this.viewport.scale,
            y: (y - this.viewport.offsetY) / this.viewport.scale
        };
    }

    getWorldPos(event) {
        const screenPos = this.getScreenPos(event);
        return this.screenToWorld(screenPos.x, screenPos.y);
    }

    getVisibleWorldBounds(padding = 0) {
        return {
            left: (-this.viewport.offsetX) / this.viewport.scale - padding,
            top: (-this.viewport.offsetY) / this.viewport.scale - padding,
            right: (this.canvas.width - this.viewport.offsetX) / this.viewport.scale + padding,
            bottom: (this.canvas.height - this.viewport.offsetY) / this.viewport.scale + padding
        };
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

    startPan(screenPos) {
        this.isPanning = true;
        this.panLastScreenPos = screenPos;
        this.hoveredNodeId = null;
        this.canvas.style.cursor = 'grabbing';
    }

    stopPan() {
        this.isPanning = false;
        this.panLastScreenPos = null;
    }

    onWheel(event) {
        event.preventDefault();

        const screenPos = this.getScreenPos(event);
        const deltaMultiplier =
            event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.canvas.height : 1;
        const normalizedDelta = event.deltaY * deltaMultiplier;
        const zoomDelta = Math.max(-70, Math.min(70, normalizedDelta));
        const zoomFactor = Math.exp(-zoomDelta * 0.0028);
        this.zoomAt(screenPos.x, screenPos.y, zoomFactor);
    }

    onMouseDown(event) {
        if (this.isSolving) return;

        if (event.button === 1 || event.button === 2) {
            event.preventDefault();
            this.startPan(this.getScreenPos(event));
            return;
        }

        if (event.button !== 0) return;

        const worldPos = this.getWorldPos(event);
        const nodeId = this.getNodeAt(worldPos.x, worldPos.y);

        if (this.currentTool === 'move' && !nodeId) {
            event.preventDefault();
            this.startPan(this.getScreenPos(event));
            return;
        }

        if (this.currentTool === 'addNode') {
            if (!nodeId) {
                this.nodes.push({
                    id: this.nextNodeId++,
                    x: worldPos.x,
                    y: worldPos.y
                });
                this.clearRoute(false);
                this.updateStats();
                this.showToast('Simpul ditambahkan!', 'success');
            }
            return;
        }

        if (this.currentTool === 'move' && nodeId) {
            this.draggingNodeId = nodeId;
            this.clearRoute();
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'delete' && nodeId) {
            this.nodes = this.nodes.filter((node) => node.id !== nodeId);
            this.clearRoute(false);
            this.updateStats();
            this.showToast('Simpul dihapus!', 'error');
        }
    }

    onMouseMove(event) {
        const screenPos = this.getScreenPos(event);

        if (this.isPanning && this.panLastScreenPos) {
            this.viewport.offsetX += screenPos.x - this.panLastScreenPos.x;
            this.viewport.offsetY += screenPos.y - this.panLastScreenPos.y;
            this.panLastScreenPos = screenPos;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        const worldPos = this.getWorldPos(event);
        this.hoveredNodeId = this.getNodeAt(worldPos.x, worldPos.y);

        if (this.draggingNodeId !== null) {
            const node = this.nodes.find((candidate) => candidate.id === this.draggingNodeId);
            if (node) {
                node.x = worldPos.x;
                node.y = worldPos.y;
            }
        }

        this.updateCanvasCursor();
    }

    onMouseUp(event) {
        const worldPos = this.getWorldPos(event);

        if (this.isPanning) {
            this.stopPan();
            this.updateCanvasCursor();
            return;
        }

        if (event.button === 0 && this.draggingNodeId !== null) {
            this.draggingNodeId = null;
            this.updateCanvasCursor(worldPos);
        }
    }

    onMouseLeave() {
        this.stopPan();
        this.draggingNodeId = null;
        this.hoveredNodeId = null;
        this.canvas.style.cursor = 'default';
    }

    updateCanvasCursor() {
        if (this.isPanning || this.draggingNodeId !== null) {
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'move') {
            this.canvas.style.cursor = this.hoveredNodeId ? 'grab' : 'move';
            return;
        }

        if (this.currentTool === 'delete') {
            this.canvas.style.cursor = this.hoveredNodeId ? 'pointer' : 'default';
            return;
        }

        this.canvas.style.cursor = this.hoveredNodeId ? 'pointer' : 'crosshair';
    }

    getNodeAt(x, y) {
        const radius = this.hitRadius / this.viewport.scale;
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (Math.hypot(node.x - x, node.y - y) <= radius) {
                return node.id;
            }
        }
        return null;
    }

    getCompleteEdgeCount() {
        return (this.nodes.length * (this.nodes.length - 1)) / 2;
    }

    updateStats() {
        document.getElementById('nodeCount').textContent = this.nodes.length.toString();
        document.getElementById('edgeCount').textContent = this.getCompleteEdgeCount().toString();
        const distanceText = this.routeDistance === null ? '-' : this.formatDistance(this.routeDistance);
        document.getElementById('tourDistance').textContent = distanceText;
        document.getElementById('resultDistance').textContent = distanceText;
        document.getElementById('resultNodes').textContent = this.route.length > 0
            ? Math.max(0, this.route.length - 1).toString()
            : '-';
        const resultAlgorithm = document.getElementById('resultAlgorithm');
        if (resultAlgorithm) {
            resultAlgorithm.textContent = this.algorithmLabel;
        }
    }

    clearRoute(update = true) {
        this.route = [];
        this.routeDistance = null;
        this.routeReveal = 1;
        this.routeRevealTarget = 1;
        this.algorithmLabel = '-';
        if (update) {
            this.updateStats();
        }
    }

    formatDistance(value) {
        if (!Number.isFinite(value)) return '-';
        return value.toLocaleString('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    getRouteColor() {
        return document.body.classList.contains('dark-mode') ? '#9ca3af' : '#2f3437';
    }

    getRouteShadowColor() {
        return document.body.classList.contains('dark-mode')
            ? 'rgba(156, 163, 175, 0.42)'
            : 'rgba(47, 52, 55, 0.30)';
    }

    importTXT(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            try {
                const importedNodes = this.parseTXTNodes(loadEvent.target.result);
                if (importedNodes.length === 0) {
                    this.showToast('File tidak berisi node valid!', 'error');
                    return;
                }

                this.nodes = importedNodes;
                this.nextNodeId = Math.max(...this.nodes.map((node) => node.id)) + 1;
                this.clearRoute(false);
                this.fitNodesToView();
                this.updateStats();
                this.showToast(`${this.nodes.length} node berhasil di-import!`, 'success');
            } catch (error) {
                this.showToast(error.message || 'Import TXT gagal!', 'error');
            } finally {
                event.target.value = '';
            }
        };

        reader.onerror = () => {
            this.showToast('File tidak bisa dibaca!', 'error');
            event.target.value = '';
        };

        reader.readAsText(file);
    }

    parseTXTNodes(text) {
        const lines = String(text)
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'));

        if (lines.length === 0) return [];

        const firstLine = lines[0].toLowerCase();
        let nodeLines;

        if ((firstLine === 'directed' || firstLine === 'undirected') && lines.length >= 2) {
            const nodeCount = Number.parseInt(lines[1], 10);
            if (!Number.isInteger(nodeCount) || nodeCount < 0) {
                throw new Error('Jumlah node tidak valid.');
            }
            nodeLines = lines.slice(2, 2 + nodeCount);
        } else {
            const firstLineNumbers = lines[0]
                .split(/[\s,;]+/)
                .map((part) => Number(part))
                .filter((number) => Number.isFinite(number));
            const nodeCount = firstLineNumbers.length === 1 ? Math.trunc(firstLineNumbers[0]) : NaN;
            if (Number.isInteger(nodeCount) && nodeCount >= 0 && lines.length >= nodeCount + 1) {
                nodeLines = lines.slice(1, 1 + nodeCount);
            } else {
                nodeLines = lines;
            }
        }

        return this.normalizeImportedNodes(nodeLines.map((line, index) => {
            const numbers = line
                .split(/[\s,;]+/)
                .map((part) => Number(part))
                .filter((number) => Number.isFinite(number));

            if (numbers.length >= 3) {
                return { id: Math.trunc(numbers[0]), x: numbers[1], y: numbers[2] };
            }

            if (numbers.length >= 2) {
                return { id: index + 1, x: numbers[0], y: numbers[1] };
            }

            return null;
        }).filter(Boolean));
    }

    normalizeImportedNodes(rawNodes) {
        const usedIds = new Set();
        let nextId = 1;
        const normalized = [];

        for (const rawNode of rawNodes) {
            if (!Number.isFinite(rawNode.x) || !Number.isFinite(rawNode.y)) continue;

            let id = Number.isInteger(rawNode.id) && rawNode.id > 0 ? rawNode.id : nextId;
            while (usedIds.has(id)) {
                id++;
            }

            usedIds.add(id);
            nextId = Math.max(nextId, id + 1);
            normalized.push({ id, x: rawNode.x, y: rawNode.y });
        }

        return normalized;
    }

    fitNodesToView() {
        if (this.nodes.length === 0) return;

        const minX = Math.min(...this.nodes.map((node) => node.x));
        const maxX = Math.max(...this.nodes.map((node) => node.x));
        const minY = Math.min(...this.nodes.map((node) => node.y));
        const maxY = Math.max(...this.nodes.map((node) => node.y));
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);
        const padding = 80;
        const scale = Math.min(
            this.viewport.maxScale,
            Math.max(
                this.viewport.minScale,
                Math.min(
                    (this.canvas.width - padding * 2) / width,
                    (this.canvas.height - padding * 2) / height
                )
            )
        );

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.viewport.scale = Number.isFinite(scale) ? scale : 1;
        this.viewport.offsetX = this.canvas.width / 2 - centerX * this.viewport.scale;
        this.viewport.offsetY = this.canvas.height / 2 - centerY * this.viewport.scale;
    }

    buildDistanceMatrix() {
        const n = this.nodes.length;
        const distances = new Float64Array(n * n);

        for (let i = 0; i < n; i++) {
            const from = this.nodes[i];
            for (let j = i + 1; j < n; j++) {
                const to = this.nodes[j];
                const distance = Math.hypot(from.x - to.x, from.y - to.y);
                distances[i * n + j] = distance;
                distances[j * n + i] = distance;
            }
        }

        return distances;
    }

    solveHeldKarp() {
        const n = this.nodes.length;
        const algorithm = 'Held-Karp DP (Exact)';

        if (n === 0) {
            return { hasTour: false, reason: 'empty', algorithm };
        }

        if (n === 1) {
            return {
                hasTour: true,
                algorithm,
                route: [this.nodes[0].id, this.nodes[0].id],
                totalDistance: 0,
                states: 1
            };
        }

        if (n > this.maxExactNodes) {
            return {
                hasTour: false,
                reason: 'too-many-nodes',
                maxNodes: this.maxExactNodes,
                algorithm
            };
        }

        const distances = this.buildDistanceMatrix();
        const otherNodeCount = n - 1;
        const stateCount = 1 << otherNodeCount;
        const tableSize = stateCount * otherNodeCount;
        const costs = new Float64Array(tableSize);
        const parents = new Int16Array(tableSize);
        costs.fill(Infinity);
        parents.fill(-1);

        for (let next = 0; next < otherNodeCount; next++) {
            const mask = 1 << next;
            costs[mask * otherNodeCount + next] = distances[next + 1];
        }

        for (let mask = 1; mask < stateCount; mask++) {
            for (let last = 0; last < otherNodeCount; last++) {
                const lastBit = 1 << last;
                if ((mask & lastBit) === 0) continue;

                const stateIndex = mask * otherNodeCount + last;
                const currentCost = costs[stateIndex];
                if (currentCost === Infinity) continue;

                const lastNodeIndex = last + 1;
                let remaining = (stateCount - 1) ^ mask;
                while (remaining) {
                    const nextBit = remaining & -remaining;
                    const next = Math.log2(nextBit);
                    const nextMask = mask | nextBit;
                    const nextIndex = nextMask * otherNodeCount + next;
                    const candidateCost = currentCost + distances[lastNodeIndex * n + next + 1];

                    if (candidateCost < costs[nextIndex]) {
                        costs[nextIndex] = candidateCost;
                        parents[nextIndex] = last;
                    }

                    remaining ^= nextBit;
                }
            }
        }

        const fullMask = stateCount - 1;
        let bestDistance = Infinity;
        let bestEnd = -1;

        for (let last = 0; last < otherNodeCount; last++) {
            const stateIndex = fullMask * otherNodeCount + last;
            const candidateDistance = costs[stateIndex] + distances[(last + 1) * n];
            if (candidateDistance < bestDistance) {
                bestDistance = candidateDistance;
                bestEnd = last;
            }
        }

        if (bestEnd === -1 || bestDistance === Infinity) {
            return { hasTour: false, reason: 'no-tour', algorithm };
        }

        const reversedOrder = [];
        let mask = fullMask;
        let currentEnd = bestEnd;

        while (currentEnd !== -1) {
            reversedOrder.push(currentEnd + 1);
            const stateIndex = mask * otherNodeCount + currentEnd;
            const previousEnd = parents[stateIndex];
            mask ^= 1 << currentEnd;
            currentEnd = previousEnd;
        }

        const nodeOrder = [0, ...reversedOrder.reverse(), 0];
        return {
            hasTour: true,
            algorithm,
            route: nodeOrder.map((index) => this.nodes[index].id),
            totalDistance: bestDistance,
            states: tableSize
        };
    }

    solveOptimizedTSP() {
        if (this.nodes.length <= this.maxExactNodes) {
            return this.solveHeldKarp();
        }

        if (this.nodes.length > this.maxMatrixHeuristicNodes) {
            return this.solveLargePointCloudTSP();
        }

        return this.solveNearestNeighborTwoOpt();
    }

    solveLargePointCloudTSP() {
        const n = this.nodes.length;
        const algorithm = 'Morton Sweep + Local 2-Opt';

        if (n === 0) {
            return { hasTour: false, reason: 'empty', algorithm };
        }

        if (n === 1) {
            return {
                hasTour: true,
                algorithm,
                route: [this.nodes[0].id, this.nodes[0].id],
                totalDistance: 0,
                states: 1
            };
        }

        const bounds = this.getNodeBounds();
        const route = Array.from({ length: n }, (_, index) => index)
            .sort((a, b) => {
                const codeDiff = this.getMortonCode(this.nodes[a], bounds) - this.getMortonCode(this.nodes[b], bounds);
                if (codeDiff !== 0) return codeDiff;
                return this.nodes[a].id - this.nodes[b].id;
            });

        route.push(route[0]);
        const optimizedRoute = this.optimizeRouteTwoOptWindow(route, 36, 4);

        return {
            hasTour: true,
            algorithm,
            route: optimizedRoute.map((index) => this.nodes[index].id),
            totalDistance: this.calculateIndexRouteDistanceDirect(optimizedRoute),
            states: n * 36 * 4
        };
    }

    getNodeBounds() {
        return {
            minX: Math.min(...this.nodes.map((node) => node.x)),
            maxX: Math.max(...this.nodes.map((node) => node.x)),
            minY: Math.min(...this.nodes.map((node) => node.y)),
            maxY: Math.max(...this.nodes.map((node) => node.y))
        };
    }

    getMortonCode(node, bounds) {
        const width = Math.max(1, bounds.maxX - bounds.minX);
        const height = Math.max(1, bounds.maxY - bounds.minY);
        const normalizedX = Math.max(0, Math.min(1023, Math.round(((node.x - bounds.minX) / width) * 1023)));
        const normalizedY = Math.max(0, Math.min(1023, Math.round(((node.y - bounds.minY) / height) * 1023)));
        return this.interleaveBits(normalizedX, normalizedY);
    }

    interleaveBits(x, y) {
        let result = 0;
        for (let bit = 0; bit < 10; bit++) {
            result |= ((x >> bit) & 1) << (2 * bit);
            result |= ((y >> bit) & 1) << (2 * bit + 1);
        }
        return result;
    }

    optimizeRouteTwoOptWindow(route, windowSize, maxPasses) {
        const optimized = route.slice();
        const lastRouteIndex = optimized.length - 2;
        const epsilon = 1e-9;
        let improved = true;
        let passes = 0;

        while (improved && passes < maxPasses) {
            improved = false;
            passes++;

            for (let i = 1; i < lastRouteIndex; i++) {
                const maxK = Math.min(lastRouteIndex, i + windowSize);
                for (let k = i + 1; k <= maxK; k++) {
                    const a = optimized[i - 1];
                    const b = optimized[i];
                    const c = optimized[k];
                    const d = optimized[k + 1];
                    const currentDistance = this.getIndexDistance(a, b) + this.getIndexDistance(c, d);
                    const swappedDistance = this.getIndexDistance(a, c) + this.getIndexDistance(b, d);

                    if (swappedDistance + epsilon < currentDistance) {
                        this.reverseRouteSegment(optimized, i, k);
                        improved = true;
                    }
                }
            }
        }

        optimized[optimized.length - 1] = optimized[0];
        return optimized;
    }

    solveNearestNeighborTwoOpt() {
        const n = this.nodes.length;
        const algorithm = 'Nearest Neighbor + 2-Opt';

        if (n === 0) {
            return { hasTour: false, reason: 'empty', algorithm };
        }

        if (n === 1) {
            return {
                hasTour: true,
                algorithm,
                route: [this.nodes[0].id, this.nodes[0].id],
                totalDistance: 0,
                states: 1
            };
        }

        const distances = this.buildDistanceMatrix();
        let bestRoute = null;
        let bestDistance = Infinity;

        for (let start = 0; start < n; start++) {
            const candidateRoute = this.buildNearestNeighborRoute(start, distances);
            const candidateDistance = this.calculateIndexRouteDistance(candidateRoute, distances);
            if (candidateDistance < bestDistance) {
                bestRoute = candidateRoute;
                bestDistance = candidateDistance;
            }
        }

        const optimizedRoute = this.optimizeRouteTwoOpt(bestRoute, distances);
        const optimizedDistance = this.calculateIndexRouteDistance(optimizedRoute, distances);

        return {
            hasTour: true,
            algorithm,
            route: optimizedRoute.map((index) => this.nodes[index].id),
            totalDistance: optimizedDistance,
            states: n * n
        };
    }

    buildNearestNeighborRoute(start, distances) {
        const n = this.nodes.length;
        const unvisited = new Set(Array.from({ length: n }, (_, index) => index));
        const route = [start];
        let current = start;
        unvisited.delete(start);

        while (unvisited.size > 0) {
            let nearest = null;
            let nearestDistance = Infinity;

            for (const candidate of unvisited) {
                const distance = distances[current * n + candidate];
                if (distance < nearestDistance) {
                    nearest = candidate;
                    nearestDistance = distance;
                }
            }

            route.push(nearest);
            unvisited.delete(nearest);
            current = nearest;
        }

        route.push(start);
        return route;
    }

    optimizeRouteTwoOpt(route, distances) {
        const n = this.nodes.length;
        const optimized = route.slice();
        const maxPasses = Math.max(10, n);
        const epsilon = 1e-9;
        let improved = true;
        let passes = 0;

        while (improved && passes < maxPasses) {
            improved = false;
            passes++;

            for (let i = 1; i < n - 1; i++) {
                for (let k = i + 1; k < n; k++) {
                    const a = optimized[i - 1];
                    const b = optimized[i];
                    const c = optimized[k];
                    const d = optimized[k + 1];
                    const currentDistance = distances[a * n + b] + distances[c * n + d];
                    const swappedDistance = distances[a * n + c] + distances[b * n + d];

                    if (swappedDistance + epsilon < currentDistance) {
                        this.reverseRouteSegment(optimized, i, k);
                        improved = true;
                    }
                }
            }
        }

        return optimized;
    }

    reverseRouteSegment(route, start, end) {
        while (start < end) {
            const temp = route[start];
            route[start] = route[end];
            route[end] = temp;
            start++;
            end--;
        }
    }

    calculateIndexRouteDistance(route, distances) {
        const n = this.nodes.length;
        let totalDistance = 0;

        for (let i = 0; i < route.length - 1; i++) {
            totalDistance += distances[route[i] * n + route[i + 1]];
        }

        return totalDistance;
    }

    calculateIndexRouteDistanceDirect(route) {
        let totalDistance = 0;

        for (let i = 0; i < route.length - 1; i++) {
            totalDistance += this.getIndexDistance(route[i], route[i + 1]);
        }

        return totalDistance;
    }

    getIndexDistance(fromIndex, toIndex) {
        const from = this.nodes[fromIndex];
        const to = this.nodes[toIndex];
        return Math.hypot(from.x - to.x, from.y - to.y);
    }

    runTSP() {
        if (this.isSolving) return;

        if (this.nodes.length < 2) {
            this.showToast('Tambahkan minimal 2 simpul!', 'warning');
            return;
        }

        this.isSolving = true;
        this.clearRoute(false);
        this.updateStats();

        setTimeout(() => {
            const result = this.solveOptimizedTSP();
            this.isSolving = false;

            if (!result.hasTour) {
                this.showToast('Tur TSP tidak dapat dihitung!', 'error');
                return;
            }

            this.route = result.route;
            this.routeDistance = result.totalDistance;
            this.algorithmLabel = result.algorithm;
            this.routeReveal = 0;
            this.routeRevealTarget = 1;
            this.updateStats();
        }, 20);
    }

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
        this.drawRoute();
        this.drawNodes();

        ctx.restore();
    }

    drawGrid() {
        const ctx = this.ctx;
        const gridSize = 32;
        const bounds = this.getVisibleWorldBounds(gridSize * 2);
        const startX = Math.floor(bounds.left / gridSize) * gridSize;
        const endX = Math.ceil(bounds.right / gridSize) * gridSize;
        const startY = Math.floor(bounds.top / gridSize) * gridSize;
        const endY = Math.ceil(bounds.bottom / gridSize) * gridSize;
        const isDark = document.body.classList.contains('dark-mode');

        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(139, 115, 85, 0.10)';
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

    drawRoute() {
        if (this.route.length < 2) return;

        const nodeById = new Map(this.nodes.map((node) => [node.id, node]));
        const routeNodes = this.route
            .map((id) => nodeById.get(id))
            .filter(Boolean);

        if (routeNodes.length < 2) return;

        const segmentCount = routeNodes.length - 1;
        const visibleSegments = this.routeReveal * segmentCount;
        const fullSegments = Math.floor(visibleSegments);
        const partialSegment = visibleSegments - fullSegments;
        const ctx = this.ctx;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4 / this.viewport.scale;
        ctx.strokeStyle = this.getRouteColor();
        ctx.shadowColor = this.getRouteShadowColor();
        ctx.shadowBlur = 16 / this.viewport.scale;

        for (let i = 0; i < fullSegments; i++) {
            this.drawRouteSegment(routeNodes[i], routeNodes[i + 1]);
        }

        if (fullSegments < segmentCount && partialSegment > 0) {
            const from = routeNodes[fullSegments];
            const to = routeNodes[fullSegments + 1];
            this.drawRouteSegment(from, {
                x: from.x + (to.x - from.x) * partialSegment,
                y: from.y + (to.y - from.y) * partialSegment
            });
        }

        ctx.restore();
    }

    drawRouteSegment(from, to) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    drawNodes() {
        const ctx = this.ctx;
        const radius = this.nodeRadius / this.viewport.scale;
        const hoverRadius = (this.nodeRadius + 3) / this.viewport.scale;
        const routeIds = new Set(this.route);

        for (const node of this.nodes) {
            const isHovered = this.hoveredNodeId === node.id;
            const isInRoute = routeIds.has(node.id);

            if (isInRoute) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, hoverRadius + 5 / this.viewport.scale, 0, Math.PI * 2);
                ctx.strokeStyle = this.getRouteShadowColor();
                ctx.lineWidth = 2 / this.viewport.scale;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, isHovered ? hoverRadius : radius, 0, Math.PI * 2);
            ctx.fillStyle = isInRoute ? this.getRouteColor() : '#4A7C59';
            ctx.fill();

            ctx.lineWidth = 2 / this.viewport.scale;
            ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#f8fafc' : '#ffffff';
            ctx.stroke();
        }
    }

    showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    showResultModal(content) {
        document.getElementById('resultModalContent').innerHTML = content;
        document.getElementById('resultModal').classList.add('show');
    }

    hideResultModal() {
        document.getElementById('resultModal').classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TSPPage();
});
