import type { ApiDefinition } from './_base';
import { todoSchema } from './todo.api';

export const apiSchema = {
	...todoSchema
} as const satisfies Record<string, ApiDefinition>;
