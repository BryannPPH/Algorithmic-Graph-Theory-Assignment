// Constants
const MAX_ROWS = 30;
const MAX_COLS = 30;
const MIN_SIZE = 1;

let rows = 8, cols = 10;
let grid = [];
let islandMap = [];
let currentTool = 'land';
let isDrawing = false;
let island3DView = null;
let islandViewMode = '2d';
let isAnimating = false;
let animationSpeed = 150;
let themeToggleBtn = null;

function init() {
    setupThemeToggle();
    generateGrid();
    document.addEventListener('mouseup', () => isDrawing = false);
    setupSizeControls();
    
    const speedSlider = document.getElementById('islandSpeedSlider');
    if (speedSlider) {
        speedSlider.oninput = (e) => {
            animationSpeed = parseInt(e.target.value);
            const speedValue = document.getElementById('islandSpeedValue');
            if (speedValue) speedValue.textContent = `${animationSpeed}ms`;
        };
    }
}

function setupThemeToggle() {
    themeToggleBtn = document.getElementById('themeToggleBtn');
    if (!themeToggleBtn) return;

    const savedTheme = localStorage.getItem('graph-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    applyTheme(initialTheme, false);

    themeToggleBtn.onclick = () => {
        const isDark = document.body.classList.contains('dark-mode');
        applyTheme(isDark ? 'light' : 'dark');
    };
}

function applyTheme(theme, persist = true) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);

    if (themeToggleBtn) {
        const text = themeToggleBtn.querySelector('.theme-text');
        if (text) {
            text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        }

        const nextModeLabel = isDark ? 'light mode' : 'dark mode';
        themeToggleBtn.setAttribute('aria-label', `Aktifkan ${nextModeLabel}`);
        themeToggleBtn.setAttribute('title', `Aktifkan ${nextModeLabel}`);
        themeToggleBtn.classList.toggle('is-dark', isDark);
    }

    if (persist) {
        localStorage.setItem('graph-theme', theme);
    }
}

function setupSizeControls() {
    const rowsInput = document.getElementById('gridRows');
    const colsInput = document.getElementById('gridCols');
    
    if (rowsInput) {
        rowsInput.min = MIN_SIZE;
        rowsInput.max = MAX_ROWS;
        rowsInput.addEventListener('input', () => {
            let val = parseInt(rowsInput.value) || MIN_SIZE;
            val = Math.max(MIN_SIZE, Math.min(MAX_ROWS, val));
            rowsInput.value = val;
        });
        rowsInput.addEventListener('blur', () => {
            let val = parseInt(rowsInput.value) || MIN_SIZE;
            val = Math.max(MIN_SIZE, Math.min(MAX_ROWS, val));
            rowsInput.value = val;
        });
    }
    
    if (colsInput) {
        colsInput.min = MIN_SIZE;
        colsInput.max = MAX_COLS;
        colsInput.addEventListener('input', () => {
            let val = parseInt(colsInput.value) || MIN_SIZE;
            val = Math.max(MIN_SIZE, Math.min(MAX_COLS, val));
            colsInput.value = val;
        });
        colsInput.addEventListener('blur', () => {
            let val = parseInt(colsInput.value) || MIN_SIZE;
            val = Math.max(MIN_SIZE, Math.min(MAX_COLS, val));
            colsInput.value = val;
        });
    }
}

function changeSize(type, delta) {
    const input = document.getElementById(type === 'rows' ? 'gridRows' : 'gridCols');
    if (!input) return;
    
    const maxVal = type === 'rows' ? MAX_ROWS : MAX_COLS;
    let val = parseInt(input.value) || MIN_SIZE;
    val = val + delta;
    val = Math.max(MIN_SIZE, Math.min(maxVal, val));
    input.value = val;
}

// ==================== VIEW TOGGLE ====================
function switchIslandTo2D() {
    islandViewMode = '2d';
    
    document.getElementById('islandView2DBtn')?.classList.add('active');
    document.getElementById('islandView3DBtn')?.classList.remove('active');
    const grid2D = document.getElementById('grid2DContainer');
    const island3D = document.getElementById('island3DContainer');
    if (grid2D) grid2D.style.display = 'block';
    if (island3D) island3D.classList.remove('active');
    
    if (island3DView) {
        island3DView.stop();
    }
    
    showToast('Tampilan 2D aktif');
}

function switchIslandTo3D() {
    let hasLand = false;
    for (let i = 0; i < rows && !hasLand; i++) {
        for (let j = 0; j < cols && !hasLand; j++) {
            if (grid[i][j] === 1) hasLand = true;
        }
    }

    if (!hasLand) {
        showToast('Tambahkan daratan terlebih dahulu!');
        return;
    }

    islandViewMode = '3d';
    
    document.getElementById('islandView2DBtn')?.classList.remove('active');
    document.getElementById('islandView3DBtn')?.classList.add('active');
    const grid2D = document.getElementById('grid2DContainer');
    const island3D = document.getElementById('island3DContainer');
    if (grid2D) grid2D.style.display = 'none';
    if (island3D) island3D.classList.add('active');
    
    setTimeout(() => {
        if (!island3DView || !island3DView.initialized) {
            island3DView = new Island3DView();
            island3DView.init('threejs-island-inline');
        }
        island3DView.loadIslandGrid(grid, islandMap);
        island3DView.start();
    }, 100);
    
    showToast('Tampilan 3D aktif');
}

function resetIslandCamera() {
    if (island3DView) {
        island3DView.resetCamera();
        showToast('Kamera direset!');
    }
}

function toggleIslandRotate() {
    if (island3DView) {
        const isRotating = island3DView.toggleAutoRotate();
        document.getElementById('toggleIslandRot')?.classList.toggle('active', isRotating);
        showToast(isRotating ? 'Auto-rotate ON' : 'Auto-rotate OFF');
    }
}

function update3DIfActive() {
    if (islandViewMode === '3d' && island3DView && island3DView.initialized) {
        island3DView.loadIslandGrid(grid, islandMap);
    }
}

// ==================== GRID FUNCTIONS ====================
function showToast(message, type = 'info') {
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

function generateGrid() {
    const rowsInput = document.getElementById('gridRows');
    const colsInput = document.getElementById('gridCols');
    
    rows = parseInt(rowsInput?.value) || 8;
    cols = parseInt(colsInput?.value) || 10;
    
    // Enforce limits
    rows = Math.max(MIN_SIZE, Math.min(MAX_ROWS, rows));
    cols = Math.max(MIN_SIZE, Math.min(MAX_COLS, cols));
    
    // Update inputs to reflect enforced values
    if (rowsInput) rowsInput.value = rows;
    if (colsInput) colsInput.value = cols;
    
    const container = document.getElementById('gridContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calculate cell size based on grid dimensions
    const maxCellSize = 38;
    const minCellSize = 18;
    const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(500 / Math.max(rows, cols))));
    
    container.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    
    grid = [];
    islandMap = [];
    
    for (let i = 0; i < rows; i++) {
        const row = [];
        const mapRow = [];
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement('button');
            cell.className = 'cell water';
            cell.id = `cell-${i}-${j}`;
            cell.dataset.r = i;
            cell.dataset.c = j;
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${Math.max(10, cellSize * 0.45)}px`;
            
            cell.onmousedown = (e) => {
                e.preventDefault();
                isDrawing = true;
                toggleCell(i, j);
            };
            
            cell.onmouseenter = () => {
                if (isDrawing) toggleCell(i, j);
            };
            
            container.appendChild(cell);
            row.push(0);
            mapRow.push(0);
        }
        grid.push(row);
        islandMap.push(mapRow);
    }
    
    const sizeDisplay = document.getElementById('gridSizeDisplay');
    if (sizeDisplay) sizeDisplay.textContent = `${rows} × ${cols}`;
    
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.style.display = 'none';
    
    if (islandViewMode === '3d') {
        switchIslandTo2D();
    }
}

function toggleCell(r, c) {
    if (isAnimating) return;
    
    const val = currentTool === 'land' ? 1 : 0;
    grid[r][c] = val;
    
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) {
        cell.className = `cell ${val ? 'land' : 'water'}`;
    }
    
    islandMap[r][c] = 0;
}

function setTool(tool) {
    currentTool = tool;
    document.getElementById('toolLand')?.classList.toggle('active', tool === 'land');
    document.getElementById('toolWater')?.classList.toggle('active', tool === 'water');
}

function fillAll(val) {
    if (isAnimating) return;
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            grid[i][j] = val;
            islandMap[i][j] = 0;
            const cell = document.getElementById(`cell-${i}-${j}`);
            if (cell) cell.className = `cell ${val ? 'land' : 'water'}`;
        }
    }
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.style.display = 'none';
    update3DIfActive();
}

function randomFill() {
    if (isAnimating) return;
    
    const density = Math.random() * 0.3 + 0.2;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const val = Math.random() < density ? 1 : 0;
            grid[i][j] = val;
            islandMap[i][j] = 0;
            const cell = document.getElementById(`cell-${i}-${j}`);
            if (cell) cell.className = `cell ${val ? 'land' : 'water'}`;
        }
    }
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.style.display = 'none';
    update3DIfActive();
}

// ==================== ISLAND COUNTING WITH VISUALIZATION ====================
async function countIslands() {
    if (isAnimating) {
        showToast('Animasi sedang berjalan!', 'warning');
        return;
    }
    
    resetCellColors();
    
    const searchType = document.querySelector('input[name="searchType"]:checked')?.value || 'bfs';
    const animate = document.getElementById('animateSearch')?.checked ?? true;
    
    if (animate) {
        isAnimating = true;
        disableControls(true);
    }
    
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    islandMap = Array.from({ length: rows }, () => Array(cols).fill(0));
    
    let islands = 0, largest = 0, totalLand = 0;
    const dr = [-1, 1, 0, 0], dc = [0, 0, -1, 1];
    const islandColors = [
        { css: 'i1', hex: 0xFF6B6B },
        { css: 'i2', hex: 0x4ECDC4 },
        { css: 'i3', hex: 0x45B7D1 },
        { css: 'i4', hex: 0xFFA07A },
        { css: 'i5', hex: 0x98D8C8 },
        { css: 'i6', hex: 0xF7DC6F },
        { css: 'i7', hex: 0xBB8FCE },
        { css: 'i8', hex: 0x85C1E9 }
    ];
    
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    
    async function bfs(sr, sc, num) {
        const queue = [[sr, sc]];
        visited[sr][sc] = true;
        islandMap[sr][sc] = num;
        let size = 0;
        const colorData = islandColors[(num - 1) % islandColors.length];
        
        while (queue.length > 0) {
            const [r, c] = queue.shift();
            size++;
            
            if (animate) {
                highlightCell2D(r, c, 'visiting');
                if (island3DView && islandViewMode === '3d') {
                    island3DView.highlightCell(r, c, 0xFFD700, 1.4);
                }
                await delay(animationSpeed);
            }
            
            highlightCell2D(r, c, colorData.css);
            if (island3DView && islandViewMode === '3d') {
                island3DView.highlightCell(r, c, colorData.hex, 1.1);
            }
            
            for (let k = 0; k < 4; k++) {
                const nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                    grid[nr][nc] === 1 && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    islandMap[nr][nc] = num;
                    queue.push([nr, nc]);
                    
                    if (animate) {
                        highlightCell2D(nr, nc, 'frontier');
                    }
                }
            }
            
            if (animate && size % 3 === 0) {
                await delay(animationSpeed / 2);
            }
        }
        return size;
    }
    
    async function dfs(sr, sc, num) {
        const stack = [[sr, sc]];
        visited[sr][sc] = true;
        islandMap[sr][sc] = num;
        let size = 0;
        const colorData = islandColors[(num - 1) % islandColors.length];
        
        while (stack.length > 0) {
            const [r, c] = stack.pop();
            size++;
            
            if (animate) {
                highlightCell2D(r, c, 'visiting');
                if (island3DView && islandViewMode === '3d') {
                    island3DView.highlightCell(r, c, 0xFFD700, 1.4);
                }
                await delay(animationSpeed);
            }
            
            highlightCell2D(r, c, colorData.css);
            if (island3DView && islandViewMode === '3d') {
                island3DView.highlightCell(r, c, colorData.hex, 1.1);
            }
            
            for (let k = 0; k < 4; k++) {
                const nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                    grid[nr][nc] === 1 && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    islandMap[nr][nc] = num;
                    stack.push([nr, nc]);
                    
                    if (animate) {
                        highlightCell2D(nr, nc, 'frontier');
                    }
                }
            }
        }
        return size;
    }
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 1) {
                totalLand++;
                if (!visited[i][j]) {
                    islands++;
                    
                    if (animate) {
                        highlightCell2D(i, j, 'start');
                        await delay(animationSpeed * 2);
                    }
                    
                    const size = searchType === 'dfs' 
                        ? await dfs(i, j, islands)
                        : await bfs(i, j, islands);
                    largest = Math.max(largest, size);
                    
                    if (animate) {
                        showToast(`Island ${islands} ditemukan! (${size} sel)`, 'success');
                        await delay(animationSpeed * 3);
                    }
                }
            }
        }
    }
    
    const totalWater = rows * cols - totalLand;
    
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.style.display = 'block';
    
    const resIslands = document.getElementById('resIslands');
    const resLargest = document.getElementById('resLargest');
    const resLand = document.getElementById('resLand');
    const resWater = document.getElementById('resWater');
    
    if (resIslands) resIslands.textContent = islands;
    if (resLargest) resLargest.textContent = largest;
    if (resLand) resLand.textContent = totalLand;
    if (resWater) resWater.textContent = totalWater;
    
    const modalIslands = document.getElementById('modalIslands');
    const modalLargest = document.getElementById('modalLargest');
    const modalLand = document.getElementById('modalLand');
    const modalWater = document.getElementById('modalWater');
    const modalAlgorithm = document.getElementById('modalAlgorithm');
    const resultModal = document.getElementById('resultModal');
    
    if (modalIslands) modalIslands.textContent = islands;
    if (modalLargest) modalLargest.textContent = largest;
    if (modalLand) modalLand.textContent = totalLand;
    if (modalWater) modalWater.textContent = totalWater;
    if (modalAlgorithm) modalAlgorithm.textContent = searchType.toUpperCase();
    if (resultModal) resultModal.classList.add('show');
    
    if (animate) {
        isAnimating = false;
        disableControls(false);
    }
    
    update3DIfActive();
}

function highlightCell2D(r, c, state) {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (!cell) return;
    
    cell.classList.remove('visiting', 'frontier', 'start', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8');
    
    if (state === 'visiting') {
        cell.classList.add('visiting');
    } else if (state === 'frontier') {
        cell.classList.add('frontier');
    } else if (state === 'start') {
        cell.classList.add('start');
    } else if (state.startsWith('i')) {
        cell.className = `cell ${state}`;
    }
}

function resetCellColors() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.getElementById(`cell-${i}-${j}`);
            if (cell) {
                cell.classList.remove('visiting', 'frontier', 'start', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8');
                cell.className = `cell ${grid[i][j] === 1 ? 'land' : 'water'}`;
            }
        }
    }
    
    if (island3DView && island3DView.initialized) {
        island3DView.resetCellColors();
    }
}

function disableControls(disabled) {
    const buttons = document.querySelectorAll('.islands-sidebar button, .islands-sidebar input');
    buttons.forEach(btn => {
        if (!btn.id?.includes('Speed')) {
            btn.disabled = disabled;
        }
    });
}

function closeModal() {
    const resultModal = document.getElementById('resultModal');
    if (resultModal) resultModal.classList.remove('show');
}

function stopAnimation() {
    isAnimating = false;
    disableControls(false);
    showToast('Animasi dihentikan', 'warning');
}

document.addEventListener('DOMContentLoaded', init);
