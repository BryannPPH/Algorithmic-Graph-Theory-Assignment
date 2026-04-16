class Graph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.directed = false;
        this.nextNodeId = 1;
    }

    setDirected(directed) {
        this.directed = directed;
    }

    addNode(x, y) {
        const id = this.nextNodeId++;
        this.nodes.set(id, { x, y, label: id.toString() });
        return id;
    }

    removeNode(nodeId) {
        if (!this.nodes.has(nodeId)) return false;
        
        this.nodes.delete(nodeId);
        this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
        return true;
    }

    moveNode(nodeId, x, y) {
        if (!this.nodes.has(nodeId)) return false;
        
        const node = this.nodes.get(nodeId);
        node.x = x;
        node.y = y;
        return true;
    }

    normalizeWeight(weight = 1) {
        const numericWeight = Number(weight);
        return Number.isFinite(numericWeight) && numericWeight >= 0 ? numericWeight : 1;
    }

    addEdge(from, to, weight = 1) {
        if (!this.nodes.has(from) || !this.nodes.has(to)) return false;
        if (from === to) return false;
        const normalizedWeight = this.normalizeWeight(weight);
        
        // Check if edge already exists
        const exists = this.edges.some(e => {
            if (this.directed) {
                return e.from === from && e.to === to;
            } else {
                return (e.from === from && e.to === to) || (e.from === to && e.to === from);
            }
        });
     
        if (exists) return false;
        
        this.edges.push({ from, to, weight: normalizedWeight });
        return true;
    }

    hasEdge(from, to) {
        return this.edges.some(e => {
            if (this.directed) {
                return e.from === from && e.to === to;
            }
            return (e.from === from && e.to === to) || (e.from === to && e.to === from);
        });
    }

    removeEdge(from, to) {
        const idx = this.edges.findIndex(e => {
            if (this.directed) {
                return e.from === from && e.to === to;
            } else {
                return (e.from === from && e.to === to) || (e.from === to && e.to === from);
            }
        });
        
        if (idx === -1) return false;
        this.edges.splice(idx, 1);
        return true;
    }

    getAdjacencyList() {
        const adj = new Map();
        
        for (const nodeId of this.nodes.keys()) {
            adj.set(nodeId, []);
        }
        
        for (const edge of this.edges) {
            adj.get(edge.from).push(edge.to);
            if (!this.directed) {
                adj.get(edge.to).push(edge.from);
            }
        }
        
        return adj;
    }

    getUndirectedAdjacencyList() {
        const adj = new Map();
        
        for (const nodeId of this.nodes.keys()) {
            adj.set(nodeId, []);
        }
        
        for (const edge of this.edges) {
            adj.get(edge.from).push(edge.to);
            adj.get(edge.to).push(edge.from);
        }
        
        return adj;
    }

    getWeightedAdjacencyList() {
        const adj = new Map();

        for (const nodeId of this.nodes.keys()) {
            adj.set(nodeId, []);
        }

        for (const edge of this.edges) {
            const weight = this.normalizeWeight(edge.weight);
            adj.get(edge.from).push({ node: edge.to, weight });
            if (!this.directed) {
                adj.get(edge.to).push({ node: edge.from, weight });
            }
        }

        return adj;
    }

    getNeighbors(nodeId) {
        if (!this.nodes.has(nodeId)) return [];

        const neighbors = [];
        for (const edge of this.edges) {
            if (edge.from === nodeId) {
                neighbors.push(edge.to);
            } else if (!this.directed && edge.to === nodeId) {
                neighbors.push(edge.from);
            }
        }

        return neighbors;
    }

    getEdge(from, to) {
        return this.edges.find(e => {
            if (this.directed) {
                return e.from === from && e.to === to;
            }
            return (e.from === from && e.to === to) || (e.from === to && e.to === from);
        }) || null;
    }

    getEdgeWeight(from, to) {
        const edge = this.getEdge(from, to);
        return edge ? this.normalizeWeight(edge.weight) : null;
    }

    clear() {
        this.nodes.clear();
        this.edges = [];
        this.nextNodeId = 1;
    }

    getNodeAtPosition(x, y, radius = 25) {
        for (const [id, node] of this.nodes.entries()) {
            const dx = node.x - x;
            const dy = node.y - y;
            if (dx * dx + dy * dy <= radius * radius) {
                return id;
            }
        }
        return null;
    }

    getEdgeAtPosition(x, y, threshold = 10) {
        for (const edge of this.edges) {
            const fromNode = this.nodes.get(edge.from);
            const toNode = this.nodes.get(edge.to);
            
            if (this.pointToLineDistance(x, y, fromNode.x, fromNode.y, toNode.x, toNode.y) <= threshold) {
                return edge;
            }
        }
        return null;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    toJSON() {
        return {
            nodes: Array.from(this.nodes.entries()),
            edges: this.edges,
            directed: this.directed,
            nextNodeId: this.nextNodeId
        };
    }

    fromJSON(data) {
        this.nodes = new Map(data.nodes);
        this.edges = (data.edges || []).map(edge => ({
            ...edge,
            weight: this.normalizeWeight(edge.weight)
        }));
        this.directed = data.directed;
        this.nextNodeId = data.nextNodeId;
    }
}

// Graph Algorithms
class GraphAlgorithms {
    constructor(graph) {
        this.graph = graph;
    }

    // DFS
    async dfs(startNode, onVisit, onBacktrack) {
        const visited = new Set();
        const order = [];
        const adj = this.graph.getAdjacencyList();

        const dfsRecursive = async (node) => {
            visited.add(node);
            order.push(node);
            
            if (onVisit) await onVisit(node, order.slice());

            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    await dfsRecursive(neighbor);
                }
            }
            
            if (onBacktrack) await onBacktrack(node);
        };

        await dfsRecursive(startNode);
        return order;
    }

    // BFS
    async bfs(startNode, onVisit, onDequeue) {
        const visited = new Set();
        const order = [];
        const queue = [startNode];
        const adj = this.graph.getAdjacencyList();

        visited.add(startNode);

        while (queue.length > 0) {
            const node = queue.shift();
            order.push(node);
            
            if (onDequeue) await onDequeue(node, order.slice());
            if (onVisit) await onVisit(node, order.slice());

            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        return order;
    }

    // Distance between two nodes using BFS
    async distance(startNode, endNode, onVisit) {
        const visited = new Set();
        const queue = [{ node: startNode, dist: 0 }];
        const adj = this.graph.getAdjacencyList();
        const path = new Map();

        visited.add(startNode);
        path.set(startNode, null);

        while (queue.length > 0) {
            const { node, dist } = queue.shift();
            
            if (onVisit) await onVisit(node, dist);

            if (node === endNode) {
                // Reconstruct path
                const pathNodes = [];
                let current = endNode;
                while (current !== null) {
                    pathNodes.unshift(current);
                    current = path.get(current);
                }
                return { distance: dist, path: pathNodes };
            }

            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    path.set(neighbor, node);
                    queue.push({ node: neighbor, dist: dist + 1 });
                }
            }
        }

        return { distance: -1, path: [] };
    }

    // Weighted shortest path using Dijkstra
    async shortestPathWeighted(startNode, endNode, onVisit) {
        const nodes = Array.from(this.graph.nodes.keys());
        if (!this.graph.nodes.has(startNode) || !this.graph.nodes.has(endNode)) {
            return { distance: Infinity, path: [] };
        }

        const adj = this.graph.getWeightedAdjacencyList();
        const dist = new Map();
        const parent = new Map();
        const visited = new Set();

        for (const node of nodes) {
            dist.set(node, Infinity);
            parent.set(node, null);
        }
        dist.set(startNode, 0);

        while (visited.size < nodes.length) {
            let current = null;
            let currentDist = Infinity;

            for (const node of nodes) {
                const candidateDist = dist.get(node);
                if (!visited.has(node) && candidateDist < currentDist) {
                    current = node;
                    currentDist = candidateDist;
                }
            }

            if (current === null || currentDist === Infinity) {
                break;
            }

            visited.add(current);

            if (onVisit) await onVisit(current, currentDist);

            if (current === endNode) {
                break;
            }

            const neighbors = adj.get(current) || [];
            for (const { node: neighbor, weight } of neighbors) {
                if (visited.has(neighbor)) continue;

                const newDist = currentDist + weight;
                if (newDist < dist.get(neighbor)) {
                    dist.set(neighbor, newDist);
                    parent.set(neighbor, current);
                }
            }
        }

        if (dist.get(endNode) === Infinity) {
            return { distance: Infinity, path: [] };
        }

        const path = [];
        let current = endNode;
        while (current !== null) {
            path.unshift(current);
            current = parent.get(current);
        }

        return { distance: dist.get(endNode), path };
    }

    shortestPathWeightedSync(startNode, endNode) {
        const nodes = Array.from(this.graph.nodes.keys());
        if (!this.graph.nodes.has(startNode) || !this.graph.nodes.has(endNode)) {
            return { distance: Infinity, path: [] };
        }

        const adj = this.graph.getWeightedAdjacencyList();
        const dist = new Map();
        const parent = new Map();
        const visited = new Set();

        for (const node of nodes) {
            dist.set(node, Infinity);
            parent.set(node, null);
        }
        dist.set(startNode, 0);

        while (visited.size < nodes.length) {
            let current = null;
            let currentDist = Infinity;

            for (const node of nodes) {
                const candidateDist = dist.get(node);
                if (!visited.has(node) && candidateDist < currentDist) {
                    current = node;
                    currentDist = candidateDist;
                }
            }

            if (current === null || currentDist === Infinity) {
                break;
            }

            visited.add(current);

            if (current === endNode) {
                break;
            }

            const neighbors = adj.get(current) || [];
            for (const { node: neighbor, weight } of neighbors) {
                if (visited.has(neighbor)) continue;

                const newDist = currentDist + weight;
                if (newDist < dist.get(neighbor)) {
                    dist.set(neighbor, newDist);
                    parent.set(neighbor, current);
                }
            }
        }

        if (dist.get(endNode) === Infinity) {
            return { distance: Infinity, path: [] };
        }

        const path = [];
        let current = endNode;
        while (current !== null) {
            path.unshift(current);
            current = parent.get(current);
        }

        return { distance: dist.get(endNode), path };
    }

    solveTSPBruteForce(startNode) {
        const nodes = Array.from(this.graph.nodes.keys()).sort((a, b) => a - b);
        const algorithmName = 'Brute Force (Exact)';

        if (!this.graph.nodes.has(startNode)) {
            return {
                hasTour: false,
                reason: 'start-node-not-found',
                algorithm: algorithmName
            };
        }

        if (nodes.length === 0) {
            return {
                hasTour: true,
                algorithm: algorithmName,
                startNode: null,
                visitOrder: [],
                cycle: [],
                expandedPath: [],
                segments: [],
                totalWeight: 0,
                usesShortestPathExpansion: false
            };
        }

        if (nodes.length === 1) {
            return {
                hasTour: true,
                algorithm: algorithmName,
                startNode,
                visitOrder: [startNode],
                cycle: [startNode, startNode],
                expandedPath: [startNode, startNode],
                segments: [{ from: startNode, to: startNode, distance: 0, path: [startNode, startNode] }],
                totalWeight: 0,
                usesShortestPathExpansion: false
            };
        }

        const maxBruteForceNodes = 11;
        if (nodes.length > maxBruteForceNodes) {
            return {
                hasTour: false,
                reason: 'too-many-nodes',
                maxNodes: maxBruteForceNodes,
                algorithm: algorithmName
            };
        }

        const weightCache = new Map();
        const getDirectWeight = (from, to) => {
            const key = `${from}->${to}`;
            if (!weightCache.has(key)) {
                weightCache.set(key, this.graph.getEdgeWeight(from, to));
            }
            return weightCache.get(key);
        };

        const isLexicographicallySmaller = (candidate, currentBest) => {
            if (!currentBest) return true;
            for (let i = 0; i < candidate.length; i++) {
                if (candidate[i] < currentBest[i]) return true;
                if (candidate[i] > currentBest[i]) return false;
            }
            return false;
        };

        const remainingNodes = nodes.filter(node => node !== startNode);
        let bestCycle = null;
        let bestVisitOrder = null;
        let bestWeight = Infinity;

        const search = (currentNode, unvisited, visitOrder, totalWeight) => {
            if (unvisited.length === 0) {
                const backWeight = getDirectWeight(currentNode, startNode);
                if (backWeight === null) return;

                const cycle = [...visitOrder, startNode];
                const candidateWeight = totalWeight + backWeight;
                if (
                    candidateWeight < bestWeight ||
                    (candidateWeight === bestWeight && isLexicographicallySmaller(cycle, bestCycle))
                ) {
                    bestWeight = candidateWeight;
                    bestVisitOrder = visitOrder.slice();
                    bestCycle = cycle;
                }
                return;
            }

            for (let i = 0; i < unvisited.length; i++) {
                const nextNode = unvisited[i];
                const edgeWeight = getDirectWeight(currentNode, nextNode);
                if (edgeWeight === null) continue;

                const nextWeight = totalWeight + edgeWeight;
                if (nextWeight > bestWeight) continue;

                const nextUnvisited = unvisited.slice(0, i).concat(unvisited.slice(i + 1));
                visitOrder.push(nextNode);
                search(nextNode, nextUnvisited, visitOrder, nextWeight);
                visitOrder.pop();
            }
        };

        search(startNode, remainingNodes, [startNode], 0);

        if (!bestCycle || !bestVisitOrder) {
            return {
                hasTour: false,
                reason: 'no-hamiltonian-cycle',
                startNode,
                algorithm: algorithmName
            };
        }

        const segments = [];
        for (let i = 0; i < bestCycle.length - 1; i++) {
            const from = bestCycle[i];
            const to = bestCycle[i + 1];
            const distance = getDirectWeight(from, to);

            segments.push({
                from,
                to,
                distance,
                path: [from, to]
            });
        }

        return {
            hasTour: true,
            algorithm: algorithmName,
            startNode,
            visitOrder: bestVisitOrder,
            cycle: bestCycle,
            expandedPath: bestCycle.slice(),
            segments,
            totalWeight: bestWeight,
            usesShortestPathExpansion: false
        };
    }

    // Check if graph is connected
    isConnected() {
        const nodes = Array.from(this.graph.nodes.keys());
        if (nodes.length === 0) return true;

        const visited = new Set();
        const adj = this.graph.getUndirectedAdjacencyList();

        const dfs = (node) => {
            visited.add(node);
            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                }
            }
        };

        dfs(nodes[0]);
        return visited.size === nodes.length;
    }

    // Count connected components
    countComponents() {
        const nodes = Array.from(this.graph.nodes.keys());
        const visited = new Set();
        const adj = this.graph.getUndirectedAdjacencyList();
        let count = 0;

        const dfs = (node) => {
            visited.add(node);
            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                }
            }
        };

        for (const node of nodes) {
            if (!visited.has(node)) {
                dfs(node);
                count++;
            }
        }

        return count;
    }

    // Get component size for a specific node
    getComponentSize(startNode) {
        const visited = new Set();
        const adj = this.graph.getUndirectedAdjacencyList();
        const componentNodes = [];

        const dfs = (node) => {
            visited.add(node);
            componentNodes.push(node);
            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                }
            }
        };

        dfs(startNode);
        return { size: componentNodes.length, nodes: componentNodes };
    }

    // Get all components
    getAllComponents() {
        const nodes = Array.from(this.graph.nodes.keys());
        const visited = new Set();
        const adj = this.graph.getUndirectedAdjacencyList();
        const components = [];

        const dfs = (node, component) => {
            visited.add(node);
            component.push(node);
            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, component);
                }
            }
        };

        for (const node of nodes) {
            if (!visited.has(node)) {
                const component = [];
                dfs(node, component);
                components.push(component);
            }
        }

        return components;
    }

    // Get largest component
    getLargestComponent() {
        const components = this.getAllComponents();
        if (components.length === 0) return { size: 0, nodes: [] };

        let largest = components[0];
        for (const comp of components) {
            if (comp.length > largest.length) {
                largest = comp;
            }
        }

        return { size: largest.length, nodes: largest.sort((a, b) => a - b) };
    }

    // Minimum spanning tree / forest using Kruskal
    getMinimumSpanningTree() {
        const nodes = Array.from(this.graph.nodes.keys()).sort((a, b) => a - b);
        if (this.graph.directed) {
            return {
                directed: true,
                disconnected: false,
                componentCount: 0,
                totalWeight: 0,
                edges: []
            };
        }

        if (nodes.length === 0) {
            return {
                directed: false,
                disconnected: false,
                componentCount: 0,
                totalWeight: 0,
                edges: []
            };
        }

        const parent = new Map();
        const rank = new Map();

        const find = (node) => {
            if (parent.get(node) !== node) {
                parent.set(node, find(parent.get(node)));
            }
            return parent.get(node);
        };

        const union = (a, b) => {
            const rootA = find(a);
            const rootB = find(b);

            if (rootA === rootB) return false;

            const rankA = rank.get(rootA);
            const rankB = rank.get(rootB);

            if (rankA < rankB) {
                parent.set(rootA, rootB);
            } else if (rankA > rankB) {
                parent.set(rootB, rootA);
            } else {
                parent.set(rootB, rootA);
                rank.set(rootA, rankA + 1);
            }
            return true;
        };

        for (const node of nodes) {
            parent.set(node, node);
            rank.set(node, 0);
        }

        const sortedEdges = this.graph.edges
            .map(edge => ({
                ...edge,
                weight: this.graph.normalizeWeight(edge.weight)
            }))
            .sort((a, b) => {
                if (a.weight !== b.weight) return a.weight - b.weight;
                if (a.from !== b.from) return a.from - b.from;
                return a.to - b.to;
            });

        const mstEdges = [];
        let totalWeight = 0;

        for (const edge of sortedEdges) {
            if (union(edge.from, edge.to)) {
                mstEdges.push(edge);
                totalWeight += edge.weight;
            }
        }

        const componentCount = this.countComponents();
        const disconnected = componentCount > 1;

        return {
            directed: false,
            disconnected,
            componentCount,
            totalWeight,
            edges: mstEdges
        };
    }

    // Check if graph is bipartite using BFS 2-coloring
    async isBipartite(onVisit) {
        const nodes = Array.from(this.graph.nodes.keys());
        if (nodes.length === 0) return { isBipartite: true, setA: [], setB: [] };

        const color = new Map(); // 0 or 1
        const adj = this.graph.getUndirectedAdjacencyList();
        let bipartite = true;
        const setA = [];
        const setB = [];

        for (const startNode of nodes) {
            if (color.has(startNode)) continue;

            const queue = [startNode];
            color.set(startNode, 0);

            while (queue.length > 0 && bipartite) {
                const node = queue.shift();
                const c = color.get(node);

                if (onVisit) await onVisit(node, c);

                const neighbors = adj.get(node) || [];
                for (const neighbor of neighbors) {
                    if (!color.has(neighbor)) {
                        color.set(neighbor, 1 - c);
                        queue.push(neighbor);
                    } else if (color.get(neighbor) === c) {
                        bipartite = false;
                        break;
                    }
                }
            }

            if (!bipartite) break;
        }

        if (bipartite) {
            for (const [node, c] of color.entries()) {
                if (c === 0) setA.push(node);
                else setB.push(node);
            }
        }

        return { isBipartite: bipartite, setA, setB, colorMap: color };
    }

    // Compute graph diameter using BFS from every node
    async getDiameter(onProgress) {
        const nodes = Array.from(this.graph.nodes.keys());
        if (nodes.length === 0) return { diameter: 0, from: null, to: null, path: [] };
        
        const adj = this.graph.getUndirectedAdjacencyList();
        let maxDist = 0;
        let diamFrom = null;
        let diamTo = null;
        let diamPath = [];

        for (const startNode of nodes) {
            // BFS from startNode
            const dist = new Map();
            const parent = new Map();
            const queue = [startNode];
            dist.set(startNode, 0);
            parent.set(startNode, null);

            while (queue.length > 0) {
                const node = queue.shift();
                const neighbors = adj.get(node) || [];
                for (const neighbor of neighbors) {
                    if (!dist.has(neighbor)) {
                        dist.set(neighbor, dist.get(node) + 1);
                        parent.set(neighbor, node);
                        queue.push(neighbor);
                    }
                }
            }

            // Check max distance from this node
            for (const [node, d] of dist.entries()) {
                if (d > maxDist) {
                    maxDist = d;
                    diamFrom = startNode;
                    diamTo = node;
                    // Reconstruct path
                    diamPath = [];
                    let cur = node;
                    while (cur !== null) {
                        diamPath.unshift(cur);
                        cur = parent.get(cur);
                    }
                }
            }

            if (onProgress) await onProgress(startNode, maxDist);
        }

        // Check if graph is disconnected (some nodes unreachable)
        const isConnected = this.isConnected();
        if (!isConnected) {
            return { diameter: Infinity, from: null, to: null, path: [], disconnected: true };
        }

        return { diameter: maxDist, from: diamFrom, to: diamTo, path: diamPath, disconnected: false };
    }

    // Detect cycle using DFS
    async detectCycle(onVisit) {
        const nodes = Array.from(this.graph.nodes.keys());
        if (nodes.length === 0) return { hasCycle: false, cycle: [] };

        const adj = this.graph.getAdjacencyList();
        const visited = new Set();
        const parent = new Map();
        let cycleNodes = [];
        let found = false;

        if (this.graph.directed) {
            const state = new Map(); 
            const predecessor = new Map();

            for (const node of nodes) state.set(node, 0);

            const dfs = async (node) => {
                if (found) return;
                state.set(node, 1); // GRAY
                if (onVisit) await onVisit(node, 'visiting');

                const neighbors = adj.get(node) || [];
                for (const neighbor of neighbors) {
                    if (found) return;
                    if (state.get(neighbor) === 1) {
                        found = true;
                        cycleNodes = [neighbor];
                        let cur = node;
                        while (cur !== neighbor) {
                            cycleNodes.push(cur);
                            cur = predecessor.get(cur);
                        }
                        cycleNodes.push(neighbor);
                        cycleNodes.reverse();
                        return;
                    }
                    if (state.get(neighbor) === 0) {
                        predecessor.set(neighbor, node);
                        await dfs(neighbor);
                    }
                }

                state.set(node, 2);
            };

            for (const node of nodes) {
                if (state.get(node) === 0 && !found) {
                    await dfs(node);
                }
            }
        } else {
            const dfs = async (node, par) => {
                if (found) return;
                visited.add(node);
                parent.set(node, par);
                if (onVisit) await onVisit(node, 'visiting');

                const neighbors = adj.get(node) || [];
                for (const neighbor of neighbors) {
                    if (found) return;
                    if (!visited.has(neighbor)) {
                        await dfs(neighbor, node);
                    } else if (neighbor !== par) {
                        // Cycle found
                        found = true;
                        cycleNodes = [neighbor];
                        let cur = node;
                        while (cur !== neighbor) {
                            cycleNodes.push(cur);
                            cur = parent.get(cur);
                        }
                        cycleNodes.push(neighbor);
                        cycleNodes.reverse();
                        return;
                    }
                }
            };

            for (const node of nodes) {
                if (!visited.has(node) && !found) {
                    await dfs(node, null);
                }
            }
        }

        return { hasCycle: found, cycle: cycleNodes };
    }

    // Find girth (shortest cycle) using BFS from each node
    async getGirth(onProgress) {
        const nodes = Array.from(this.graph.nodes.keys());
        if (nodes.length === 0) return { girth: Infinity, cycle: [] };

        const adj = this.graph.getUndirectedAdjacencyList();
        let minGirth = Infinity;
        let bestCycle = [];

        for (const startNode of nodes) {
            const dist = new Map();
            const parentMap = new Map();
            const queue = [startNode];
            dist.set(startNode, 0);
            parentMap.set(startNode, null);

            let foundCycle = false;

            while (queue.length > 0 && !foundCycle) {
                const node = queue.shift();
                const d = dist.get(node);

                const neighbors = adj.get(node) || [];
                for (const neighbor of neighbors) {
                    if (!dist.has(neighbor)) {
                        dist.set(neighbor, d + 1);
                        parentMap.set(neighbor, node);
                        queue.push(neighbor);
                    } else if (parentMap.get(node) !== neighbor) {
                        // Found a cycle
                        const cycleLen = d + dist.get(neighbor) + 1;
                        if (cycleLen < minGirth) {
                            minGirth = cycleLen;
                            // Reconstruct cycle
                            const pathA = [];
                            let cur = node;
                            while (cur !== null) {
                                pathA.push(cur);
                                cur = parentMap.get(cur);
                            }
                            const pathB = [];
                            cur = neighbor;
                            while (cur !== null) {
                                pathB.push(cur);
                                cur = parentMap.get(cur);
                            }
                            // Find LCA and build cycle
                            const setA = new Set(pathA);
                            let lca = null;
                            for (const n of pathB) {
                                if (setA.has(n)) { lca = n; break; }
                            }
                            if (lca !== null) {
                                const cyclePartA = [];
                                for (const n of pathA) {
                                    cyclePartA.push(n);
                                    if (n === lca) break;
                                }
                                const cyclePartB = [];
                                for (const n of pathB) {
                                    if (n === lca) break;
                                    cyclePartB.push(n);
                                }
                                bestCycle = [...cyclePartA, ...cyclePartB.reverse(), cyclePartA[0]];
                            }
                        }
                        foundCycle = true;
                        break;
                    }
                }
            }

            if (onProgress) await onProgress(startNode, minGirth);
        }

        if (this.graph.directed) {
            const dirAdj = this.graph.getAdjacencyList();
            minGirth = Infinity;
            bestCycle = [];

            for (const startNode of nodes) {
                const dist = new Map();
                const parentMap = new Map();
                const queue = [startNode];
                dist.set(startNode, 0);
                parentMap.set(startNode, null);

                while (queue.length > 0) {
                    const node = queue.shift();
                    const d = dist.get(node);

                    if (d >= minGirth) break;

                    const neighbors = dirAdj.get(node) || [];
                    for (const neighbor of neighbors) {
                        if (neighbor === startNode && d + 1 < minGirth) {
                            minGirth = d + 1;
                            bestCycle = [startNode];
                            let cur = node;
                            while (cur !== startNode && cur !== null) {
                                bestCycle.push(cur);
                                cur = parentMap.get(cur);
                            }
                            bestCycle.reverse();
                            bestCycle.push(startNode);
                        }
                        if (!dist.has(neighbor)) {
                            dist.set(neighbor, d + 1);
                            parentMap.set(neighbor, node);
                            queue.push(neighbor);
                        }
                    }
                }
            }
        }

        return { girth: minGirth, cycle: bestCycle };
    }

    // Count islands in a grid
    static countIslandsInGrid(grid) {
        if (grid.length === 0) return { islands: 0, largest: 0 };

        const rows = grid.length;
        const cols = grid[0].length;
        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        
        let islands = 0;
        let largest = 0;

        const dr = [-1, 1, 0, 0];
        const dc = [0, 0, -1, 1];

        const bfs = (startR, startC) => {
            const queue = [{ r: startR, c: startC }];
            visited[startR][startC] = true;
            let size = 0;

            while (queue.length > 0) {
                const { r, c } = queue.shift();
                size++;

                for (let k = 0; k < 4; k++) {
                    const nr = r + dr[k];
                    const nc = c + dc[k];

                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                        grid[nr][nc] === 1 && !visited[nr][nc]) {
                        visited[nr][nc] = true;
                        queue.push({ r: nr, c: nc });
                    }
                }
            }

            return size;
        };

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === 1 && !visited[i][j]) {
                    islands++;
                    const size = bfs(i, j);
                    largest = Math.max(largest, size);
                }
            }
        }

        return { islands, largest };
    }
}
