export class UserModel {
  id!: string
  name!: string
  username!: string
  email!: string
  address!: string
  company!: string

  constructor(data: Partial<UserModel> = {}) {
    Object.assign(this, data)
  }
}

export type UserPlainModel = Omit<UserModel, 'constructor'>
