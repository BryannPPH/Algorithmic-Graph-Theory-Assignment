#include <iostream>
#include <vector>
#include <queue>

using namespace std;

int n, m;
bool directed;
vector<vector<int>> adjList;
vector<bool> visited;

void dfs(int node){
    visited[node] = true;

    for(int neighbor : adjList[node]){
        if(!visited[neighbor]){
            dfs(neighbor);
        }
    }
}

void showDFS(int node){
    visited[node] = true;

    cout << node << ' ';
    for(int neighbor : adjList[node]){
        if(!visited[neighbor]){
            showDFS(neighbor);
        }
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
        int size = q.size();

        for(int i = 0; i < size; i++){
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

int dfsSize(int node){
    visited[node] = true;
    int count = 1;

    for(int neighbor : adjList[node]){
        if(!visited[neighbor]){
            count += dfsSize(neighbor);
        }
    }

    return count;
}

int countComponents(){
    int count = 0;

    for(int i = 1; i <= n; i++){
        if(!visited[i]){
            dfs(i);
            count++;
        }
    }

    return count;
}


int main(){
    cout << "Input jumlah simpul graf: ";
    cin >> n;
    cout << "Input jumlah sisi graf: ";
    cin >> m;

    adjList.resize(n+1);
    visited.resize(n+1);

    cout << "\nApakah graf berarah?\n";
    cout << "0. Tidak (Undirected)\n";
    cout << "1. Ya (Directed)\n";
    cout << "Pilihan: ";
    cin >> directed;

    cout << "\ninput sisi(u, v) graf, contoh input 'u v': \n";
    for(int i = 0; i < m; i++){
        int u, v;
        cin >> u >> v;

        adjList[u].push_back(v);
        if(!directed) adjList[v].push_back(u);
    }

    for(;;){
        fill(visited.begin(), visited.end(), false);
        cout << "\n\nMenu Operasi Graf\n";
        cout << "1. Jarak dari simpul a ke simpul b\n";
        cout << "2. Cek apakah graf G terhubung\n";
        cout << "3. Size dari suatu komponen\n";
        cout << "4. Jumlah komponen\n";
        cout << "5. DFS dari simpul A\n";
        cout << "6. BFS dari simpul A\n";
        cout << "7. Keluar\n";
        cout << "Input pilihan (1-7): ";
        int x; cin >> x;
        cout << '\n';

        if(x == 1){
            cout << "Masukkan simpul a dan simpul b untuk dihitung jaraknya: ";
            int a, b; cin >> a >> b;
            cout << '\n';

            int ans = dt(a ,b);

            if(ans == -1){
                cout << "Simpul a dan simpul b tidak terhubung\n";
            }else{
                cout << "Simpul a dan simpul b terhubung dengan jarak " << ans << '\n';
            }
        }else if(x == 2){
            if(directed){
                cout << "Belum  didevelop\n";
            }else{
                if(countComponents() == 1){
                    cout << "Ya, seluruh simpul dalam graf terhubung\n";
                }else{
                    cout << "Tidak, graf tidak terhubung\n";
                }
            }
            
        }else if(x == 3){
            int input;
            cout << "Masukkan simpul suatu komponen untuk menghitung ukuran dari komponen graf: ";
            cin >> input;
            cout << '\n' << "Ukuran komponen dari simpul tersebut adalah " << dfsSize(input) << '\n';
        }else if(x == 4){
            cout << "Jumlah komponen dari graf adalah " << countComponents() << " Komponen\n";
        }else if(x == 5){
            cout << "Masukkan satu simpul, tempat DFS dimulai: "; 
            int input; cin >> input;
            cout << "\nHasil:\n";
            showDFS(input);
            cout << '\n';
        }else if(x == 6){
            cout << "Masukkan satu simpul, tempat BFS dimulai: "; 
            int input; cin >> input;
            cout << "\nHasil:\n";
            showBFS(input);
            cout << '\n';
        }else if(x == 7){
            break;
        }else{
            cout << "Input tidak valid!\n";
        }
    }


    return 0;
}