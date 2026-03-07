
class Graph {
    constructor() {
        this.nodes = new Map(); // nodeId -> { x, y, label }
        this.edges = []; // [{ from, to }]
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

    // DFS with step-by-step tracking
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

    // BFS with step-by-step tracking
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

    // Count islands in a grid (separate from graph)
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
