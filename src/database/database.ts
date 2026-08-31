import * as SQLite from 'expo-sqlite';
import { DB_NAME } from './schema';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the app's single, persistent SQLite database connection. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DB_NAME).then(async (database) => {
      await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
      return database;
    });
  }
  return databasePromise;
}
