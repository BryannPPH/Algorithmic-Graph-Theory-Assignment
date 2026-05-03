const SCHEDULE_CODE_COLLATOR = new Intl.Collator('id', {
    numeric: true,
    sensitivity: 'base'
});

const EXACT_SCHEDULE_LIMIT = 18;
const SCHEDULE_SLOT_COLORS = [
    '#6B8B9E',
    '#4A7C59',
    '#C4A35A',
    '#B56B6B',
    '#7B6BA8',
    '#5A9AAD',
    '#D97C54',
    '#5C7AEA'
];

const SCHEDULE_PRESETS = {
    'semester-dasar': {
        hint: 'Contoh seimbang dengan 6 mata kuliah dan 5 slot kuliah.',
        courses: [
            'IF201 | Matematika Diskrit',
            'IF202 | Algoritma dan Pemrograman',
            'IF203 | Struktur Data',
            'IF204 | Basis Data',
            'IF205 | Logika Informatika',
            'IF206 | Sistem Digital'
        ].join('\n'),
        conflicts: [
            'IF201 IF202',
            'IF201 IF205',
            'IF202 IF203',
            'IF202 IF204',
            'IF203 IF204',
            'IF203 IF206',
            'IF204 IF205',
            'IF205 IF206'
        ].join('\n'),
        slots: [
            'Senin 08:00-10:00',
            'Senin 13:00-15:00',
            'Selasa 08:00-10:00',
            'Rabu 10:00-12:00',
            'Kamis 13:00-15:00'
        ].join('\n')
    },
    'padat-3-slot': {
        hint: 'Konflik cukup rapat namun masih muat tepat dalam 3 slot.',
        courses: [
            'IF311 | Graf',
            'IF312 | Probabilitas',
            'IF313 | Organisasi Komputer',
            'IF314 | Analisis Algoritma',
            'IF315 | Pemrograman Berorientasi Objek',
            'IF316 | Jaringan Komputer'
        ].join('\n'),
        conflicts: [
            'IF311 IF312',
            'IF311 IF313',
            'IF311 IF314',
            'IF312 IF314',
            'IF312 IF315',
            'IF313 IF315',
            'IF313 IF316',
            'IF314 IF316',
            'IF315 IF316'
        ].join('\n'),
        slots: [
            'Senin 07:00-09:00',
            'Rabu 09:00-11:00',
            'Jumat 13:00-15:00'
        ].join('\n')
    },
    'slot-kurang': {
        hint: 'Contoh tidak feasible: graf konflik butuh 5 slot, tetapi hanya tersedia 4.',
        courses: [
            'IF401 | Kecerdasan Buatan',
            'IF402 | Kriptografi',
            'IF403 | Komputasi Numerik',
            'IF404 | Rekayasa Perangkat Lunak',
            'IF405 | Sistem Operasi'
        ].join('\n'),
        conflicts: [
            'IF401 IF402',
            'IF401 IF403',
            'IF401 IF404',
            'IF401 IF405',
            'IF402 IF403',
            'IF402 IF404',
            'IF402 IF405',
            'IF403 IF404',
            'IF403 IF405',
            'IF404 IF405'
        ].join('\n'),
        slots: [
            'Senin 08:00-10:00',
            'Selasa 08:00-10:00',
            'Rabu 08:00-10:00',
            'Kamis 08:00-10:00'
        ].join('\n')
    }
};

function compareScheduleCodes(a, b) {
    return SCHEDULE_CODE_COLLATOR.compare(String(a), String(b));
}

function normalizeInputLines(text) {
    return String(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
}

function parseCourses(text) {
    const lines = normalizeInputLines(text);
    const seenCodes = new Set();
    const courses = [];

    for (const line of lines) {
        const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
        const code = parts[0];
        const name = parts.length > 1 ? parts.slice(1).join(' | ') : code;

        if (!code) {
            throw new Error('Setiap mata kuliah harus memiliki kode.');
        }

        if (seenCodes.has(code)) {
            throw new Error(`Kode mata kuliah duplikat: ${code}.`);
        }

        seenCodes.add(code);
        courses.push({ code, name });
    }

    if (courses.length === 0) {
        throw new Error('Masukkan minimal satu mata kuliah.');
    }

    return courses.sort((a, b) => compareScheduleCodes(a.code, b.code));
}

function parseSlots(text) {
    const slots = normalizeInputLines(text);
    if (slots.length === 0) {
        throw new Error('Masukkan minimal satu slot kuliah.');
    }
    return slots;
}

function parseConflicts(text, courseMap) {
    const lines = normalizeInputLines(text);
    const conflicts = [];
    const seen = new Set();

    for (const line of lines) {
        const tokens = line.split(/[\s,;]+/).map((token) => token.trim()).filter(Boolean);
        if (tokens.length < 2) {
            throw new Error(`Format konflik tidak valid: "${line}".`);
        }

        const [rawA, rawB] = tokens;
        if (!courseMap.has(rawA) || !courseMap.has(rawB)) {
            throw new Error(`Konflik "${rawA} ${rawB}" merujuk mata kuliah yang belum didefinisikan.`);
        }

        if (rawA === rawB) {
            throw new Error(`Konflik diri sendiri tidak valid pada mata kuliah ${rawA}.`);
        }

        const key = compareScheduleCodes(rawA, rawB) <= 0
            ? `${rawA}|${rawB}`
            : `${rawB}|${rawA}`;

        if (seen.has(key)) continue;
        seen.add(key);

        conflicts.push({
            from: key.split('|')[0],
            to: key.split('|')[1]
        });
    }

    return conflicts.sort((a, b) => {
        const firstCompare = compareScheduleCodes(a.from, b.from);
        if (firstCompare !== 0) return firstCompare;
        return compareScheduleCodes(a.to, b.to);
    });
}

function buildAdjacency(courseCodes, conflicts) {
    const adjacency = new Map(courseCodes.map((code) => [code, new Set()]));

    for (const conflict of conflicts) {
        adjacency.get(conflict.from).add(conflict.to);
        adjacency.get(conflict.to).add(conflict.from);
    }

    return adjacency;
}

function getNeighborColorSet(code, adjacency, colorMap) {
    const colors = new Set();
    for (const neighbor of adjacency.get(code) || []) {
        if (colorMap.has(neighbor)) {
            colors.add(colorMap.get(neighbor));
        }
    }
    return colors;
}

function selectDsaturVertex(courseCodes, adjacency, colorMap) {
    let bestCode = null;
    let bestSaturation = -1;
    let bestDegree = -1;

    for (const code of courseCodes) {
        if (colorMap.has(code)) continue;

        const saturation = getNeighborColorSet(code, adjacency, colorMap).size;
        const degree = (adjacency.get(code) || new Set()).size;

        if (
            saturation > bestSaturation ||
            (saturation === bestSaturation && degree > bestDegree) ||
            (saturation === bestSaturation && degree === bestDegree && bestCode !== null && compareScheduleCodes(code, bestCode) < 0) ||
            bestCode === null
        ) {
            bestCode = code;
            bestSaturation = saturation;
            bestDegree = degree;
        }
    }

    return bestCode;
}

function greedyDsaturColoring(courseCodes, adjacency) {
    const colors = new Map();
    let colorCount = 0;

    while (colors.size < courseCodes.length) {
        const code = selectDsaturVertex(courseCodes, adjacency, colors);
        const forbidden = getNeighborColorSet(code, adjacency, colors);
        let color = 0;
        while (forbidden.has(color)) {
            color++;
        }

        colors.set(code, color);
        colorCount = Math.max(colorCount, color + 1);
    }

    return { colors, colorCount };
}

function exactDsaturColoring(courseCodes, adjacency, initialResult) {
    if (courseCodes.length === 0) {
        return { colors: new Map(), colorCount: 0 };
    }

    let bestCount = initialResult.colorCount;
    let bestColors = new Map(initialResult.colors);
    const currentColors = new Map();

    const backtrack = (usedColorCount) => {
        if (currentColors.size === courseCodes.length) {
            if (usedColorCount < bestCount) {
                bestCount = usedColorCount;
                bestColors = new Map(currentColors);
            }
            return;
        }

        if (usedColorCount >= bestCount) {
            return;
        }

        const code = selectDsaturVertex(courseCodes, adjacency, currentColors);
        const forbidden = getNeighborColorSet(code, adjacency, currentColors);

        for (let color = 0; color < usedColorCount; color++) {
            if (forbidden.has(color)) continue;
            currentColors.set(code, color);
            backtrack(usedColorCount);
            currentColors.delete(code);
        }

        if (usedColorCount + 1 < bestCount) {
            currentColors.set(code, usedColorCount);
            backtrack(usedColorCount + 1);
            currentColors.delete(code);
        }
    };

    backtrack(0);
    return { colors: bestColors, colorCount: bestCount };
}

function solveScheduleDataset(courses, conflicts, slots) {
    const courseCodes = courses.map((course) => course.code);
    const adjacency = buildAdjacency(courseCodes, conflicts);
    const heuristic = greedyDsaturColoring(courseCodes, adjacency);

    let coloring = heuristic;
    let algorithm = 'DSATUR Greedy';

    if (courses.length <= EXACT_SCHEDULE_LIMIT) {
        coloring = exactDsaturColoring(courseCodes, adjacency, heuristic);
        algorithm = 'DSATUR Branch & Bound (Exact)';
    }

    const assignments = courses
        .map((course) => {
            const slotIndex = coloring.colors.get(course.code) ?? 0;
            const overflowIndex = slotIndex - slots.length + 1;
            const slotLabel = slots[slotIndex] || `Slot Tambahan ${overflowIndex}`;

            return {
                ...course,
                slotIndex,
                slotLabel,
                conflictDegree: adjacency.get(course.code).size
            };
        })
        .sort((a, b) => {
            if (a.slotIndex !== b.slotIndex) return a.slotIndex - b.slotIndex;
            return compareScheduleCodes(a.code, b.code);
        });

    const slotGroups = Array.from({ length: coloring.colorCount }, (_, slotIndex) => ({
        slotIndex,
        label: slots[slotIndex] || `Slot Tambahan ${slotIndex - slots.length + 1}`,
        isOverflow: slotIndex >= slots.length,
        color: SCHEDULE_SLOT_COLORS[slotIndex % SCHEDULE_SLOT_COLORS.length],
        courses: assignments.filter((course) => course.slotIndex === slotIndex)
    }));

    const maxDegree = Math.max(0, ...courseCodes.map((code) => adjacency.get(code).size));
    const isolatedCourses = courseCodes.filter((code) => adjacency.get(code).size === 0).length;
    const possibleEdges = courses.length <= 1 ? 1 : (courses.length * (courses.length - 1)) / 2;
    const density = possibleEdges === 0 ? 0 : conflicts.length / possibleEdges;

    return {
        algorithm,
        usedSlots: coloring.colorCount,
        availableSlots: slots.length,
        overflowSlots: Math.max(0, coloring.colorCount - slots.length),
        feasible: coloring.colorCount <= slots.length,
        assignments,
        slotGroups,
        summary: {
            totalCourses: courses.length,
            totalConflicts: conflicts.length,
            maxDegree,
            isolatedCourses,
            density
        }
    };
}

class SchedulePage {
    constructor() {
        this.currentResult = null;
        this.init();
    }

    init() {
        this.setupThemeToggle();
        this.setupPresetEvents();
        this.setupUIEvents();
        this.applyPreset('semester-dasar');
        this.resetOutput();
        this.updateInputStats();
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

    setupPresetEvents() {
        const presetSelect = document.getElementById('schedulePresetSelect');
        const loadButton = document.getElementById('loadSchedulePreset');
        if (!presetSelect || !loadButton) return;

        presetSelect.onchange = () => this.updatePresetHint();
        loadButton.onclick = () => this.applyPreset(presetSelect.value);
        this.updatePresetHint();
    }

    setupUIEvents() {
        document.getElementById('solveScheduleBtn').onclick = () => this.solveSchedule();
        document.getElementById('loadTemplateBtn').onclick = () => this.applyPreset('semester-dasar');
        document.getElementById('resetInputsBtn').onclick = () => {
            document.getElementById('courseInput').value = '';
            document.getElementById('conflictInput').value = '';
            document.getElementById('slotInput').value = '';
            this.currentResult = null;
            this.resetOutput();
            this.updateInputStats();
            this.showToast('Input penjadwalan dikosongkan.', 'info');
        };

        for (const elementId of ['courseInput', 'conflictInput', 'slotInput']) {
            document.getElementById(elementId).addEventListener('input', () => this.updateInputStats());
        }
    }

    updatePresetHint() {
        const presetKey = document.getElementById('schedulePresetSelect')?.value;
        const hint = document.getElementById('schedulePresetHint');
        if (hint) {
            hint.textContent = SCHEDULE_PRESETS[presetKey]?.hint || '';
        }
    }

    applyPreset(presetKey) {
        const preset = SCHEDULE_PRESETS[presetKey];
        if (!preset) return;

        document.getElementById('courseInput').value = preset.courses;
        document.getElementById('conflictInput').value = preset.conflicts;
        document.getElementById('slotInput').value = preset.slots;
        document.getElementById('schedulePresetSelect').value = presetKey;
        this.updatePresetHint();
        this.currentResult = null;
        this.resetOutput();
        this.updateInputStats();
    }

    updateInputStats() {
        const courseCount = normalizeInputLines(document.getElementById('courseInput').value).length;
        const conflictCount = normalizeInputLines(document.getElementById('conflictInput').value)
            .filter((line) => line.split(/[\s,;]+/).filter(Boolean).length >= 2)
            .length;
        const slotCount = normalizeInputLines(document.getElementById('slotInput').value).length;

        document.getElementById('courseCountInfo').textContent = String(courseCount);
        document.getElementById('conflictCountInfo').textContent = String(conflictCount);
        document.getElementById('slotCountInfo').textContent = String(slotCount);
    }

    solveSchedule() {
        try {
            const courses = parseCourses(document.getElementById('courseInput').value);
            const courseMap = new Map(courses.map((course) => [course.code, course]));
            const conflicts = parseConflicts(document.getElementById('conflictInput').value, courseMap);
            const slots = parseSlots(document.getElementById('slotInput').value);
            const result = solveScheduleDataset(courses, conflicts, slots);

            this.currentResult = result;
            this.renderResult(result);
            this.showToast(result.feasible ? 'Jadwal berhasil dibentuk.' : 'Jadwal valid membutuhkan slot tambahan.', result.feasible ? 'success' : 'warning');
        } catch (error) {
            this.currentResult = null;
            this.resetOutput();
            this.showToast(error.message || 'Penjadwalan gagal.', 'error');
        }
    }

    resetOutput() {
        document.getElementById('usedSlotInfo').textContent = '-';
        document.getElementById('algorithmInfo').textContent = '-';
        document.getElementById('resultRequiredSlots').textContent = '-';
        document.getElementById('resultAvailableSlots').textContent = '-';
        document.getElementById('resultOverflowSlots').textContent = '-';
        document.getElementById('resultScheduleStatus').textContent = '-';
        this.renderStatusBanner('Masukkan mata kuliah, konflik, dan slot lalu jalankan penjadwalan.', 'info');
        this.renderBoardEmpty();
        this.renderAssignmentTable([]);
        this.renderSummary([]);
    }

    renderResult(result) {
        document.getElementById('usedSlotInfo').textContent = String(result.usedSlots);
        document.getElementById('algorithmInfo').textContent = result.algorithm;
        document.getElementById('resultRequiredSlots').textContent = String(result.usedSlots);
        document.getElementById('resultAvailableSlots').textContent = String(result.availableSlots);
        document.getElementById('resultOverflowSlots').textContent = String(result.overflowSlots);
        document.getElementById('resultScheduleStatus').textContent = result.feasible ? 'Feasible' : 'Butuh Slot Tambahan';

        const bannerText = result.feasible
            ? `Jadwal valid terbentuk dengan ${result.usedSlots} slot dari ${result.availableSlots} slot yang tersedia.`
            : `Graf konflik membutuhkan ${result.usedSlots} slot. Tambahkan ${result.overflowSlots} slot lagi agar jadwal feasible.`;
        this.renderStatusBanner(bannerText, result.feasible ? 'success' : 'warning');
        this.renderBoard(result.slotGroups);
        this.renderAssignmentTable(result.assignments);
        this.renderSummary(result);
    }

    renderStatusBanner(text, type) {
        const banner = document.getElementById('statusBanner');
        banner.textContent = text;
        banner.classList.remove('is-success', 'is-warning');
        if (type === 'success') banner.classList.add('is-success');
        if (type === 'warning') banner.classList.add('is-warning');
    }

    renderBoard(slotGroups = []) {
        const board = document.getElementById('scheduleBoard');
        if (!board) return;

        if (slotGroups.length === 0) {
            this.renderBoardEmpty();
            return;
        }

        board.innerHTML = slotGroups.map((group) => `
            <article class="schedule-slot-column${group.isOverflow ? ' is-overflow' : ''}">
                <div class="schedule-slot-head">
                    <div>
                        <div class="schedule-slot-title">${this.escapeHTML(group.label)}</div>
                        <div class="schedule-slot-meta">${group.courses.length} mata kuliah</div>
                    </div>
                </div>
                <div class="schedule-slot-list">
                    ${group.courses.map((course) => `
                        <div class="schedule-course-card" style="--slot-color: ${group.color}">
                            <span class="schedule-course-code">${this.escapeHTML(course.code)}</span>
                            <span class="schedule-course-name">${this.escapeHTML(course.name)}</span>
                            <span class="schedule-course-meta">${course.conflictDegree} konflik</span>
                        </div>
                    `).join('')}
                </div>
            </article>
        `).join('');
    }

    renderBoardEmpty() {
        const board = document.getElementById('scheduleBoard');
        if (!board) return;
        board.innerHTML = '<div class="schedule-empty">Belum ada jadwal untuk ditampilkan.</div>';
    }

    renderAssignmentTable(assignments) {
        const tbody = document.getElementById('assignmentTableBody');
        if (!tbody) return;

        if (!assignments || assignments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4"><div class="schedule-empty">Belum ada penempatan mata kuliah.</div></td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = assignments.map((assignment) => `
            <tr>
                <td><strong>${this.escapeHTML(assignment.code)}</strong></td>
                <td>${this.escapeHTML(assignment.name)}</td>
                <td>${this.escapeHTML(assignment.slotLabel)}</td>
                <td>${assignment.conflictDegree}</td>
            </tr>
        `).join('');
    }

    renderSummary(result) {
        const summaryContainer = document.getElementById('scheduleSummaryCards');
        if (!summaryContainer) return;

        if (!result || !result.summary) {
            summaryContainer.innerHTML = '<div class="schedule-empty">Statistik konflik akan muncul di sini.</div>';
            return;
        }

        const densityPercent = `${(result.summary.density * 100).toFixed(1)}%`;
        const items = [
            ['Algoritma', result.algorithm],
            ['Konflik Total', String(result.summary.totalConflicts)],
            ['Derajat Maksimum', String(result.summary.maxDegree)],
            ['Tanpa Konflik', String(result.summary.isolatedCourses)],
            ['Kepadatan Graf', densityPercent],
            ['Status Slot', result.feasible ? 'Cukup' : `Kurang ${result.overflowSlots}`]
        ];

        summaryContainer.innerHTML = items.map(([label, value]) => `
            <div class="schedule-summary-item">
                <span>${this.escapeHTML(label)}</span>
                <strong>${this.escapeHTML(value)}</strong>
            </div>
        `).join('');
    }

    escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
}

if (typeof module !== 'undefined') {
    module.exports = {
        parseCourses,
        parseConflicts,
        parseSlots,
        greedyDsaturColoring,
        exactDsaturColoring,
        solveScheduleDataset
    };
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new SchedulePage();
    });
}
