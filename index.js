var readline = require('readline');
var fs = require('fs');
var { exec, execSync } = require('child_process');
var clc = require('cli-color');
require('dotenv').config({ path: '.env.development' });

const testFolder = './test/';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getTheListOfFile() {
    
    console.log('=== LIST OF FILE, CHOOSE THE ONE ===');
    fs.readdirSync(testFolder).forEach(async (file, index) => {
        console.log(`${index+1}. ${file}`);
    })

}

getTheListOfFile();

function getInputFileName() {
    
    rl.question('Masukkan input nama file (ketik x untuk close) : ', (input) => {
    
        if(input.trim() === "") {
            console.log(clc.red('⚠ Tolong masukkan file test yang sesuai!'))
            getTheListOfFile();
            getInputFileName();
        } else if(input.trim() === "x") {
            console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
            rl.close();
        } else {
            let found = false;
            try {
                fs.readdirSync(testFolder).forEach(async file => {
                    let fileName = file.split('.')[0];
                    if(input === fileName) {

                        exec(`npm test test/${file}`, (error, stdout, stderr) => {
                            if (error) {
                                console.error(clc.red('❌ Terjadi kesalahan: '), error);
                            }

                            console.log(stdout);
                            console.log(clc.yellow('Eksekusi telah selesai!'));

                            process.exit();
                        });
                        found = true;
                    }
                })
            } finally {
                if(!found) {
                    console.log(clc.red('⚠ Maaf, file yang masukkan tidak di temukan!'))
                    getTheListOfFile();
                    getInputFileName()
                }
            }
    
        }
    });

}

getInputFileName();