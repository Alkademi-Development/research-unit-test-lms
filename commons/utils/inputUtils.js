import readline from 'readline';
import moment from 'moment-timezone';

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getCustomOptionReportFile = (inputReportFile) => {
  return inputReportFile ? `--reporter-options code=false,cdn=true,timestamp=longDate,overwrite=false,reportDir=testResults/reports,reportFilename=${inputReportFile.replace(/\s/g, '').toLowerCase()}/[status]-[datetime]-report,reportPageTitle=Report-Testing-${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}` : `--reporter-options code=false,overwrite=false,reportDir=testResults/reports,reportFilename=examples/test-results,reportPageTitle=Report-Testing-${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}`;
}

export {
  getCustomOptionReportFile
}