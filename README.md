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

The module provides two commands: `mapper` and `service`.

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
Generates API service classes for your models.

```bash
npx tw service create [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name` | Services to generate (comma-separated) | Required |
| `-o, --output` | Output directory | `./services` |

Examples:
```bash
# Generate a service for a mapper
npx tw service create -n user

# Generate multiple services at once
npx tw service create -n user,post,comment

# Specify custom output directory
npx tw service create -n user -o ./api/services
```

This will generate both the model and DTO files for each specified mapper.

The generated services automatically handle data transformation between DTOs and models.

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

### 3. Use Generated Code

```typescript
// Import the generated models and DTOs
import { UserModel } from '~/mappers/user/user.model'
import { UserDTO } from '~/mappers/user/user.dto'

// Convert DTO to Model
const userDTO = new UserDTO({
  id: '1',
  fullName: 'John Doe',
  email: 'john@example.com'
})

// Convert to model
const userModel = userDTO.toModel()

// Convert to plain model (without methods)
const plainModel = userDTO.toPlainModel()
```

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
