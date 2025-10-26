import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, 'api');

fs.readdirSync(targetDir).forEach((file) => {
	if (!file.endsWith('.ts')) return;
	const filePath = path.join(targetDir, file);
	let content = fs.readFileSync(filePath, 'utf8');
	// 處理 import 路徑（只改本地檔案，相對路徑，不動 package）
	content = content.replace(
		/from\s+(['"])(\.\/[^'"]+?)(['"])/g,
		(match, quoteL, importPath, quoteR) => {
			if (importPath.endsWith('.js')) return match; // 已經有 .js 不改
			return `from ${quoteL}${importPath}.js${quoteR}`;
		}
	);
	fs.writeFileSync(filePath, content, 'utf8');
	console.log(`Updated imports in ${file}`);
});
