import { defineCommand, runMain } from 'citty'
import { dataMapperCommand } from './commands/mapper'
import { serviceCommand } from './commands/service'
import { requestCommand } from './commands/request'

const main = defineCommand({
  meta: {
    name: 'tw',
    version: '0.0.1',
    description: 'Data Mapper CLI tools',
  },
  subCommands: {
    mapper: dataMapperCommand,
    service: serviceCommand,
    request: requestCommand,
  },
})

runMain(main)
