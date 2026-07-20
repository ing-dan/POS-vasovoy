export type Role = {
  id: number
  code: string
  label: string
}

export type UserOut = {
  id: number
  username: string
  full_name: string
  restaurant_id: number
  role: Role
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: UserOut
}
