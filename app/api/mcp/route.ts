import { NextRequest, NextResponse } from 'next/server'
import { MCP_TOOLS, callMcpTool } from '@/lib/mcp-tools'

const SERVER_INFO = { name: 'splendit-mcp', version: '1.0.0' }
const PROTOCOL_VERSION = '2024-11-05'

function jsonRpcOk(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}

function checkAuth(req: NextRequest): boolean {
  const apiKey = process.env.MCP_API_KEY
  if (!apiKey) return false
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim()
  return token === apiKey
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocolVersion: PROTOCOL_VERSION,
    status: 'ok',
  })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonRpcError(null, -32700, 'Parse error')
  }

  const { id, method, params } = body

  if (!method) {
    return jsonRpcError(id, -32600, 'Invalid Request')
  }

  // ── initialize ─────────────────────────────────────────────────────────────
  if (method === 'initialize') {
    return jsonRpcOk(id, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      capabilities: { tools: {} },
    })
  }

  // ── notifications/initialized ───────────────────────────────────────────────
  if (method === 'notifications/initialized') {
    // notification — no response needed, return 204-equivalent empty body
    return new NextResponse(null, { status: 204 })
  }

  // ── tools/list ─────────────────────────────────────────────────────────────
  if (method === 'tools/list') {
    return jsonRpcOk(id, { tools: MCP_TOOLS })
  }

  // ── tools/call ─────────────────────────────────────────────────────────────
  if (method === 'tools/call') {
    const p = params as { name?: string; arguments?: Record<string, unknown> } | undefined
    const toolName = p?.name
    const toolArgs = p?.arguments ?? {}

    if (!toolName) {
      return jsonRpcError(id, -32602, 'Missing tool name')
    }

    try {
      const result = await callMcpTool(toolName, toolArgs)
      return jsonRpcOk(id, result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return jsonRpcError(id, -32603, `Tool execution error: ${msg}`)
    }
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`)
}
