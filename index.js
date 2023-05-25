import * as dotenv from 'dotenv';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
import supertest from 'supertest';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { exec, execSync, spawn } from 'child_process';
import { TEST_NEED_AUTHENTICATION } from '#root/commons/constants/file';
import clc from 'cli-color';

const request = supertest(process.env.SERVICES_API + 'v1/');
const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

const testFolder = './test/';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(clc.bold('=== LIST OF FILE, CHOOSE THE ONE ==='));
function getTheListOfFileRecursively(folderPath, depth = 0) {
    const files = fs.readdirSync(folderPath);
    let index = 1;
  
    files.forEach((file) => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        const isDirectory = stats.isDirectory();
        const prefix = isDirectory ? '' : `${' '.repeat(depth)}-`;

        console.log(`${' '.repeat(depth)}${prefix} ${file} (${isDirectory ? 'Folder' : 'File'})`);

        if (isDirectory) {
            getTheListOfFileRecursively(filePath, depth + 1); // Memanggil rekursif untuk folder anak
            index++;
        }

    });
}
getTheListOfFileRecursively(testFolder);
console.log(clc.bold(`Or you can type 'all' if you want to test all files, and if you want to test nested file just type like this ${clc.yellow('test/nametest')}`));

function getInputFileName() {
    
    rl.question('Masukkan input nama file (ketik x untuk close) : ', (input) => {
    
        if(input.trim() === "") {
            console.log(clc.red('⚠ Tolong masukkan file test yang sesuai!'))
            getTheListOfFileRecursively(testFolder);
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
                                    .set(paramsRequest.sApp, paramsRequest.sAppToken)
                                    .send(dataRequest)
                                    .then((res) => {
                                        if(res.body.status === false) {
                                            console.log(clc.red(res.body.message));
                                            console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                            getInfoAccount();
                                        } else {
                                            data.push(`akun=${inputEmail};${inputPassword}`);

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

                function getTheListOfFileInputRecursively(folderPath) {
                    const files = fs.readdirSync(folderPath);
                    const testFolderPath = path.join(testFolder, input);
                    const absolutePath = path.join(testFolderPath);
                    const data = [];
                  
                    files.forEach((file) => {
                        const filePath = path.join(folderPath, file);
                        const statsFolder = fs.statSync(filePath);
                        const isDirectory = statsFolder.isDirectory();
                        const statsFile = fs.statSync(filePath);
                        const isFile = statsFile.isDirectory();
                
                        if (isDirectory && !isFile) {
                            if(fs.existsSync(absolutePath) && isFile) {

                                absolutePath = path.join(testFolderPath + '.js');
                                
                                let matchFound = TEST_NEED_AUTHENTICATION.some((item) =>
                                    input.toLowerCase().includes(item)
                                );

                                if(matchFound) {
                                    
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
                                                            .set(paramsRequest.sApp, paramsRequest.sAppToken)
                                                            .send(dataRequest)
                                                            .then((res) => {
                                                                if(res.body.status === false) {
                                                                    console.log(clc.red(res.body.message));
                                                                    console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                                    getInfoAccount();
                                                                } else {
                                                                    data.push(`akun=${inputEmail};${inputPassword}`);

                                                                    exec(`npm test ${absolutePath} -- --data=${data}`, (error, stdout, stderr) => {
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

                                    exec(`npm test ${absolutePath} -- --data=${data}`, (error, stdout, stderr) => {
                                        if (error) {
                                            console.error(clc.red('❌ Terjadi kesalahan: '), error);
                                        }
                            
                                        console.log(stdout);
                                        console.log(clc.yellow('Eksekusi telah selesai!'));
                                        console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                            
                                        process.exit();
                                    });

                                }

                            } else {
                                
                                
                                let matchFound = TEST_NEED_AUTHENTICATION.some((item) =>
                                    input.toLowerCase().includes(item)
                                );

                                if(matchFound) {
                                    
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
                                                            .set(paramsRequest.sApp, paramsRequest.sAppToken)
                                                            .send(dataRequest)
                                                            .then((res) => {
                                                                if(res.body.status === false) {
                                                                    console.log(clc.red(res.body.message));
                                                                    console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                                    getInfoAccount();
                                                                } else {
                                                                    data.push(`akun=${inputEmail};${inputPassword}`);

                                                                    exec(`npm test ${absolutePath} -- --data=${data}`, (error, stdout, stderr) => {
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

                                    exec(`npm test ${absolutePath} -- --data=${data}`, (error, stdout, stderr) => {
                                        if (error) {
                                            console.error(clc.red('❌ Terjadi kesalahan: '), error);
                                        }
                            
                                        console.log(stdout);
                                        console.log(clc.yellow('Eksekusi telah selesai!'));
                                        console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                            
                                        process.exit();
                                    });

                                }

                            }

                            found = true;

                        } else {
                            let fileName = file.split('.')[0];
                            
                            if(input.toLowerCase() === fileName.toLowerCase()) {
                                if(TEST_NEED_AUTHENTICATION.includes(fileName.toLowerCase())) {
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
                                                            .set(paramsRequest.sApp, paramsRequest.sAppToken)
                                                            .send(dataRequest)
                                                            .then((res) => {
                                                                if(res.body.status === false) {
                                                                    console.log(clc.red(res.body.message));
                                                                    console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                                    getInfoAccount();
                                                                } else {
                                                                    data.push(`akun=${inputEmail};${inputPassword}`);
                    
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
                        }
                    });
                }
                getTheListOfFileInputRecursively(testFolder);

            } finally {
                if(!found) {
                    console.log(clc.red('⚠ Maaf, file yang anda masukkan tidak di temukan!'))
                    getTheListOfFileRecursively(testFolder);
                    getInputFileName()
                }
            }
    
        }
    });

}
getInputFileName();