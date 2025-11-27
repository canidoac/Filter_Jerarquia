export interface TreeNode {
  id: string
  name: string
  children?: TreeNode[]
  parentId?: string | null
}

export interface TableauConfig {
  worksheetName: string
  userField: string
  leaderField: string
}

export interface RawDataRow {
  usuario: string
  lider: string | null
}
