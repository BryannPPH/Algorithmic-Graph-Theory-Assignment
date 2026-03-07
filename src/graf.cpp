#include <iostream>
#include <vector>
#include <queue>
#include <algorithm>

using namespace std;

int n, m;
bool directed;

vector<vector<int>> adjList;
vector<vector<int>> adjUndir;
vector<bool> visited;

void dfs(int node, const vector<vector<int>>& g){
    visited[node] = true;
    for(int neighbor : g[node]){
        if(!visited[neighbor]) dfs(neighbor, g);
    }
}

int dfsSize(int node, const vector<vector<int>>& g){
    visited[node] = true;
    int count = 1;
    for(int neighbor : g[node]){
        if(!visited[neighbor]) count += dfsSize(neighbor, g);
    }
    return count;
}

void showDFS(int node){
    visited[node] = true;
    cout << node << ' ';
    for(int neighbor : adjList[node]){
        if(!visited[neighbor]) showDFS(neighbor);
    }
}

void showBFS(int start){
    queue<int> q;
    q.push(start);
    visited[start] = true;

    while(!q.empty()){
        int node = q.front();
        q.pop();

        cout << node << " ";
        for(int neighbor : adjList[node]){
            if(!visited[neighbor]){
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
}

int dt(int a, int b){
    queue<int> q;
    q.push(a);
    visited[a] = true;

    int dist = 0;

    while(!q.empty()){
        int sz = (int)q.size();
        for(int i = 0; i < sz; i++){
            int node = q.front();
            q.pop();

            if(node == b) return dist;

            for(int neighbor : adjList[node]){
                if(!visited[neighbor]){
                    visited[neighbor] = true;
                    q.push(neighbor);
                }
            }
        }
        dist++;
    }
    return -1;
}

int countComponentsUndir(){
    fill(visited.begin(), visited.end(), false);
    int count = 0;
    for(int i = 1; i <= n; i++){
        if(!visited[i]){
            dfs(i, adjUndir);
            count++;
        }
    }
    return count;
}

pair<int, vector<int>> largestComponent(){
    fill(visited.begin(), visited.end(), false);

    int bestSize = 0;
    vector<int> bestNodes;

    for(int i = 1; i <= n; i++){
        if(!visited[i]){
            vector<int> nodes;
            queue<int> q;
            q.push(i);
            visited[i] = true;

            while(!q.empty()){
                int u = q.front(); q.pop();
                nodes.push_back(u);

                for(int v : adjUndir[u]){
                    if(!visited[v]){
                        visited[v] = true;
                        q.push(v);
                    }
                }
            }

            if((int)nodes.size() > bestSize){
                bestSize = (int)nodes.size();
                bestNodes = nodes;
            }
        }
    }

    sort(bestNodes.begin(), bestNodes.end());
    return {bestSize, bestNodes};
}

bool inBounds(int r, int c, int R, int C){
    return r >= 0 && r < R && c >= 0 && c < C;
}

pair<int,int> countIslandsAndLargest(vector<vector<int>>& grid){
    int R = (int)grid.size();
    int C = (R ? (int)grid[0].size() : 0);

    vector<vector<bool>> vis(R, vector<bool>(C, false));
    int islands = 0;
    int largest = 0;

    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};

    for(int i = 0; i < R; i++){
        for(int j = 0; j < C; j++){
            if(grid[i][j] == 1 && !vis[i][j]){
                islands++;
                int sz = 0;

                queue<pair<int,int>> q;
                q.push({i,j});
                vis[i][j] = true;

                while(!q.empty()){
                    auto [r,c] = q.front(); q.pop();
                    sz++;

                    for(int k = 0; k < 4; k++){
                        int nr = r + dr[k];
                        int nc = c + dc[k];
                        if(inBounds(nr,nc,R,C) && grid[nr][nc] == 1 && !vis[nr][nc]){
                            vis[nr][nc] = true;
                            q.push({nr,nc});
                        }
                    }
                }

                largest = max(largest, sz);
            }
        }
    }

    return {islands, largest};
}

int main(){
    cout << "Input jumlah simpul graf: ";
    cin >> n;
    cout << "Input jumlah sisi graf: ";
    cin >> m;

    adjList.assign(n+1, {});
    adjUndir.assign(n+1, {});
    visited.assign(n+1, false);

    cout << "\nApakah graf berarah?\n";
    cout << "0. Tidak (Undirected)\n";
    cout << "1. Ya (Directed)\n";
    cout << "Pilihan: ";
    cin >> directed;

    cout << "\nInput sisi (u v), contoh: 1 2\n";
    for(int i = 0; i < m; i++){
        int u, v;
        cin >> u >> v;

        adjList[u].push_back(v);
        if(!directed) adjList[v].push_back(u);

        adjUndir[u].push_back(v);
        adjUndir[v].push_back(u);
    }

    for(;;){
        fill(visited.begin(), visited.end(), false);

        cout << "\n\nMenu Operasi Graf\n";
        cout << "1. Jarak dari simpul a ke simpul b\n";
        cout << "2. Cek apakah graf terhubung\n";
        cout << "3. Size dari komponen (berdasarkan simpul)\n";
        cout << "4. Jumlah komponen\n";
        cout << "5. DFS dari simpul A\n";
        cout << "6. BFS dari simpul A\n";
        cout << "7. Komponen terbesar\n";
        cout << "8. Hitung jumlah island dari matriks 0/1\n";
        cout << "9. Keluar\n";
        cout << "Input pilihan (1-9): ";

        int x;
        cin >> x;
        cout << '\n';

        if(x == 1){
            cout << "Masukkan simpul a dan simpul b: ";
            int a, b; cin >> a >> b;

            fill(visited.begin(), visited.end(), false);
            int ans = dt(a, b);

            if(ans == -1) cout << "Simpul a dan simpul b tidak terhubung\n";
            else cout << "Jarak dari a ke b adalah " << ans << '\n';

        }else if(x == 2){
            int cc = countComponentsUndir();
            if(cc == 1) cout << "Ya, graf terhubung\n";
            else cout << "Tidak, graf tidak terhubung. Jumlah komponen: " << cc << '\n';

        }else if(x == 3){
            cout << "Masukkan simpul: ";
            int input; cin >> input;

            fill(visited.begin(), visited.end(), false);
            int sz = dfsSize(input, adjUndir);
            cout << "Ukuran komponen dari simpul " << input << " adalah " << sz << '\n';

        }else if(x == 4){
            cout << "Jumlah komponen = " << countComponentsUndir() << '\n';

        }else if(x == 5){
            cout << "Masukkan simpul awal DFS: ";
            int input; cin >> input;

            fill(visited.begin(), visited.end(), false);
            cout << "Hasil DFS:\n";
            showDFS(input);
            cout << '\n';

        }else if(x == 6){
            cout << "Masukkan simpul awal BFS: ";
            int input; cin >> input;

            fill(visited.begin(), visited.end(), false);
            cout << "Hasil BFS:\n";
            showBFS(input);
            cout << '\n';

        }else if(x == 7){
            auto [sz, nodes] = largestComponent();
            cout << "Ukuran komponen terbesar = " << sz << '\n';
            cout << "Simpul dalam komponen terbesar: ";
            for(int v : nodes) cout << v << ' ';
            cout << '\n';

        }else if(x == 8){
            int R, C;
            cout << "Masukkan jumlah baris (R) dan kolom (C): ";
            cin >> R >> C;

            vector<vector<int>> grid(R, vector<int>(C));
            cout << "Masukkan matriks 0/1:\n";
            for(int i = 0; i < R; i++){
                for(int j = 0; j < C; j++){
                    cin >> grid[i][j];
                }
            }

            auto [islands, largest] = countIslandsAndLargest(grid);
            cout << "Jumlah island = " << islands << '\n';
            cout << "Ukuran island terbesar = " << largest << '\n';

        }else if(x == 9){
            break;

        }else{
            cout << "Input tidak valid!\n";
        }
    }

    return 0;
}