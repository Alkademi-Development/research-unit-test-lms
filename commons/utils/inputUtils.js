import readline from 'readline';


export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getCustomOptionReportFile = (inputReportFile) => {
  return inputReportFile ? `-- --reporter-options reportDir=testReports,reportFilename=${inputReportFile.replaceAll(' ', '').toLowerCase()},reportPageTitle=Laporan-Harian-Testing` : '--reporter-options reportDir=testReports,reportFilename=examples/test-results,reportPageTitle=Laporan-Harian-Testing';
}

export {
  getCustomOptionReportFile
}