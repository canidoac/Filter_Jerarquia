"use client"

import { memo, useMemo } from "react"
import { ChevronRight, ChevronDown, Users, User } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { TreeNode as TreeNodeType } from "@/lib/types"
import { getAllDescendantIds } from "@/lib/hierarchy-utils"
import { cn } from "@/lib/utils"

interface TreeNodeProps {
  node: TreeNodeType
  level: number
  expandedIds: Set<string>
  selectedIds: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (node: TreeNodeType, isSelected: boolean) => void
}

export const TreeNode = memo(function TreeNodeComponent({
  node,
  level,
  expandedIds,
  selectedIds,
  onToggleExpand,
  onSelect,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedIds.has(node.id)

  // Calculate indeterminate state (some but not all children selected)
  const checkboxState = useMemo(() => {
    if (!hasChildren) return isSelected ? "checked" : "unchecked"

    const descendantIds = getAllDescendantIds(node)
    const selectedDescendants = descendantIds.filter((id) => selectedIds.has(id))

    if (isSelected && selectedDescendants.length === descendantIds.length) {
      return "checked"
    }
    if (selectedDescendants.length > 0 || isSelected) {
      return "indeterminate"
    }
    return "unchecked"
  }, [node, hasChildren, isSelected, selectedIds])

  const handleCheckboxChange = () => {
    onSelect(node, checkboxState !== "checked")
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-1 rounded-sm hover:bg-accent/50 cursor-pointer group",
          isSelected && "bg-accent",
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-sm hover:bg-accent",
            !hasChildren && "invisible",
          )}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ))}
        </button>

        {/* Checkbox */}
        <Checkbox
          checked={checkboxState === "checked"}
          // @ts-ignore - indeterminate is a valid HTML attribute
          data-state={checkboxState}
          onCheckedChange={handleCheckboxChange}
          className={cn("h-4 w-4", checkboxState === "indeterminate" && "data-[state=indeterminate]:bg-primary")}
        />

        {/* Icon */}
        {hasChildren ? (
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        {/* Label */}
        <span className="text-sm text-foreground truncate flex-1" onClick={handleCheckboxChange}>
          {node.displayName || node.name}
        </span>

        {/* Children count badge */}
        {hasChildren && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {node.children!.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedIds={selectedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
})
