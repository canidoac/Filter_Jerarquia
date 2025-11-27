"use client"

import { useState, useCallback, useMemo } from "react"
import { TreeNode as TreeNodeComponent } from "./tree-node"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronDown, ChevronRight, Check, X } from "lucide-react"
import type { TreeNode } from "@/lib/types"
import { getAllDescendantIds, getAllNodeIds, filterTree } from "@/lib/hierarchy-utils"

interface HierarchicalTreeProps {
  data: TreeNode[]
  selectedIds: Set<string>
  onSelectionChange: (selectedIds: Set<string>) => void
}

export function HierarchicalTree({ data, selectedIds, onSelectionChange }: HierarchicalTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")

  // Filter tree based on search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data
    return filterTree(data, searchTerm.toLowerCase())
  }, [data, searchTerm])

  // Get all node IDs for select all functionality
  const allNodeIds = useMemo(() => getAllNodeIds(data), [data])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleNodeSelect = useCallback(
    (node: TreeNode, isSelected: boolean) => {
      const newSelectedIds = new Set(selectedIds)
      const descendantIds = getAllDescendantIds(node)
      const allIds = [node.id, ...descendantIds]

      if (isSelected) {
        allIds.forEach((id) => newSelectedIds.add(id))
      } else {
        allIds.forEach((id) => newSelectedIds.delete(id))
      }

      onSelectionChange(newSelectedIds)
    },
    [selectedIds, onSelectionChange],
  )

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(allNodeIds))
  }, [allNodeIds])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const selectAll = useCallback(() => {
    onSelectionChange(new Set(allNodeIds))
  }, [allNodeIds, onSelectionChange])

  const clearSelection = useCallback(() => {
    onSelectionChange(new Set())
  }, [onSelectionChange])

  // Auto-expand when searching
  useMemo(() => {
    if (searchTerm.trim()) {
      const idsToExpand = getAllNodeIds(filteredData)
      setExpandedIds(new Set(idsToExpand))
    }
  }, [searchTerm, filteredData])

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar usuario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" onClick={expandAll}>
          <ChevronDown className="h-3 w-3 mr-1" />
          Expandir
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" onClick={collapseAll}>
          <ChevronRight className="h-3 w-3 mr-1" />
          Colapsar
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" onClick={selectAll}>
          <Check className="h-3 w-3 mr-1" />
          Todos
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" onClick={clearSelection}>
          <X className="h-3 w-3 mr-1" />
          Ninguno
        </Button>
      </div>

      {/* Tree */}
      <div className="border border-border rounded-md bg-card overflow-hidden">
        <div className="max-h-[calc(100vh-200px)] overflow-auto p-1">
          {filteredData.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {searchTerm ? "No se encontraron resultados" : "Sin datos"}
            </div>
          ) : (
            filteredData.map((node) => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                level={0}
                expandedIds={expandedIds}
                selectedIds={selectedIds}
                onToggleExpand={toggleExpand}
                onSelect={handleNodeSelect}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
