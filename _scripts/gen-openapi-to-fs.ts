import { generateOpenApiDocToFile } from './openapi-doc-builder.js';
import { apiSchema } from './api/_index.js';

generateOpenApiDocToFile({
	schema: apiSchema,
	serverUrl: 'https://your-api-url.com',
	outputPath: '_docs/0.1.0/openapi.json'
});

// 可以至 swagger 官網測試文件：https://editor.swagger.io/
