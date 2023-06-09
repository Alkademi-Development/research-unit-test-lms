import path from 'path';
import readline from 'readline';


export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getCustomOptionReportFile = (inputReportFile) => {
  return inputReportFile ? `--reporter-options assetsDir=testReports/assets,reportDir=testReports,reportFilename=${inputReportFile.replaceAll(' ', '').toLowerCase()},reportPageTitle=Laporan-Harian-Testing,assetsDir=${path.relative(inputReportFile.replaceAll(' ', '').toLowerCase(), 'testReports/assets')}` : `--reporter-options reportDir=testReports,reportFilename=examples/test-results,reportPageTitle=Laporan-Harian-Testing`;
}

export {
  getCustomOptionReportFile
}