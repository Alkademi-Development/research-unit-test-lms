var readline = require('readline');
var fs = require('fs');
var { exec, execSync } = require('child_process');
var clc = require('cli-color');
require('dotenv').config({ path: '.env.development' });
const { ROLES } = require('./commons/constants/role')

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
    console.log(clc.bold("Or you can type 'all' if you want to test all files"));

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
        } else if(input.trim() === "all") {
            exec(`npm test`, (error, stdout, stderr) => {
                if (error) {
                    console.error(clc.red('❌ Terjadi kesalahan: '), error);
                }

                console.log(stdout);
                console.log(clc.yellow('Eksekusi telah selesai!'));
                console.log(clc.green('Terimakasih sudah mencoba tester! 😊'));

                process.exit();
            });
        } else {
            let found = false;
            try {
                fs.readdirSync(testFolder).forEach(async file => {
                    let fileName = file.split('.')[0];
                    if(input === fileName) {
                        const data = [];

                        if(fileName == 'login' || fileName == 'logout') {
                            console.log(clc.yellowBright('=== File Tester ini Membutuhkan akun untuk Authentication, Silahkan pilih role yang ingin di gunakan ==='));
                            console.log(clc.yellow('=== ROLE YANG TERSEDIA ==='));
                            const roles = ROLES;
                            roles.forEach((role, index) => {
                                console.log(`${index+1}. ${role}`)
                            })
                            function getRole() {
                                rl.question(clc.blue('Masukkan tipe role dari akun yang ingin di test (ketik x untuk kembali memilih file & ketik xx untuk close test) : '), (input) => {
                                    if(input.trim() === "") {
                                        console.log(clc.red('⚠ Tolong masukkan role yang sesuai dan tersedia!'));
                                        getRole();
                                    } else if (input.trim() === "x") {
                                        getTheListOfFile();
                                        getInputFileName();
                                    } else if (input.trim() === "xx") {
                                        console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                        rl.close();
                                    } else if (!roles.includes(input)) {
                                        console.log(clc.red('⚠ Maaf role yang anda cari atau ketik tidak di temukan, pilih yang tersedia!'));
                                        getRole();
                                    }  else {
                                        switch (input) {
                                            case 'admin':
                                                data.push(`role=${1}`)
                                                break;
                                            case 'mentor':
                                                data.push(`role=${2}`)
                                            case 'teacher':
                                                data.push(`role=${3}`)
                                            case 'student':
                                                data.push(`role=${4}`)
                                            case 'industry':
                                                data.push(`role=${5}`)
                                            case 'content-writer':
                                                data.push(`role=${6}`)
                                            case 'lead-program':
                                                data.push(`role=${7}`)
                                            case 'lead-region':
                                                data.push(`role=${8}`)
                                            default:
                                                data.push(`role=${0}`)
                                                break;
                                        }
        
                                        exec(`npm test test/${file} -- --data=${data}`, (error, stdout, stderr) => {
                                            if (error) {
                                                console.error(clc.red('❌ Terjadi kesalahan: '), error);
                                            }
                
                                            console.log(stdout);
                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                            console.log(clc.green('Terimakasih sudah mencoba tester! 😊'));
                
                                            process.exit();
                                        });
                                    }
                                })
                            }
                            getRole();
                        } else {
    
                            exec(`npm test test/${file} -- --data=${data}`, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(clc.red('❌ Terjadi kesalahan: '), error);
                                }
    
                                console.log(stdout);
                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                console.log(clc.green('Terimakasih sudah mencoba tester! 😊'));
    
                                process.exit();
                            });
                        }
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