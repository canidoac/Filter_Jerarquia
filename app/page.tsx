"use client"

import { useState, useEffect, useCallback } from "react"
import { HierarchicalTree } from "@/components/hierarchical-tree"
import { ConfigPanel } from "@/components/config-panel"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw, AlertCircle, Bug } from "lucide-react"
import type { TreeNode, TableauConfig } from "@/lib/types"
import { buildHierarchy } from "@/lib/hierarchy-utils"

declare global {
  interface Window {
    tableau: any
  }
}

interface DiagnosticInfo {
  windowExists: boolean
  tableauExists: boolean
  extensionsExists: boolean
  initializeAsyncExists: boolean
  scriptLoaded: boolean
  scriptError: string | null
  initResult: string | null
  timestamp: string
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
  const [statusMessage, setStatusMessage] = useState<string>("Inicializando...")
  const [initAttempts, setInitAttempts] = useState(0)

  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo>({
    windowExists: false,
    tableauExists: false,
    extensionsExists: false,
    initializeAsyncExists: false,
    scriptLoaded: false,
    scriptError: null,
    initResult: null,
    timestamp: new Date().toISOString(),
  })

  const updateDiagnostics = useCallback((updates: Partial<DiagnosticInfo>) => {
    setDiagnostics((prev) => ({
      ...prev,
      ...updates,
      timestamp: new Date().toISOString(),
    }))
  }, [])

  useEffect(() => {
    const checkScript = () => {
      const scripts = Array.from(document.getElementsByTagName("script"))
      const tableauScript = scripts.find((s) => s.src.includes("tableau"))

      updateDiagnostics({
        scriptLoaded: !!tableauScript,
        scriptError: tableauScript ? null : "Script de Tableau no encontrado en el DOM",
      })
    }

    checkScript()
    // Re-check after a delay
    const timeout = setTimeout(checkScript, 2000)
    return () => clearTimeout(timeout)
  }, [updateDiagnostics])

  useEffect(() => {
    let isMounted = true
    let attemptCount = 0
    const maxAttempts = 20

    const checkAndInit = async () => {
      attemptCount++
      if (!isMounted) return

      setInitAttempts(attemptCount)

      const hasWindow = typeof window !== "undefined"
      const hasTableau = hasWindow && typeof window.tableau !== "undefined"
      const hasExtensions = hasTableau && typeof window.tableau.extensions !== "undefined"
      const hasInitialize = hasExtensions && typeof window.tableau.extensions.initializeAsync === "function"

      updateDiagnostics({
        windowExists: hasWindow,
        tableauExists: hasTableau,
        extensionsExists: hasExtensions,
        initializeAsyncExists: hasInitialize,
      })

      setStatusMessage(`Buscando API... (${attemptCount}/${maxAttempts})`)

      if (hasInitialize) {
        try {
          setStatusMessage("API encontrada, conectando con Tableau...")
          updateDiagnostics({ initResult: "Llamando initializeAsync..." })

          await window.tableau.extensions.initializeAsync()

          if (!isMounted) return

          updateDiagnostics({ initResult: "Inicialización exitosa" })
          setStatusMessage("Conectado a Tableau")
          setIsTableauReady(true)

          const savedConfig = window.tableau.extensions.settings.get("hierarchyConfig")
          if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig)
            setConfig(parsedConfig)
            setIsConfigured(true)
            setStatusMessage("Configuración cargada")
          } else {
            setShowConfig(true)
            setStatusMessage("Configuración requerida")
          }
          return
        } catch (err: any) {
          const errorMsg = err.message || String(err)
          updateDiagnostics({ initResult: `Error: ${errorMsg}` })
          setError(`Error de inicialización: ${errorMsg}`)
          setStatusMessage(`Error: ${errorMsg}`)
          return
        }
      }

      if (attemptCount < maxAttempts) {
        setTimeout(checkAndInit, 500)
      } else {
        updateDiagnostics({ initResult: "Tiempo agotado - modo demo" })
        setStatusMessage("Modo demo (ejecutando fuera de Tableau)")
        loadDemoData()
      }
    }

    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        checkAndInit()
      } else {
        window.addEventListener("load", checkAndInit)
        return () => {
          isMounted = false
          window.removeEventListener("load", checkAndInit)
        }
      }
    }

    return () => {
      isMounted = false
    }
  }, [updateDiagnostics])

  useEffect(() => {
    if (config && isTableauReady) {
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

    try {
      if (window.tableau && isTableauReady) {
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
        setStatusMessage(`${data.length} registros cargados`)

        worksheet.addEventListener(window.tableau.TableauEventType.FilterChanged, () => {
          loadData()
        })
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }, [config, isTableauReady])

  const handleConfigSave = async (newConfig: TableauConfig) => {
    setConfig(newConfig)
    setIsConfigured(true)
    setShowConfig(false)

    if (window.tableau && isTableauReady) {
      window.tableau.extensions.settings.set("hierarchyConfig", JSON.stringify(newConfig))
      await window.tableau.extensions.settings.saveAsync()
    }
  }

  const handleSelectionChange = useCallback(
    async (newSelectedIds: Set<string>) => {
      setSelectedIds(newSelectedIds)

      if (window.tableau && isTableauReady && config) {
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
            } catch (wsErr: any) {
              // Ignorar errores de hojas que no tienen el campo
            }
          }
        } catch (err) {
          console.error("[v0] Error applying filter:", err)
        }
      }
    },
    [config, isTableauReady],
  )

  const DiagnosticsPanel = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Diagnóstico de Conexión</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowDiagnostics(false)}>
            ✕
          </Button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="space-y-2">
            <h3 className="font-medium">Estado de la API:</h3>
            <div className="bg-gray-100 rounded p-3 space-y-1 font-mono text-xs">
              <p>
                <span className={diagnostics.windowExists ? "text-green-600" : "text-red-600"}>
                  {diagnostics.windowExists ? "✓" : "✗"}
                </span>{" "}
                window: {String(diagnostics.windowExists)}
              </p>
              <p>
                <span className={diagnostics.tableauExists ? "text-green-600" : "text-red-600"}>
                  {diagnostics.tableauExists ? "✓" : "✗"}
                </span>{" "}
                window.tableau: {String(diagnostics.tableauExists)}
              </p>
              <p>
                <span className={diagnostics.extensionsExists ? "text-green-600" : "text-red-600"}>
                  {diagnostics.extensionsExists ? "✓" : "✗"}
                </span>{" "}
                tableau.extensions: {String(diagnostics.extensionsExists)}
              </p>
              <p>
                <span className={diagnostics.initializeAsyncExists ? "text-green-600" : "text-red-600"}>
                  {diagnostics.initializeAsyncExists ? "✓" : "✗"}
                </span>{" "}
                initializeAsync: {String(diagnostics.initializeAsyncExists)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Script de Tableau:</h3>
            <div className="bg-gray-100 rounded p-3 font-mono text-xs">
              <p>
                <span className={diagnostics.scriptLoaded ? "text-green-600" : "text-red-600"}>
                  {diagnostics.scriptLoaded ? "✓" : "✗"}
                </span>{" "}
                Cargado: {String(diagnostics.scriptLoaded)}
              </p>
              {diagnostics.scriptError && <p className="text-red-600 mt-1">{diagnostics.scriptError}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Resultado de inicialización:</h3>
            <div className="bg-gray-100 rounded p-3 font-mono text-xs break-all">
              {diagnostics.initResult || "Pendiente..."}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Información adicional:</h3>
            <div className="bg-gray-100 rounded p-3 font-mono text-xs">
              <p>Intentos: {initAttempts}/20</p>
              <p>Timestamp: {diagnostics.timestamp}</p>
              <p>URL: {typeof window !== "undefined" ? window.location.href : "N/A"}</p>
              <p>User Agent: {typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 50) + "..." : "N/A"}</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              Si "tableau.extensions" es false, el problema es que la API de Tableau no está siendo inyectada. Esto
              puede ocurrir si la extensión no está corriendo dentro de Tableau o hay un bloqueo de red.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  if (!isConfigured && !showConfig && initAttempts < 20) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
        <p className="text-xs text-muted-foreground mt-2">Intento {initAttempts}/20</p>
        <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={() => setShowDiagnostics(true)}>
          <Bug className="h-4 w-4 mr-2" />
          Ver diagnóstico
        </Button>
        {showDiagnostics && <DiagnosticsPanel />}
      </div>
    )
  }

  if (showConfig || !isConfigured) {
    return (
      <>
        <ConfigPanel
          onSave={handleConfigSave}
          onCancel={() => isConfigured && setShowConfig(false)}
          isTableauReady={isTableauReady}
          initialConfig={config}
        />
        {showDiagnostics && <DiagnosticsPanel />}
      </>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Filtro Jerárquico</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowDiagnostics(true)}
            title="Diagnóstico"
          >
            <Bug className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {error ? (
          <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
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

      <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
        {selectedIds.size > 0 ? `${selectedIds.size} usuario(s) seleccionado(s)` : "Ningún filtro aplicado"}
        <span className="ml-2 opacity-70">| {statusMessage}</span>
      </div>

      {showDiagnostics && <DiagnosticsPanel />}
    </div>
  )
}
