const MATCHING_LABEL_COLLATOR = new Intl.Collator('id', {
    numeric: true,
    sensitivity: 'base'
});
const MATCHING_TRACE_LIMIT = 180;

function compareMatchingLabels(a, b) {
    return MATCHING_LABEL_COLLATOR.compare(String(a), String(b));
}

function normalizeUndirectedEdgeKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function inferBipartitionFromEdgeList(nodeLabels, edges) {
    const orderedLabels = Array.from(new Set(nodeLabels)).sort(compareMatchingLabels);
    const adjacency = new Map(orderedLabels.map((label) => [label, new Set()]));

    for (const edge of edges) {
        const from = String(edge.from);
        const to = String(edge.to);

        if (!adjacency.has(from) || !adjacency.has(to)) {
            throw new Error(`Sisi ${from}-${to} merujuk simpul yang tidak terdaftar.`);
        }

        if (from === to) {
            throw new Error(`Self-loop pada simpul ${from} membuat graf tidak bipartit.`);
        }

        adjacency.get(from).add(to);
        adjacency.get(to).add(from);
    }

    const color = new Map();

    for (const startLabel of orderedLabels) {
        if (color.has(startLabel)) continue;

        color.set(startLabel, 0);
        const queue = [startLabel];

        while (queue.length > 0) {
            const current = queue.shift();
            const currentColor = color.get(current);

            for (const neighbor of adjacency.get(current)) {
                if (!color.has(neighbor)) {
                    color.set(neighbor, 1 - currentColor);
                    queue.push(neighbor);
                } else if (color.get(neighbor) === currentColor) {
                    throw new Error(`Graf tidak bipartit karena konflik warna pada ${current} dan ${neighbor}.`);
                }
            }
        }
    }

    const left = [];
    const right = [];

    for (const label of orderedLabels) {
        if (color.get(label) === 0) left.push(label);
        else right.push(label);
    }

    return { left, right, color };
}

function parseMatchingTXT(text) {
    const lines = String(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));

    if (lines.length === 0) {
        throw new Error('File kosong.');
    }

    let cursor = 0;
    let directed = false;
    const header = lines[cursor].toLowerCase();

    if (header === 'directed' || header === 'undirected') {
        directed = header === 'directed';
        cursor++;
    }

    if (directed) {
        throw new Error('Matching maksimum di halaman ini hanya menerima graf bipartit tak berarah.');
    }

    const nodeCount = Number.parseInt(lines[cursor], 10);
    if (!Number.isInteger(nodeCount) || nodeCount < 0) {
        throw new Error('Jumlah simpul pada file TXT tidak valid.');
    }
    cursor++;

    const nodeLabels = [];
    const seenLabels = new Set();
    for (let i = 0; i < nodeCount; i++) {
        if (cursor >= lines.length) {
            throw new Error(`Data simpul kurang. Baru terbaca ${i} dari ${nodeCount}.`);
        }

        const parts = lines[cursor].split(/\s+/);
        cursor++;

        if (parts.length < 1 || !parts[0]) {
            throw new Error(`Format simpul tidak valid pada baris ${cursor}.`);
        }

        if (seenLabels.has(parts[0])) {
            throw new Error(`Label simpul duplikat ditemukan: ${parts[0]}.`);
        }

        seenLabels.add(parts[0]);
        nodeLabels.push(parts[0]);
    }

    if (cursor >= lines.length) {
        throw new Error('Jumlah sisi tidak ditemukan.');
    }

    const edgeCount = Number.parseInt(lines[cursor], 10);
    if (!Number.isInteger(edgeCount) || edgeCount < 0) {
        throw new Error('Jumlah sisi pada file TXT tidak valid.');
    }
    cursor++;

    const edges = [];
    const seenEdges = new Set();

    for (let i = 0; i < edgeCount; i++) {
        if (cursor >= lines.length) {
            throw new Error(`Data sisi kurang. Baru terbaca ${i} dari ${edgeCount}.`);
        }

        const parts = lines[cursor].split(/\s+/);
        cursor++;

        if (parts.length < 2) {
            throw new Error(`Format sisi tidak valid pada baris ${cursor}.`);
        }

        const from = parts[0];
        const to = parts[1];
        const key = compareMatchingLabels(from, to) <= 0 ? `${from}|${to}` : `${to}|${from}`;

        if (seenEdges.has(key)) continue;
        seenEdges.add(key);
        edges.push({ from, to });
    }

    return { nodeLabels, edges };
}

function createMatchingTraceRecorder(limit = MATCHING_TRACE_LIMIT) {
    return {
        limit,
        events: [],
        truncated: false
    };
}

function pushMatchingTrace(recorder, event) {
    if (!recorder) return false;
    if (recorder.events.length >= recorder.limit) {
        recorder.truncated = true;
        return false;
    }

    recorder.events.push(event);
    return true;
}

function snapshotMatchingEdgeKeys(pairLeft) {
    const keys = [];

    for (const [leftId, rightId] of pairLeft.entries()) {
        if (rightId !== null) {
            keys.push(normalizeUndirectedEdgeKey(leftId, rightId));
        }
    }

    return keys;
}

function computeHopcroftKarp(leftNodeIds, rightNodeIds, edges, options = {}) {
    const leftIds = leftNodeIds.slice();
    const rightIds = rightNodeIds.slice();
    const adjacency = new Map(leftIds.map((id) => [id, []]));
    const traceRecorder = options.trace ? createMatchingTraceRecorder(options.traceLimit) : null;

    for (const edge of edges) {
        if (!adjacency.has(edge.from)) {
            adjacency.set(edge.from, []);
        }
        adjacency.get(edge.from).push(edge.to);
    }

    for (const neighbors of adjacency.values()) {
        neighbors.sort((a, b) => a - b);
    }

    const pairLeft = new Map(leftIds.map((id) => [id, null]));
    const pairRight = new Map(rightIds.map((id) => [id, null]));
    const dist = new Map();

    const bfs = () => {
        const queue = [];
        let foundAugmentingPath = false;

        for (const leftId of leftIds) {
            if (pairLeft.get(leftId) === null) {
                dist.set(leftId, 0);
                queue.push(leftId);
            } else {
                dist.set(leftId, Number.POSITIVE_INFINITY);
            }
        }

        pushMatchingTrace(traceRecorder, {
            type: 'bfs-seed',
            freeLeftIds: queue.slice()
        });

        while (queue.length > 0) {
            const currentLeft = queue.shift();
            const currentDist = dist.get(currentLeft);

            pushMatchingTrace(traceRecorder, {
                type: 'bfs-left',
                leftId: currentLeft,
                depth: currentDist
            });

            for (const rightId of adjacency.get(currentLeft) || []) {
                const mate = pairRight.get(rightId);
                pushMatchingTrace(traceRecorder, {
                    type: 'bfs-edge',
                    leftId: currentLeft,
                    rightId,
                    mateLeftId: mate
                });

                if (mate === null) {
                    foundAugmentingPath = true;
                    pushMatchingTrace(traceRecorder, {
                        type: 'bfs-free-right',
                        leftId: currentLeft,
                        rightId
                    });
                } else if (dist.get(mate) === Number.POSITIVE_INFINITY) {
                    dist.set(mate, currentDist + 1);
                    queue.push(mate);
                    pushMatchingTrace(traceRecorder, {
                        type: 'bfs-layer',
                        leftId: currentLeft,
                        rightId,
                        mateLeftId: mate,
                        depth: currentDist + 1
                    });
                }
            }
        }

        pushMatchingTrace(traceRecorder, {
            type: 'bfs-finish',
            found: foundAugmentingPath
        });

        return foundAugmentingPath;
    };

    const dfs = (leftId) => {
        pushMatchingTrace(traceRecorder, {
            type: 'dfs-start',
            leftId
        });

        for (const rightId of adjacency.get(leftId) || []) {
            const mate = pairRight.get(rightId);
            pushMatchingTrace(traceRecorder, {
                type: 'dfs-edge',
                leftId,
                rightId,
                mateLeftId: mate
            });

            if (mate === null) {
                pairLeft.set(leftId, rightId);
                pairRight.set(rightId, leftId);
                return [normalizeUndirectedEdgeKey(leftId, rightId)];
            }

            if (dist.get(mate) === dist.get(leftId) + 1) {
                const suffix = dfs(mate);
                if (suffix) {
                    pairLeft.set(leftId, rightId);
                    pairRight.set(rightId, leftId);

                    return [
                        normalizeUndirectedEdgeKey(leftId, rightId),
                        normalizeUndirectedEdgeKey(mate, rightId),
                        ...suffix
                    ];
                }
            }
        }

        dist.set(leftId, Number.POSITIVE_INFINITY);
        pushMatchingTrace(traceRecorder, {
            type: 'dfs-dead-end',
            leftId
        });
        return null;
    };

    let matchingSize = 0;

    while (bfs()) {
        for (const leftId of leftIds) {
            if (pairLeft.get(leftId) !== null) continue;

            const augmentingPath = dfs(leftId);
            if (augmentingPath) {
                matchingSize++;
                pushMatchingTrace(traceRecorder, {
                    type: 'augment',
                    leftId,
                    edgeKeys: Array.from(new Set(augmentingPath))
                });
                pushMatchingTrace(traceRecorder, {
                    type: 'match-commit',
                    leftId,
                    matchingSize,
                    matchedEdgeKeys: snapshotMatchingEdgeKeys(pairLeft)
                });
            }
        }
    }

    const pairs = [];
    for (const leftId of leftIds) {
        const rightId = pairLeft.get(leftId);
        if (rightId !== null) {
            pairs.push({ left: leftId, right: rightId });
        }
    }

    return {
        matchingSize,
        pairs,
        pairLeft,
        pairRight,
        searchTrace: traceRecorder
            ? {
                events: traceRecorder.events,
                truncated: traceRecorder.truncated
            }
            : null
    };
}

class MatchingPage {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.nextNodeId = 1;
        this.partitionSerial = { left: 1, right: 1 };
        this.currentTool = 'addLeftNode';
        this.hoveredNodeId = null;
        this.draggingNodeId = null;
        this.dragOffset = { x: 0, y: 0 };
        this.edgeStartNodeId = null;
        this.pointerPosition = null;
        this.nodeRadius = 25;
        this.edgeHitThreshold = 8;
        this.matchedEdgeKeys = new Set();
        this.latestMatching = null;
        this.hasComputedMatching = false;
        this.isAnimating = false;
        this.animationRunId = 0;
        this.traceMessages = [];
        this.animationState = this.createEmptyAnimationState();

        this.canvas = document.getElementById('matchingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = document.getElementById('canvasContainer');
        this.solveButton = document.getElementById('solveMatchingBtn');
        this.solveButtonMarkup = this.solveButton ? this.solveButton.innerHTML : '';
        this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupThemeToggle();
        this.setupCanvasEvents();
        this.setupUIEvents();
        this.setupPresetEvents();
        this.resetMatchingTraceUI();
        this.setTool('addLeftNode');
        this.updateStats();
        this.render();
    }

    createEmptyAnimationState() {
        return {
            phaseLabel: 'Siap',
            stepLabel: '0 langkah',
            message: this.getDefaultTraceMessage(),
            activeLeftId: null,
            activeRightId: null,
            activeEdgeKeys: new Set(),
            augmentingEdgeKeys: new Set(),
            frontierLeftIds: new Set(),
            frontierRightIds: new Set(),
            layeredLeftIds: new Set()
        };
    }

    getDefaultTraceMessage() {
        return 'Jejak BFS dan DFS augmentasi akan tampil di sini saat matching dijalankan.';
    }

    resetMatchingTraceUI() {
        this.traceMessages = [];
        this.animationState = this.createEmptyAnimationState();
        this.renderMatchingTraceLog();
        this.syncMatchingTraceUI();
    }

    syncMatchingTraceUI() {
        document.getElementById('matchingTracePhase').textContent = this.animationState.phaseLabel;
        document.getElementById('matchingTraceStep').textContent = this.animationState.stepLabel;
        document.getElementById('matchingTraceMessage').textContent = this.animationState.message;
    }

    renderMatchingTraceLog() {
        const list = document.getElementById('matchingTraceList');
        if (!list) return;

        if (this.traceMessages.length === 0) {
            list.innerHTML = '<div class="matching-trace-item is-muted">Belum ada pencarian yang divisualisasikan.</div>';
            return;
        }

        list.innerHTML = this.traceMessages
            .map((message) => `<div class="matching-trace-item">${escapeHTML(message)}</div>`)
            .join('');
    }

    pushMatchingTraceMessage(message) {
        this.traceMessages.unshift(message);
        this.traceMessages = this.traceMessages.slice(0, 5);
        this.renderMatchingTraceLog();
    }

    setMatchingBusy(disabled) {
        const controlIds = [
            'addLeftNodeTool',
            'addRightNodeTool',
            'addEdgeTool',
            'moveTool',
            'deleteTool',
            'solveMatchingBtn',
            'autoLayout',
            'resetMatching',
            'clearGraph',
            'importTxt',
            'matchingPresetSelect',
            'matchingPresetM',
            'matchingPresetN',
            'loadMatchingPreset',
            'txtFileInput'
        ];

        for (const id of controlIds) {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = disabled;
            }
        }

        this.canvas.style.pointerEvents = disabled ? 'none' : 'auto';
        this.canvasContainer.classList.toggle('is-animating', disabled);

        if (this.solveButton) {
            this.solveButton.innerHTML = disabled
                ? 'Memvisualisasikan Pencarian...'
                : this.solveButtonMarkup;
        }
    }

    getMatchingTracePhaseLabel(event) {
        switch (event.type) {
            case 'bfs-seed':
            case 'bfs-left':
            case 'bfs-edge':
            case 'bfs-free-right':
            case 'bfs-layer':
            case 'bfs-finish':
                return 'BFS Layering';
            case 'dfs-start':
            case 'dfs-edge':
            case 'dfs-dead-end':
                return 'DFS Augment';
            case 'augment':
            case 'match-commit':
                return 'Augmentasi';
            default:
                return 'Pencarian';
        }
    }

    getMatchingTraceDelay(totalSteps, emphasized = false) {
        if (this.prefersReducedMotion) return 24;

        const base = Math.min(165, Math.max(55, Math.round(5200 / Math.max(1, totalSteps))));
        return emphasized ? Math.round(base * 1.5) : base;
    }

    getMatchingNodeLabel(nodeId) {
        return this.getNodeById(nodeId)?.label || String(nodeId);
    }

    describeMatchingTraceEvent(event) {
        switch (event.type) {
            case 'bfs-seed':
                return `${event.freeLeftIds.length} simpul kiri bebas dimasukkan ke antrean BFS.`;
            case 'bfs-left':
                return `BFS memeriksa tetangga ${this.getMatchingNodeLabel(event.leftId)} pada layer ${event.depth}.`;
            case 'bfs-edge':
                return `BFS mengecek sisi ${this.getMatchingNodeLabel(event.leftId)}-${this.getMatchingNodeLabel(event.rightId)}.`;
            case 'bfs-free-right':
                return `${this.getMatchingNodeLabel(event.rightId)} masih bebas, jalur augmentasi mulai terlihat.`;
            case 'bfs-layer':
                return `${this.getMatchingNodeLabel(event.rightId)} sedang dipasangkan dengan ${this.getMatchingNodeLabel(event.mateLeftId)}, maka ${this.getMatchingNodeLabel(event.mateLeftId)} masuk layer berikut.`;
            case 'bfs-finish':
                return event.found
                    ? 'BFS menemukan lapisan yang masih punya peluang augmentasi.'
                    : 'BFS tidak lagi menemukan augmenting path baru.';
            case 'dfs-start':
                return `DFS mencoba memperluas matching dari ${this.getMatchingNodeLabel(event.leftId)}.`;
            case 'dfs-edge':
                return event.mateLeftId === null
                    ? `DFS menguji ${this.getMatchingNodeLabel(event.leftId)}-${this.getMatchingNodeLabel(event.rightId)} dan menemukan simpul kanan yang bebas.`
                    : `DFS menguji ${this.getMatchingNodeLabel(event.leftId)}-${this.getMatchingNodeLabel(event.rightId)} lewat pasangan ${this.getMatchingNodeLabel(event.mateLeftId)}.`;
            case 'dfs-dead-end':
                return `Cabang pencarian dari ${this.getMatchingNodeLabel(event.leftId)} buntu.`;
            case 'augment':
                return `Augmenting path dari ${this.getMatchingNodeLabel(event.leftId)} ditemukan dan akan diterapkan.`;
            case 'match-commit':
                return `Matching bertambah menjadi ${event.matchingSize} pasangan.`;
            default:
                return this.getDefaultTraceMessage();
        }
    }

    dedupeEdgeKeys(keys) {
        return Array.from(new Set(keys || []));
    }

    applyMatchingTraceEvent(event, stepIndex, totalSteps) {
        const nextState = this.createEmptyAnimationState();
        nextState.phaseLabel = this.getMatchingTracePhaseLabel(event);
        nextState.stepLabel = `${stepIndex}/${totalSteps} langkah`;
        nextState.message = this.describeMatchingTraceEvent(event);

        switch (event.type) {
            case 'bfs-seed':
                nextState.frontierLeftIds = new Set(event.freeLeftIds || []);
                break;
            case 'bfs-left':
                nextState.activeLeftId = event.leftId;
                break;
            case 'bfs-edge':
                nextState.activeLeftId = event.leftId;
                nextState.activeRightId = event.rightId;
                nextState.activeEdgeKeys = new Set([normalizeUndirectedEdgeKey(event.leftId, event.rightId)]);
                if (event.mateLeftId !== null) {
                    nextState.layeredLeftIds = new Set([event.mateLeftId]);
                }
                break;
            case 'bfs-free-right':
                nextState.activeLeftId = event.leftId;
                nextState.activeRightId = event.rightId;
                nextState.activeEdgeKeys = new Set([normalizeUndirectedEdgeKey(event.leftId, event.rightId)]);
                nextState.frontierRightIds = new Set([event.rightId]);
                break;
            case 'bfs-layer':
                nextState.activeLeftId = event.leftId;
                nextState.activeRightId = event.rightId;
                nextState.activeEdgeKeys = new Set([normalizeUndirectedEdgeKey(event.leftId, event.rightId)]);
                nextState.frontierRightIds = new Set([event.rightId]);
                nextState.layeredLeftIds = new Set([event.mateLeftId]);
                break;
            case 'dfs-start':
                nextState.activeLeftId = event.leftId;
                break;
            case 'dfs-edge':
                nextState.activeLeftId = event.leftId;
                nextState.activeRightId = event.rightId;
                nextState.activeEdgeKeys = new Set([normalizeUndirectedEdgeKey(event.leftId, event.rightId)]);
                if (event.mateLeftId !== null) {
                    nextState.layeredLeftIds = new Set([event.mateLeftId]);
                }
                break;
            case 'dfs-dead-end':
                nextState.activeLeftId = event.leftId;
                break;
            case 'augment':
                nextState.activeLeftId = event.leftId;
                nextState.augmentingEdgeKeys = new Set(this.dedupeEdgeKeys(event.edgeKeys));
                break;
            case 'match-commit':
                nextState.activeLeftId = event.leftId;
                nextState.augmentingEdgeKeys = new Set(event.matchedEdgeKeys || []);
                this.matchedEdgeKeys = new Set(event.matchedEdgeKeys || []);
                break;
            default:
                break;
        }

        this.animationState = nextState;
        this.syncMatchingTraceUI();
        this.pushMatchingTraceMessage(nextState.message);
        this.updateStats();
        this.render();
    }

    async waitForPlayback(ms) {
        await new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }

    async playMatchingTrace(trace) {
        const events = trace?.events || [];
        if (events.length === 0) return;

        const runId = ++this.animationRunId;
        this.traceMessages = [];
        this.renderMatchingTraceLog();
        this.matchedEdgeKeys.clear();
        this.updateStats();
        this.render();

        for (let index = 0; index < events.length; index++) {
            if (runId !== this.animationRunId) return;

            const event = events[index];
            this.applyMatchingTraceEvent(event, index + 1, events.length);

            const emphasized = ['bfs-free-right', 'augment', 'match-commit'].includes(event.type);
            await this.waitForPlayback(this.getMatchingTraceDelay(events.length, emphasized));
        }

        if (trace.truncated) {
            const message = 'Sebagian langkah diringkas agar animasi tetap responsif.';
            this.animationState.message = message;
            this.syncMatchingTraceUI();
            this.pushMatchingTraceMessage(message);
        }
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

        this.render();
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(320, this.canvasContainer.clientWidth);
        const height = Math.max(320, this.canvasContainer.clientHeight);

        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.nodes.forEach((node) => {
            const clamped = this.clampNodePosition(node.partition, node.x, node.y);
            node.x = clamped.x;
            node.y = clamped.y;
        });
        this.render();
    }

    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    }

    setupUIEvents() {
        document.getElementById('addLeftNodeTool').onclick = () => this.setTool('addLeftNode');
        document.getElementById('addRightNodeTool').onclick = () => this.setTool('addRightNode');
        document.getElementById('addEdgeTool').onclick = () => this.setTool('addEdge');
        document.getElementById('moveTool').onclick = () => this.setTool('move');
        document.getElementById('deleteTool').onclick = () => this.setTool('delete');

        document.getElementById('solveMatchingBtn').onclick = () => this.solveMaximumMatching();
        document.getElementById('autoLayout').onclick = () => {
            this.autoLayout();
            this.showToast('Posisi simpul dirapikan.', 'info');
        };
        document.getElementById('resetMatching').onclick = () => {
            this.clearMatching();
            this.showToast('Hasil matching direset.', 'info');
        };
        document.getElementById('clearGraph').onclick = () => {
            if (this.nodes.length > 0 && !confirm('Hapus semua simpul dan sisi bipartit?')) {
                return;
            }

            this.resetGraph();
            this.showToast('Graf bipartit dikosongkan.', 'error');
        };
        document.getElementById('importTxt').onclick = () => document.getElementById('txtFileInput').click();
        document.getElementById('txtFileInput').onchange = (event) => this.importTXT(event);

        document.getElementById('closeResultModal').onclick = () => this.hideResultModal();
        document.getElementById('resultModal').onclick = (event) => {
            if (event.target.id === 'resultModal') {
                this.hideResultModal();
            }
        };
    }

    setupPresetEvents() {
        const presetSelect = document.getElementById('matchingPresetSelect');
        const loadButton = document.getElementById('loadMatchingPreset');
        if (!presetSelect || !loadButton) return;

        presetSelect.onchange = () => this.updatePresetForm();
        loadButton.onclick = () => this.loadSelectedPreset();
        this.updatePresetForm();
    }

    getPresetDefinitions() {
        return {
            completeBipartite: {
                hint: 'K_m,n menghubungkan semua simpul kiri ke semua simpul kanan.',
                params: {
                    m: { label: 'm', value: 4, min: 1, max: 12 },
                    n: { label: 'n', value: 4, min: 1, max: 12 }
                }
            },
            crown: {
                hint: 'Crown graph C_n adalah K_n,n tanpa pasangan diagonal yang sama indeks.',
                params: {
                    n: { label: 'n', value: 5, min: 2, max: 12 }
                }
            },
            ladder: {
                hint: 'Ladder bipartit L_n berbentuk rangkaian jalur silang kecil.',
                params: {
                    n: { label: 'n', value: 6, min: 2, max: 14 }
                }
            }
        };
    }

    updatePresetForm() {
        const presetSelect = document.getElementById('matchingPresetSelect');
        if (!presetSelect) return;

        const definitions = this.getPresetDefinitions();
        const definition = definitions[presetSelect.value] || definitions.completeBipartite;
        const params = definition.params || {};

        for (const paramId of ['m', 'n']) {
            const field = document.querySelector(`.preset-field[data-param="${paramId}"]`);
            const input = document.getElementById(`matchingPreset${paramId.toUpperCase()}`);
            const label = document.getElementById(`matchingPreset${paramId.toUpperCase()}Label`);
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

        const hint = document.getElementById('matchingPresetHint');
        if (hint) {
            hint.textContent = definition.hint || '';
        }
    }

    loadSelectedPreset() {
        const presetSelect = document.getElementById('matchingPresetSelect');
        if (!presetSelect) return;

        try {
            const definitions = this.getPresetDefinitions();
            const definition = definitions[presetSelect.value] || definitions.completeBipartite;
            const params = this.readPresetParams(definition);
            const preset = this.buildPreset(presetSelect.value, params);

            if (this.nodes.length > 0 && !confirm('Ganti graf bipartit saat ini dengan preset baru?')) {
                return;
            }

            this.applyPreset(preset);
            this.showToast(`${preset.name} dimuat.`, 'success');
        } catch (error) {
            this.showToast(error.message || 'Preset gagal dimuat.', 'error');
        }
    }

    readPresetParams(definition) {
        const params = {};
        const configMap = definition.params || {};

        for (const [paramName, config] of Object.entries(configMap)) {
            const input = document.getElementById(`matchingPreset${paramName.toUpperCase()}`);
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

    buildPreset(type, params) {
        switch (type) {
            case 'completeBipartite':
                return this.buildCompleteBipartitePreset(params.m, params.n);
            case 'crown':
                return this.buildCrownPreset(params.n);
            case 'ladder':
                return this.buildLadderPreset(params.n);
            default:
                return this.buildCompleteBipartitePreset(4, 4);
        }
    }

    buildCompleteBipartitePreset(m, n) {
        const leftLabels = Array.from({ length: m }, (_, index) => `L${index + 1}`);
        const rightLabels = Array.from({ length: n }, (_, index) => `R${index + 1}`);
        const edges = [];

        for (const leftLabel of leftLabels) {
            for (const rightLabel of rightLabels) {
                edges.push({ fromLabel: leftLabel, toLabel: rightLabel });
            }
        }

        return {
            name: `Graf bipartit lengkap K_${m},${n}`,
            leftLabels,
            rightLabels,
            edges
        };
    }

    buildCrownPreset(n) {
        const leftLabels = Array.from({ length: n }, (_, index) => `L${index + 1}`);
        const rightLabels = Array.from({ length: n }, (_, index) => `R${index + 1}`);
        const edges = [];

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                edges.push({
                    fromLabel: leftLabels[i],
                    toLabel: rightLabels[j]
                });
            }
        }

        return {
            name: `Crown graph C_${n}`,
            leftLabels,
            rightLabels,
            edges
        };
    }

    buildLadderPreset(n) {
        const leftLabels = Array.from({ length: n }, (_, index) => `L${index + 1}`);
        const rightLabels = Array.from({ length: n }, (_, index) => `R${index + 1}`);
        const edges = [];

        for (let i = 0; i < n; i++) {
            edges.push({ fromLabel: leftLabels[i], toLabel: rightLabels[i] });
            if (i < n - 1) {
                edges.push({ fromLabel: leftLabels[i], toLabel: rightLabels[i + 1] });
                edges.push({ fromLabel: leftLabels[i + 1], toLabel: rightLabels[i] });
            }
        }

        return {
            name: `Ladder bipartit L_${n}`,
            leftLabels,
            rightLabels,
            edges
        };
    }

    applyPreset(preset) {
        this.resetGraph(false);

        const labelToId = new Map();
        for (const label of preset.leftLabels) {
            const id = this.addNode('left', null, null, label, false);
            labelToId.set(label, id);
        }
        for (const label of preset.rightLabels) {
            const id = this.addNode('right', null, null, label, false);
            labelToId.set(label, id);
        }

        const seenEdges = new Set();
        for (const edge of preset.edges) {
            const fromId = labelToId.get(edge.fromLabel);
            const toId = labelToId.get(edge.toLabel);
            if (!fromId || !toId) continue;

            const key = normalizeUndirectedEdgeKey(fromId, toId);
            if (seenEdges.has(key)) continue;
            seenEdges.add(key);
            this.edges.push({ from: fromId, to: toId });
        }

        this.autoLayout(false);
        this.clearMatching(false);
        this.updateStats();
        this.render();
    }

    resetGraph(shouldRender = true) {
        this.nodes = [];
        this.edges = [];
        this.nextNodeId = 1;
        this.partitionSerial = { left: 1, right: 1 };
        this.hoveredNodeId = null;
        this.draggingNodeId = null;
        this.edgeStartNodeId = null;
        this.pointerPosition = null;
        this.clearMatching(false);
        this.updateStats();
        if (shouldRender) {
            this.render();
        }
    }

    clearMatching(update = true) {
        const wasAnimating = this.isAnimating;
        const hadTraceState = this.traceMessages.length > 0
            || this.animationState.message !== this.getDefaultTraceMessage()
            || this.animationState.phaseLabel !== 'Siap'
            || this.isAnimating;
        this.animationRunId++;
        this.isAnimating = false;
        this.matchedEdgeKeys.clear();
        this.latestMatching = null;
        this.hasComputedMatching = false;
        if (hadTraceState) {
            this.resetMatchingTraceUI();
        }

        if (wasAnimating) {
            this.setMatchingBusy(false);
        }

        if (update) {
            this.updateStats();
            this.render();
        }
    }

    addNode(partition, x = null, y = null, label = null, resetMatching = true) {
        const id = this.nextNodeId++;
        const fallbackPosition = this.getDefaultNodePosition(partition);
        const clampedPosition = this.clampNodePosition(
            partition,
            x ?? fallbackPosition.x,
            y ?? fallbackPosition.y
        );

        const finalLabel = label || this.getNextPartitionLabel(partition);
        this.nodes.push({
            id,
            label: finalLabel,
            partition,
            x: clampedPosition.x,
            y: clampedPosition.y
        });

        if (resetMatching) {
            this.clearMatching(false);
            this.updateStats();
            this.render();
        }

        return id;
    }

    getNextPartitionLabel(partition) {
        const prefix = partition === 'left' ? 'L' : 'R';
        const existingLabels = new Set(this.nodes.map((node) => node.label));
        let serial = this.partitionSerial[partition];

        while (existingLabels.has(`${prefix}${serial}`)) {
            serial++;
        }

        this.partitionSerial[partition] = serial + 1;
        return `${prefix}${serial}`;
    }

    getDefaultNodePosition(partition) {
        const canvasWidth = this.canvas.clientWidth || this.canvas.width;
        const canvasHeight = this.canvas.clientHeight || this.canvas.height;
        const partitionNodes = this.nodes.filter((node) => node.partition === partition);
        const x = partition === 'left' ? canvasWidth * 0.26 : canvasWidth * 0.74;
        const y = 120 + partitionNodes.length * 70;

        return this.clampNodePosition(partition, x, y);
    }

    clampNodePosition(partition, x, y) {
        const width = this.canvas.clientWidth || this.canvas.width;
        const height = this.canvas.clientHeight || this.canvas.height;
        const margin = this.nodeRadius + 18;
        const center = width / 2;
        const leftMin = margin;
        const leftMax = center - margin - 24;
        const rightMin = center + margin + 24;
        const rightMax = width - margin;

        return {
            x: partition === 'left'
                ? Math.min(leftMax, Math.max(leftMin, x))
                : Math.min(rightMax, Math.max(rightMin, x)),
            y: Math.min(height - margin, Math.max(margin + 18, y))
        };
    }

    onMouseDown(event) {
        const point = this.getCanvasPoint(event);
        const hitNode = this.getNodeAt(point.x, point.y);

        if (this.currentTool === 'addLeftNode' || this.currentTool === 'addRightNode') {
            if (!hitNode) {
                const partition = this.currentTool === 'addLeftNode' ? 'left' : 'right';
                this.addNode(partition, point.x, point.y);
                this.showToast(`Simpul ${partition === 'left' ? 'kiri' : 'kanan'} ditambahkan.`, 'success');
            }
            return;
        }

        if (this.currentTool === 'addEdge') {
            if (!hitNode) {
                this.edgeStartNodeId = null;
                this.pointerPosition = null;
                this.render();
                return;
            }

            if (this.edgeStartNodeId === null) {
                this.edgeStartNodeId = hitNode.id;
                this.pointerPosition = point;
                this.render();
                return;
            }

            if (this.edgeStartNodeId === hitNode.id) {
                this.edgeStartNodeId = null;
                this.pointerPosition = null;
                this.render();
                return;
            }

            this.tryAddEdge(this.edgeStartNodeId, hitNode.id);
            this.edgeStartNodeId = null;
            this.pointerPosition = null;
            this.render();
            return;
        }

        if (this.currentTool === 'move' && hitNode) {
            this.draggingNodeId = hitNode.id;
            this.dragOffset = {
                x: point.x - hitNode.x,
                y: point.y - hitNode.y
            };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'delete') {
            if (hitNode) {
                this.removeNode(hitNode.id);
                this.showToast(`Simpul ${hitNode.label} dihapus.`, 'error');
                return;
            }

            const hitEdge = this.getEdgeAt(point.x, point.y);
            if (hitEdge) {
                this.removeEdge(hitEdge);
                this.showToast('Sisi dihapus.', 'error');
            }
        }
    }

    onMouseMove(event) {
        const point = this.getCanvasPoint(event);
        const hitNode = this.getNodeAt(point.x, point.y);
        this.hoveredNodeId = hitNode ? hitNode.id : null;

        if (this.currentTool === 'addEdge' && this.edgeStartNodeId !== null) {
            this.pointerPosition = point;
        }

        if (this.currentTool === 'move' && this.draggingNodeId !== null) {
            const node = this.getNodeById(this.draggingNodeId);
            if (node) {
                const nextPosition = this.clampNodePosition(
                    node.partition,
                    point.x - this.dragOffset.x,
                    point.y - this.dragOffset.y
                );
                node.x = nextPosition.x;
                node.y = nextPosition.y;
                this.clearMatching(false);
                this.updateStats();
            }
        }

        this.updateCanvasCursor();
        this.render();
    }

    onMouseUp() {
        this.draggingNodeId = null;
        this.updateCanvasCursor();
    }

    onMouseLeave() {
        this.hoveredNodeId = null;
        this.draggingNodeId = null;
        this.pointerPosition = null;
        this.updateCanvasCursor();
        this.render();
    }

    updateCanvasCursor() {
        if (this.draggingNodeId !== null) {
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        switch (this.currentTool) {
            case 'move':
                this.canvas.style.cursor = this.hoveredNodeId ? 'grab' : 'default';
                break;
            case 'delete':
                this.canvas.style.cursor = 'not-allowed';
                break;
            case 'addEdge':
                this.canvas.style.cursor = 'crosshair';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
                break;
        }
    }

    tryAddEdge(nodeAId, nodeBId) {
        const nodeA = this.getNodeById(nodeAId);
        const nodeB = this.getNodeById(nodeBId);
        if (!nodeA || !nodeB) return;

        if (nodeA.partition === nodeB.partition) {
            this.showToast('Sisi bipartit harus menghubungkan partisi kiri dan kanan.', 'warning');
            return;
        }

        const fromId = nodeA.partition === 'left' ? nodeA.id : nodeB.id;
        const toId = nodeA.partition === 'right' ? nodeA.id : nodeB.id;
        const edgeKey = normalizeUndirectedEdgeKey(fromId, toId);
        const exists = this.edges.some((edge) => normalizeUndirectedEdgeKey(edge.from, edge.to) === edgeKey);

        if (exists) {
            this.showToast('Sisi tersebut sudah ada.', 'warning');
            return;
        }

        this.edges.push({ from: fromId, to: toId });
        this.clearMatching(false);
        this.updateStats();
        this.render();
        this.showToast(`Sisi ${this.getNodeById(fromId).label}-${this.getNodeById(toId).label} ditambahkan.`, 'success');
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter((node) => node.id !== nodeId);
        this.edges = this.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
        this.clearMatching(false);
        this.updateStats();
        this.render();
    }

    removeEdge(edgeToRemove) {
        this.edges = this.edges.filter((edge) => edge !== edgeToRemove);
        this.clearMatching(false);
        this.updateStats();
        this.render();
    }

    autoLayout(shouldRender = true) {
        const leftNodes = this.nodes
            .filter((node) => node.partition === 'left')
            .sort((a, b) => compareMatchingLabels(a.label, b.label));
        const rightNodes = this.nodes
            .filter((node) => node.partition === 'right')
            .sort((a, b) => compareMatchingLabels(a.label, b.label));

        const width = this.canvas.clientWidth || this.canvas.width;
        const height = this.canvas.clientHeight || this.canvas.height;
        const layoutColumn = (nodes, partition, xPosition) => {
            if (nodes.length === 0) return;

            const top = 110;
            const bottom = height - 80;
            const span = Math.max(1, nodes.length - 1);

            nodes.forEach((node, index) => {
                const y = nodes.length === 1
                    ? height / 2
                    : top + (index / span) * Math.max(0, bottom - top);
                const clamped = this.clampNodePosition(partition, xPosition, y);
                node.x = clamped.x;
                node.y = clamped.y;
            });
        };

        layoutColumn(leftNodes, 'left', width * 0.26);
        layoutColumn(rightNodes, 'right', width * 0.74);

        if (shouldRender) {
            this.render();
        }
    }

    async solveMaximumMatching() {
        if (this.isAnimating) {
            this.showToast('Animasi matching masih berjalan.', 'warning');
            return;
        }

        const leftNodes = this.nodes
            .filter((node) => node.partition === 'left')
            .sort((a, b) => compareMatchingLabels(a.label, b.label));
        const rightNodes = this.nodes
            .filter((node) => node.partition === 'right')
            .sort((a, b) => compareMatchingLabels(a.label, b.label));

        if (leftNodes.length === 0 || rightNodes.length === 0) {
            this.showToast('Graf harus memiliki kedua partisi kiri dan kanan.', 'warning');
            return;
        }

        if (this.edges.length === 0) {
            this.showToast('Tambahkan minimal satu sisi bipartit.', 'warning');
            return;
        }

        const result = computeHopcroftKarp(
            leftNodes.map((node) => node.id),
            rightNodes.map((node) => node.id),
            this.edges,
            {
                trace: true,
                traceLimit: MATCHING_TRACE_LIMIT
            }
        );

        this.hideResultModal();
        this.matchedEdgeKeys.clear();
        this.latestMatching = null;
        this.hasComputedMatching = false;
        this.isAnimating = true;
        this.resetMatchingTraceUI();
        this.animationState.phaseLabel = 'Persiapan';
        this.animationState.stepLabel = `0/${result.searchTrace?.events?.length || 0} langkah`;
        this.animationState.message = 'Membangun layer BFS dan mencoba augmenting path pada graf bipartit.';
        this.syncMatchingTraceUI();
        this.updateStats();
        this.render();
        this.setMatchingBusy(true);

        try {
            await this.playMatchingTrace(result.searchTrace);
        } finally {
            this.isAnimating = false;
            this.setMatchingBusy(false);
        }

        this.latestMatching = result;
        this.hasComputedMatching = true;
        this.matchedEdgeKeys = new Set(
            result.pairs.map((pair) => normalizeUndirectedEdgeKey(pair.left, pair.right))
        );
        this.animationState.phaseLabel = 'Selesai';
        this.animationState.stepLabel = `${result.searchTrace?.events?.length || 0}/${result.searchTrace?.events?.length || 0} langkah`;
        this.animationState.message = `Matching maksimum selesai dengan ${result.matchingSize} pasangan.`;
        this.syncMatchingTraceUI();
        this.pushMatchingTraceMessage(this.animationState.message);
        this.updateStats();
        this.render();

        const pairDescriptions = result.pairs
            .map((pair) => {
                const leftLabel = this.getNodeById(pair.left)?.label || pair.left;
                const rightLabel = this.getNodeById(pair.right)?.label || pair.right;
                return `<p><strong>${escapeHTML(leftLabel)}</strong> &harr; <strong>${escapeHTML(rightLabel)}</strong></p>`;
            })
            .join('');

        const freeLeft = leftNodes.length - result.matchingSize;
        const freeRight = rightNodes.length - result.matchingSize;
        const isPerfect = result.matchingSize * 2 === this.nodes.length && leftNodes.length === rightNodes.length;

        this.showResultModal(`
            <h3>Matching Maksimum Ditemukan</h3>
            <p>Hopcroft-Karp menghasilkan <strong>${result.matchingSize}</strong> pasangan dari kapasitas maksimum teoritis <strong>${Math.min(leftNodes.length, rightNodes.length)}</strong>.</p>
            <p class="result-note">Status: <strong>${isPerfect ? 'Perfect matching' : 'Belum perfect matching'}</strong></p>
            <p>Simpul kiri belum terpasang: <strong>${freeLeft}</strong></p>
            <p>Simpul kanan belum terpasang: <strong>${freeRight}</strong></p>
            <p>Pasangan hasil:</p>
            ${pairDescriptions || '<p>Tidak ada pasangan yang terbentuk.</p>'}
        `);
        this.showToast(`Matching maksimum bernilai ${result.matchingSize}.`, 'success');
    }

    importTXT(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            try {
                const parsed = parseMatchingTXT(loadEvent.target.result);
                const partitionInfo = inferBipartitionFromEdgeList(parsed.nodeLabels, parsed.edges);
                this.applyImportedGraph(parsed, partitionInfo);
                this.showToast(`Graf bipartit TXT berhasil di-import (${parsed.nodeLabels.length} simpul).`, 'success');
            } catch (error) {
                this.showToast(error.message || 'Import TXT gagal.', 'error');
            } finally {
                event.target.value = '';
            }
        };

        reader.onerror = () => {
            this.showToast('File TXT tidak bisa dibaca.', 'error');
            event.target.value = '';
        };

        reader.readAsText(file);
    }

    applyImportedGraph(parsed, partitionInfo) {
        this.resetGraph(false);

        const labelToId = new Map();
        for (const label of partitionInfo.left) {
            const id = this.addNode('left', null, null, label, false);
            labelToId.set(label, id);
        }
        for (const label of partitionInfo.right) {
            const id = this.addNode('right', null, null, label, false);
            labelToId.set(label, id);
        }

        const seenEdges = new Set();
        for (const edge of parsed.edges) {
            const fromColor = partitionInfo.color.get(edge.from);
            const leftLabel = fromColor === 0 ? edge.from : edge.to;
            const rightLabel = fromColor === 0 ? edge.to : edge.from;
            const fromId = labelToId.get(leftLabel);
            const toId = labelToId.get(rightLabel);
            if (!fromId || !toId) continue;

            const key = normalizeUndirectedEdgeKey(fromId, toId);
            if (seenEdges.has(key)) continue;
            seenEdges.add(key);
            this.edges.push({ from: fromId, to: toId });
        }

        this.autoLayout(false);
        this.clearMatching(false);
        this.updateStats();
        this.render();
    }

    updateStats() {
        const leftCount = this.nodes.filter((node) => node.partition === 'left').length;
        const rightCount = this.nodes.filter((node) => node.partition === 'right').length;
        const liveMatchingSize = this.matchedEdgeKeys.size;
        const showingLiveMatching = this.isAnimating;
        const matchingSize = this.hasComputedMatching && this.latestMatching
            ? this.latestMatching.matchingSize
            : showingLiveMatching
                ? liveMatchingSize
                : '-';

        document.getElementById('leftNodeCount').textContent = String(leftCount);
        document.getElementById('rightNodeCount').textContent = String(rightCount);
        document.getElementById('edgeCount').textContent = String(this.edges.length);
        document.getElementById('matchingSizeInfo').textContent = String(matchingSize);
        document.getElementById('currentMode').textContent = this.getCurrentModeLabel();

        document.getElementById('resultMatchingSize').textContent = String(matchingSize);
        document.getElementById('resultMatchedPairs').textContent = this.hasComputedMatching && this.latestMatching
            ? `${this.latestMatching.pairs.length} pasang`
            : showingLiveMatching
                ? `${liveMatchingSize} pasang sementara`
                : '-';
        document.getElementById('resultFreeLeft').textContent = this.hasComputedMatching && this.latestMatching
            ? String(leftCount - this.latestMatching.matchingSize)
            : showingLiveMatching
                ? String(leftCount - liveMatchingSize)
                : '-';
        document.getElementById('resultFreeRight').textContent = this.hasComputedMatching && this.latestMatching
            ? String(rightCount - this.latestMatching.matchingSize)
            : showingLiveMatching
                ? String(rightCount - liveMatchingSize)
                : '-';
    }

    getCurrentModeLabel() {
        switch (this.currentTool) {
            case 'addLeftNode':
                return 'Tambah Simpul Kiri';
            case 'addRightNode':
                return 'Tambah Simpul Kanan';
            case 'addEdge':
                return 'Tambah Sisi';
            case 'move':
                return 'Pindah Simpul';
            case 'delete':
                return 'Hapus';
            default:
                return '-';
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        this.edgeStartNodeId = null;
        this.pointerPosition = null;

        const mapping = {
            addLeftNodeTool: tool === 'addLeftNode',
            addRightNodeTool: tool === 'addRightNode',
            addEdgeTool: tool === 'addEdge',
            moveTool: tool === 'move',
            deleteTool: tool === 'delete'
        };

        for (const [elementId, active] of Object.entries(mapping)) {
            document.getElementById(elementId)?.classList.toggle('active', active);
        }

        this.updateCanvasCursor();
        this.updateStats();
        this.render();
    }

    render() {
        if (!this.ctx) return;

        const width = this.canvas.clientWidth || this.canvas.width;
        const height = this.canvas.clientHeight || this.canvas.height;

        this.ctx.clearRect(0, 0, width, height);
        this.drawPartitionBackdrop(width, height);
        this.drawEdges();
        this.drawTemporaryEdge();
        this.drawNodes();
        this.drawSearchOverlay(width, height);
    }

    drawPartitionBackdrop(width, height) {
        const isDark = document.body.classList.contains('dark-mode');
        const ctx = this.ctx;
        const center = width / 2;

        ctx.save();
        ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(107, 139, 158, 0.08)';
        ctx.fillRect(0, 0, center, height);
        ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(196, 163, 90, 0.08)';
        ctx.fillRect(center, 0, center, height);

        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(139, 115, 85, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(center, 22);
        ctx.lineTo(center, height - 22);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '700 16px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#dbeafe' : '#35556a';
        ctx.textAlign = 'center';
        ctx.fillText('Partisi Kiri', width * 0.25, 34);

        ctx.fillStyle = isDark ? '#fde68a' : '#805f24';
        ctx.fillText('Partisi Kanan', width * 0.75, 34);
        ctx.restore();
    }

    drawEdges() {
        const ctx = this.ctx;
        const colors = this.getThemeColors();

        for (const edge of this.edges) {
            const fromNode = this.getNodeById(edge.from);
            const toNode = this.getNodeById(edge.to);
            if (!fromNode || !toNode) continue;

            const edgeKey = normalizeUndirectedEdgeKey(edge.from, edge.to);
            const isMatched = this.matchedEdgeKeys.has(edgeKey);
            const isActiveSearch = this.animationState.activeEdgeKeys.has(edgeKey);
            const isAugmenting = this.animationState.augmentingEdgeKeys.has(edgeKey);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.lineWidth = isAugmenting ? 6 : isActiveSearch ? 4.5 : isMatched ? 5 : 2.5;
            ctx.strokeStyle = isAugmenting
                ? colors.augmentingEdge
                : isActiveSearch
                    ? colors.searchEdge
                    : isMatched
                        ? colors.matchedEdge
                        : colors.edge;
            ctx.shadowColor = isAugmenting
                ? colors.augmentingGlow
                : isActiveSearch
                    ? colors.searchGlow
                    : isMatched
                        ? colors.matchedGlow
                        : 'transparent';
            ctx.shadowBlur = isAugmenting ? 20 : isActiveSearch ? 15 : isMatched ? 16 : 0;
            ctx.stroke();
            ctx.restore();
        }
    }

    drawTemporaryEdge() {
        if (this.currentTool !== 'addEdge' || this.edgeStartNodeId === null || !this.pointerPosition) {
            return;
        }

        const startNode = this.getNodeById(this.edgeStartNodeId);
        if (!startNode) return;

        const ctx = this.ctx;
        const colors = this.getThemeColors();

        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.previewEdge;
        ctx.beginPath();
        ctx.moveTo(startNode.x, startNode.y);
        ctx.lineTo(this.pointerPosition.x, this.pointerPosition.y);
        ctx.stroke();
        ctx.restore();
    }

    drawNodes() {
        const ctx = this.ctx;
        const colors = this.getThemeColors();

        for (const node of this.nodes) {
            const isHovered = node.id === this.hoveredNodeId;
            const isSelected = node.id === this.edgeStartNodeId;
            const isMatched = this.matchedEdgeKeys.size > 0 && this.isNodeMatched(node.id);
            const isActiveSearch = node.id === this.animationState.activeLeftId || node.id === this.animationState.activeRightId;
            const isFrontier = this.animationState.frontierLeftIds.has(node.id) || this.animationState.frontierRightIds.has(node.id);
            const isLayered = this.animationState.layeredLeftIds.has(node.id);

            const fillColor = node.partition === 'left' ? colors.leftNode : colors.rightNode;

            if (isMatched) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, this.nodeRadius + 8, 0, Math.PI * 2);
                ctx.fillStyle = colors.matchedNodeHalo;
                ctx.fill();
                ctx.restore();
            }

            if (isFrontier || isLayered) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, this.nodeRadius + (isLayered ? 12 : 10), 0, Math.PI * 2);
                ctx.fillStyle = isLayered ? colors.searchLayerHalo : colors.searchFrontierHalo;
                ctx.fill();
                ctx.restore();
            }

            if (isActiveSearch) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, this.nodeRadius + 14, 0, Math.PI * 2);
                ctx.fillStyle = colors.searchActiveHalo;
                ctx.fill();
                ctx.restore();
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, this.nodeRadius + (isHovered ? 2 : 0), 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.lineWidth = isActiveSearch || isSelected ? 4 : 2;
            ctx.strokeStyle = isActiveSearch
                ? colors.searchActiveStroke
                : isSelected
                    ? colors.selection
                    : isFrontier || isLayered
                        ? colors.searchFrontierStroke
                        : colors.nodeStroke;
            ctx.stroke();

            ctx.fillStyle = colors.nodeLabel;
            ctx.font = '700 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.label, node.x, node.y);
            ctx.restore();
        }
    }

    drawSearchOverlay(width, height) {
        const shouldShowOverlay = this.isAnimating
            || this.traceMessages.length > 0
            || this.animationState.message !== this.getDefaultTraceMessage();

        if (!shouldShowOverlay) return;

        const ctx = this.ctx;
        const colors = this.getThemeColors();
        const panelWidth = Math.min(width - 36, 420);
        const panelHeight = 64;
        const x = 18;
        const y = height - panelHeight - 18;

        ctx.save();
        ctx.fillStyle = colors.searchOverlayBg;
        ctx.strokeStyle = colors.searchOverlayBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, panelWidth, panelHeight, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = colors.searchOverlaySubtle;
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.animationState.phaseLabel.toUpperCase(), x + 16, y + 18);

        ctx.fillStyle = colors.searchOverlayText;
        ctx.font = '600 12px Inter, sans-serif';
        const text = this.animationState.message || this.getDefaultTraceMessage();
        ctx.fillText(text.length > 62 ? `${text.slice(0, 59)}...` : text, x + 16, y + 42);
        ctx.restore();
    }

    getThemeColors() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            edge: isDark ? 'rgba(203, 213, 225, 0.55)' : 'rgba(71, 85, 105, 0.45)',
            previewEdge: isDark ? 'rgba(148, 163, 184, 0.75)' : 'rgba(107, 139, 158, 0.75)',
            matchedEdge: isDark ? '#fbbf24' : '#8b5e34',
            matchedGlow: isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(139, 94, 52, 0.35)',
            searchEdge: isDark ? '#7dd3fc' : '#2b7aa0',
            searchGlow: isDark ? 'rgba(125, 211, 252, 0.6)' : 'rgba(43, 122, 160, 0.35)',
            augmentingEdge: isDark ? '#f97316' : '#c26a26',
            augmentingGlow: isDark ? 'rgba(249, 115, 22, 0.55)' : 'rgba(194, 106, 38, 0.34)',
            leftNode: isDark ? '#4f8db5' : '#6b8b9e',
            rightNode: isDark ? '#5c9f78' : '#4a7c59',
            matchedNodeHalo: isDark ? 'rgba(251, 191, 36, 0.18)' : 'rgba(196, 163, 90, 0.18)',
            searchFrontierHalo: isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(107, 139, 158, 0.14)',
            searchLayerHalo: isDark ? 'rgba(147, 197, 253, 0.18)' : 'rgba(80, 138, 179, 0.12)',
            searchActiveHalo: isDark ? 'rgba(249, 115, 22, 0.18)' : 'rgba(194, 106, 38, 0.14)',
            searchActiveStroke: isDark ? '#fdba74' : '#b46123',
            searchFrontierStroke: isDark ? '#7dd3fc' : '#4f8db5',
            nodeStroke: isDark ? '#f8fafc' : '#ffffff',
            nodeLabel: '#ffffff',
            selection: isDark ? '#fde68a' : '#f4d03f',
            searchOverlayBg: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.9)',
            searchOverlayBorder: isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(139, 115, 85, 0.18)',
            searchOverlayText: isDark ? '#e2e8f0' : '#2d2a26',
            searchOverlaySubtle: isDark ? '#fde68a' : '#8b5e34'
        };
    }

    isNodeMatched(nodeId) {
        return this.edges.some((edge) => {
            if (edge.from !== nodeId && edge.to !== nodeId) {
                return false;
            }

            return this.matchedEdgeKeys.has(normalizeUndirectedEdgeKey(edge.from, edge.to));
        });
    }

    getCanvasPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    getNodeById(nodeId) {
        return this.nodes.find((node) => node.id === nodeId) || null;
    }

    getNodeAt(x, y) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const dx = node.x - x;
            const dy = node.y - y;
            if (dx * dx + dy * dy <= this.nodeRadius * this.nodeRadius) {
                return node;
            }
        }

        return null;
    }

    getEdgeAt(x, y) {
        for (const edge of this.edges) {
            const fromNode = this.getNodeById(edge.from);
            const toNode = this.getNodeById(edge.to);
            if (!fromNode || !toNode) continue;

            if (this.pointToSegmentDistance(x, y, fromNode.x, fromNode.y, toNode.x, toNode.y) <= this.edgeHitThreshold) {
                return edge;
            }
        }

        return null;
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            return Math.hypot(px - x1, py - y1);
        }

        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        const projectionX = x1 + t * dx;
        const projectionY = y1 + t * dy;
        return Math.hypot(px - projectionX, py - projectionY);
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
        }, 2200);
    }

    showResultModal(content) {
        document.getElementById('resultModalContent').innerHTML = content;
        document.getElementById('resultModal').classList.add('show');
    }

    hideResultModal() {
        document.getElementById('resultModal').classList.remove('show');
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        computeHopcroftKarp,
        inferBipartitionFromEdgeList,
        parseMatchingTXT
    };
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new MatchingPage();
    });
}
