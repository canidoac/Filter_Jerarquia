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
  const [debugInfo, setDebugInfo] = useState<string>("")

  useEffect(() => {
    const initTableau = async () => {
      console.log("[v0] Starting Tableau initialization...")
      console.log("[v0] window.tableau exists:", typeof window !== "undefined" && !!window.tableau)

      // Wait for tableau to be available (may load async)
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        if (typeof window !== "undefined" && window.tableau && window.tableau.extensions) {
          console.log("[v0] Tableau Extensions API found, initializing...")
          setDebugInfo("API encontrada, inicializando...")

          try {
            await window.tableau.extensions.initializeAsync()
            console.log("[v0] Tableau initialized successfully")
            setDebugInfo("Tableau inicializado correctamente")
            setIsTableauReady(true)

            // Load saved configuration
            const savedConfig = window.tableau.extensions.settings.get("hierarchyConfig")
            console.log("[v0] Saved config:", savedConfig)

            if (savedConfig) {
              const parsedConfig = JSON.parse(savedConfig)
              setConfig(parsedConfig)
              setIsConfigured(true)
            } else {
              setShowConfig(true)
            }
            return
          } catch (err: any) {
            console.error("[v0] Error initializing Tableau extension:", err)
            setError(`Error al inicializar: ${err.message}`)
            setDebugInfo(`Error: ${err.message}`)
            return
          }
        }

        attempts++
        console.log(`[v0] Waiting for Tableau API... attempt ${attempts}/${maxAttempts}`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Demo mode when not in Tableau
      console.log("[v0] Running in demo mode - Tableau API not available after waiting")
      setDebugInfo("Modo demo - API no disponible")
      loadDemoData()
    }

    initTableau()
  }, [])

  // Load data when configuration changes
  useEffect(() => {
    if (config && isTableauReady) {
      console.log("[v0] Config changed, loading data...")
      loadData()
    }
  }, [config, isTableauReady])

  const loadDemoData = () => {
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
    console.log("[v0] Loading data with config:", config)

    try {
      if (window.tableau && isTableauReady) {
        const dashboard = window.tableau.extensions.dashboardContent.dashboard
        console.log(
          "[v0] Dashboard worksheets:",
          dashboard.worksheets.map((ws: any) => ws.name),
        )

        const worksheet = dashboard.worksheets.find((ws: any) => ws.name === config.worksheetName)

        if (!worksheet) {
          throw new Error(`Hoja "${config.worksheetName}" no encontrada`)
        }

        console.log("[v0] Found worksheet:", worksheet.name)

        // Get summary data (respects dashboard filters)
        const dataTable = await worksheet.getSummaryDataAsync()
        const columns = dataTable.columns
        const data = dataTable.data

        console.log(
          "[v0] Columns:",
          columns.map((c: any) => c.fieldName),
        )
        console.log("[v0] Data rows:", data.length)

        // Find column indices
        const userColIndex = columns.findIndex((col: any) => col.fieldName === config.userField)
        const leaderColIndex = columns.findIndex((col: any) => col.fieldName === config.leaderField)

        console.log("[v0] User column index:", userColIndex, "Leader column index:", leaderColIndex)

        if (userColIndex === -1 || leaderColIndex === -1) {
          throw new Error("Campos de usuario o líder no encontrados")
        }

        // Extract data
        const rawData = data.map((row: any) => ({
          usuario: row[userColIndex].formattedValue,
          lider:
            row[leaderColIndex].formattedValue === "%null%" ||
            row[leaderColIndex].formattedValue === "Null" ||
            row[leaderColIndex].formattedValue === "" ||
            row[leaderColIndex].formattedValue === null
              ? null
              : row[leaderColIndex].formattedValue,
        }))

        console.log("[v0] Raw data sample:", rawData.slice(0, 5))

        // Build hierarchy
        const hierarchy = buildHierarchy(rawData, "usuario", "lider")
        console.log("[v0] Hierarchy built:", hierarchy.length, "root nodes")
        setTreeData(hierarchy)

        // Listen for filter changes
        worksheet.addEventListener(window.tableau.TableauEventType.FilterChanged, () => {
          console.log("[v0] Filter changed, reloading data...")
          loadData()
        })
      }
    } catch (err: any) {
      console.error("[v0] Error loading data:", err)
      setError(err.message || "Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }, [config, isTableauReady])

  const handleConfigSave = async (newConfig: TableauConfig) => {
    console.log("[v0] Saving config:", newConfig)
    setConfig(newConfig)
    setIsConfigured(true)
    setShowConfig(false)

    // Save to Tableau settings
    if (window.tableau && isTableauReady) {
      window.tableau.extensions.settings.set("hierarchyConfig", JSON.stringify(newConfig))
      await window.tableau.extensions.settings.saveAsync()
      console.log("[v0] Config saved to Tableau settings")
    }
  }

  const handleSelectionChange = useCallback(
    async (newSelectedIds: Set<string>) => {
      setSelectedIds(newSelectedIds)
      console.log("[v0] Selection changed:", Array.from(newSelectedIds))

      // Apply filter in Tableau to ALL worksheets
      if (window.tableau && isTableauReady && config) {
        try {
          const dashboard = window.tableau.extensions.dashboardContent.dashboard
          const selectedValues = Array.from(newSelectedIds)

          console.log("[v0] Applying filter to all worksheets. Values:", selectedValues)

          // Apply filter to ALL worksheets that have the user field
          for (const worksheet of dashboard.worksheets) {
            try {
              if (selectedValues.length > 0) {
                await worksheet.applyFilterAsync(
                  config.userField,
                  selectedValues,
                  window.tableau.FilterUpdateType.Replace,
                )
                console.log(`[v0] Filter applied to worksheet: ${worksheet.name}`)
              } else {
                await worksheet.clearFilterAsync(config.userField)
                console.log(`[v0] Filter cleared from worksheet: ${worksheet.name}`)
              }
            } catch (wsErr: any) {
              // Some worksheets may not have this field, ignore those errors
              console.log(`[v0] Could not apply filter to ${worksheet.name}:`, wsErr.message)
            }
          }
        } catch (err) {
          console.error("[v0] Error applying filter:", err)
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
        {debugInfo && <span className="ml-2">| {debugInfo}</span>}
      </div>
    </div>
  )
}
