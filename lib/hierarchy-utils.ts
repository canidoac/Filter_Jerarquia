import type { TreeNode, RawDataRow } from "./types"

/**
 * Builds a hierarchical tree structure from flat user-leader data
 */
export function buildHierarchy(
  data: RawDataRow[],
  userKey: string,
  leaderKey: string,
  fullNameKey?: string,
): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()

  // First pass: create all nodes
  data.forEach((row) => {
    const userId = row[userKey as keyof RawDataRow] as string
    const displayName = fullNameKey ? (row[fullNameKey as keyof RawDataRow] as string) : userId

    if (userId && !nodeMap.has(userId)) {
      nodeMap.set(userId, {
        id: userId,
        name: userId, // Keep ID as name for filtering
        displayName: displayName || userId, // Use display name for UI
        children: [],
        parentId: row[leaderKey as keyof RawDataRow] as string | null,
      })
    }
  })

  // Second pass: build parent-child relationships
  const roots: TreeNode[] = []

  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(node)
    } else {
      // This is a root node (no parent or parent not in data)
      roots.push(node)
    }
  })

  // Sort children alphabetically
  const sortChildren = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name))
      .map((node) => ({
        ...node,
        children: node.children ? sortChildren(node.children) : undefined,
      }))
  }

  return sortChildren(roots)
}

/**
 * Gets all descendant IDs of a node (recursive)
 */
export function getAllDescendantIds(node: TreeNode): string[] {
  const ids: string[] = []

  const traverse = (n: TreeNode) => {
    if (n.children) {
      n.children.forEach((child) => {
        ids.push(child.id)
        traverse(child)
      })
    }
  }

  traverse(node)
  return ids
}

/**
 * Gets all node IDs in the tree
 */
export function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = []

  const traverse = (nodeList: TreeNode[]) => {
    nodeList.forEach((node) => {
      ids.push(node.id)
      if (node.children) {
        traverse(node.children)
      }
    })
  }

  traverse(nodes)
  return ids
}

/**
 * Filters tree to show only nodes matching search term (and their ancestors)
 */
export function filterTree(nodes: TreeNode[], searchTerm: string): TreeNode[] {
  const result: TreeNode[] = []

  nodes.forEach((node) => {
    const nameMatches =
      node.name.toLowerCase().includes(searchTerm) ||
      (node.displayName && node.displayName.toLowerCase().includes(searchTerm))
    const filteredChildren = node.children ? filterTree(node.children, searchTerm) : []

    if (nameMatches || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : nameMatches ? node.children : undefined,
      })
    }
  })

  return result
}

/**
 * Finds a node by ID in the tree
 */
export function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}
