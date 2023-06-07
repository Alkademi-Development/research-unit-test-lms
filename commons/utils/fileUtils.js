import fs from 'fs';
import path from 'path';
import clc from 'cli-color';
import { By } from 'selenium-webdriver';

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
  console.log(clc.bold('\n === LIST OF FILE, CHOOSE THE ONE === '));
  const tree = getTheListOfFileRecursively(folderPath);
  console.log(tree);
}

function checkStringForKeywords(string, keywords) {
  for (const keyword of keywords) {
    if (string.includes(keyword)) {
      return true;
    }
  }
  return false;
}

async function takeScreenshot(driver, path) {
  const bodyElement = await driver.findElement(By.css('body'));
  await driver.executeScript("document.body.style.height = '100%';");
  await driver.takeScreenshot().then(data => {
    fs.writeFileSync(path, data, 'base64');
  });
}

export {
    getAllFilePaths,
    getTheListOfFileRecursively,
    printFileTree,
    checkStringForKeywords,
    takeScreenshot
}