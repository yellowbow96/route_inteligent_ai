import heapq

class Graph:
    def __init__(self):
        self.nodes = set()
        self.edges = {}
        self.distances = {}

    def add_node(self, value):
        self.nodes.add(value)
        self.edges[value] = []

    def add_edge(self, from_node, to_node, distance):
        self.edges[from_node].append(to_node)
        self.edges[to_node].append(from_node)
        self.distances[(from_node, to_node)] = distance
        self.distances[(to_node, from_node)] = distance

def shortest_path(graph: Graph, start, end):
    """
    Core Dijkstra Algorithm implementation for shortest path finding.
    Expected for MCA evaluation.
    """
    print(f"[DSA] Executing Dijkstra Algorithm finding shortest path from {start} to {end}")
    visited = {start: 0}
    path = {}
    nodes = set(graph.nodes)

    while nodes:
        min_node = None
        for node in nodes:
            if node in visited:
                if min_node is None:
                    min_node = node
                elif visited[node] < visited[min_node]:
                    min_node = node

        if min_node is None:
            break

        nodes.remove(min_node)
        current_weight = visited[min_node]

        for edge in graph.edges.get(min_node, []):
            weight = current_weight + graph.distances[(min_node, edge)]
            if edge not in visited or weight < visited[edge]:
                visited[edge] = weight
                path[edge] = min_node

    if end not in path:
        return []

    current = end
    final_path = []
    while current != start:
        final_path.insert(0, current)
        current = path[current]
    final_path.insert(0, start)
    return final_path
