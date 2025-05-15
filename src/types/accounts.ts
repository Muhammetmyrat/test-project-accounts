export type AccountType = 'local' | 'ldap'

export interface AccountLabel {
  text: string
}

export interface Account {
  id?: string
  labels?: AccountLabel[]
  type: AccountType
  login: string
  password: string | null
}
