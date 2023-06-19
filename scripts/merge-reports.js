import fs from 'fs';
import { merge } from 'mochawesome-merge';
import { create } from 'mochawesome-report-generator';
import { rl } from '#root/commons/utils/inputUtils';
import { TEXT_CONFIRM } from '#root/commons/constants/input';

async function mergeReports(directory, outputFile) {
    const files = await getJsonFiles(directory);

    const reports = await merge({files});
  
    fs.writeFileSync(outputFile, JSON.stringify(reports, null, 2));
    console.log(`Merged report saved to ${outputFile}`);
}
  
function getJsonFiles(directory) {
    return new Promise((resolve, reject) => {
      const jsonFiles = [];
  
      function traverseDir(dir) {
        const files = fs.readdirSync(dir);
  
        files.forEach((file) => {
          const filePath = `${dir}/${file}`;
  
          if (fs.statSync(filePath).isDirectory()) {
            traverseDir(filePath);
          } else if (file.endsWith('.json')) {
            jsonFiles.push(filePath);
          }
        });
      }
  
      try {
        traverseDir(directory);
        resolve(jsonFiles);
      } catch (error) {
        reject(error);
      }
    });
}

const reportData = fs.readFileSync('./output.json', 'utf-8');

const options = {
    reportDir: './custom-report-dir', // Path folder untuk menyimpan report
    reportFilename: 'custom-report.html', // Nama file report
};
create(JSON.parse(reportData), {});


  