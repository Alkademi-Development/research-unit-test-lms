import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import fs from 'fs';
import path from 'path';
import clc from 'cli-color';
import { TEST_NEED_AUTHENTICATION } from '#root/commons/constants/file';
import { exec } from 'child_process';
import { signIn } from '#root/api/auth-api';
import { printFileTree } from '#root/commons/utils/fileUtils';
import { rl } from '#root/commons/utils/inputUtils';
import { ALL_TEXT_INPUT } from '#root/commons/constants/input';
import { getCustomOptionReportFile } from '#root/commons/utils/inputUtils';

const { questionInputReportFile } = ALL_TEXT_INPUT;

const paramsRequest = {
    sApp: 'S-App-Authorization',
    sAppToken: 'ab89d3a579eaf78207bd6e1f2fa88fb1cf1fce58b161a5f93462ea6cc81497df'
};

/** Start Input File */
const testFolder = './test/';
printFileTree(testFolder)
/** End Input File */

async function getInput() {

    rl.question(clc.bold(questionInputReportFile), inputReportFile => {

        if(inputReportFile.includes(' ')) {
            console.log('Tidak boleh ada spasi!');
            return getInput();
        }

        console.log(`${inputReportFile.trim() === '' ? "\n Baiklah, data report akan di generate by default" : "\n Baiklah, data report akan di sesuaikan dari anda dengan report file " + clc.green("'" + inputReportFile.trim() + "'")}`)
        
        let inputReportCommand = getCustomOptionReportFile(inputReportFile);

        printFileTree(testFolder);
        console.log(clc.bold(`Or you can type 'all' if you want to test all files, and if you want to test nested file just type like this ${clc.yellow("'test/nametest'")}`));

        function getInputFileName() {
            rl.question(`Masukkan input nama file ${clc.bold("(ketik x untuk close)")} : `, (input) => {
            
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
                                    
                                    rl.question(clc.bold('Masukkan akun password: (ketik x untuk close) '), async (inputPassword) => {
        
                                        if(inputPassword.trim() === '') {
                                            console.log(clc.yellowBright('Wajib memasukkan email & password'))
                                            getPassword();
                                        } else if (inputPassword.trim() === "x") {
                                            console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                            rl.close();
                                        } else {
                                            let dataRequest = { email: inputEmail, password: inputPassword };
                                            
                                            const response = await signIn(paramsRequest, dataRequest);

                                            if(response?.body?.status === false) {
                                                console.log(clc.red(String(response?.body?.message).toUpperCase()));
                                                console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                getInfoAccount();
                                            } else {
                                                data.push(`akun=${inputEmail};${inputPassword}`);
                                                
                                                try {
                                                    
                                                    exec(`npm test -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                        if (error) {
                                                            console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                        }
                                    
                                                        console.log(stdout);
                                                        console.log(clc.yellow('Eksekusi telah selesai!'));
                                                        console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                    
                                                        process.exit();
                                                    });
                                    
                                                } catch (error) {
                                                    console.log(error);
                                                    console.log(clc.red(clc.bold('Oops!, Something went wrong')));
                                                    process.exit();
                                                }
                                    
                                            }

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
                            let absolutePath = path.join(testFolderPath);
                            const data = [];
                            
                            files.forEach((file) => {
                                const filePath = path.join(folderPath, file);
                                const statsFolder = fs.statSync(filePath);
                                const isDirectory = statsFolder.isDirectory();
        
                                let filePathMatch = (filePath + '\\' + input.split('/').slice(1).join('\\')).toLowerCase().endsWith(input.toLowerCase().replaceAll('/', '\\'));
                                let filePathJoinInput = filePath + '\\' + input.split('/').slice(1).join('\\').toLowerCase();
                        
                                if (isDirectory && input.includes('/')  && filePathMatch) {
        
                                    if(fs.existsSync(absolutePath)) { // Mengakses default file di parent / dalam folder
        
                                        // Dapatkan terlebih dahulu file yang ingin di running nya apa, tapi karena ini default file maka langsung saja yg di test ini file defaultnya
        
                                        // Mencari file test yang membutuhkan account untuk authentication
                                        let authenticationFound = TEST_NEED_AUTHENTICATION.some((item) =>
                                            input.toLowerCase().includes(item)
                                        );
                                        if(authenticationFound) { // jika ketemu, maka dia harus memasukkan akun untuk authentication
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
                                                            
                                                            rl.question(clc.bold('Masukkan akun password: (ketik x untuk close) '), async (inputPassword) => {
        
                                                                if(inputPassword.trim() === '') {
                                                                    console.log(clc.yellowBright('Wajib memasukkan email & password'))
                                                                    getPassword();
                                                                } else if (inputPassword.trim() === "x") {
                                                                    console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                                                    rl.close();
                                                                } else {
                                                                    let dataRequest = { email: inputEmail, password: inputPassword };

                                                                    const response = await signIn(paramsRequest, dataRequest);
                                                                
                                                                    if(response?.body?.status === false) {
                                                                        console.log(clc.red(response?.body?.message));
                                                                        console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                                        getInfoAccount();
                                                                    } else {
                                                                        data.push(`akun=${inputEmail};${inputPassword}`);
    
                                                                        console.log(`\n ${clc.bgYellow(clc.whiteBright("Program is running in test " + filePathJoinInput))}`);
                                                                        exec(`npm test ${absolutePath} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                            if (error) {
                                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                            }
                                                
                                                                            console.log(stdout);
                                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                
                                                                            process.exit();
                                                                        });
                                                                    }
                                                                }
                                                                
                                                            });
                                                        }
                                                        getPassword();
                                                    }
                                                });
        
                                            }
        
                                            getInfoAccount();
        
                                            found = true;
                                        } else { // Jika tidak maka jalankan tanpa tahap authentication

                                            console.log(`\n ${clc.bgYellow(clc.whiteBright("Program is running in test " + filePathJoinInput))}`);
                                            exec(`npm test ${absolutePath} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                if (error) {
                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                }
                    
                                                console.log(stdout);
                                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                    
                                                process.exit();
                                            });
                                            
                                            found = true;
        
                                        }
                                        
                                    }  else {
        
                                        // Dapatkan terlebih dahulu file yang ingin di running nya apa, jika memang ada maka di run akan tetapi jika tidak ada maka gagal menemukan file
                                        if(fs.existsSync(absolutePath + '.js')) {
                                            
                                            // Mencari file test yang membutuhkan account untuk authentication
                                            let authenticationFound = TEST_NEED_AUTHENTICATION.some((item) =>
                                                input.toLowerCase().includes(item)
                                            );
                                            if(authenticationFound) { // jika ketemu, maka dia harus memasukkan akun untuk authentication
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
                                                                
                                                                rl.question(clc.bold('Masukkan akun password: (ketik x untuk close) '), async (inputPassword) => {
            
                                                                    if(inputPassword.trim() === '') {
                                                                        console.log(clc.yellowBright('Wajib memasukkan email & password'))
                                                                        getPassword();
                                                                    } else if (inputPassword.trim() === "x") {
                                                                        console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                                                        rl.close();
                                                                    } else {
                                                                        let dataRequest = { email: inputEmail, password: inputPassword };
                                                                    
                                                                        const response = await signIn(paramsRequest, dataRequest);
                                                                        
                                                                        if(response?.body?.status === false) {
                                                                            console.log(clc.red(response?.body?.message));
                                                                            console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                                            getInfoAccount();
                                                                        } else {
                                                                            data.push(`akun=${inputEmail};${inputPassword}`);
        
                                                                            console.log(`\n ${clc.bgYellow(clc.whiteBright("Program is running in test " + filePathJoinInput))}`);
                                                                            exec(`npm test ${absolutePath} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                if (error) {
                                                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                                }
                                                    
                                                                                console.log(stdout);
                                                                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                    
                                                                                process.exit();
                                                                            });
                                                                        }
                                                                        
                                                                    }
                                                                    
                                                                });
                                                            }
                                                            getPassword();
                                                        }
                                                    });
            
                                                }
            
                                                getInfoAccount();
            
                                                found = true;
                                            } else { // Jika tidak maka jalankan tanpa tahap authentication
                                                
                                                console.log(`\n ${clc.bgYellow(clc.whiteBright("Program is running in test " + filePathJoinInput))}`);
                                                exec(`npm test ${absolutePath} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                    if (error) {
                                                        console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                    }
                        
                                                    console.log(stdout);
                                                    console.log(clc.yellow('Eksekusi telah selesai!'));
                                                    console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                        
                                                    process.exit();
                                                });
                                                
                                                found = true;
            
                                            }
        
                                        }
        
        
                                    }
                                    
                                    
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
                                                            
                                                            rl.question(clc.bold('Masukkan akun password: (ketik x untuk close) '), async (inputPassword) => {
                
                                                                if(inputPassword.trim() === '') {
                                                                    console.log(clc.yellowBright('Wajib memasukkan email & password'))
                                                                    getPassword();
                                                                } else if (inputPassword.trim() === "x") {
                                                                    console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                                                                    rl.close();
                                                                } else {
                                                                    let dataRequest = { email: inputEmail, password: inputPassword };
                                                                
                                                                    const response = await signIn(paramsRequest, dataRequest);

                                                                    if(response?.body?.status === false) {
                                                                        console.log(clc.red(response?.body?.message));
                                                                        console.log(clc.bgYellow(clc.white('Masukkan akun yang benar dan sesuai!')));
                                                                        getInfoAccount();
                                                                    } else {
                                                                        data.push(`akun=${inputEmail};${inputPassword}`);
                        
                                                                        console.log(`\n ${clc.bgYellow(clc.whiteBright("Program is running in test " + filePathJoinInput))}`);
                                                                        const resultTest = exec(`npm test test/${file} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                            if (error) {
                                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                            }
                                                
                                                                            console.log(stdout);
                                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                
                                                                            process.exit();
                                                                        });
                                                                    }
                                                                }
                                                                
                                                            });
                                                        }
                                                        getPassword();
                                                    }
                                                });
                
                                            }
                
                                            getInfoAccount();
                
                                        } else {
                                            console.log(`\n ${clc.bgYellow(clc.whiteBright("Program is running in test " + filePathJoinInput))}`);
                                            exec(`npm test test/${file} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                if (error) {
                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
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
        
                    } catch(error) {
                        console.log(error);
                        process.exit();
                    } finally {
                        if(!found) {
                            console.log(clc.red('⚠ Maaf, file yang anda masukkan tidak di temukan!'));
                            printFileTree(testFolder);
                            getInputFileName();
                        }
                    }
            
                }
            });
        }
        getInputFileName();


    });


    

}
getInput();

