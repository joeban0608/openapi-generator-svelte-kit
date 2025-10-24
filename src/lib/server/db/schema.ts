import { pgTable, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const todos = pgTable('todos', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	completed: boolean('completed').notNull().default(false)
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type Todo = typeof todos.$inferSelect;
