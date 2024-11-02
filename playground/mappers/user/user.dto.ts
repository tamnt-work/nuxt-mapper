import { UserModel, type UserPlainModel } from './user.model'

export class UserDTO {
  id!: string
  fullName!: string
  username!: string
  email!: string
  address!: { street: string }
  company!: { name: string }

  constructor(data: Partial<UserDTO> = {}) {
    Object.assign(this, data)
  }

  toModel(): UserModel {
    return new UserModel({
      id: this.id,
      name: this.fullName,
      username: this.username,
      email: this.email,
      address: this.address?.street,
      company: this.company?.name,

    })
  }

  toPlainModel(): UserPlainModel {
    return {
      id: this.id,
      name: this.fullName,
      username: this.username,
      email: this.email,
      address: this.address?.street,
      company: this.company?.name,

    }
  }
}
