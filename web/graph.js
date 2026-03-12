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

    addEdge(from, to) {
        if (!this.nodes.has(from) || !this.nodes.has(to)) return false;
        if (from === to) return false;
        
        // Check if edge already exists
        const exists = this.edges.some(e => {
            if (this.directed) {
                return e.from === from && e.to === to;
            } else {
                return (e.from === from && e.to === to) || (e.from === to && e.to === from);
            }
        });
     
        if (exists) return false;
        
        this.edges.push({ from, to });
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
        this.edges = data.edges;
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
