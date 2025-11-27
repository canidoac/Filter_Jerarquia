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
  const [availableFields, setAvailableFields] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load worksheets from Tableau
  useEffect(() => {
    const loadWorksheets = async () => {
      if (typeof window !== "undefined" && window.tableau && isTableauReady) {
        try {
          const dashboard = window.tableau.extensions.dashboardContent.dashboard
          const wsData: WorksheetInfo[] = []

          for (const ws of dashboard.worksheets) {
            const dataTable = await ws.getSummaryDataAsync()
            const fields = dataTable.columns.map((col: any) => col.fieldName)
            wsData.push({ name: ws.name, fields })
          }

          setWorksheets(wsData)
        } catch (err) {
          console.error("Error loading worksheets:", err)
        }
      } else {
        // Demo mode
        setWorksheets([
          {
            name: "Hoja de Usuarios",
            fields: ["Usuario", "Lider", "Departamento", "País"],
          },
          {
            name: "Datos de Ventas",
            fields: ["Vendedor", "Supervisor", "Región", "Monto"],
          },
        ])
      }
    }

    loadWorksheets()
  }, [isTableauReady])

  // Update available fields when worksheet changes
  useEffect(() => {
    const ws = worksheets.find((w) => w.name === selectedWorksheet)
    if (ws) {
      setAvailableFields(ws.fields)
    } else {
      setAvailableFields([])
    }
  }, [selectedWorksheet, worksheets])

  const handleSave = () => {
    if (selectedWorksheet && userField && leaderField) {
      onSave({
        worksheetName: selectedWorksheet,
        userField,
        leaderField,
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
          {/* Worksheet Selection */}
          <div className="space-y-2">
            <Label htmlFor="worksheet">Hoja de trabajo</Label>
            <Select value={selectedWorksheet} onValueChange={setSelectedWorksheet}>
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
          </div>

          {/* User Field */}
          <div className="space-y-2">
            <Label htmlFor="userField">Campo de Usuario</Label>
            <Select value={userField} onValueChange={setUserField} disabled={!selectedWorksheet}>
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

          {/* Leader Field */}
          <div className="space-y-2">
            <Label htmlFor="leaderField">Campo de Líder</Label>
            <Select value={leaderField} onValueChange={setLeaderField} disabled={!selectedWorksheet}>
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

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent" disabled={!initialConfig}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={!isValid}>
              Guardar
            </Button>
          </div>

          {!isTableauReady && (
            <p className="text-xs text-muted-foreground text-center">Modo demo - ejecutando fuera de Tableau</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
