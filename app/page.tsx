"use client"

import { useState, useEffect, useCallback } from "react"
import { HierarchicalTree } from "@/components/hierarchical-tree"
import { ConfigPanel } from "@/components/config-panel"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import type { TreeNode, TableauConfig } from "@/lib/types"
import { buildHierarchy } from "@/lib/hierarchy-utils"

declare global {
  interface Window {
    tableau: any
  }
}

type ConnectionState = "loading" | "connected" | "error" | "demo"

export default function HierarchicalFilterExtension() {
  // Estados de conexión
  const [connectionState, setConnectionState] = useState<ConnectionState>("loading")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [dashboardName, setDashboardName] = useState<string>("")

  // Estados de configuración y datos
  const [isConfigured, setIsConfigured] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<TableauConfig | null>(null)
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Inicialización de Tableau - solo se ejecuta una vez al montar
  useEffect(() => {
    let isMounted = true

    const initTableau = async () => {
      // Verificar si existe la API
      if (typeof window === "undefined") {
        return
      }

      // Esperar a que el objeto tableau esté disponible
      if (!window.tableau?.extensions?.initializeAsync) {
        console.log("[v0] API de Tableau no disponible, cargando modo demo")
        if (isMounted) {
          setConnectionState("demo")
          loadDemoData()
        }
        return
      }

      try {
        console.log("[v0] Llamando initializeAsync...")
        await window.tableau.extensions.initializeAsync()

        if (!isMounted) return

        console.log("[v0] Conexión exitosa con Tableau")
        const dashboard = window.tableau.extensions.dashboardContent.dashboard
        setDashboardName(dashboard.name)
        setConnectionState("connected")

        // Cargar configuración guardada
        const savedConfig = window.tableau.extensions.settings.get("hierarchyConfig")
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig)
          setConfig(parsedConfig)
          setIsConfigured(true)
        } else {
          setShowConfig(true)
        }
      } catch (err: any) {
        console.error("[v0] Error de inicialización:", err)
        if (isMounted) {
          setConnectionError(err.message || String(err))
          setConnectionState("error")
        }
      }
    }

    // Ejecutar inicialización
    initTableau()

    return () => {
      isMounted = false
    }
  }, [])

  // Cargar datos cuando cambia la configuración
  useEffect(() => {
    if (config && connectionState === "connected") {
      loadData()
    }
  }, [config, connectionState])

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
    if (!config || connectionState !== "connected") return

    setIsLoading(true)

    try {
      const dashboard = window.tableau.extensions.dashboardContent.dashboard
      const worksheet = dashboard.worksheets.find((ws: any) => ws.name === config.worksheetName)

      if (!worksheet) {
        throw new Error(`Hoja "${config.worksheetName}" no encontrada`)
      }

      const dataTable = await worksheet.getSummaryDataAsync()
      const columns = dataTable.columns
      const data = dataTable.data

      const userColIndex = columns.findIndex((col: any) => col.fieldName === config.userField)
      const leaderColIndex = columns.findIndex((col: any) => col.fieldName === config.leaderField)

      if (userColIndex === -1 || leaderColIndex === -1) {
        throw new Error("Campos de usuario o líder no encontrados")
      }

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

      const hierarchy = buildHierarchy(rawData, "usuario", "lider")
      setTreeData(hierarchy)

      // Listener para cambios de filtro
      worksheet.addEventListener(window.tableau.TableauEventType.FilterChanged, () => {
        loadData()
      })
    } catch (err: any) {
      console.error("[v0] Error cargando datos:", err)
      setConnectionError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [config, connectionState])

  const handleConfigSave = async (newConfig: TableauConfig) => {
    setConfig(newConfig)
    setIsConfigured(true)
    setShowConfig(false)

    if (connectionState === "connected") {
      window.tableau.extensions.settings.set("hierarchyConfig", JSON.stringify(newConfig))
      await window.tableau.extensions.settings.saveAsync()
    }
  }

  const handleSelectionChange = useCallback(
    async (newSelectedIds: Set<string>) => {
      setSelectedIds(newSelectedIds)

      if (connectionState === "connected" && config) {
        try {
          const dashboard = window.tableau.extensions.dashboardContent.dashboard
          const selectedValues = Array.from(newSelectedIds)

          for (const worksheet of dashboard.worksheets) {
            try {
              if (selectedValues.length > 0) {
                await worksheet.applyFilterAsync(
                  config.userField,
                  selectedValues,
                  window.tableau.FilterUpdateType.Replace,
                )
              } else {
                await worksheet.clearFilterAsync(config.userField)
              }
            } catch {
              // Ignorar hojas sin el campo
            }
          }
        } catch (err) {
          console.error("[v0] Error aplicando filtro:", err)
        }
      }
    },
    [config, connectionState],
  )

  // UI: Estado de carga inicial
  if (connectionState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-base font-medium text-foreground">Conectando con Tableau...</p>
        <p className="text-sm text-muted-foreground mt-2">Inicializando extensión</p>
      </div>
    )
  }

  // UI: Estado de error
  if (connectionState === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Error de Conexión</h2>
          </div>
          <p className="text-sm text-destructive/90 mb-4">{connectionError}</p>
          <Button variant="outline" className="w-full bg-transparent" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // UI: Modo demo (fuera de Tableau)
  if (connectionState === "demo" && !isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Modo Demostración</h2>
          <p className="text-sm text-amber-700 mb-4">
            Esta extensión debe ejecutarse dentro de un Dashboard de Tableau. Mostrando datos de ejemplo.
          </p>
          <Button onClick={loadDemoData} className="w-full">
            Ver Demo
          </Button>
        </div>
      </div>
    )
  }

  // UI: Panel de configuración
  if (showConfig || !isConfigured) {
    return (
      <div className="min-h-screen bg-background">
        {connectionState === "connected" && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Conectado a: <strong>{dashboardName}</strong>
            </span>
          </div>
        )}
        <ConfigPanel
          onSave={handleConfigSave}
          onCancel={() => isConfigured && setShowConfig(false)}
          isTableauReady={connectionState === "connected"}
          initialConfig={config}
        />
      </div>
    )
  }

  // UI: Vista principal con árbol jerárquico
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-foreground">Filtro Jerárquico</h1>
          {connectionState === "connected" && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Conectado</span>
          )}
          {connectionState === "demo" && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Demo</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => loadData()}
            disabled={isLoading || connectionState !== "connected"}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : treeData.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">No hay datos disponibles</div>
        ) : (
          <HierarchicalTree data={treeData} selectedIds={selectedIds} onSelectionChange={handleSelectionChange} />
        )}
      </div>

      <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
        {selectedIds.size > 0 ? `${selectedIds.size} usuario(s) seleccionado(s)` : "Ningún filtro aplicado"}
      </div>
    </div>
  )
}
