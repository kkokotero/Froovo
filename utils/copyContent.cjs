const fs = require('fs');
const path = require('path');

function copyFolderContent(src, dest) {
	if (fs.existsSync(dest)) {
		fs.rmSync(dest, { recursive: true, force: true });
	}

	fs.mkdirSync(dest, { recursive: true });

	for (const entry of fs.readdirSync(src)) {
		const srcPath = path.join(src, entry);
		const destPath = path.join(dest, entry);
		const stat = fs.statSync(srcPath);

		if (stat.isDirectory()) {
			copyFolderContent(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

const srcDir = path.resolve(process.cwd(), 'src/uWebSockets');
const destDir = path.resolve(process.cwd(), 'dist/uWebSockets');

copyFolderContent(srcDir, destDir);
