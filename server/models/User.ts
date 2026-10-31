import { randomUUID } from 'crypto';
import { db } from '../config/database';

export interface UserData {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export class UserModel {
  static findAll(): Omit<UserData, 'password_hash'>[] {
    return db
      .prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at ASC')
      .all() as Omit<UserData, 'password_hash'>[];
  }

  static findById(id: string): UserData | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserData | undefined;
  }

  static findByEmail(email: string): UserData | undefined {
    return db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserData | undefined;
  }

  static create(data: { name: string; email: string; password_hash: string }): UserData {
    const id = `user-${randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.email.toLowerCase().trim(), data.password_hash, now);

    return this.findById(id)!;
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM users').get() as any).count;
  }
}

