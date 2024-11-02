import { defineCommand, runMain } from 'citty'
import { dataMapperCommand } from './commands/mapper'
import { serviceCommand } from './commands/service'

const main = defineCommand({
  meta: {
    name: 'tw',
    version: '0.0.1',
    description: 'Data Mapper CLI tools',
  },
  subCommands: {
    mapper: dataMapperCommand,
    service: serviceCommand,
  },
})

runMain(main)
