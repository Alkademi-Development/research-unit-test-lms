import fs from 'fs';
import path from 'path';
import clc from 'cli-color';

function getAllFilePaths(folderPath) {
    const result = [];
  
    function traverseFolder(currentPath) {
      const files = fs.readdirSync(currentPath);
  
      files.forEach((file) => {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
  
        if (stat.isFile()) {
          result.push(filePath);
        } else if (stat.isDirectory()) {
          traverseFolder(filePath);
        }
      });
    }
  
    traverseFolder(folderPath);
    return result;
}

function getTheListOfFileRecursively(folderPath, indent = '') {
  const files = fs.readdirSync(folderPath);
  let tree = '';

  files.forEach((file, index) => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    const isDirectory = stats.isDirectory();
    const isLast = index === files.length - 1;
    const nodePrefix = isLast ? '└──' : '├──';
    const nodeIndent = isLast ? '    ' : '│   ';
    const nodeLabel = isDirectory ? `${clc.yellowBright(file)} (Folder)` : `${clc.blueBright(file)} (File)`;

    tree += `${indent}${nodePrefix} ${nodeLabel}\n`;

    if (isDirectory) {
      const childIndent = isLast ? '    ' : '│   ';
      tree += getTheListOfFileRecursively(filePath, `${indent}${nodeIndent}`);
    }
  });

  return tree;
}

function printFileTree(folderPath) {
  console.log(clc.bold('\n === LIST OF FILE, CHOOSE THE ONE === \n'));
  const tree = getTheListOfFileRecursively(folderPath);
  console.log(tree);
}

export {
    getAllFilePaths,
    getTheListOfFileRecursively,
    printFileTree,
}