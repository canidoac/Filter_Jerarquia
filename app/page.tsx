"use client"

import { useState, useEffect, useCallback } from "react"
import { HierarchicalTree } from "@/components/hierarchical-tree"
import { ConfigPanel } from "@/components/config-panel"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw } from "lucide-react"
import type { TreeNode, TableauConfig } from "@/lib/types"
import { buildHierarchy } from "@/lib/hierarchy-utils"

// Declare tableau as a global variable for the Tableau Extensions API
declare global {
  interface Window {
    tableau: any
  }
}

export default function HierarchicalFilterExtension() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<TableauConfig | null>(null)
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTableauReady, setIsTableauReady] = useState(false)

  // Initialize Tableau Extension
  useEffect(() => {
    const initTableau = async () => {
      if (typeof window !== "undefined" && window.tableau) {
        try {
          await window.tableau.extensions.initializeAsync()
          setIsTableauReady(true)

          // Load saved configuration
          const savedConfig = window.tableau.extensions.settings.get("hierarchyConfig")
          if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig)
            setConfig(parsedConfig)
            setIsConfigured(true)
          } else {
            setShowConfig(true)
          }
        } catch (err) {
          console.error("Error initializing Tableau extension:", err)
          setError("Error al inicializar la extensión de Tableau")
        }
      } else {
        // Demo mode when not in Tableau
        console.log("[v0] Running in demo mode - Tableau API not available")
        loadDemoData()
      }
    }

    initTableau()
  }, [])

  // Load data when configuration changes
  useEffect(() => {
    if (config && (isTableauReady || !window.tableau)) {
      loadData()
    }
  }, [config, isTableauReady])

  const loadDemoData = () => {
    // Demo data for testing outside Tableau
    const demoData = [
      { usuario: "Carlos", lider: null },
      { usuario: "María", lider: "Carlos" },
      { usuario: "Juan", lider: "María" },
      { usuario: "Pedro", lider: "María" },
      { usuario: "Ana", lider: "Carlos" },
      { usuario: "Luis", lider: "Ana" },
      { usuario: "Elena", lider: "Ana" },
      { usuario: "Roberto", lider: "Luis" },
      { usuario: "Sofía", lider: "Luis" },
      { usuario: "Miguel", lider: "Elena" },
      { usuario: "Laura", lider: "Juan" },
      { usuario: "Diego", lider: "Juan" },
      { usuario: "Carmen", lider: "Pedro" },
      { usuario: "Fernando", lider: "Roberto" },
      { usuario: "Isabel", lider: "Roberto" },
    ]

    const hierarchy = buildHierarchy(demoData, "usuario", "lider")
    setTreeData(hierarchy)
    setIsConfigured(true)
  }

  const loadData = useCallback(async () => {
    if (!config) return

    setIsLoading(true)
    setError(null)

    try {
      if (window.tableau && isTableauReady) {
        const dashboard = window.tableau.extensions.dashboardContent.dashboard
        const worksheet = dashboard.worksheets.find((ws: any) => ws.name === config.worksheetName)

        if (!worksheet) {
          throw new Error(`Hoja "${config.worksheetName}" no encontrada`)
        }

        // Get summary data (respects dashboard filters)
        const dataTable = await worksheet.getSummaryDataAsync()
        const columns = dataTable.columns
        const data = dataTable.data

        // Find column indices
        const userColIndex = columns.findIndex((col: any) => col.fieldName === config.userField)
        const leaderColIndex = columns.findIndex((col: any) => col.fieldName === config.leaderField)

        if (userColIndex === -1 || leaderColIndex === -1) {
          throw new Error("Campos de usuario o líder no encontrados")
        }

        // Extract data
        const rawData = data.map((row: any) => ({
          usuario: row[userColIndex].formattedValue,
          lider:
            row[leaderColIndex].formattedValue === "%null%" ||
            row[leaderColIndex].formattedValue === "Null" ||
            row[leaderColIndex].formattedValue === ""
              ? null
              : row[leaderColIndex].formattedValue,
        }))

        // Build hierarchy
        const hierarchy = buildHierarchy(rawData, "usuario", "lider")
        setTreeData(hierarchy)

        // Listen for filter changes
        worksheet.addEventListener(window.tableau.TableauEventType.FilterChanged, () => loadData())
      }
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError(err.message || "Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }, [config, isTableauReady])

  const handleConfigSave = async (newConfig: TableauConfig) => {
    setConfig(newConfig)
    setIsConfigured(true)
    setShowConfig(false)

    // Save to Tableau settings
    if (window.tableau && isTableauReady) {
      window.tableau.extensions.settings.set("hierarchyConfig", JSON.stringify(newConfig))
      await window.tableau.extensions.settings.saveAsync()
    }
  }

  const handleSelectionChange = useCallback(
    async (newSelectedIds: Set<string>) => {
      setSelectedIds(newSelectedIds)

      // Apply filter in Tableau
      if (window.tableau && isTableauReady && config) {
        try {
          const dashboard = window.tableau.extensions.dashboardContent.dashboard
          const worksheet = dashboard.worksheets.find((ws: any) => ws.name === config.worksheetName)

          if (worksheet && newSelectedIds.size > 0) {
            await worksheet.applyFilterAsync(
              config.userField,
              Array.from(newSelectedIds),
              window.tableau.FilterUpdateType.Replace,
            )
          } else if (worksheet && newSelectedIds.size === 0) {
            await worksheet.clearFilterAsync(config.userField)
          }
        } catch (err) {
          console.error("Error applying filter:", err)
        }
      }
    },
    [config, isTableauReady],
  )

  if (showConfig || !isConfigured) {
    return (
      <ConfigPanel
        onSave={handleConfigSave}
        onCancel={() => isConfigured && setShowConfig(false)}
        isTableauReady={isTableauReady}
        initialConfig={config}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Filtro Jerárquico</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {error ? (
          <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : treeData.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">No hay datos disponibles</div>
        ) : (
          <HierarchicalTree data={treeData} selectedIds={selectedIds} onSelectionChange={handleSelectionChange} />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
        {selectedIds.size > 0 ? `${selectedIds.size} usuario(s) seleccionado(s)` : "Ningún filtro aplicado"}
      </div>
    </div>
  )
}
