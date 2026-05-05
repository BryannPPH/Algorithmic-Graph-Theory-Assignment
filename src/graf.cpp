#include <algorithm>
#include <cctype>
#include <cmath>
#include <functional>
#include <iostream>
#include <limits>
#include <map>
#include <queue>
#include <set>
#include <string>
#include <utility>
#include <vector>

using namespace std;

// Basic graph primitives used across all algorithms in this file.
struct Node {
    double x, y;
    string label;
};

struct Edge {
    int from, to;
    double weight;
};

// Result containers for traversal and graph-analysis routines.
struct DistanceResult {
    int distance;
    vector<int> path;
};

struct WeightedDistanceResult {
    double distance;
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

struct MinimumSpanningTreeResult {
    bool directed;
    bool disconnected;
    int componentCount;
    double totalWeight;
    vector<Edge> edges;
};

struct TspSegment {
    int from;
    int to;
    double distance;
    vector<int> path;
};

struct TspResult {
    bool hasTour;
    string reason;
    int maxNodes;
    string algorithm;
    int startNode;
    vector<int> visitOrder;
    vector<int> cycle;
    vector<int> expandedPath;
    vector<TspSegment> segments;
    double totalWeight;
    bool usesShortestPathExpansion;
    long long iterations;
};

// Result containers for matching and scheduling features mirrored from the web app.
struct MatchingPair {
    int left;
    int right;
};

struct MatchingResult {
    bool validBipartition;
    int matchingSize;
    vector<MatchingPair> pairs;
    map<int, int> pairLeft;
    map<int, int> pairRight;
};

struct ScheduleCourse {
    string code;
    string name;
};

struct ScheduleConflict {
    string from;
    string to;
};

struct ScheduleAssignment {
    string code;
    string name;
    int slotIndex;
    string slotLabel;
    int conflictDegree;
};

struct ScheduleSlotGroup {
    int slotIndex;
    string label;
    bool isOverflow;
    vector<ScheduleAssignment> courses;
};

struct ScheduleSummary {
    int totalCourses;
    int totalConflicts;
    int maxDegree;
    int isolatedCourses;
    double density;
};

struct ScheduleColoringResult {
    map<string, int> colors;
    int colorCount;
};

struct ScheduleResult {
    string algorithm;
    int usedSlots;
    int availableSlots;
    int overflowSlots;
    bool feasible;
    vector<ScheduleAssignment> assignments;
    vector<ScheduleSlotGroup> slotGroups;
    ScheduleSummary summary;
};

// Mutable graph model that stores geometry, orientation, and optional edge weights.
class Graph {
public:
    map<int, Node> nodes;
    vector<Edge> edges;
    bool directed;
    int nextNodeId;

    Graph() : directed(false), nextNodeId(1) {}

    void setDirected(bool dir) {
        directed = dir;
    }

    int addNode(double x, double y) {
        int id = nextNodeId++;
        nodes[id] = {x, y, to_string(id)};
        return id;
    }

    bool removeNode(int nodeId) {
        if (nodes.find(nodeId) == nodes.end()) return false;

        nodes.erase(nodeId);
        edges.erase(
            remove_if(
                edges.begin(),
                edges.end(),
                [nodeId](const Edge& e) {
                    return e.from == nodeId || e.to == nodeId;
                }
            ),
            edges.end()
        );
        return true;
    }

    bool moveNode(int nodeId, double x, double y) {
        auto it = nodes.find(nodeId);
        if (it == nodes.end()) return false;

        it->second.x = x;
        it->second.y = y;
        return true;
    }

    double normalizeWeight(double weight = 1.0) const {
        // Dijkstra and Kruskal assume non-negative finite weights.
        return isfinite(weight) && weight >= 0.0 ? weight : 1.0;
    }

    bool addEdge(int from, int to, double weight = 1.0) {
        if (nodes.find(from) == nodes.end()) return false;
        if (nodes.find(to) == nodes.end()) return false;
        if (from == to) return false;

        for (const Edge& e : edges) {
            if (directed) {
                if (e.from == from && e.to == to) return false;
            } else {
                if ((e.from == from && e.to == to) ||
                    (e.from == to && e.to == from)) {
                    return false;
                }
            }
        }

        edges.push_back({from, to, normalizeWeight(weight)});
        return true;
    }

    bool hasEdge(int from, int to) const {
        return getEdge(from, to) != nullptr;
    }

    bool removeEdge(int from, int to) {
        for (auto it = edges.begin(); it != edges.end(); ++it) {
            bool match = directed
                ? (it->from == from && it->to == to)
                : ((it->from == from && it->to == to) ||
                   (it->from == to && it->to == from));
            if (match) {
                edges.erase(it);
                return true;
            }
        }
        return false;
    }

    const Edge* getEdge(int from, int to) const {
        for (const Edge& e : edges) {
            if (directed) {
                if (e.from == from && e.to == to) return &e;
            } else if ((e.from == from && e.to == to) ||
                       (e.from == to && e.to == from)) {
                return &e;
            }
        }
        return nullptr;
    }

    bool tryGetEdgeWeight(int from, int to, double& weight) const {
        const Edge* edge = getEdge(from, to);
        if (!edge) return false;

        weight = normalizeWeight(edge->weight);
        return true;
    }

    double getEdgeWeight(int from, int to) const {
        double weight = -1.0;
        return tryGetEdgeWeight(from, to, weight) ? weight : -1.0;
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

    map<int, vector<pair<int, double>>> getWeightedAdjacencyList() const {
        // Weighted adjacency is built on demand so unweighted operations stay simple.
        map<int, vector<pair<int, double>>> adj;
        for (const auto& kv : nodes) adj[kv.first] = {};

        for (const Edge& e : edges) {
            double weight = normalizeWeight(e.weight);
            adj[e.from].push_back({e.to, weight});
            if (!directed) adj[e.to].push_back({e.from, weight});
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
            if (dx * dx + dy * dy <= radius * radius) return kv.first;
        }
        return -1;
    }

    double pointToLineDistance(
        double px,
        double py,
        double x1,
        double y1,
        double x2,
        double y2
    ) const {
        // Project the point onto the segment, then measure Euclidean distance.
        double A = px - x1;
        double B = py - y1;
        double C = x2 - x1;
        double D = y2 - y1;

        double dot = A * C + B * D;
        double lenSq = C * C + D * D;
        double param = (lenSq != 0.0) ? dot / lenSq : -1.0;

        double xx = 0.0;
        double yy = 0.0;
        if (param < 0.0) {
            xx = x1;
            yy = y1;
        } else if (param > 1.0) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        double dx = px - xx;
        double dy = py - yy;
        return sqrt(dx * dx + dy * dy);
    }

    const Edge* getEdgeAtPosition(double x, double y, double threshold = 10.0) const {
        for (const Edge& e : edges) {
            const Node& from = nodes.at(e.from);
            const Node& to = nodes.at(e.to);
            if (pointToLineDistance(x, y, from.x, from.y, to.x, to.y) <= threshold) {
                return &e;
            }
        }
        return nullptr;
    }
};

// Collection of core graph algorithms used by the visualizer pages.
class GraphAlgorithms {
    const Graph& graph;

public:
    explicit GraphAlgorithms(const Graph& g) : graph(g) {}

    // Standard depth-first traversal following the graph orientation.
    vector<int> dfs(int startNode) const {
        if (graph.nodes.find(startNode) == graph.nodes.end()) return {};

        set<int> visited;
        vector<int> order;
        auto adj = graph.getAdjacencyList();

        function<void(int)> dfsRec = [&](int node) {
            visited.insert(node);
            order.push_back(node);
            for (int neighbor : adj[node]) {
                if (!visited.count(neighbor)) dfsRec(neighbor);
            }
        };

        dfsRec(startNode);
        return order;
    }

    // Standard breadth-first traversal following the graph orientation.
    vector<int> bfs(int startNode) const {
        if (graph.nodes.find(startNode) == graph.nodes.end()) return {};

        set<int> visited;
        vector<int> order;
        queue<int> q;
        auto adj = graph.getAdjacencyList();

        visited.insert(startNode);
        q.push(startNode);

        while (!q.empty()) {
            int node = q.front();
            q.pop();
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

    // Unweighted shortest path measured in number of edges.
    DistanceResult distance(int startNode, int endNode) const {
        if (graph.nodes.find(startNode) == graph.nodes.end()) return {-1, {}};
        if (graph.nodes.find(endNode) == graph.nodes.end()) return {-1, {}};

        set<int> visited;
        map<int, int> parent;
        queue<pair<int, int>> q;
        auto adj = graph.getAdjacencyList();

        visited.insert(startNode);
        parent[startNode] = -1;
        q.push({startNode, 0});

        while (!q.empty()) {
            auto [node, dist] = q.front();
            q.pop();

            if (node == endNode) {
                return {dist, reconstructPath(parent, endNode)};
            }

            for (int neighbor : adj[node]) {
                if (!visited.count(neighbor)) {
                    visited.insert(neighbor);
                    parent[neighbor] = node;
                    q.push({neighbor, dist + 1});
                }
            }
        }

        return {-1, {}};
    }

    // Dijkstra with a min-heap; safe because weights are normalized to non-negative values.
    WeightedDistanceResult shortestPathWeighted(int startNode, int endNode) const {
        const double INF = numeric_limits<double>::infinity();
        if (graph.nodes.find(startNode) == graph.nodes.end()) return {INF, {}};
        if (graph.nodes.find(endNode) == graph.nodes.end()) return {INF, {}};

        auto adj = graph.getWeightedAdjacencyList();
        auto nodeList = getNodeIds();
        map<int, double> dist;
        map<int, int> parent;

        for (int node : nodeList) {
            dist[node] = INF;
            parent[node] = -1;
        }

        priority_queue<pair<double, int>, vector<pair<double, int>>, greater<pair<double, int>>> pq;
        dist[startNode] = 0.0;
        pq.push({0.0, startNode});

        while (!pq.empty()) {
            auto [currentDist, node] = pq.top();
            pq.pop();

            if (currentDist > dist[node]) continue;
            if (node == endNode) break;

            for (const auto& [neighbor, weight] : adj[node]) {
                double nextDist = currentDist + weight;
                if (nextDist < dist[neighbor]) {
                    dist[neighbor] = nextDist;
                    parent[neighbor] = node;
                    pq.push({nextDist, neighbor});
                }
            }
        }

        if (!isfinite(dist[endNode])) return {INF, {}};
        return {dist[endNode], reconstructPath(parent, endNode)};
    }

    WeightedDistanceResult shortestPathWeightedSync(int startNode, int endNode) const {
        return shortestPathWeighted(startNode, endNode);
    }

    // Connectivity checks ignore orientation to match the visualizer's component semantics.
    bool isConnected() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return true;

        set<int> visited;
        auto adj = graph.getUndirectedAdjacencyList();
        dfsHelper(nodeList[0], adj, visited);
        return static_cast<int>(visited.size()) == static_cast<int>(nodeList.size());
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

    // Returns the connected component containing a given start node.
    ComponentResult getComponentSize(int startNode) const {
        if (graph.nodes.find(startNode) == graph.nodes.end()) return {0, {}};

        set<int> visited;
        vector<int> comp;
        auto adj = graph.getUndirectedAdjacencyList();

        function<void(int)> dfsRec = [&](int node) {
            visited.insert(node);
            comp.push_back(node);
            for (int neighbor : adj.at(node)) {
                if (!visited.count(neighbor)) dfsRec(neighbor);
            }
        };

        dfsRec(startNode);
        return {static_cast<int>(comp.size()), comp};
    }

    vector<vector<int>> getAllComponents() const {
        auto nodeList = getNodeIds();
        set<int> visited;
        auto adj = graph.getUndirectedAdjacencyList();
        vector<vector<int>> components;

        for (int node : nodeList) {
            if (!visited.count(node)) {
                vector<int> component;

                function<void(int)> dfsRec = [&](int current) {
                    visited.insert(current);
                    component.push_back(current);
                    for (int neighbor : adj.at(current)) {
                        if (!visited.count(neighbor)) dfsRec(neighbor);
                    }
                };

                dfsRec(node);
                components.push_back(component);
            }
        }

        return components;
    }

    // Picks the largest connected component under the same undirected interpretation.
    ComponentResult getLargestComponent() const {
        auto components = getAllComponents();
        if (components.empty()) return {0, {}};

        vector<int>* largest = &components[0];
        for (auto& component : components) {
            if (component.size() > largest->size()) largest = &component;
        }

        sort(largest->begin(), largest->end());
        return {static_cast<int>(largest->size()), *largest};
    }

    // Kruskal grows a minimum spanning forest; disconnected graphs return a forest, not a single tree.
    MinimumSpanningTreeResult getMinimumSpanningTree() const {
        auto nodeList = getNodeIds();

        if (graph.directed) {
            return {true, false, 0, 0.0, {}};
        }

        if (nodeList.empty()) {
            return {false, false, 0, 0.0, {}};
        }

        struct DisjointSetUnion {
            map<int, int> parent;
            map<int, int> rank;

            explicit DisjointSetUnion(const vector<int>& nodes) {
                for (int node : nodes) {
                    parent[node] = node;
                    rank[node] = 0;
                }
            }

            int find(int node) {
                if (parent[node] != node) parent[node] = find(parent[node]);
                return parent[node];
            }

            bool unite(int a, int b) {
                int rootA = find(a);
                int rootB = find(b);
                if (rootA == rootB) return false;

                if (rank[rootA] < rank[rootB]) {
                    parent[rootA] = rootB;
                } else if (rank[rootA] > rank[rootB]) {
                    parent[rootB] = rootA;
                } else {
                    parent[rootB] = rootA;
                    rank[rootA]++;
                }
                return true;
            }
        };

        vector<Edge> sortedEdges = graph.edges;
        sort(
            sortedEdges.begin(),
            sortedEdges.end(),
            [&](const Edge& a, const Edge& b) {
                double weightA = graph.normalizeWeight(a.weight);
                double weightB = graph.normalizeWeight(b.weight);
                if (weightA != weightB) return weightA < weightB;
                if (a.from != b.from) return a.from < b.from;
                return a.to < b.to;
            }
        );

        DisjointSetUnion dsu(nodeList);
        vector<Edge> mstEdges;
        double totalWeight = 0.0;

        for (const Edge& edge : sortedEdges) {
            // Only keep edges that connect two different DSU components.
            if (dsu.unite(edge.from, edge.to)) {
                mstEdges.push_back({edge.from, edge.to, graph.normalizeWeight(edge.weight)});
                totalWeight += graph.normalizeWeight(edge.weight);
            }
        }

        int componentCount = countComponents();
        bool disconnected = componentCount > 1;
        return {false, disconnected, componentCount, totalWeight, mstEdges};
    }

    // Exact TSP solver for small graphs using permutation search with branch-and-bound pruning.
    TspResult solveTSPBruteForce(int startNode) const {
        vector<int> nodes = getNodeIds();
        sort(nodes.begin(), nodes.end());

        TspResult result;
        result.hasTour = false;
        result.reason = "";
        result.maxNodes = 0;
        result.algorithm = "Brute Force (Exact)";
        result.startNode = startNode;
        result.totalWeight = 0.0;
        result.usesShortestPathExpansion = false;
        result.iterations = 0;

        if (graph.nodes.find(startNode) == graph.nodes.end()) {
            result.reason = "start-node-not-found";
            return result;
        }

        if (nodes.empty()) {
            result.hasTour = true;
            result.startNode = -1;
            return result;
        }

        if (nodes.size() == 1) {
            result.hasTour = true;
            result.visitOrder = {startNode};
            result.cycle = {startNode, startNode};
            result.expandedPath = result.cycle;
            result.segments = {{startNode, startNode, 0.0, {startNode, startNode}}};
            return result;
        }

        const int maxBruteForceNodes = 11;
        if (static_cast<int>(nodes.size()) > maxBruteForceNodes) {
            result.reason = "too-many-nodes";
            result.maxNodes = maxBruteForceNodes;
            return result;
        }

        vector<int> remainingNodes;
        for (int node : nodes) {
            if (node != startNode) remainingNodes.push_back(node);
        }

        vector<int> bestCycle;
        vector<int> bestVisitOrder;
        double bestWeight = numeric_limits<double>::infinity();

        function<void(int, vector<int>&, vector<int>&, double)> search =
            [&](int currentNode, vector<int>& unvisited, vector<int>& visitOrder, double totalWeight) {
                result.iterations++;

                if (unvisited.empty()) {
                    double backWeight = 0.0;
                    if (!graph.tryGetEdgeWeight(currentNode, startNode, backWeight)) return;

                    vector<int> cycle = visitOrder;
                    cycle.push_back(startNode);
                    double candidateWeight = totalWeight + backWeight;

                    if (candidateWeight < bestWeight ||
                        (candidateWeight == bestWeight &&
                         isLexicographicallySmaller(cycle, bestCycle))) {
                        bestWeight = candidateWeight;
                        bestVisitOrder = visitOrder;
                        bestCycle = cycle;
                    }
                    return;
                }

                for (size_t i = 0; i < unvisited.size(); i++) {
                    int nextNode = unvisited[i];
                    double edgeWeight = 0.0;
                    if (!graph.tryGetEdgeWeight(currentNode, nextNode, edgeWeight)) continue;

                    // Prune partial tours that are already worse than the best exact solution found.
                    double nextWeight = totalWeight + edgeWeight;
                    if (nextWeight > bestWeight) continue;

                    vector<int> nextUnvisited = unvisited;
                    nextUnvisited.erase(nextUnvisited.begin() + static_cast<long>(i));
                    visitOrder.push_back(nextNode);
                    search(nextNode, nextUnvisited, visitOrder, nextWeight);
                    visitOrder.pop_back();
                }
            };

        vector<int> visitOrder = {startNode};
        search(startNode, remainingNodes, visitOrder, 0.0);

        if (bestCycle.empty()) {
            result.reason = "no-hamiltonian-cycle";
            return result;
        }

        vector<TspSegment> segments;
        for (size_t i = 0; i + 1 < bestCycle.size(); i++) {
            double segmentWeight = 0.0;
            graph.tryGetEdgeWeight(bestCycle[i], bestCycle[i + 1], segmentWeight);
            segments.push_back({bestCycle[i], bestCycle[i + 1], segmentWeight, {bestCycle[i], bestCycle[i + 1]}});
        }

        result.hasTour = true;
        result.visitOrder = bestVisitOrder;
        result.cycle = bestCycle;
        result.expandedPath = bestCycle;
        result.segments = segments;
        result.totalWeight = bestWeight;
        return result;
    }

    // Two-coloring by BFS on the undirected view of the graph.
    BipartiteResult isBipartite() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return {true, {}, {}};

        map<int, int> color;
        auto adj = graph.getUndirectedAdjacencyList();
        bool bipartite = true;

        for (int startNode : nodeList) {
            if (color.count(startNode)) continue;

            queue<int> q;
            q.push(startNode);
            color[startNode] = 0;

            while (!q.empty() && bipartite) {
                int node = q.front();
                q.pop();
                int currentColor = color[node];

                for (int neighbor : adj[node]) {
                    if (!color.count(neighbor)) {
                        color[neighbor] = 1 - currentColor;
                        q.push(neighbor);
                    } else if (color[neighbor] == currentColor) {
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
            for (const auto& [node, currentColor] : color) {
                if (currentColor == 0) result.setA.push_back(node);
                else result.setB.push_back(node);
            }
            sort(result.setA.begin(), result.setA.end());
            sort(result.setB.begin(), result.setB.end());
        }

        return result;
    }

    // Diameter is computed by BFS from every node, so this is exact for unweighted graphs.
    DiameterResult getDiameter() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return {0, -1, -1, {}, false};

        auto adj = graph.getUndirectedAdjacencyList();
        int maxDist = 0;
        int diamFrom = -1;
        int diamTo = -1;
        vector<int> diamPath;

        for (int startNode : nodeList) {
            map<int, int> dist;
            map<int, int> parent;
            queue<int> q;

            dist[startNode] = 0;
            parent[startNode] = -1;
            q.push(startNode);

            while (!q.empty()) {
                int node = q.front();
                q.pop();
                for (int neighbor : adj[node]) {
                    if (!dist.count(neighbor)) {
                        dist[neighbor] = dist[node] + 1;
                        parent[neighbor] = node;
                        q.push(neighbor);
                    }
                }
            }

            for (const auto& [node, distance] : dist) {
                if (distance > maxDist) {
                    maxDist = distance;
                    diamFrom = startNode;
                    diamTo = node;
                    diamPath = reconstructPath(parent, node);
                }
            }
        }

        if (!isConnected()) {
            return {-1, -1, -1, {}, true};
        }

        return {maxDist, diamFrom, diamTo, diamPath, false};
    }

    // Directed cycle detection uses DFS colors; undirected detection uses parent tracking.
    CycleResult detectCycle() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return {false, {}};

        auto adj = graph.getAdjacencyList();
        vector<int> cycleNodes;
        bool found = false;

        if (graph.directed) {
            map<int, int> state;
            map<int, int> predecessor;

            for (int node : nodeList) state[node] = 0;

            function<void(int)> dfsRec = [&](int node) {
                if (found) return;
                state[node] = 1;

                for (int neighbor : adj[node]) {
                    if (found) return;
                    if (state[neighbor] == 1) {
                        found = true;
                        cycleNodes.push_back(neighbor);
                        int current = node;
                        while (current != neighbor) {
                            cycleNodes.push_back(current);
                            current = predecessor[current];
                        }
                        cycleNodes.push_back(neighbor);
                        reverse(cycleNodes.begin(), cycleNodes.end());
                        return;
                    }
                    if (state[neighbor] == 0) {
                        predecessor[neighbor] = node;
                        dfsRec(neighbor);
                    }
                }

                state[node] = 2;
            };

            for (int node : nodeList) {
                if (state[node] == 0 && !found) dfsRec(node);
            }
        } else {
            set<int> visited;
            map<int, int> parent;

            function<void(int, int)> dfsRec = [&](int node, int par) {
                if (found) return;
                visited.insert(node);
                parent[node] = par;

                for (int neighbor : adj[node]) {
                    if (found) return;
                    if (!visited.count(neighbor)) {
                        dfsRec(neighbor, node);
                    } else if (neighbor != par) {
                        found = true;
                        cycleNodes.push_back(neighbor);
                        int current = node;
                        while (current != neighbor) {
                            cycleNodes.push_back(current);
                            current = parent[current];
                        }
                        cycleNodes.push_back(neighbor);
                        reverse(cycleNodes.begin(), cycleNodes.end());
                        return;
                    }
                }
            };

            for (int node : nodeList) {
                if (!visited.count(node) && !found) dfsRec(node, -1);
            }
        }

        return {found, cycleNodes};
    }

    // Girth is the length of the shortest cycle; computed by BFS from each node.
    GirthResult getGirth() const {
        auto nodeList = getNodeIds();
        if (nodeList.empty()) return {numeric_limits<int>::max(), {}};

        int minGirth = numeric_limits<int>::max();
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
                    int node = q.front();
                    q.pop();
                    int currentDist = dist[node];

                    for (int neighbor : adj[node]) {
                        if (!dist.count(neighbor)) {
                            dist[neighbor] = currentDist + 1;
                            parentMap[neighbor] = node;
                            q.push(neighbor);
                        } else if (parentMap[node] != neighbor) {
                            // A non-tree edge in the BFS tree yields a cycle candidate.
                            int cycleLen = currentDist + dist[neighbor] + 1;
                            if (cycleLen < minGirth) {
                                minGirth = cycleLen;

                                vector<int> pathA;
                                int current = node;
                                while (current != -1) {
                                    pathA.push_back(current);
                                    current = parentMap[current];
                                }

                                vector<int> pathB;
                                current = neighbor;
                                while (current != -1) {
                                    pathB.push_back(current);
                                    current = parentMap[current];
                                }

                                set<int> setA(pathA.begin(), pathA.end());
                                int lca = -1;
                                for (int value : pathB) {
                                    if (setA.count(value)) {
                                        lca = value;
                                        break;
                                    }
                                }

                                if (lca != -1) {
                                    vector<int> cyclePartA;
                                    for (int value : pathA) {
                                        cyclePartA.push_back(value);
                                        if (value == lca) break;
                                    }

                                    vector<int> cyclePartB;
                                    for (int value : pathB) {
                                        if (value == lca) break;
                                        cyclePartB.push_back(value);
                                    }
                                    reverse(cyclePartB.begin(), cyclePartB.end());

                                    bestCycle = cyclePartA;
                                    bestCycle.insert(bestCycle.end(), cyclePartB.begin(), cyclePartB.end());
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
            auto adj = graph.getAdjacencyList();

            for (int startNode : nodeList) {
                map<int, int> dist;
                map<int, int> parentMap;
                queue<int> q;

                dist[startNode] = 0;
                parentMap[startNode] = -1;
                q.push(startNode);

                while (!q.empty()) {
                    int node = q.front();
                    q.pop();
                    int currentDist = dist[node];

                    // No need to continue once this BFS depth cannot beat the current best cycle.
                    if (currentDist >= minGirth) break;

                    for (int neighbor : adj[node]) {
                        if (neighbor == startNode && currentDist + 1 < minGirth) {
                            minGirth = currentDist + 1;
                            bestCycle = {startNode};
                            int current = node;
                            while (current != startNode && current != -1) {
                                bestCycle.push_back(current);
                                current = parentMap[current];
                            }
                            reverse(bestCycle.begin(), bestCycle.end());
                            bestCycle.push_back(startNode);
                        }

                        if (!dist.count(neighbor)) {
                            dist[neighbor] = currentDist + 1;
                            parentMap[neighbor] = node;
                            q.push(neighbor);
                        }
                    }
                }
            }
        }

        return {minGirth, bestCycle};
    }

    // Hopcroft-Karp on a caller-supplied bipartition of the graph.
    MatchingResult maximumBipartiteMatching(const vector<int>& leftNodes, const vector<int>& rightNodes) const {
        MatchingResult result;
        result.validBipartition = false;
        result.matchingSize = 0;

        set<int> leftSet(leftNodes.begin(), leftNodes.end());
        set<int> rightSet(rightNodes.begin(), rightNodes.end());
        if (leftSet.empty() || rightSet.empty()) return result;

        for (int node : leftSet) {
            if (graph.nodes.find(node) == graph.nodes.end()) return result;
        }
        for (int node : rightSet) {
            if (graph.nodes.find(node) == graph.nodes.end()) return result;
            if (leftSet.count(node)) return result;
        }

        map<int, vector<int>> adjacency;
        for (int leftNode : leftNodes) adjacency[leftNode] = {};

        for (const Edge& edge : graph.edges) {
            if (leftSet.count(edge.from) && rightSet.count(edge.to)) {
                adjacency[edge.from].push_back(edge.to);
            } else if (leftSet.count(edge.to) && rightSet.count(edge.from)) {
                adjacency[edge.to].push_back(edge.from);
            }
        }

        for (auto& [leftNode, neighbors] : adjacency) {
            sort(neighbors.begin(), neighbors.end());
            neighbors.erase(unique(neighbors.begin(), neighbors.end()), neighbors.end());
        }

        const int INF = numeric_limits<int>::max();
        map<int, int> pairLeft;
        map<int, int> pairRight;
        map<int, int> dist;

        for (int leftNode : leftNodes) pairLeft[leftNode] = -1;
        for (int rightNode : rightNodes) pairRight[rightNode] = -1;

        auto bfsLayering = [&]() -> bool {
            // Build alternating-path layers starting from every free node on the left side.
            queue<int> q;
            bool foundAugmentingPath = false;

            for (int leftNode : leftNodes) {
                if (pairLeft[leftNode] == -1) {
                    dist[leftNode] = 0;
                    q.push(leftNode);
                } else {
                    dist[leftNode] = INF;
                }
            }

            while (!q.empty()) {
                int currentLeft = q.front();
                q.pop();
                int currentDist = dist[currentLeft];

                for (int rightNode : adjacency[currentLeft]) {
                    int mate = pairRight[rightNode];
                    if (mate == -1) {
                        foundAugmentingPath = true;
                    } else if (dist[mate] == INF) {
                        dist[mate] = currentDist + 1;
                        q.push(mate);
                    }
                }
            }

            return foundAugmentingPath;
        };

        function<bool(int)> dfsAugment = [&](int leftNode) -> bool {
            // Respect the BFS layering so each phase finds a maximal set of shortest augmenting paths.
            for (int rightNode : adjacency[leftNode]) {
                int mate = pairRight[rightNode];
                if (mate == -1 || (dist[mate] == dist[leftNode] + 1 && dfsAugment(mate))) {
                    pairLeft[leftNode] = rightNode;
                    pairRight[rightNode] = leftNode;
                    return true;
                }
            }

            dist[leftNode] = INF;
            return false;
        };

        int matchingSize = 0;
        while (bfsLayering()) {
            for (int leftNode : leftNodes) {
                if (pairLeft[leftNode] == -1 && dfsAugment(leftNode)) matchingSize++;
            }
        }

        vector<MatchingPair> pairs;
        for (int leftNode : leftNodes) {
            if (pairLeft[leftNode] != -1) {
                pairs.push_back({leftNode, pairLeft[leftNode]});
            }
        }

        result.validBipartition = true;
        result.matchingSize = matchingSize;
        result.pairs = pairs;
        result.pairLeft = pairLeft;
        result.pairRight = pairRight;
        return result;
    }

    // Convenience wrapper that derives the partition from the graph's bipartite coloring.
    MatchingResult maximumBipartiteMatchingAuto() const {
        BipartiteResult partition = isBipartite();
        if (!partition.isBipartite) return {false, 0, {}, {}, {}};
        if (partition.setA.empty() || partition.setB.empty()) return {true, 0, {}, {}, {}};
        return maximumBipartiteMatching(partition.setA, partition.setB);
    }

    // Counts 4-connected islands in a binary grid.
    static IslandResult countIslandsInGrid(const vector<vector<int>>& grid) {
        if (grid.empty() || grid[0].empty()) return {0, 0};

        int rows = static_cast<int>(grid.size());
        int cols = static_cast<int>(grid[0].size());
        vector<vector<bool>> visited(rows, vector<bool>(cols, false));

        int islands = 0;
        int largest = 0;
        int dr[] = {-1, 1, 0, 0};
        int dc[] = {0, 0, -1, 1};

        auto bfsGrid = [&](int startR, int startC) -> int {
            queue<pair<int, int>> q;
            q.push({startR, startC});
            visited[startR][startC] = true;
            int size = 0;

            while (!q.empty()) {
                auto [r, c] = q.front();
                q.pop();
                size++;

                for (int k = 0; k < 4; k++) {
                    int nr = r + dr[k];
                    int nc = c + dc[k];
                    if (nr >= 0 && nr < rows &&
                        nc >= 0 && nc < cols &&
                        grid[nr][nc] == 1 &&
                        !visited[nr][nc]) {
                        visited[nr][nc] = true;
                        q.push({nr, nc});
                    }
                }
            }

            return size;
        };

        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (grid[i][j] == 1 && !visited[i][j]) {
                    islands++;
                    largest = max(largest, bfsGrid(i, j));
                }
            }
        }

        return {islands, largest};
    }

private:
    // Helper used by several algorithms that need stable iteration over node IDs.
    vector<int> getNodeIds() const {
        vector<int> ids;
        ids.reserve(graph.nodes.size());
        for (const auto& kv : graph.nodes) ids.push_back(kv.first);
        return ids;
    }

    void dfsHelper(int node, const map<int, vector<int>>& adj, set<int>& visited) const {
        visited.insert(node);
        for (int neighbor : adj.at(node)) {
            if (!visited.count(neighbor)) dfsHelper(neighbor, adj, visited);
        }
    }

    // Rebuilds a path from an end node using a predecessor map.
    static vector<int> reconstructPath(const map<int, int>& parent, int endNode) {
        vector<int> path;
        int current = endNode;
        while (current != -1) {
            path.push_back(current);
            auto it = parent.find(current);
            current = (it == parent.end()) ? -1 : it->second;
        }
        reverse(path.begin(), path.end());
        return path;
    }

    // Used by the TSP solver to break ties deterministically.
    static bool isLexicographicallySmaller(const vector<int>& candidate, const vector<int>& currentBest) {
        if (currentBest.empty()) return true;

        size_t limit = min(candidate.size(), currentBest.size());
        for (size_t i = 0; i < limit; i++) {
            if (candidate[i] != currentBest[i]) return candidate[i] < currentBest[i];
        }
        return candidate.size() < currentBest.size();
    }
};

// Graph-coloring utilities for the course scheduling page.
class ScheduleAlgorithms {
public:
    // Greedy DSATUR chooses the next vertex by saturation degree, then assigns the smallest valid color.
    static ScheduleColoringResult greedyDsaturColoring(
        const vector<string>& courseCodes,
        const map<string, set<string>>& adjacency
    ) {
        ScheduleColoringResult result;
        result.colorCount = 0;

        while (result.colors.size() < courseCodes.size()) {
            string code = selectDsaturVertex(courseCodes, adjacency, result.colors);
            set<int> forbidden = getNeighborColorSet(code, adjacency, result.colors);

            int color = 0;
            while (forbidden.count(color)) color++;

            result.colors[code] = color;
            result.colorCount = max(result.colorCount, color + 1);
        }

        return result;
    }

    // Exact DSATUR branch-and-bound improves the greedy result for small datasets.
    static ScheduleColoringResult exactDsaturColoring(
        const vector<string>& courseCodes,
        const map<string, set<string>>& adjacency,
        const ScheduleColoringResult& initialResult
    ) {
        if (courseCodes.empty()) return {{}, 0};

        int bestCount = initialResult.colorCount;
        map<string, int> bestColors = initialResult.colors;
        map<string, int> currentColors;

        function<void(int)> backtrack = [&](int usedColorCount) {
            if (currentColors.size() == courseCodes.size()) {
                if (usedColorCount < bestCount) {
                    bestCount = usedColorCount;
                    bestColors = currentColors;
                }
                return;
            }

            if (usedColorCount >= bestCount) return;

            string code = selectDsaturVertex(courseCodes, adjacency, currentColors);
            set<int> forbidden = getNeighborColorSet(code, adjacency, currentColors);

            // Try reusing existing colors before opening a new slot.
            for (int color = 0; color < usedColorCount; color++) {
                if (forbidden.count(color)) continue;
                currentColors[code] = color;
                backtrack(usedColorCount);
                currentColors.erase(code);
            }

            if (usedColorCount + 1 < bestCount) {
                currentColors[code] = usedColorCount;
                backtrack(usedColorCount + 1);
                currentColors.erase(code);
            }
        };

        backtrack(0);
        return {bestColors, bestCount};
    }

    // Converts a conflict graph coloring into slot assignments and summary statistics.
    static ScheduleResult solveScheduleDataset(
        vector<ScheduleCourse> courses,
        vector<ScheduleConflict> conflicts,
        const vector<string>& slots
    ) {
        sort(
            courses.begin(),
            courses.end(),
            [](const ScheduleCourse& a, const ScheduleCourse& b) {
                return compareCodes(a.code, b.code) < 0;
            }
        );

        sort(
            conflicts.begin(),
            conflicts.end(),
            [](const ScheduleConflict& a, const ScheduleConflict& b) {
                int firstCompare = compareCodes(a.from, b.from);
                if (firstCompare != 0) return firstCompare < 0;
                return compareCodes(a.to, b.to) < 0;
            }
        );

        vector<string> courseCodes;
        courseCodes.reserve(courses.size());
        for (const ScheduleCourse& course : courses) courseCodes.push_back(course.code);

        auto adjacency = buildAdjacency(courseCodes, conflicts);
        ScheduleColoringResult heuristic = greedyDsaturColoring(courseCodes, adjacency);

        ScheduleColoringResult coloring = heuristic;
        string algorithm = "DSATUR Greedy";
        const int EXACT_SCHEDULE_LIMIT = 18;

        if (static_cast<int>(courses.size()) <= EXACT_SCHEDULE_LIMIT) {
            coloring = exactDsaturColoring(courseCodes, adjacency, heuristic);
            algorithm = "DSATUR Branch & Bound (Exact)";
        }

        vector<ScheduleAssignment> assignments;
        assignments.reserve(courses.size());

        for (const ScheduleCourse& course : courses) {
            int slotIndex = 0;
            auto colorIt = coloring.colors.find(course.code);
            if (colorIt != coloring.colors.end()) slotIndex = colorIt->second;

            int overflowIndex = slotIndex - static_cast<int>(slots.size()) + 1;
            string slotLabel = slotIndex < static_cast<int>(slots.size())
                ? slots[slotIndex]
                : "Slot Tambahan " + to_string(overflowIndex);

            assignments.push_back({
                course.code,
                course.name,
                slotIndex,
                slotLabel,
                static_cast<int>(adjacency[course.code].size())
            });
        }

        sort(
            assignments.begin(),
            assignments.end(),
            [](const ScheduleAssignment& a, const ScheduleAssignment& b) {
                if (a.slotIndex != b.slotIndex) return a.slotIndex < b.slotIndex;
                return compareCodes(a.code, b.code) < 0;
            }
        );

        vector<ScheduleSlotGroup> slotGroups;
        for (int slotIndex = 0; slotIndex < coloring.colorCount; slotIndex++) {
            int overflowIndex = slotIndex - static_cast<int>(slots.size()) + 1;
            string label = slotIndex < static_cast<int>(slots.size())
                ? slots[slotIndex]
                : "Slot Tambahan " + to_string(overflowIndex);

            ScheduleSlotGroup group;
            group.slotIndex = slotIndex;
            group.label = label;
            group.isOverflow = slotIndex >= static_cast<int>(slots.size());

            for (const ScheduleAssignment& assignment : assignments) {
                if (assignment.slotIndex == slotIndex) group.courses.push_back(assignment);
            }

            slotGroups.push_back(group);
        }

        int maxDegree = 0;
        int isolatedCourses = 0;
        for (const string& code : courseCodes) {
            int degree = static_cast<int>(adjacency[code].size());
            maxDegree = max(maxDegree, degree);
            if (degree == 0) isolatedCourses++;
        }

        double possibleEdges = courses.size() <= 1
            ? 1.0
            : static_cast<double>(courses.size()) * static_cast<double>(courses.size() - 1) / 2.0;
        double density = possibleEdges == 0.0
            ? 0.0
            : static_cast<double>(conflicts.size()) / possibleEdges;

        ScheduleResult result;
        result.algorithm = algorithm;
        result.usedSlots = coloring.colorCount;
        result.availableSlots = static_cast<int>(slots.size());
        result.overflowSlots = max(0, coloring.colorCount - static_cast<int>(slots.size()));
        result.feasible = coloring.colorCount <= static_cast<int>(slots.size());
        result.assignments = assignments;
        result.slotGroups = slotGroups;
        result.summary = {
            static_cast<int>(courses.size()),
            static_cast<int>(conflicts.size()),
            maxDegree,
            isolatedCourses,
            density
        };

        return result;
    }

private:
    // Builds the undirected conflict graph between courses.
    static map<string, set<string>> buildAdjacency(
        const vector<string>& courseCodes,
        const vector<ScheduleConflict>& conflicts
    ) {
        map<string, set<string>> adjacency;
        for (const string& code : courseCodes) adjacency[code] = {};

        for (const ScheduleConflict& conflict : conflicts) {
            adjacency[conflict.from].insert(conflict.to);
            adjacency[conflict.to].insert(conflict.from);
        }

        return adjacency;
    }

    // Collects the colors already used by adjacent vertices.
    static set<int> getNeighborColorSet(
        const string& code,
        const map<string, set<string>>& adjacency,
        const map<string, int>& colorMap
    ) {
        set<int> colors;
        auto adjIt = adjacency.find(code);
        if (adjIt == adjacency.end()) return colors;

        for (const string& neighbor : adjIt->second) {
            auto colorIt = colorMap.find(neighbor);
            if (colorIt != colorMap.end()) colors.insert(colorIt->second);
        }
        return colors;
    }

    // DSATUR tie-break: saturation first, then degree, then natural code ordering.
    static string selectDsaturVertex(
        const vector<string>& courseCodes,
        const map<string, set<string>>& adjacency,
        const map<string, int>& colorMap
    ) {
        string bestCode;
        int bestSaturation = -1;
        int bestDegree = -1;
        bool found = false;

        for (const string& code : courseCodes) {
            if (colorMap.count(code)) continue;

            int saturation = static_cast<int>(getNeighborColorSet(code, adjacency, colorMap).size());
            int degree = 0;
            auto adjIt = adjacency.find(code);
            if (adjIt != adjacency.end()) degree = static_cast<int>(adjIt->second.size());

            if (!found ||
                saturation > bestSaturation ||
                (saturation == bestSaturation && degree > bestDegree) ||
                (saturation == bestSaturation && degree == bestDegree && compareCodes(code, bestCode) < 0)) {
                bestCode = code;
                bestSaturation = saturation;
                bestDegree = degree;
                found = true;
            }
        }

        return bestCode;
    }

    // Natural-order comparison so codes like IF2 sort before IF10.
    static int compareCodes(const string& a, const string& b) {
        size_t i = 0;
        size_t j = 0;

        while (i < a.size() && j < b.size()) {
            unsigned char charA = static_cast<unsigned char>(a[i]);
            unsigned char charB = static_cast<unsigned char>(b[j]);

            if (isdigit(charA) && isdigit(charB)) {
                size_t startA = i;
                size_t startB = j;

                while (i < a.size() && a[i] == '0') i++;
                while (j < b.size() && b[j] == '0') j++;

                size_t numberEndA = i;
                size_t numberEndB = j;
                while (numberEndA < a.size() && isdigit(static_cast<unsigned char>(a[numberEndA]))) numberEndA++;
                while (numberEndB < b.size() && isdigit(static_cast<unsigned char>(b[numberEndB]))) numberEndB++;

                size_t lengthA = numberEndA - i;
                size_t lengthB = numberEndB - j;
                if (lengthA != lengthB) return lengthA < lengthB ? -1 : 1;

                for (size_t offset = 0; offset < lengthA; offset++) {
                    if (a[i + offset] != b[j + offset]) {
                        return a[i + offset] < b[j + offset] ? -1 : 1;
                    }
                }

                size_t originalLengthA = numberEndA - startA;
                size_t originalLengthB = numberEndB - startB;
                if (originalLengthA != originalLengthB) {
                    return originalLengthA < originalLengthB ? -1 : 1;
                }

                i = numberEndA;
                j = numberEndB;
                continue;
            }

            char lowerA = static_cast<char>(tolower(charA));
            char lowerB = static_cast<char>(tolower(charB));
            if (lowerA != lowerB) return lowerA < lowerB ? -1 : 1;

            i++;
            j++;
        }

        if (i == a.size() && j == b.size()) return 0;
        return i == a.size() ? -1 : 1;
    }
};
