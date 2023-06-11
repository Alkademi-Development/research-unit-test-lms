import path from 'path';
import readline from 'readline';
import moment from 'moment-timezone';


export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getCustomOptionReportFile = (inputReportFile) => {
  return inputReportFile ? `--reporter-options includeScreenshots=true,timestamp=longDate,overwrite=false,reportDir=testReports,reportFilename=${inputReportFile.replaceAll(' ', '').toLowerCase()}/[status]-[datetime]-report,reportPageTitle=Laporan-Harian-Testing,assetsDir=${path.relative(inputReportFile.replaceAll(' ', '').toLowerCase(), 'testReports/assets')}` : `--reporter-options overwrite=false,reportDir=testReports,reportFilename=examples/test-results,reportPageTitle=Laporan-Harian-Testing`;
}

export {
  getCustomOptionReportFile
}