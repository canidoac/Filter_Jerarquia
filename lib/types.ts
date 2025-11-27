export interface TreeNode {
  id: string
  name: string
  displayName?: string
  children?: TreeNode[]
  parentId?: string | null
}

export interface TableauConfig {
  worksheetName: string
  userField: string
  leaderField: string
  fullNameField?: string
}

export interface RawDataRow {
  usuario: string
  lider: string | null
  nombreCompleto?: string
}
