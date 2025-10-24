import { db } from './db';
import { eq } from 'drizzle-orm';
import { todos } from './db/schema';

export async function getTodos() {
	return await db.select().from(todos).execute();
}

export async function getTodo(id: string) {
	return await db.select().from(todos).where(eq(todos.id, id));
}

export async function createTodo(title: string) {
	const [todo] = await db
		.insert(todos)
		.values({ id: crypto.randomUUID(), title, completed: false })
		.returning();
	return todo;
}

// 如果更新 title 時，發現 todo 已完成，則拋出錯誤
// todo immutable error

export async function updateTodo({
	id,
	title,
	completed
}: {
	id: string;
	title?: string;
	completed: boolean;
}) {
	let todo;
	if (title) {
		[todo] = await db.update(todos).set({ title, completed }).where(eq(todos.id, id)).returning();
	} else {
		[todo] = await db.update(todos).set({ completed }).where(eq(todos.id, id)).returning();
	}

	return todo;
}

export async function deleteTodo(id: string) {
	await db.delete(todos).where(eq(todos.id, id));
	return { success: true };
}

