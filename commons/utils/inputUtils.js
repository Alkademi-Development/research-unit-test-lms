import readline from 'readline';


export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getCustomOptionReportFile = (inputReportFile) => {
  return inputReportFile ? `-- --reporter-options reportDir=testReports,reportFilename=${inputReportFile.toLowerCase()},reportPageTitle=${inputReportFile.toUpperCase()}` : '--reporter-options reportDir=testReports,reportFilename=test-results,reportPageTitle=Laporan-Harian-Testing';
}

export {
  getCustomOptionReportFile
}