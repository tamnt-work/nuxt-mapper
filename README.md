<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: My Module
- Package name: my-module
- Description: My new Nuxt module
-->

# @tamnt-work/nuxt-mapper

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
- ✨ Zod-powered request validation
- 🌐 i18n support for validation messages

## Installation

```bash
# Using package manager of choice
pnpm add @tamnt-work/nuxt-mapper
yarn add @tamnt-work/nuxt-mapper
npm install @tamnt-work/nuxt-mapper
bun add @tamnt-work/nuxt-mapper

# Optional: Install zod if using request validation
pnpm add zod
yarn add zod
npm install zod
bun add zod
```

## Setup

Add to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@tamnt-work/nuxt-mapper'],
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

### 1. Model Schema Definition

First, initialize the schema files using the CLI:

```bash
# Initialize model schema
npx tw mapper init

# Initialize form schema
npx tw form init
```

This will create the following files:
- `mappers/schema.tw`: Model schema definition
- `mappers/form.tw`: Form validation schema

Then modify the schema files according to your needs:

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
    email:
      type: string
      required: true
    address:
      type: string
      map: address.street
  relationships:
    posts:
      type: Post[]
      map: user.posts

# Post Model
Post:
  type: model
  mappings:
    id:
      type: string
      required: true
    title:
      type: string
    content:
      type: string
      map: body
  relationships:
    author:
      type: User
      map: post.user
```

### 2. Form Validation Schema

Create a `form.tw` file for API validation rules:

```yaml
User:
  create:
    fullName:
      required: true
      min: 2
      max: 100
      messages:
        required: "Full name is required"
        min: "Name must be at least {min} characters"
    
    email:
      required: true
      email: true
      messages:
        email: "Please enter a valid email address"

    # Array validation example
    addresses:
      type: array
      item:
        type: object
        properties:
          street:
            required: true
            min: 5
          city:
            required: true
      max_items: 3
      messages:
        max_items: "Maximum {max} addresses allowed"

  update:
    id:
      required: true
    fullName:
      min: 2
      max: 100
    email:
      email: true
```

### 3. Generated Structure

After running the generators, your directory will look like:

```
mappers/
├── schema.tw                 # Model schema definition
├── form.tw                  # Form validation schema
├── user/                    
│   ├── user.model.ts       # User Plain Model
│   ├── user.dto.ts         # User DTO with mapping
│   └── forms/              # Generated form validators
│       ├── create-user.form.ts
│       ├── update-user.form.ts
│       └── delete-user.form.ts
└── post/                    
    ├── post.model.ts       
    ├── post.dto.ts         
    └── forms/           
```

### 4. CLI Commands

#### Generate Models & DTOs

```bash
# Initialize schema
npx tw mapper init

# Generate all models
npx tw mapper generate

# Generate specific models
npx tw mapper generate -m user,post

# Watch mode
npx tw mapper generate -w
```

Options:
| Option | Description | Default |
|--------|-------------|---------|
| `-m, --models` | Models to generate | All models |
| `-w, --watch` | Watch for changes | `false` |
| `-f, --fix` | Auto-fix ESLint | `false` |
| `-s, --schema` | Schema file path | `./mappers/schema.tw` |

#### Generate Form Validators

```bash
# Initialize form schema
npx tw form init

# Generate all form validators
npx tw form generate

# Generate for specific models
npx tw form generate -m user,post

# Watch mode
npx tw form generate -w
```

Options:
| Option | Description | Default |
|--------|-------------|---------|
| `-m, --models` | Models to generate | All models |
| `-w, --watch` | Watch for changes | `false` |
| `-f, --fix` | Auto-fix ESLint | `false` |
| `-s, --schema` | Schema file path | `./mappers/form.tw` |

#### Generate Services

```bash
# Initialize service infrastructure
npx tw service init

# Generate services
npx tw service create -n user,post
```

Options:
| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name` | Services to generate | Required |
| `-o, --output` | Output directory | `./services` |

### 5. Validation Rules Reference

#### String Validations
- `required`: boolean
- `min`: number (min length)
- `max`: number (max length)
- `email`: boolean
- `regex`: string
- `url`: boolean
- `uuid`: boolean
- `cuid`: boolean
- `length`: number
- `startsWith`: string
- `endsWith`: string
- `includes`: string

#### Number Validations
- `type: number`
- `gt`: number (greater than)
- `gte`: number (greater than or equal)
- `lt`: number (less than)
- `lte`: number (less than or equal)
- `int`: boolean
- `positive`: boolean
- `negative`: boolean
- `multipleOf`: number
- `finite`: boolean
- `safe`: boolean

#### Array Validations
- `type: array`
- `nonempty`: boolean
- `min_items`: number
- `max_items`: number
- `item`: object (nested validation)

#### Object Validations
- `type: object`
- `properties`: Record<string, ValidationRule>

#### Custom Messages
```yaml
fieldName:
  required: true
  min: 2
  messages:
    required: "Custom required message"
    min: "Must be at least {min} chars"
```

#### i18n Support
```yaml
fieldName:
  required: true
  i18n:
    required: "validation.field.required"
```

### 6. Using Services

```typescript
// Auto-imported service
const userService = useUserService()

// Create with form validation
const { data: newUser } = await userService.create({
  fullName: 'John Doe',
  email: 'john@example.com'
} satisfies CreateUserForm) // Type-safe form validation

// Update with form validation
const { data: updated } = await userService.update('1', {
  fullName: 'John Smith'
} satisfies UpdateUserForm)

// With custom options and form validation
const { data } = await userService.all({
  query: { role: 'admin' } satisfies GetUsersForm
})

// Error handling with Zod validation
try {
  const { data } = await userService.create({
    // Invalid data
    email: 'invalid-email'
  } satisfies CreateUserForm)
} catch (error) {
  if (error instanceof z.ZodError) {
    // Type-safe validation errors
    console.log(error.errors)
  }
}
```

## Contributing

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Development
npm run dev

# Build
npm run dev:build

# Run ESLint
npm run lint

# Run Tests
npm run test
npm run test:watch

# Release
npm run release
```

## License

[MIT License](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@tamnt-work/nuxt-mapper/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@tamnt-work/nuxt-mapper
[npm-downloads-src]: https://img.shields.io/npm/dm/@tamnt-work/nuxt-mapper.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@tamnt-work/nuxt-mapper
[license-src]: https://img.shields.io/npm/l/@tamnt-work/nuxt-mapper.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@tamnt-work/nuxt-mapper
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
