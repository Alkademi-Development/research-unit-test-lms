require('dotenv').config({ path: '.env' });
const supertest = require('supertest');
var readline = require('readline');
var fs = require('fs');
var { exec, execSync, spawn } = require('child_process');
var clc = require('cli-color');
const request = supertest(process.env.SERVICES_API + 'v1/');
const { ROLES } = require('./commons/constants/role');

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
            const data = [];
 
            console.log(clc.yellowBright('=== Silahkan masukkan akun terlebih dahulu untuk mengetes file yang membutuhkan authentication ==='));

            function getInfoAccount() {
                
                rl.question(clc.bold('Masukkan akun email: (ketik x untuk close) '), (inputEmail) => {
                    if(inputEmail.trim() === '') {
                        console.log(clc.yellowBright('Wajib memasukkan email & password'));
                        getInfoAccount();
                    } else if (inputEmail.trim() === "x") {
                        console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                        rl.close();
                    } else {
                        function getPassword() {
                            
                            rl.question(clc.bold('Masukkan akun password: (ketik x untuk close) '), (inputPassword) => {

                                if(inputPassword.trim() === '') {
                                    console.log(clc.yellowBright('Wajib memasukkan email & password'))
                                    getPassword();
                                } else if (inputPassword.trim() === "x") {
                                    console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                    rl.close();
                                } else {
                                    let dataRequest = { email: inputEmail, password: inputPassword };
                                
                                    request.post(`auth/signin`)
                                    .set('S-App-Authorization', 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df')
                                    .send(dataRequest)
                                    .then((res) => {
                                        if(res.body.status === false) {
                                            console.log(clc.red(res.body.message));
                                            console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                            getInfoAccount();
                                        } else {
                                            data.push(`akun=${inputEmail},${inputPassword}`);

                                            exec(`npm test -- --data=${data}`, (error, stdout, stderr) => {
                                                if (error) {
                                                    console.error(clc.red('❌ Terjadi kesalahan: '), error);
                                                }
                    
                                                console.log(stdout);
                                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                    
                                                process.exit();
                                            });
                                        }
                                    })
                                    .catch((err) => {
                                        console.log(err);
                                    });
                                }
                             
                            });
                        }
                        getPassword();
                    }
                });

            }

            getInfoAccount(); 

        } else {
            let found = false;
            try {
                fs.readdirSync(testFolder).forEach(async file => {
                    let fileName = file.split('.')[0];
                    if(input === fileName) {
                        const data = [];

                        if(fileName == 'login' || fileName == 'logout') {

                            console.log(clc.yellowBright('=== Silahkan masukkan akun terlebih dahulu untuk mengetes file ini ==='));

                            function getInfoAccount() {
                                
                                rl.question(clc.bold('Masukkan akun email: (ketik x untuk close) '), (inputEmail) => {
                                    if(inputEmail.trim() === '') {
                                        console.log(clc.yellowBright('Wajib memasukkan email & password'));
                                        getInfoAccount();
                                    } else if (inputEmail.trim() === "x") {
                                        console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                        rl.close();
                                    } else {
                                        function getPassword() {
                                            
                                            rl.question(clc.bold('Masukkan akun password: (ketik x untuk close) '), (inputPassword) => {

                                                if(inputPassword.trim() === '') {
                                                    console.log(clc.yellowBright('Wajib memasukkan email & password'))
                                                    getPassword();
                                                } else if (inputPassword.trim() === "x") {
                                                    console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                                    rl.close();
                                                } else {
                                                    let dataRequest = { email: inputEmail, password: inputPassword };
                                                
                                                    request.post(`auth/signin`)
                                                    .set('S-App-Authorization', 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df')
                                                    .send(dataRequest)
                                                    .then((res) => {
                                                        if(res.body.status === false) {
                                                            console.log(clc.red(res.body.message));
                                                            console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                            getInfoAccount();
                                                        } else {
                                                            data.push(`akun=${inputEmail},${inputPassword}`);
            
                                                            exec(`npm test test/${file} -- --data=${data}`, (error, stdout, stderr) => {
                                                                if (error) {
                                                                    console.error(clc.red('❌ Terjadi kesalahan: '), error);
                                                                }
                                    
                                                                console.log(stdout);
                                                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                    
                                                                process.exit();
                                                            });
                                                        }
                                                    })
                                                    .catch((err) => {
                                                        console.log(err);
                                                    });
                                                }
                                             
                                            });
                                        }
                                        getPassword();
                                    }
                                });

                            }

                            getInfoAccount();

                        } else {
    
                            exec(`npm test test/${file} -- --data=${data}`, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(clc.red('❌ Terjadi kesalahan: '), error);
                                }
    
                                console.log(stdout);
                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
    
                                process.exit();
                            });
                        }
                        found = true;
                    }
                })
            } finally {
                if(!found) {
                    console.log(clc.red('⚠ Maaf, file yang anda masukkan tidak di temukan!'))
                    getTheListOfFile();
                    getInputFileName()
                }
            }
    
        }
    });

}

getInputFileName();