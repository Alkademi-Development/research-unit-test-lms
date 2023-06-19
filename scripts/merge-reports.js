import fs from 'fs';
import { merge } from 'mochawesome-merge';
import { create } from 'mochawesome-report-generator';
import { rl } from '#root/commons/utils/inputUtils';
import { TEXT_REPORTS } from '#root/commons/constants/input';

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

function askMergeReport() {
  
  rl.question(clc.bold("Pilih salah satu jenis tipe test yang anda ingin merge : 'app' atau 'api' "), input => {

      if(!TEXT_REPORTS.includes(input)) {
        console.log(clc.red('Input tidak valid, tolong masukkan sesuai instruksi'));
        askMergeReport();
      } else if(input.trim().toLowerCase() === 'app') {

        mergeReports('./testResults/reports/app', `./testResults/output-merged-report-${input}.json`);

        const reportData = fs.readFileSync(`./testResults/output-merged-report-${input}.json`, 'utf-8');

        const options = { 
            reportDir: './testResults', // Path folder untuk menyimpan report
            reportFilename: `merged-report-${input}.html`, // Nama file report
        };
        create(JSON.parse(reportData), options);

      } else if (input.trim().toLowerCase() === 'api') {
        mergeReports('./testResults/reports/api', `./testResults/output-merged-report-${input}.json`);

        const reportData = fs.readFileSync(`./testResults/output-merged-report-${input}.json`, 'utf-8');

        const options = { 
            reportDir: './testResults', // Path folder untuk menyimpan report
            reportFilename: `merged-report-${input}.html`, // Nama file report
        };
        create(JSON.parse(reportData), options);
      } else {
        console.log(clc.red('Input tidak valid, tolong masukkan sesuai instruksi'));
        askMergeReport();
      }

  })

}

askMergeReport();


  