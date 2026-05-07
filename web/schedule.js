const SCHEDULE_CODE_COLLATOR = new Intl.Collator('id', {
    numeric: true,
    sensitivity: 'base'
});

const EXACT_SCHEDULE_LIMIT = 18;
const SCHEDULE_TRACE_LIMIT = 220;
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

function buildDenseWeekSchedulePreset() {
    const courses = [
        ['IF501', 'Analisis Perancangan Algoritma'],
        ['IF502', 'Arsitektur Komputer Lanjut'],
        ['IF503', 'Sistem Basis Data'],
        ['IF504', 'Jaringan Komputer'],
        ['IF505', 'Kecerdasan Buatan'],
        ['IF506', 'Rekayasa Perangkat Lunak'],
        ['IF507', 'Graf dan Optimasi'],
        ['IF508', 'Keamanan Informasi'],
        ['IF509', 'Komputasi Paralel'],
        ['IF510', 'Sistem Operasi Lanjut'],
        ['IF511', 'Manajemen Proyek TI'],
        ['IF512', 'Interaksi Manusia dan Komputer'],
        ['IF513', 'Data Mining'],
        ['IF514', 'Komputasi Awan'],
        ['IF515', 'Pemrosesan Citra Digital'],
        ['IF516', 'Pengujian Perangkat Lunak'],
        ['IF517', 'Teori Bahasa dan Automata'],
        ['IF518', 'Kriptografi Terapan'],
        ['IF519', 'Sistem Terdistribusi'],
        ['IF520', 'Pembelajaran Mesin']
    ];

    const slots = [
        'Senin 07:30-09:30',
        'Senin 13:00-15:00',
        'Selasa 07:30-09:30',
        'Selasa 13:00-15:00',
        'Rabu 07:30-09:30',
        'Rabu 13:00-15:00',
        'Kamis 07:30-09:30',
        'Kamis 13:00-15:00',
        'Jumat 07:30-09:30',
        'Jumat 13:00-15:00'
    ];

    const sameSlotPairs = [
        ['IF501', 'IF511'],
        ['IF502', 'IF512'],
        ['IF503', 'IF513'],
        ['IF504', 'IF514'],
        ['IF505', 'IF515'],
        ['IF506', 'IF516'],
        ['IF507', 'IF517'],
        ['IF508', 'IF518'],
        ['IF509', 'IF519'],
        ['IF510', 'IF520']
    ];

    const nonConflictPairs = new Set(sameSlotPairs.map(([a, b]) => `${a}|${b}`));
    const conflicts = [];

    for (let i = 0; i < courses.length; i++) {
        for (let j = i + 1; j < courses.length; j++) {
            const codeA = courses[i][0];
            const codeB = courses[j][0];
            const key = `${codeA}|${codeB}`;
            if (nonConflictPairs.has(key)) continue;
            conflicts.push(`${codeA} ${codeB}`);
        }
    }

    return {
        hint: 'Dataset besar dan sangat padat: 20 mata kuliah, 180 konflik, dan 10 slot dari Senin sampai Jumat. Hampir semua pasangan bentrok kecuali 10 pasangan yang memang berbagi slot.',
        courses: courses.map(([code, name]) => `${code} | ${name}`).join('\n'),
        conflicts: conflicts.join('\n'),
        slots: slots.join('\n')
    };
}

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
    },
    'senin-jumat-padat': buildDenseWeekSchedulePreset()
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

function createScheduleTraceRecorder(limit = SCHEDULE_TRACE_LIMIT) {
    return {
        limit,
        events: [],
        truncated: false
    };
}

function pushScheduleTrace(recorder, event) {
    if (!recorder) return false;
    if (recorder.events.length >= recorder.limit) {
        recorder.truncated = true;
        return false;
    }

    recorder.events.push(event);
    return true;
}

function buildSlotLabel(slots, slotIndex) {
    const overflowIndex = slotIndex - slots.length + 1;
    return slots[slotIndex] || `Slot Tambahan ${overflowIndex}`;
}

function greedyDsaturColoring(courseCodes, adjacency, traceRecorder = null) {
    const colors = new Map();
    let colorCount = 0;

    pushScheduleTrace(traceRecorder, {
        type: 'greedy-start'
    });

    while (colors.size < courseCodes.length) {
        const code = selectDsaturVertex(courseCodes, adjacency, colors);
        const forbidden = getNeighborColorSet(code, adjacency, colors);
        const saturation = forbidden.size;
        const degree = (adjacency.get(code) || new Set()).size;
        pushScheduleTrace(traceRecorder, {
            type: 'select',
            phase: 'greedy',
            code,
            saturation,
            degree,
            usedColorCount: colorCount
        });

        let color = 0;
        while (forbidden.has(color)) {
            color++;
        }

        colors.set(code, color);
        colorCount = Math.max(colorCount, color + 1);
        pushScheduleTrace(traceRecorder, {
            type: 'assign',
            phase: 'greedy',
            code,
            color,
            usedColorCount: colorCount,
            reusedColor: color < colorCount - 1
        });
    }

    return { colors, colorCount };
}

function exactDsaturColoring(courseCodes, adjacency, initialResult, traceRecorder = null) {
    if (courseCodes.length === 0) {
        return { colors: new Map(), colorCount: 0 };
    }

    let bestCount = initialResult.colorCount;
    let bestColors = new Map(initialResult.colors);
    const currentColors = new Map();

    pushScheduleTrace(traceRecorder, {
        type: 'exact-start',
        bestCount
    });

    const backtrack = (usedColorCount) => {
        if (currentColors.size === courseCodes.length) {
            if (usedColorCount < bestCount) {
                bestCount = usedColorCount;
                bestColors = new Map(currentColors);
                pushScheduleTrace(traceRecorder, {
                    type: 'best',
                    phase: 'exact',
                    bestCount
                });
            }
            return;
        }

        if (usedColorCount >= bestCount) {
            pushScheduleTrace(traceRecorder, {
                type: 'prune',
                phase: 'exact',
                usedColorCount,
                bestCount
            });
            return;
        }

        const code = selectDsaturVertex(courseCodes, adjacency, currentColors);
        const forbidden = getNeighborColorSet(code, adjacency, currentColors);
        const saturation = forbidden.size;
        const degree = (adjacency.get(code) || new Set()).size;
        pushScheduleTrace(traceRecorder, {
            type: 'select',
            phase: 'exact',
            code,
            saturation,
            degree,
            usedColorCount,
            bestCount
        });

        for (let color = 0; color < usedColorCount; color++) {
            if (forbidden.has(color)) continue;
            currentColors.set(code, color);
            pushScheduleTrace(traceRecorder, {
                type: 'assign',
                phase: 'exact',
                code,
                color,
                usedColorCount,
                reusedColor: true
            });
            backtrack(usedColorCount);
            currentColors.delete(code);
            pushScheduleTrace(traceRecorder, {
                type: 'unassign',
                phase: 'exact',
                code,
                color
            });
        }

        if (usedColorCount + 1 < bestCount) {
            currentColors.set(code, usedColorCount);
            pushScheduleTrace(traceRecorder, {
                type: 'assign',
                phase: 'exact',
                code,
                color: usedColorCount,
                usedColorCount: usedColorCount + 1,
                reusedColor: false
            });
            backtrack(usedColorCount + 1);
            currentColors.delete(code);
            pushScheduleTrace(traceRecorder, {
                type: 'unassign',
                phase: 'exact',
                code,
                color: usedColorCount
            });
        } else {
            pushScheduleTrace(traceRecorder, {
                type: 'skip-new-color',
                phase: 'exact',
                code,
                color: usedColorCount,
                bestCount
            });
        }
    };

    backtrack(0);
    return { colors: bestColors, colorCount: bestCount };
}

function solveScheduleDataset(courses, conflicts, slots, options = {}) {
    const courseCodes = courses.map((course) => course.code);
    const adjacency = buildAdjacency(courseCodes, conflicts);
    const traceRecorder = options.trace ? createScheduleTraceRecorder(options.traceLimit) : null;
    const heuristic = greedyDsaturColoring(courseCodes, adjacency, traceRecorder);

    let coloring = heuristic;
    let algorithm = 'DSATUR Greedy';

    if (courses.length <= EXACT_SCHEDULE_LIMIT) {
        coloring = exactDsaturColoring(courseCodes, adjacency, heuristic, traceRecorder);
        algorithm = 'DSATUR Branch & Bound (Exact)';
    }

    const assignments = courses
        .map((course) => {
            const slotIndex = coloring.colors.get(course.code) ?? 0;
            const slotLabel = buildSlotLabel(slots, slotIndex);

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
        courses: courses.map((course) => ({ ...course })),
        conflicts: conflicts.map((conflict) => ({ ...conflict })),
        availableSlotLabels: slots.slice(),
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
        },
        searchTrace: traceRecorder
            ? {
                events: traceRecorder.events,
                truncated: traceRecorder.truncated
            }
            : null
    };
}

class SchedulePage {
    constructor() {
        this.currentResult = null;
        this.isAnimating = false;
        this.animationRunId = 0;
        this.searchLog = [];
        this.searchState = this.createEmptySearchState();
        this.solveButton = document.getElementById('solveScheduleBtn');
        this.solveButtonMarkup = this.solveButton ? this.solveButton.innerHTML : '';
        this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }

    init() {
        this.setupThemeToggle();
        this.setupPresetEvents();
        this.setupUIEvents();
        this.resetSearchUI();
        this.applyPreset('semester-dasar');
        this.resetOutput();
        this.updateInputStats();
    }

    createEmptySearchState() {
        return {
            phaseLabel: 'Siap',
            stepLabel: '0 langkah',
            message: this.getDefaultSearchMessage(),
            activeCode: null,
            backtrackedCode: null
        };
    }

    getDefaultSearchMessage() {
        return 'Setiap mata kuliah adalah simpul, setiap konflik adalah sisi, dan warna simpul menunjukkan slot hasil pewarnaan DSATUR.';
    }

    resetSearchUI() {
        this.searchLog = [];
        this.searchState = this.createEmptySearchState();
        this.renderSearchLog();
        this.syncSearchUI();
    }

    syncSearchUI() {
        document.getElementById('scheduleSearchPhase').textContent = this.searchState.phaseLabel;
        document.getElementById('scheduleSearchStep').textContent = this.searchState.stepLabel;
        document.getElementById('scheduleSearchMessage').textContent = this.searchState.message;
    }

    renderSearchLog() {
        const log = document.getElementById('scheduleSearchLog');
        if (!log) return;

        if (this.searchLog.length === 0) {
            log.innerHTML = '<div class="schedule-search-log-item is-muted">Belum ada pencarian yang divisualisasikan.</div>';
            return;
        }

        log.innerHTML = this.searchLog
            .map((message) => `<div class="schedule-search-log-item">${this.escapeHTML(message)}</div>`)
            .join('');
    }

    pushSearchLog(message) {
        this.searchLog.unshift(message);
        this.searchLog = this.searchLog.slice(0, 6);
        this.renderSearchLog();
    }

    setScheduleBusy(disabled) {
        const controlIds = [
            'schedulePresetSelect',
            'loadSchedulePreset',
            'courseInput',
            'conflictInput',
            'slotInput',
            'solveScheduleBtn',
            'loadTemplateBtn',
            'resetInputsBtn'
        ];

        for (const id of controlIds) {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = disabled;
            }
        }

        if (this.solveButton) {
            this.solveButton.innerHTML = disabled
                ? 'Menelusuri Pewarnaan...'
                : this.solveButtonMarkup;
        }
    }

    getScheduleTraceDelay(totalSteps, emphasized = false) {
        if (this.prefersReducedMotion) return 24;

        const base = Math.min(150, Math.max(50, Math.round(5000 / Math.max(1, totalSteps))));
        return emphasized ? Math.round(base * 1.45) : base;
    }

    getSchedulePhaseLabel(event) {
        if (event.type === 'greedy-start') return 'Greedy DSATUR';
        if (event.type === 'exact-start') return 'Exact Search';
        if (event.phase === 'exact') return 'Branch & Bound';
        return 'Greedy DSATUR';
    }

    describeScheduleTraceEvent(event, slots) {
        switch (event.type) {
            case 'greedy-start':
                return 'DSATUR greedy mulai membangun solusi awal dari graf konflik.';
            case 'exact-start':
                return `Pencarian exact dimulai dengan batas atas ${event.bestCount} slot dari heuristic.`;
            case 'select':
                return `${event.phase === 'exact' ? 'Exact search' : 'Greedy'} memilih ${event.code} karena saturasi ${event.saturation} dan derajat ${event.degree}.`;
            case 'assign':
                return event.reusedColor
                    ? `${event.code} ditempatkan ke ${buildSlotLabel(slots, event.color)} yang sudah ada.`
                    : `${event.code} membuka ${buildSlotLabel(slots, event.color)} baru.`;
            case 'unassign':
                return `Backtrack melepas ${event.code} dari ${buildSlotLabel(slots, event.color)}.`;
            case 'prune':
                return `Cabang dipangkas karena sudah memakai ${event.usedColorCount} slot dan tidak lebih baik dari batas ${event.bestCount}.`;
            case 'best':
                return `Solusi terbaik baru ditemukan: cukup ${event.bestCount} slot.`;
            case 'skip-new-color':
                return `Cabang tidak menambah ${buildSlotLabel(slots, event.color)} karena tidak akan mengalahkan batas ${event.bestCount}.`;
            default:
                return this.getDefaultSearchMessage();
        }
    }

    async waitForPlayback(ms) {
        await new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }

    renderGraphLegend(slots, colorMap) {
        const legend = document.getElementById('scheduleGraphLegend');
        if (!legend) return;

        const assignedColors = Array.from(colorMap.values());
        const highestColor = assignedColors.length > 0 ? Math.max(...assignedColors) : -1;
        const legendCount = Math.max(slots.length, highestColor + 1);

        if (legendCount <= 0) {
            legend.innerHTML = '<div class="schedule-graph-legend-item is-muted">Legenda slot akan muncul setelah graf dibangun.</div>';
            return;
        }

        legend.innerHTML = Array.from({ length: legendCount }, (_, slotIndex) => {
            const shortLabel = slotIndex < slots.length
                ? `S${slotIndex + 1}`
                : `X${slotIndex - slots.length + 1}`;
            const fullLabel = buildSlotLabel(slots, slotIndex);

            return `
                <div class="schedule-graph-legend-item">
                    <span class="schedule-graph-legend-swatch" style="--legend-color: ${SCHEDULE_SLOT_COLORS[slotIndex % SCHEDULE_SLOT_COLORS.length]}"></span>
                    <span>${this.escapeHTML(shortLabel)} · ${this.escapeHTML(fullLabel)}</span>
                </div>
            `;
        }).join('');
    }

    computeGraphLayout(courses, adjacency) {
        const width = 1000;
        const height = 560;
        const centerX = width / 2;
        const centerY = height / 2;
        const orderedCourses = courses.slice().sort((a, b) => compareScheduleCodes(a.code, b.code));
        const maxDegree = Math.max(0, ...orderedCourses.map((course) => adjacency.get(course.code)?.size || 0));
        const radiusX = orderedCourses.length <= 3
            ? 220
            : Math.min(390, 250 + orderedCourses.length * 11);
        const radiusY = orderedCourses.length <= 3
            ? 140
            : Math.min(220, 155 + orderedCourses.length * 7);
        const positions = new Map();

        if (orderedCourses.length === 1) {
            positions.set(orderedCourses[0].code, { x: centerX, y: centerY });
            return { width, height, positions };
        }

        orderedCourses.forEach((course, index) => {
            const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / orderedCourses.length);
            const degree = adjacency.get(course.code)?.size || 0;
            const inwardFactor = maxDegree > 0 ? 1 - (degree / maxDegree) * 0.12 : 1;
            positions.set(course.code, {
                x: centerX + Math.cos(angle) * radiusX * inwardFactor,
                y: centerY + Math.sin(angle) * radiusY * inwardFactor
            });
        });

        return { width, height, positions };
    }

    getGraphNodeFill(slotIndex) {
        if (typeof slotIndex === 'number') {
            return SCHEDULE_SLOT_COLORS[slotIndex % SCHEDULE_SLOT_COLORS.length];
        }

        return document.body.classList.contains('dark-mode')
            ? 'rgba(148, 163, 184, 0.16)'
            : 'rgba(107, 139, 158, 0.14)';
    }

    getGraphNodeStroke(slotIndex) {
        if (typeof slotIndex === 'number') {
            return 'rgba(255, 255, 255, 0.92)';
        }

        return document.body.classList.contains('dark-mode')
            ? 'rgba(148, 163, 184, 0.28)'
            : 'rgba(139, 115, 85, 0.22)';
    }

    getGraphSlotShortLabel(slotIndex, slots) {
        if (typeof slotIndex !== 'number') return '-';
        return slotIndex < slots.length
            ? `S${slotIndex + 1}`
            : `X${slotIndex - slots.length + 1}`;
    }

    buildConflictGraphMarkup(courses, conflicts, slots, colorMap, adjacency, options = {}) {
        const orderedCourses = courses.slice().sort((a, b) => compareScheduleCodes(a.code, b.code));
        const { width, height, positions } = this.computeGraphLayout(orderedCourses, adjacency);
        const activeNeighbors = options.activeCode
            ? adjacency.get(options.activeCode) || new Set()
            : new Set();

        const edgeMarkup = conflicts.map((conflict) => {
            const from = positions.get(conflict.from);
            const to = positions.get(conflict.to);
            if (!from || !to) return '';

            const isActive = Boolean(options.activeCode && (conflict.from === options.activeCode || conflict.to === options.activeCode));
            const isBacktracked = Boolean(options.backtrackedCode && (conflict.from === options.backtrackedCode || conflict.to === options.backtrackedCode));
            const classes = [
                'schedule-graph-edge',
                isActive ? 'is-active' : '',
                isBacktracked ? 'is-backtracked' : ''
            ].filter(Boolean).join(' ');

            return `
                <line
                    class="${classes}"
                    x1="${from.x.toFixed(2)}"
                    y1="${from.y.toFixed(2)}"
                    x2="${to.x.toFixed(2)}"
                    y2="${to.y.toFixed(2)}"
                />
            `;
        }).join('');

        const nodeMarkup = orderedCourses.map((course) => {
            const point = positions.get(course.code);
            const slotIndex = colorMap.get(course.code);
            const isColored = typeof slotIndex === 'number';
            const isActive = course.code === options.activeCode;
            const isBacktracked = course.code === options.backtrackedCode;
            const isNeighbor = !isActive && activeNeighbors.has(course.code);
            const classes = [
                'schedule-graph-node',
                isColored ? 'is-colored' : '',
                isActive ? 'is-active' : '',
                isNeighbor ? 'is-neighbor' : '',
                isBacktracked ? 'is-backtracked' : ''
            ].filter(Boolean).join(' ');
            const slotLabel = this.getGraphSlotShortLabel(slotIndex, slots);
            const degree = adjacency.get(course.code)?.size || 0;
            const fullSlotLabel = typeof slotIndex === 'number'
                ? buildSlotLabel(slots, slotIndex)
                : 'Belum ditempatkan';

            return `
                <g
                    class="${classes}"
                    transform="translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})"
                    style="--node-fill: ${this.getGraphNodeFill(slotIndex)}; --node-stroke: ${this.getGraphNodeStroke(slotIndex)};"
                >
                    <title>${this.escapeHTML(`${course.code} | ${course.name} | Konflik: ${degree} | Slot: ${fullSlotLabel}`)}</title>
                    <circle class="schedule-graph-node-ring" r="39"></circle>
                    <circle class="schedule-graph-node-core" r="31"></circle>
                    <text class="schedule-graph-node-code" y="-4">${this.escapeHTML(course.code)}</text>
                    <text class="schedule-graph-node-slot" y="15">${this.escapeHTML(slotLabel)}</text>
                </g>
            `;
        }).join('');

        return `
            <div class="schedule-graph-stage">
                <svg class="schedule-graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Graf konflik penjadwalan mata kuliah">
                    <g>${edgeMarkup}</g>
                    <g>${nodeMarkup}</g>
                </svg>
                <div class="schedule-graph-meta">
                    <span>${orderedCourses.length} simpul mata kuliah</span>
                    <span>${conflicts.length} sisi konflik</span>
                </div>
            </div>
        `;
    }

    renderBoardPreview(courses, conflicts, slots, colorMap, adjacency, options = {}) {
        const board = document.getElementById('scheduleBoard');
        if (!board) return;

        this.renderGraphLegend(slots, colorMap);
        board.innerHTML = this.buildConflictGraphMarkup(courses, conflicts, slots, colorMap, adjacency, options);
    }

    renderAssignmentPreview(courses, slots, colorMap, adjacency, options = {}) {
        const tbody = document.getElementById('assignmentTableBody');
        if (!tbody) return;

        tbody.innerHTML = courses.map((course) => {
            const slotIndex = colorMap.get(course.code);
            const slotLabel = typeof slotIndex === 'number'
                ? buildSlotLabel(slots, slotIndex)
                : 'Belum ditempatkan';
            const rowClass = course.code === options.activeCode
                ? 'schedule-row-active'
                : course.code === options.backtrackedCode
                    ? 'schedule-row-backtracked'
                    : typeof slotIndex === 'number'
                        ? ''
                        : 'schedule-row-pending';

            return `
                <tr class="${rowClass}">
                    <td><strong>${this.escapeHTML(course.code)}</strong></td>
                    <td>${this.escapeHTML(course.name)}</td>
                    <td>${this.escapeHTML(slotLabel)}</td>
                    <td>${adjacency.get(course.code)?.size || 0}</td>
                </tr>
            `;
        }).join('');
    }

    async playScheduleTrace(courses, conflicts, slots, trace) {
        const events = trace?.events || [];
        const adjacency = buildAdjacency(courses.map((course) => course.code), conflicts);
        const previewColors = new Map();
        const runId = ++this.animationRunId;

        this.searchLog = [];
        this.renderSearchLog();
        this.renderBoardPreview(courses, conflicts, slots, previewColors, adjacency);
        this.renderAssignmentPreview(courses, slots, previewColors, adjacency);

        for (let index = 0; index < events.length; index++) {
            if (runId !== this.animationRunId) return;

            const event = events[index];
            let activeCode = null;
            let backtrackedCode = null;

            if (event.type === 'greedy-start' || event.type === 'exact-start') {
                previewColors.clear();
            }

            if (event.type === 'select' || event.type === 'assign') {
                activeCode = event.code;
            }

            if (event.type === 'assign') {
                previewColors.set(event.code, event.color);
            }

            if (event.type === 'unassign') {
                previewColors.delete(event.code);
                backtrackedCode = event.code;
            }

            this.searchState.phaseLabel = this.getSchedulePhaseLabel(event);
            this.searchState.stepLabel = `${index + 1}/${events.length} langkah`;
            this.searchState.message = this.describeScheduleTraceEvent(event, slots);
            this.searchState.activeCode = activeCode;
            this.searchState.backtrackedCode = backtrackedCode;
            this.syncSearchUI();
            this.pushSearchLog(this.searchState.message);
            this.renderStatusBanner(this.searchState.message, 'info');
            this.renderBoardPreview(courses, conflicts, slots, previewColors, adjacency, { activeCode, backtrackedCode });
            this.renderAssignmentPreview(courses, slots, previewColors, adjacency, { activeCode, backtrackedCode });

            const emphasized = ['assign', 'best', 'unassign'].includes(event.type);
            await this.waitForPlayback(this.getScheduleTraceDelay(events.length, emphasized));
        }

        if (trace?.truncated) {
            const message = 'Sebagian langkah exact search diringkas agar animasi tetap responsif.';
            this.searchState.message = message;
            this.syncSearchUI();
            this.pushSearchLog(message);
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

    async solveSchedule() {
        if (this.isAnimating) {
            this.showToast('Animasi penjadwalan masih berjalan.', 'warning');
            return;
        }

        try {
            const courses = parseCourses(document.getElementById('courseInput').value);
            const courseMap = new Map(courses.map((course) => [course.code, course]));
            const conflicts = parseConflicts(document.getElementById('conflictInput').value, courseMap);
            const slots = parseSlots(document.getElementById('slotInput').value);
            const adjacency = buildAdjacency(courses.map((course) => course.code), conflicts);
            const result = solveScheduleDataset(courses, conflicts, slots, {
                trace: true,
                traceLimit: SCHEDULE_TRACE_LIMIT
            });

            this.currentResult = null;
            this.isAnimating = true;
            this.resetSearchUI();
            this.searchState.phaseLabel = 'Persiapan';
            this.searchState.stepLabel = `0/${result.searchTrace?.events?.length || 0} langkah`;
            this.searchState.message = 'Membangun pewarnaan greedy lalu menelusuri cabang terbaik untuk jadwal.';
            this.syncSearchUI();
            this.renderStatusBanner('Memvisualisasikan langkah DSATUR pada graf konflik...', 'info');
            this.renderBoardPreview(courses, conflicts, slots, new Map(), adjacency);
            this.renderAgenda([]);
            this.renderAssignmentPreview(courses, slots, new Map(), adjacency);
            this.renderSummary([]);
            document.getElementById('usedSlotInfo').textContent = '-';
            document.getElementById('algorithmInfo').textContent = '-';
            document.getElementById('resultRequiredSlots').textContent = '-';
            document.getElementById('resultAvailableSlots').textContent = String(slots.length);
            document.getElementById('resultOverflowSlots').textContent = '-';
            document.getElementById('resultScheduleStatus').textContent = 'Mencari';
            this.setScheduleBusy(true);

            try {
                await this.playScheduleTrace(courses, conflicts, slots, result.searchTrace);
            } finally {
                this.isAnimating = false;
                this.setScheduleBusy(false);
            }

            this.currentResult = result;
            this.searchState.phaseLabel = 'Selesai';
            this.searchState.stepLabel = `${result.searchTrace?.events?.length || 0}/${result.searchTrace?.events?.length || 0} langkah`;
            this.searchState.message = `Pewarnaan akhir selesai dengan ${result.usedSlots} slot.`;
            this.syncSearchUI();
            this.pushSearchLog(this.searchState.message);
            this.renderResult(result);
            this.showToast(result.feasible ? 'Jadwal berhasil dibentuk.' : 'Jadwal valid membutuhkan slot tambahan.', result.feasible ? 'success' : 'warning');
        } catch (error) {
            this.currentResult = null;
            this.resetOutput();
            this.showToast(error.message || 'Penjadwalan gagal.', 'error');
        }
    }

    resetOutput() {
        const wasAnimating = this.isAnimating;
        this.animationRunId++;
        this.isAnimating = false;
        if (wasAnimating) {
            this.setScheduleBusy(false);
        }

        document.getElementById('usedSlotInfo').textContent = '-';
        document.getElementById('algorithmInfo').textContent = '-';
        document.getElementById('resultRequiredSlots').textContent = '-';
        document.getElementById('resultAvailableSlots').textContent = '-';
        document.getElementById('resultOverflowSlots').textContent = '-';
        document.getElementById('resultScheduleStatus').textContent = '-';
        this.resetSearchUI();
        this.renderStatusBanner('Masukkan mata kuliah, konflik, dan slot lalu jalankan penjadwalan.', 'info');
        this.renderBoardEmpty();
        this.renderAgenda([]);
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
        this.renderBoard(result);
        this.renderAgenda(result.slotGroups);
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

    renderBoard(result = null) {
        const board = document.getElementById('scheduleBoard');
        if (!board) return;

        if (!result || !result.courses || result.courses.length === 0) {
            this.renderBoardEmpty();
            return;
        }

        const colorMap = new Map(result.assignments.map((assignment) => [assignment.code, assignment.slotIndex]));
        const adjacency = buildAdjacency(result.courses.map((course) => course.code), result.conflicts);
        this.renderGraphLegend(result.availableSlotLabels || [], colorMap);
        board.innerHTML = this.buildConflictGraphMarkup(
            result.courses,
            result.conflicts,
            result.availableSlotLabels || [],
            colorMap,
            adjacency
        );
    }

    getAgendaDayLabel(slotLabel, isOverflow = false) {
        if (isOverflow) {
            return 'Slot Tambahan';
        }

        const label = String(slotLabel || '').trim();
        if (!label) return 'Lainnya';

        const dayMatch = label.match(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\b/i);
        if (dayMatch) {
            return dayMatch[1];
        }

        const beforeTime = label.match(/^(.+?)\s+\d{1,2}:\d{2}/);
        if (beforeTime) {
            return beforeTime[1].trim();
        }

        return label;
    }

    renderAgenda(slotGroups = []) {
        const board = document.getElementById('scheduleAgendaBoard');
        if (!board) return;

        if (!slotGroups || slotGroups.length === 0) {
            board.innerHTML = '<div class="schedule-empty">Agenda harian akan muncul setelah jadwal berhasil dibentuk.</div>';
            return;
        }

        const dayBuckets = [];
        const dayMap = new Map();

        for (const slotGroup of slotGroups) {
            const dayLabel = this.getAgendaDayLabel(slotGroup.label, slotGroup.isOverflow);
            if (!dayMap.has(dayLabel)) {
                const bucket = {
                    dayLabel,
                    entries: [],
                    totalCourses: 0
                };
                dayMap.set(dayLabel, bucket);
                dayBuckets.push(bucket);
            }

            const bucket = dayMap.get(dayLabel);
            bucket.entries.push(slotGroup);
            bucket.totalCourses += slotGroup.courses.length;
        }

        board.innerHTML = dayBuckets.map((bucket) => `
            <article class="schedule-day-card">
                <div class="schedule-day-head">
                    <div class="schedule-day-title">${this.escapeHTML(bucket.dayLabel)}</div>
                    <div class="schedule-day-meta">${bucket.totalCourses} mata kuliah</div>
                </div>
                <div class="schedule-day-slot-list">
                    ${bucket.entries.map((entry) => `
                        <section class="schedule-day-slot">
                            <div class="schedule-day-slot-title">
                                <span class="schedule-day-slot-swatch" style="--slot-color: ${entry.color}"></span>
                                <span>${this.escapeHTML(entry.label)}</span>
                            </div>
                            <div class="schedule-day-course-list">
                                ${entry.courses.map((course) => `
                                    <div class="schedule-day-course" style="--slot-color: ${entry.color}">
                                        <strong>${this.escapeHTML(course.code)}</strong>
                                        <span>${this.escapeHTML(course.name)}</span>
                                    </div>
                                `).join('') || `<div class="schedule-day-course" style="--slot-color: ${entry.color}"><span>Tidak ada mata kuliah pada slot ini.</span></div>`}
                            </div>
                        </section>
                    `).join('')}
                </div>
            </article>
        `).join('');
    }

    renderBoardEmpty() {
        const board = document.getElementById('scheduleBoard');
        if (!board) return;
        const legend = document.getElementById('scheduleGraphLegend');
        if (legend) {
            legend.innerHTML = '<div class="schedule-graph-legend-item is-muted">Legenda slot akan muncul setelah graf dibangun.</div>';
        }
        board.innerHTML = '<div class="schedule-empty">Graf konflik belum tersedia untuk divisualisasikan.</div>';
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
