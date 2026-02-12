import Database from 'better-sqlite3'
import path from 'path'
import { mkdirSync } from 'fs'

export interface Document {
  id: string
  content: Buffer | null
  created_at: string
  updated_at: string
}

export class DocumentStore {
  private db: Database.Database

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      mkdirSync(path.dirname(dbPath), { recursive: true })
    }
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        content BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  createDocument(id: string, content?: Buffer): void {
    const stmt = this.db.prepare('INSERT INTO documents (id, content) VALUES (?, ?)')
    stmt.run(id, content ?? null)
  }

  getDocument(id: string): Document | undefined {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ?')
    return stmt.get(id) as Document | undefined
  }

  saveDocument(id: string, content: Buffer): void {
    const stmt = this.db.prepare(
      'INSERT INTO documents (id, content) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP'
    )
    stmt.run(id, content)
  }

  documentExists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM documents WHERE id = ?')
    return stmt.get(id) !== undefined
  }

  close(): void {
    this.db.close()
  }
}

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'documents.db')
export const store = new DocumentStore(DB_PATH)
