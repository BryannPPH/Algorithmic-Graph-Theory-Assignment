#include <iostream>
#include <vector>
#include <map>
#include <set>
#include <queue>
#include <cmath>
#include <algorithm>
#include <climits>

using namespace std;

struct Node {
    double x, y;
    string label;
};

struct Edge {
    int from, to;
};

struct DistanceResult {
    int distance;
    vector<int> path;
};

struct ComponentResult {
    int size;
    vector<int> nodes;
};

struct IslandResult {
    int islands;
    int largest;
};

struct BipartiteResult {
    bool isBipartite;
    vector<int> setA;
    vector<int> setB;
};

struct DiameterResult {
    int diameter;
    int from;
    int to;
    vector<int> path;
    bool disconnected;
};

struct CycleResult {
    bool hasCycle;
    vector<int> cycle;
};

struct GirthResult {
    int girth;
    vector<int> cycle;
};

class Graph {
public:
    map<int, Node> nodes;
    vector<Edge>   edges;
    bool           directed;
    int            nextNodeId;

    Graph() : directed(false), nextNodeId(1) {}

    void setDirected(bool dir) {
        directed = dir;
    }
    int addNode(double x, double y) {
        int id = nextNodeId++;
        nodes[id] = { x, y, to_string(id) };
        return id;
    }

    bool removeNode(int nodeId) {
        if (nodes.find(nodeId) == nodes.end()) return false;

        nodes.erase(nodeId);
        edges.erase(
            remove_if(edges.begin(), edges.end(),
                [nodeId](const Edge& e) {
                    return e.from == nodeId || e.to == nodeId;
                }),
            edges.end()
        );
        return true;
    }

    bool moveNode(int nodeId, double x, double y) {
        if (nodes.find(nodeId) == nodes.end()) return false;
        nodes[nodeId].x = x;
        nodes[nodeId].y = y;
        return true;
    }

    bool addEdge(int from, int to) {
        if (nodes.find(from) == nodes.end()) return false;
        if (nodes.find(to)   == nodes.end()) return false;
        if (from == to) return false;

        for (const Edge& e : edges) {
            if (directed) {
                if (e.from == from && e.to == to) return false;
            } else {
                if ((e.from == from && e.to == to) ||
                    (e.from == to   && e.to == from)) return false;
            }
        }

        edges.push_back({ from, to });
        return true;
    }

    bool hasEdge(int from, int to) const {
        for (const Edge& e : edges) {
            if (directed) {
                if (e.from == from && e.to == to) return true;
            } else {
                if ((e.from == from && e.to == to) ||
                    (e.from == to   && e.to == from)) return true;
            }
        }
        return false;
    }

    bool removeEdge(int from, int to) {
        for (auto it = edges.begin(); it != edges.end(); ++it) {
            bool match = directed
                ? (it->from == from && it->to == to)
                : ((it->from == from && it->to == to) ||
                   (it->from == to   && it->to == from));
            if (match) {
                edges.erase(it);
                return true;
            }
        }
        return false;
    }

    map<int, vector<int>> getAdjacencyList() const {
        map<int, vector<int>> adj;
        for (const auto& kv : nodes) adj[kv.first] = {};

        for (const Edge& e : edges) {
            adj[e.from].push_back(e.to);
            if (!directed) adj[e.to].push_back(e.from);
        }
        return adj;
    }

    map<int, vector<int>> getUndirectedAdjacencyList() const {
        map<int, vector<int>> adj;
        for (const auto& kv : nodes) adj[kv.first] = {};

        for (const Edge& e : edges) {
            adj[e.from].push_back(e.to);
            adj[e.to].push_back(e.from);
        }
        return adj;
    }

    vector<int> getNeighbors(int nodeId) const {
        vector<int> neighbors;
        if (nodes.find(nodeId) == nodes.end()) return neighbors;

        for (const Edge& e : edges) {
            if (e.from == nodeId) {
                neighbors.push_back(e.to);
            } else if (!directed && e.to == nodeId) {
                neighbors.push_back(e.from);
            }
        }
        return neighbors;
    }

    void clear() {
        nodes.clear();
        edges.clear();
        nextNodeId = 1;
    }

    int getNodeAtPosition(double x, double y, double radius = 25.0) const {
        for (const auto& kv : nodes) {
            double dx = kv.second.x - x;
            double dy = kv.second.y - y;
            if (dx*dx + dy*dy <= radius*radius) return kv.first;
        }
        return -1;
    }

    double pointToLineDistance(double px, double py, double x1, double y1, double x2, double y2) const {
        double A = px - x1, B = py - y1;
        double C = x2 - x1, D = y2 - y1;

        double dot   = A*C + B*D;
        double lenSq = C*C + D*D;
        double param = (lenSq != 0) ? dot / lenSq : -1;

        double xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param*C; yy = y1 + param*D; }

        double dx = px - xx, dy = py - yy;
        return sqrt(dx*dx + dy*dy);
    }

    // Cari edge terdekat dari posisi (x, y)
    const Edge* getEdgeAtPosition(double x, double y, double threshold = 10.0) const {
        for (const Edge& e : edges) {
            const Node& from = nodes.at(e.from);
            const Node& to   = nodes.at(e.to);
            if (pointToLineDistance(x, y, from.x, from.y, to.x, to.y) <= threshold)
                return &e;
        }
        return nullptr;
    }
};


class GraphAlgorithms {
    const Graph& graph;

public:
    explicit GraphAlgorithms(const Graph& g) : graph(g) {}

    vector<int> dfs(int startNode) const {
        set<int> visited;
        vector<int> order;
        auto adj = graph.getAdjacencyList();

        function<void(int)> dfsRec = [&](int node) {
            visited.insert(node);
            order.push_back(node);
            for (int neighbor : adj[node]) {
                if (!visited.count(neighbor))
                    dfsRec(neighbor);
            }
        };

        dfsRec(startNode);
        return order;
    }

    vector<int> bfs(int startNode) const {
        set<int> visited;
        vector<int> order;
        queue<int> q;
        auto adj = graph.getAdjacencyList();

        visited.insert(startNode);
        q.push(startNode);

        while (!q.empty()) {
            int node = q.front(); q.pop();
            order.push_back(node);

            for (int neighbor : adj[node]) {
                if (!visited.count(neighbor)) {
                    visited.insert(neighbor);
                    q.push(neighbor);
                }
            }
        }
        return order;
    }

    DistanceResult distance(int startNode, int endNode) const {
        set<int> visited;
        map<int, int> parent;   
        queue<pair<int,int>> q;    
        auto adj = graph.getAdjacencyList();

        visited.insert(startNode);
        parent[startNode] = -1;
        q.push({ startNode, 0 });

        while (!q.empty()) {
            auto [node, dist] = q.front(); q.pop();

            if (node == endNode) {
                // Rekonstruksi jalur
                vector<int> path;
                int curr = endNode;
                while (curr != -1) {
                    path.push_back(curr);
                    curr = parent[curr];
                }
                reverse(path.begin(), path.end());
                return { dist, path };
            }

            for (int neighbor : adj[node]) {
                if (!visited.count(neighbor)) {
                    visited.insert(neighbor);
                    parent[neighbor] = node;
                    q.push({ neighbor, dist + 1 });
                }
            }
        }

        return { -1, {} };
    }

    bool isConnected() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return true;

        set<int> visited;
        auto adj = graph.getUndirectedAdjacencyList();
        dfsHelper(nodeList[0], adj, visited);
        return (int)visited.size() == (int)nodeList.size();
    }

    int countComponents() const {
        auto nodeList = getNodeIds();
        set<int> visited;
        auto adj = graph.getUndirectedAdjacencyList();
        int count = 0;

        for (int node : nodeList) {
            if (!visited.count(node)) {
                dfsHelper(node, adj, visited);
                count++;
            }
        }
        return count;
    }

    ComponentResult getComponentSize(int startNode) const {
        set<int> visited;
        vector<int> comp;
        auto adj = graph.getUndirectedAdjacencyList();

        function<void(int)> dfs = [&](int node) {
            visited.insert(node);
            comp.push_back(node);
            for (int nb : adj.at(node))
                if (!visited.count(nb)) dfs(nb);
        };

        dfs(startNode);
        return { (int)comp.size(), comp };
    }

    vector<vector<int>> getAllComponents() const {
        auto nodeList = getNodeIds();
        set<int> visited;
        auto adj = graph.getUndirectedAdjacencyList();
        vector<vector<int>> components;

        for (int node : nodeList) {
            if (!visited.count(node)) {
                vector<int> comp;
                function<void(int)> dfs = [&](int n) {
                    visited.insert(n);
                    comp.push_back(n);
                    for (int nb : adj.at(n))
                        if (!visited.count(nb)) dfs(nb);
                };
                dfs(node);
                components.push_back(comp);
            }
        }
        return components;
    }

    ComponentResult getLargestComponent() const {
        auto comps = getAllComponents();
        if (comps.empty()) return { 0, {} };

        vector<int>* largest = &comps[0];
        for (auto& c : comps)
            if (c.size() > largest->size()) largest = &c;

        sort(largest->begin(), largest->end());
        return { (int)largest->size(), *largest };
    }

    static IslandResult countIslandsInGrid(const vector<vector<int>>& grid) {
        if (grid.empty()) return { 0, 0 };

        int rows = grid.size();
        int cols = grid[0].size();
        vector<vector<bool>> visited(rows, vector<bool>(cols, false));

        int islands = 0, largest = 0;
        int dr[] = { -1, 1, 0, 0 };
        int dc[] = {  0, 0,-1, 1 };

        auto bfs = [&](int startR, int startC) -> int {
            queue<pair<int,int>> q;
            q.push({ startR, startC });
            visited[startR][startC] = true;
            int size = 0;

            while (!q.empty()) {
                auto [r, c] = q.front(); q.pop();
                size++;
                for (int k = 0; k < 4; k++) {
                    int nr = r + dr[k], nc = c + dc[k];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                        grid[nr][nc] == 1 && !visited[nr][nc]) {
                        visited[nr][nc] = true;
                        q.push({ nr, nc });
                    }
                }
            }
            return size;
        };

        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (grid[i][j] == 1 && !visited[i][j]) {
                    islands++;
                    largest = max(largest, bfs(i, j));
                }
            }
        }

        return { islands, largest };
    }

    // Cek apakah graf bipartite menggunakan BFS 2-coloring
    BipartiteResult isBipartite() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return { true, {}, {} };

        map<int, int> color;
        auto adj = graph.getUndirectedAdjacencyList();
        bool bipartite = true;

        for (int startNode : nodeList) {
            if (color.count(startNode)) continue;

            queue<int> q;
            q.push(startNode);
            color[startNode] = 0;

            while (!q.empty() && bipartite) {
                int node = q.front(); q.pop();
                int c = color[node];

                for (int neighbor : adj[node]) {
                    if (!color.count(neighbor)) {
                        color[neighbor] = 1 - c;
                        q.push(neighbor);
                    } else if (color[neighbor] == c) {
                        bipartite = false;
                        break;
                    }
                }
            }

            if (!bipartite) break;
        }

        BipartiteResult result;
        result.isBipartite = bipartite;

        if (bipartite) {
            for (auto& [node, c] : color) {
                if (c == 0) result.setA.push_back(node);
                else result.setB.push_back(node);
            }
            sort(result.setA.begin(), result.setA.end());
            sort(result.setB.begin(), result.setB.end());
        }

        return result;
    }

    DiameterResult getDiameter() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return { 0, -1, -1, {}, false };

        auto adj = graph.getUndirectedAdjacencyList();
        int maxDist = 0;
        int diamFrom = -1, diamTo = -1;
        vector<int> diamPath;

        for (int startNode : nodeList) {
            map<int, int> dist;
            map<int, int> parent;
            queue<int> q;

            dist[startNode] = 0;
            parent[startNode] = -1;
            q.push(startNode);

            while (!q.empty()) {
                int node = q.front(); q.pop();
                for (int neighbor : adj[node]) {
                    if (!dist.count(neighbor)) {
                        dist[neighbor] = dist[node] + 1;
                        parent[neighbor] = node;
                        q.push(neighbor);
                    }
                }
            }

            for (auto& [node, d] : dist) {
                if (d > maxDist) {
                    maxDist = d;
                    diamFrom = startNode;
                    diamTo = node;
                    diamPath.clear();
                    int cur = node;
                    while (cur != -1) {
                        diamPath.push_back(cur);
                        cur = parent[cur];
                    }
                    reverse(diamPath.begin(), diamPath.end());
                }
            }
        }

        if (!isConnected()) {
            return { -1, -1, -1, {}, true };
        }

        return { maxDist, diamFrom, diamTo, diamPath, false };
    }

    // Deteksi siklus menggunakan DFS
    CycleResult detectCycle() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return { false, {} };

        auto adj = graph.getAdjacencyList();
        vector<int> cycleNodes;
        bool found = false;

        if (graph.directed) {
            // Directed: gunakan warna (WHITE=0, GRAY=1, BLACK=2)
            map<int, int> state;
            map<int, int> predecessor;

            for (int node : nodeList) state[node] = 0;

            function<void(int)> dfs = [&](int node) {
                if (found) return;
                state[node] = 1; // GRAY

                for (int neighbor : adj[node]) {
                    if (found) return;
                    if (state[neighbor] == 1) {
                        // Back edge → siklus!
                        found = true;
                        cycleNodes.push_back(neighbor);
                        int cur = node;
                        while (cur != neighbor) {
                            cycleNodes.push_back(cur);
                            cur = predecessor[cur];
                        }
                        cycleNodes.push_back(neighbor);
                        reverse(cycleNodes.begin(), cycleNodes.end());
                        return;
                    }
                    if (state[neighbor] == 0) {
                        predecessor[neighbor] = node;
                        dfs(neighbor);
                    }
                }

                state[node] = 2;
            };

            for (int node : nodeList) {
                if (state[node] == 0 && !found) {
                    dfs(node);
                }
            }
        } else {
            set<int> visited;
            map<int, int> parent;

            function<void(int, int)> dfs = [&](int node, int par) {
                if (found) return;
                visited.insert(node);
                parent[node] = par;

                for (int neighbor : adj[node]) {
                    if (found) return;
                    if (!visited.count(neighbor)) {
                        dfs(neighbor, node);
                    } else if (neighbor != par) {
                        found = true;
                        cycleNodes.push_back(neighbor);
                        int cur = node;
                        while (cur != neighbor) {
                            cycleNodes.push_back(cur);
                            cur = parent[cur];
                        }
                        cycleNodes.push_back(neighbor);
                        reverse(cycleNodes.begin(), cycleNodes.end());
                        return;
                    }
                }
            };

            for (int node : nodeList) {
                if (!visited.count(node) && !found) {
                    dfs(node, -1);
                }
            }
        }

        return { found, cycleNodes };
    }

    // Cari girth (siklus terpendek) menggunakan BFS dari setiap simpul
    GirthResult getGirth() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return { INT_MAX, {} };

        int minGirth = INT_MAX;
        vector<int> bestCycle;

        if (!graph.directed) {
            auto adj = graph.getUndirectedAdjacencyList();

            for (int startNode : nodeList) {
                map<int, int> dist;
                map<int, int> parentMap;
                queue<int> q;

                dist[startNode] = 0;
                parentMap[startNode] = -1;
                q.push(startNode);

                bool foundCycle = false;

                while (!q.empty() && !foundCycle) {
                    int node = q.front(); q.pop();
                    int d = dist[node];

                    for (int neighbor : adj[node]) {
                        if (!dist.count(neighbor)) {
                            dist[neighbor] = d + 1;
                            parentMap[neighbor] = node;
                            q.push(neighbor);
                        } else if (parentMap[node] != neighbor) {
                            int cycleLen = d + dist[neighbor] + 1;
                            if (cycleLen < minGirth) {
                                minGirth = cycleLen;

                                vector<int> pathA;
                                int cur = node;
                                while (cur != -1) {
                                    pathA.push_back(cur);
                                    cur = parentMap[cur];
                                }
                                vector<int> pathB;
                                cur = neighbor;
                                while (cur != -1) {
                                    pathB.push_back(cur);
                                    cur = parentMap[cur];
                                }

                                set<int> setA(pathA.begin(), pathA.end());
                                int lca = -1;
                                for (int n : pathB) {
                                    if (setA.count(n)) { lca = n; break; }
                                }

                                if (lca != -1) {
                                    vector<int> cyclePartA;
                                    for (int n : pathA) {
                                        cyclePartA.push_back(n);
                                        if (n == lca) break;
                                    }
                                    vector<int> cyclePartB;
                                    for (int n : pathB) {
                                        if (n == lca) break;
                                        cyclePartB.push_back(n);
                                    }
                                    reverse(cyclePartB.begin(), cyclePartB.end());

                                    bestCycle.clear();
                                    for (int n : cyclePartA) bestCycle.push_back(n);
                                    for (int n : cyclePartB) bestCycle.push_back(n);
                                    bestCycle.push_back(cyclePartA[0]);
                                }
                            }
                            foundCycle = true;
                            break;
                        }
                    }
                }
            }
        } else {
            auto dirAdj = graph.getAdjacencyList();

            for (int startNode : nodeList) {
                map<int, int> dist;
                map<int, int> parentMap;
                queue<int> q;

                dist[startNode] = 0;
                parentMap[startNode] = -1;
                q.push(startNode);

                while (!q.empty()) {
                    int node = q.front(); q.pop();
                    int d = dist[node];

                    if (d >= minGirth) break;

                    for (int neighbor : dirAdj[node]) {
                        if (neighbor == startNode && d + 1 < minGirth) {
                            minGirth = d + 1;
                            // Rekonstruksi
                            bestCycle.clear();
                            bestCycle.push_back(startNode);
                            int cur = node;
                            while (cur != startNode && cur != -1) {
                                bestCycle.push_back(cur);
                                cur = parentMap[cur];
                            }
                            reverse(bestCycle.begin(), bestCycle.end());
                            bestCycle.push_back(startNode);
                        }
                        if (!dist.count(neighbor)) {
                            dist[neighbor] = d + 1;
                            parentMap[neighbor] = node;
                            q.push(neighbor);
                        }
                    }
                }
            }
        }

        return { minGirth, bestCycle };
    }

private:
    vector<int> getNodeIds() const {
        vector<int> ids;
        for (const auto& kv : graph.nodes) ids.push_back(kv.first);
        return ids;
    }

    void dfsHelper(int node,
                   const map<int, vector<int>>& adj,
                   set<int>& visited) const {
        visited.insert(node);
        for (int nb : adj.at(node))
            if (!visited.count(nb)) dfsHelper(nb, adj, visited);
    }
};