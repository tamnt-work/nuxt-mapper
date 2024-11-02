<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: My Module
- Package name: my-module
- Description: My new Nuxt module
-->

# @tw/nuxt-mapper

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A powerful data mapper and converter module for Nuxt 3 that helps you transform data between different formats from backend to frontend using schema definitions.

## Features

- 🚀 Schema-driven development
- 🔄 Automatic model and DTO generation
- 📝 Type-safe data transformations
- 🔍 Real-time schema watching
- 🛠 CLI tools for code generation
- ⚡️ Hot reload support

## Installation

Add `@tw/nuxt-mapper` dependency to your project:

```bash
# pnpm
pnpm add @tw/nuxt-mapper

# yarn
yarn add @tw/nuxt-mapper

# npm
npm install @tw/nuxt-mapper

# bun
bun add @tw/nuxt-mapper
```

## Setup

Add `@tw/nuxt-mapper` to the `modules` section of your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@tw/nuxt-mapper'],
  dataMapper: {
    // Enable watch mode in development
    watch: true,
    // Enable ESLint auto-fix for generated files
    fixEslint: true,
    // Custom mappers directory (default: './mappers')
    mappersDir: './mappers',
    // Add services directory to auto-imports
    imports: {
      dirs: ['services']
    }
  }
})
```

## Usage

### 1. Define Your Schema

Create a `schema.tw` file in your mappers directory:

```yaml
# User Model
User:
  type: model
  mappings:
    id:
      type: string
      map: id
      required: true
    name:
      type: string
      map: fullName
      required: true
    email:
      type: string
      required: true

# Post Model
Post:
  type: model
  mappings:
    id:
      type: string
      map: id
      required: true
    title:
      type: string
      required: true
    content:
      type: string
      required: true
    authorId:
      type: string
      map: user_id
      required: true
  relationships:
    author:
      type: User
```

### 2. CLI Commands

The module provides two main commands: `mapper` and `service`.

#### `tw mapper`
Generates model and DTO files from your schema.

```bash
npx tw mapper [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --models` | Models to generate (comma-separated) | All models |
| `-w, --watch` | Watch for schema changes | `false` |
| `-f, --fix` | Auto-fix ESLint issues | `false` |
| `-s, --schema` | Path to schema file | `./mappers/schema.tw` |

Examples:
```bash
# Generate all models
npx tw mapper

# Generate specific models
npx tw mapper -m user,post

# Watch mode with auto-fix
npx tw mapper -w -f

# Custom schema path
npx tw mapper -s ./custom/path/schema.tw
```

#### `tw service`
The service command has two subcommands: `init` and `create`.

##### `tw service init`
Initializes the service infrastructure by creating:
- A base API configuration file (`api.ts`)
- An empty index file for exports (`index.ts`)
- Automatically updates nuxt.config.ts to include services in auto-imports


```bash
npx tw service init [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output` | Output directory | `./services` |

##### `tw service create`
Generates service classes for your models.

```bash
npx tw service create [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name` | Services to generate (comma-separated) | Required |
| `-o, --output` | Output directory | `./services` |

Examples:
```bash
# Generate a single service
npx tw service create -n user

# Generate multiple services at once
npx tw service create -n user,post,comment
```

The command generates the following directory structure:
```
services/
├── user/
│   └── index.ts        # User service implementation
├── post/
│   └── index.ts        # Post service implementation
├── comment/
│   └── index.ts        # Comment service implementation
├── api.ts              # Base API configuration
└── index.ts            # Auto-exports all services
```

Each service follows this structure:
```typescript
export class UserService {
  private api = useApi<UserPlainModel>()
  private resource = 'users'

  async all(options?: UseFetchOptions<UserPlainModel[]>) {
    // Fetches and transforms data
  }

  async find(id: string, options?: UseFetchOptions<UserPlainModel>) {
    // Fetches and transforms single record
  }

  async create(dto: UserDTO, options?: UseFetchOptions<UserPlainModel>) {
    // Creates and transforms new record
  }

  async update(id: string, dto: UserDTO, options?: UseFetchOptions<UserPlainModel>) {
    // Updates and transforms existing record
  }

  async delete(id: string, options?: UseFetchOptions<void>) {
    // Deletes record
  }
}
```

To ensure your services are properly imported, add the services directory to your Nuxt configuration:

```ts
export default defineNuxtConfig({
  modules: ['@tw/nuxt-mapper'],
  dataMapper: {
    watch: true,
    fixEslint: true,
    mappersDir: './mappers',
    // Add services directory to auto-imports
    imports: {
      dirs: ['services']
    }
  }
})
```

### 3. Using Services

Once you have generated your services, you can use them in your components or pages:

```typescript
// Access the auto-imported service
const userService = useUserService()

// Fetch all users (returns UserPlainModel[])
const { data: users } = await userService.all()

// Get single user by ID (returns UserPlainModel)
const { data: user } = await userService.find('1')

// Create new user (accepts UserDTO, returns UserPlainModel)
const { data: newUser } = await userService.create(new UserDTO({
  fullName: 'John Doe',
  email: 'john@example.com'
}))

// Update user (accepts UserDTO, returns UserPlainModel)
const { data: updatedUser } = await userService.update('1', new UserDTO({
  fullName: 'John Smith'
}))

// Delete user
await userService.delete('1')

// All methods accept UseFetchOptions for customization
const { data: filteredUsers } = await userService.all({
  query: {
    role: 'admin'
  }
})
```

Each service method automatically handles:
- API endpoint construction using resource pluralization
- Data transformation between DTOs and Plain Models
- Type safety with TypeScript
- Integration with Nuxt's `useFetch` options

## Schema Definition

### Basic Structure

```yaml
ModelName:
  type: model
  mappings:
    fieldName:
      type: string|number|boolean|date
      map: backend_field_name
      required: true|false
  relationships:
    relatedField:
      type: RelatedModel|RelatedModel[]
```

### Supported Types

- `string`
- `number`
- `boolean`
- `date`

### Nested Mappings

You can map nested properties using dot notation:

```yaml
User:
  type: model
  mappings:
    address:
      type: string
      map: address.street
```

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@tamnt-work/nuxt-mapper/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@tamnt-work/nuxt-mapper

[npm-downloads-src]: https://img.shields.io/npm/dm/@tamnt-work/nuxt-mapper.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@tamnt-work/nuxt-mapper

[license-src]: https://img.shields.io/npm/l/@tamnt-work/nuxt-mapper.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@tamnt-work/nuxt-mapper

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
