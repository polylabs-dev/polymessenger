use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsrGraph<N, E> {
    nodes: HashMap<[u8; 16], N>,
    row_ptr: Vec<usize>,
    col_idx: Vec<[u8; 16]>,
    edges: Vec<E>,
    node_order: Vec<[u8; 16]>,
    overlays: HashMap<String, HashMap<[u8; 16], u64>>,
}

impl<N: Clone, E: Clone> CsrGraph<N, E> {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            row_ptr: vec![0],
            col_idx: Vec::new(),
            edges: Vec::new(),
            node_order: Vec::new(),
            overlays: HashMap::new(),
        }
    }

    pub fn insert_node(&mut self, id: [u8; 16], node: N) {
        if !self.nodes.contains_key(&id) {
            self.node_order.push(id);
            self.row_ptr.push(*self.row_ptr.last().unwrap());
        }
        self.nodes.insert(id, node);
    }

    pub fn lookup_node(&self, id: &[u8; 16]) -> Option<&N> {
        self.nodes.get(id)
    }

    pub fn update_node(&mut self, id: [u8; 16], node: N) {
        self.nodes.insert(id, node);
    }

    pub fn remove_node(&mut self, id: &[u8; 16]) -> Option<N> {
        self.nodes.remove(id)
    }

    pub fn insert_edge(&mut self, from: [u8; 16], to: [u8; 16], edge: E) {
        let from_idx = self
            .node_order
            .iter()
            .position(|n| n == &from)
            .expect("from node must exist");

        let insert_pos = self.row_ptr[from_idx + 1];
        self.col_idx.insert(insert_pos, to);
        self.edges.insert(insert_pos, edge);

        for ptr in &mut self.row_ptr[from_idx + 1..] {
            *ptr += 1;
        }
    }

    pub fn lookup_edge(&self, from: &[u8; 16], to: &[u8; 16]) -> Option<&E> {
        let from_idx = self.node_order.iter().position(|n| n == from)?;
        let start = self.row_ptr[from_idx];
        let end = self.row_ptr[from_idx + 1];

        for i in start..end {
            if &self.col_idx[i] == to {
                return Some(&self.edges[i]);
            }
        }
        None
    }

    pub fn remove_edge(&mut self, from: &[u8; 16], to: &[u8; 16]) -> Option<E> {
        let from_idx = self.node_order.iter().position(|n| n == from)?;
        let start = self.row_ptr[from_idx];
        let end = self.row_ptr[from_idx + 1];

        for i in start..end {
            if &self.col_idx[i] == to {
                let edge = self.edges.remove(i);
                self.col_idx.remove(i);
                for ptr in &mut self.row_ptr[from_idx + 1..] {
                    *ptr -= 1;
                }
                return Some(edge);
            }
        }
        None
    }

    pub fn edge_count(&self, node: &[u8; 16]) -> usize {
        let Some(idx) = self.node_order.iter().position(|n| n == node) else {
            return 0;
        };
        self.row_ptr[idx + 1] - self.row_ptr[idx]
    }

    pub fn neighbors(&self, node: &[u8; 16]) -> Vec<([u8; 16], &E)> {
        let Some(idx) = self.node_order.iter().position(|n| n == node) else {
            return vec![];
        };
        let start = self.row_ptr[idx];
        let end = self.row_ptr[idx + 1];
        (start..end)
            .map(|i| (self.col_idx[i], &self.edges[i]))
            .collect()
    }

    pub fn set_overlay(&mut self, overlay: &str, node: [u8; 16], value: u64) {
        self.overlays
            .entry(overlay.to_string())
            .or_default()
            .insert(node, value);
    }

    pub fn get_overlay(&self, overlay: &str, node: &[u8; 16]) -> Option<u64> {
        self.overlays.get(overlay)?.get(node).copied()
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn total_edges(&self) -> usize {
        self.edges.len()
    }

    pub fn all_nodes(&self) -> impl Iterator<Item = (&[u8; 16], &N)> {
        self.nodes.iter()
    }
}

impl<N: Clone, E: Clone> Default for CsrGraph<N, E> {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn id(n: u8) -> [u8; 16] {
        let mut id = [0u8; 16];
        id[0] = n;
        id
    }

    #[test]
    fn insert_and_lookup() {
        let mut g: CsrGraph<String, String> = CsrGraph::new();
        g.insert_node(id(1), "alice".into());
        g.insert_node(id(2), "bob".into());
        g.insert_edge(id(1), id(2), "knows".into());

        assert_eq!(g.lookup_node(&id(1)), Some(&"alice".to_string()));
        assert_eq!(g.lookup_edge(&id(1), &id(2)), Some(&"knows".to_string()));
        assert_eq!(g.edge_count(&id(1)), 1);
    }

    #[test]
    fn overlays() {
        let mut g: CsrGraph<u8, u8> = CsrGraph::new();
        g.insert_node(id(1), 0);
        g.set_overlay("trust", id(1), 5);
        assert_eq!(g.get_overlay("trust", &id(1)), Some(5));
    }
}
