import SQLite from 'react-native-sqlite-storage';

// Type definitions for SQLite
interface SQLTransaction {
  executeSql: (sql: string, args?: any[], success?: (tx: any, result: any) => void, error?: (tx: any, error: any) => void) => void;
}

interface SQLResultSet {
  rows: {
    length: number;
    item: (index: number) => any;
  };
  rowsAffected: number;
}

interface SQLError {
  code: number;
  message: string;
}

export interface DatabaseSchema {
  transactions: {
    id: string;
    amount: number;
    currency: string;
    recipient: string;
    recipient_account: string;
    payment_method: string;
    status: 'pending' | 'completed' | 'failed';
    created_at: string;
    processed_at?: string;
    reference: string;
    notes?: string;
    category?: string;
    merchant_id?: string;
    qr_reference?: string;
  };
  
  queued_actions: {
    id: string;
    action_type: 'payment' | 'transfer' | 'bill_payment' | 'qr_payment';
    action_data: string; // JSON string
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retry_count: number;
    max_retries: number;
    created_at: string;
    next_retry_at?: string;
    error_message?: string;
  };
  
  sync_status: {
    id: string;
    table_name: string;
    record_id: string;
    last_synced_at: string;
    sync_status: 'synced' | 'pending' | 'conflict' | 'error';
    conflict_data?: string; // JSON string
  };
  
  user_preferences: {
    key: string;
    value: string;
    updated_at: string;
  };
  
  cached_data: {
    key: string;
    data: string; // JSON string
    expires_at: string;
    created_at: string;
  };
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private database: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize the offline database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      
      
      // Enable debugging
      SQLite.DEBUG(true);
      SQLite.enablePromise(true);

      // Open database
      this.database = await SQLite.openDatabase({
        name: 'SikaRemitOffline.db',
        location: 'default',
      });

      

      // Create tables
      await this.createTables();
      
      this.isInitialized = true;
      
      
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Create all necessary tables
   */
  private async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const tables = [
      // Transactions table
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'GHS',
        recipient TEXT NOT NULL,
        recipient_account TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        processed_at TEXT,
        reference TEXT NOT NULL UNIQUE,
        notes TEXT,
        category TEXT,
        merchant_id TEXT,
        qr_reference TEXT
      )`,

      // Queued actions table
      `CREATE TABLE IF NOT EXISTS queued_actions (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        action_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL,
        next_retry_at TEXT,
        error_message TEXT
      )`,

      // Sync status table
      `CREATE TABLE IF NOT EXISTS sync_status (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        last_synced_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        conflict_data TEXT,
        UNIQUE(table_name, record_id)
      )`,

      // User preferences table
      `CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Cached data table
      `CREATE TABLE IF NOT EXISTS cached_data (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    ];

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_queued_actions_status ON queued_actions(status)',
      'CREATE INDEX IF NOT EXISTS idx_queued_actions_next_retry ON queued_actions(next_retry_at)',
      'CREATE INDEX IF NOT EXISTS idx_sync_status_table_record ON sync_status(table_name, record_id)',
      'CREATE INDEX IF NOT EXISTS idx_cached_data_expires_at ON cached_data(expires_at)'
    ];

    try {
      // Execute table creation
      for (const tableSQL of tables) {
        await this.database.executeSql(tableSQL);
      }

      // Execute index creation
      for (const indexSQL of indexes) {
        await this.database.executeSql(indexSQL);
      }

      
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.database || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    transactionFn: (db: SQLTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.database!.transaction(
        async (tx: SQLTransaction) => {
          try {
            const result = await transactionFn(tx);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        (error: SQLError) => {
          console.error('Transaction failed:', error);
          reject(error);
        },
        () => {
          // Transaction completed successfully
        }
      );
    });
  }

  /**
   * Insert a record
   */
  async insert(
    table: keyof DatabaseSchema,
    data: Partial<DatabaseSchema[keyof DatabaseSchema]>
  ): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    try {
      await this.database.executeSql(sql, values);
      
    } catch (error) {
      console.error(`Failed to insert into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Update records
   */
  async update(
    table: keyof DatabaseSchema,
    data: Partial<DatabaseSchema[keyof DatabaseSchema]>,
    whereClause: string,
    whereArgs: any[] = []
  ): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

    try {
      const [result] = await this.database.executeSql(sql, [...values, ...whereArgs]);
      const rowsAffected = (result as SQLResultSet).rowsAffected;
      
      return rowsAffected;
    } catch (error: any) {
      console.error(`Failed to update ${table}:`, error);
      throw error;
    }
  }

  /**
   * Delete records
   */
  async delete(
    table: keyof DatabaseSchema,
    whereClause: string,
    whereArgs: any[] = []
  ): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;

    try {
      const [result] = await this.database.executeSql(sql, whereArgs);
      const rowsAffected = (result as SQLResultSet).rowsAffected;
      
      return rowsAffected;
    } catch (error: any) {
      console.error(`Failed to delete from ${table}:`, error);
      throw error;
    }
  }

  /**
   * Query records
   */
  async query<T>(
    table: keyof DatabaseSchema,
    columns: string[] = ['*'],
    whereClause?: string,
    whereArgs: any[] = [],
    orderBy?: string,
    limit?: number
  ): Promise<T[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    let sql = `SELECT ${columns.join(', ')} FROM ${table}`;
    const args: any[] = [];

    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
      args.push(...whereArgs);
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    try {
      const [result] = await this.database.executeSql(sql, args);
      const records: T[] = [];

      for (let i = 0; i < (result as SQLResultSet).rows.length; i++) {
        records.push((result as SQLResultSet).rows.item(i));
      }

      
      return records;
    } catch (error: any) {
      console.error(`Failed to query ${table}:`, error);
      throw error;
    }
  }

  /**
   * Get a single record by ID
   */
  async getById<T>(
    table: keyof DatabaseSchema,
    id: string
  ): Promise<T | null> {
    const records = await this.query<T>(table, ['*'], 'id = ?', [id]);
    return records.length > 0 ? records[0] : null;
  }

  /**
   * Check if a record exists
   */
  async exists(
    table: keyof DatabaseSchema,
    whereClause: string,
    whereArgs: any[] = []
  ): Promise<boolean> {
    const records = await this.query(table, ['COUNT(*) as count'], whereClause, whereArgs);
    return (records[0] as { count: number }).count > 0;
  }

  /**
   * Get count of records
   */
  async count(
    table: keyof DatabaseSchema,
    whereClause?: string,
    whereArgs: any[] = []
  ): Promise<number> {
    const records = await this.query(table, ['COUNT(*) as count'], whereClause, whereArgs);
    return (records[0] as { count: number }).count;
  }

  /**
   * Clear expired cached data
   */
  async clearExpiredCache(): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const sql = `DELETE FROM cached_data WHERE expires_at < datetime('now')`;

    try {
      const [result] = await this.database.executeSql(sql);
      const rowsAffected = (result as SQLResultSet).rowsAffected;
      
      return rowsAffected;
    } catch (error: any) {
      console.error('Failed to clear expired cache:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<Record<string, number>> {
    const tables = ['transactions', 'queued_actions', 'sync_status', 'user_preferences', 'cached_data'];
    const stats: Record<string, number> = {};

    for (const table of tables) {
      stats[table] = await this.count(table as keyof DatabaseSchema);
    }

    return stats;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
      this.isInitialized = false;
      this.initializationPromise = null;
      
    }
  }

  /**
   * Reset database (for testing or debugging)
   */
  async reset(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const tables = ['transactions', 'queued_actions', 'sync_status', 'user_preferences', 'cached_data'];

    try {
      for (const table of tables) {
        await this.database.executeSql(`DELETE FROM ${table}`);
      }
      
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }
}

