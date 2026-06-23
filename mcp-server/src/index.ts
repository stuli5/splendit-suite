import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerCandidateTools } from './tools/candidates.js'
import { registerProjectTools   } from './tools/projects.js'
import { registerPipelineTools  } from './tools/pipeline.js'
import { registerCompanyTools   } from './tools/companies.js'
import { registerDealTools      } from './tools/deals.js'
import { registerBodyshopTools  } from './tools/bodyshop.js'
import { registerActivityTools  } from './tools/activity.js'
import { registerUserTools      } from './tools/users.js'
import { registerLiRegisterTools } from './tools/li-register.js'

const server = new McpServer({
  name:    'splendit-mcp',
  version: '1.0.0',
})

registerCandidateTools(server)
registerProjectTools(server)
registerPipelineTools(server)
registerCompanyTools(server)
registerDealTools(server)
registerBodyshopTools(server)
registerActivityTools(server)
registerUserTools(server)
registerLiRegisterTools(server)

const transport = new StdioServerTransport()
await server.connect(transport)
