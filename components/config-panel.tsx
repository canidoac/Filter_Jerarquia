"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TableauConfig } from "@/lib/types"

interface ConfigPanelProps {
  onSave: (config: TableauConfig) => void
  onCancel: () => void
  isTableauReady: boolean
  initialConfig: TableauConfig | null
}

interface WorksheetInfo {
  name: string
  fields: string[]
}

export function ConfigPanel({ onSave, onCancel, isTableauReady, initialConfig }: ConfigPanelProps) {
  const [worksheets, setWorksheets] = useState<WorksheetInfo[]>([])
  const [selectedWorksheet, setSelectedWorksheet] = useState(initialConfig?.worksheetName || "")
  const [userField, setUserField] = useState(initialConfig?.userField || "")
  const [leaderField, setLeaderField] = useState(initialConfig?.leaderField || "")
  const [fullNameField, setFullNameField] = useState(initialConfig?.fullNameField || "__none__")
  const [availableFields, setAvailableFields] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const loadWorksheets = async () => {
      setIsLoading(true)
      setLoadError(null)
      console.log("[v0] ConfigPanel: Loading worksheets, isTableauReady:", isTableauReady)

      if (typeof window !== "undefined" && window.tableau && window.tableau.extensions && isTableauReady) {
        try {
          const dashboard = window.tableau.extensions.dashboardContent.dashboard
          console.log("[v0] ConfigPanel: Dashboard found:", dashboard.name)
          console.log("[v0] ConfigPanel: Number of worksheets:", dashboard.worksheets.length)

          const wsData: WorksheetInfo[] = []

          for (const ws of dashboard.worksheets) {
            console.log("[v0] ConfigPanel: Processing worksheet:", ws.name)
            try {
              const dataTable = await ws.getSummaryDataAsync()
              const fields = dataTable.columns.map((col: any) => col.fieldName)
              console.log("[v0] ConfigPanel: Fields for", ws.name, ":", fields)
              wsData.push({ name: ws.name, fields })
            } catch (wsErr: any) {
              console.error("[v0] ConfigPanel: Error loading worksheet", ws.name, ":", wsErr)
              wsData.push({ name: ws.name, fields: [] })
            }
          }

          console.log("[v0] ConfigPanel: Total worksheets loaded:", wsData.length)
          setWorksheets(wsData)

          if (wsData.length === 0) {
            setLoadError("No se encontraron hojas de trabajo en el dashboard")
          }
        } catch (err: any) {
          console.error("[v0] ConfigPanel: Error loading worksheets:", err)
          setLoadError(`Error cargando hojas: ${err.message}`)
        }
      } else {
        // Demo mode
        console.log("[v0] ConfigPanel: Running in demo mode")
        setWorksheets([
          {
            name: "Hoja de Usuarios",
            fields: ["Usuario", "Lider", "Nombre Completo", "Departamento", "País"],
          },
          {
            name: "Datos de Ventas",
            fields: ["Vendedor", "Supervisor", "Nombre Completo Vendedor", "Región", "Monto"],
          },
        ])
      }
      setIsLoading(false)
    }

    loadWorksheets()
  }, [isTableauReady])

  useEffect(() => {
    const ws = worksheets.find((w) => w.name === selectedWorksheet)
    if (ws) {
      setAvailableFields(ws.fields)
      console.log("[v0] ConfigPanel: Available fields updated:", ws.fields)
    } else {
      setAvailableFields([])
    }
  }, [selectedWorksheet, worksheets])

  const handleSave = () => {
    if (selectedWorksheet && userField && leaderField) {
      console.log("[v0] ConfigPanel: Saving configuration")
      onSave({
        worksheetName: selectedWorksheet,
        userField,
        leaderField,
        fullNameField: fullNameField === "__none__" ? undefined : fullNameField,
      })
    }
  }

  const isValid = selectedWorksheet && userField && leaderField

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Configurar Filtro Jerárquico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="text-sm text-muted-foreground text-center py-4">Cargando hojas de trabajo...</div>
          )}

          {loadError && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{loadError}</div>}

          <div className="space-y-2">
            <Label htmlFor="worksheet">Hoja de trabajo</Label>
            <Select value={selectedWorksheet} onValueChange={setSelectedWorksheet} disabled={isLoading}>
              <SelectTrigger id="worksheet">
                <SelectValue placeholder="Seleccionar hoja..." />
              </SelectTrigger>
              <SelectContent>
                {worksheets.map((ws) => (
                  <SelectItem key={ws.name} value={ws.name}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {worksheets.length === 0 && !isLoading && (
              <p className="text-xs text-destructive">No hay hojas disponibles</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userField">Campo de Usuario</Label>
            <Select value={userField} onValueChange={setUserField} disabled={!selectedWorksheet || isLoading}>
              <SelectTrigger id="userField">
                <SelectValue placeholder="Seleccionar campo..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Campo que contiene el nombre del usuario</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaderField">Campo de Líder</Label>
            <Select value={leaderField} onValueChange={setLeaderField} disabled={!selectedWorksheet || isLoading}>
              <SelectTrigger id="leaderField">
                <SelectValue placeholder="Seleccionar campo..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Campo que contiene el nombre del líder (null para raíz)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullNameField">Campo de Nombre Completo (opcional)</Label>
            <Select value={fullNameField} onValueChange={setFullNameField} disabled={!selectedWorksheet || isLoading}>
              <SelectTrigger id="fullNameField">
                <SelectValue placeholder="Seleccionar campo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ninguno (usar campo de usuario)</SelectItem>
                {availableFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Campo para mostrar en el filtro (ej: "Juan Pérez")</p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent" disabled={!initialConfig}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={!isValid || isLoading}>
              Guardar
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {isTableauReady ? (
              <span className="text-green-600">Conectado a Tableau</span>
            ) : (
              <span>Modo demo - ejecutando fuera de Tableau</span>
            )}
            {worksheets.length > 0 && <span className="ml-2">| {worksheets.length} hoja(s) encontrada(s)</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
