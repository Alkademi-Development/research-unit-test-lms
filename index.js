import fs from 'fs';
import path from 'path';
import clc from 'cli-color';
import { TEST_NEED_AUTHENTICATION } from '#root/commons/constants/file';
import { exec } from 'child_process';
import '#root/api/app-token';
import { signIn } from '#root/api/auth-api';
import { printFileTree } from '#root/commons/utils/fileUtils';
import { rl } from '#root/commons/utils/inputUtils';
import { ALL_TEXT_INPUT } from '#root/commons/constants/input';
import { getCustomOptionReportFile } from '#root/commons/utils/inputUtils';
import { ROLES } from "#root/commons/constants/role"

const { questionInputReportFile } = ALL_TEXT_INPUT;

/** Start Input File */
const testFolder = './test/';
/** End Input File */

async function getInput() {

    let data = {
        accounts: [],
    };

    rl.question(clc.bold(questionInputReportFile), inputReportFile => {

        if(inputReportFile.includes(' ')) {
            console.log(clc.red('Tidak boleh ada spasi!, tolong masukkan nama nya sesuai format yang di berikan'));
            return getInput();
        } else if(inputReportFile.includes('.')) {
            console.log(clc.red('Tidak boleh ada tanda titik!, tolong masukkan nama nya sesuai format yang di berikan'));
            return getInput();
        }

        printFileTree(testFolder);
        console.log(`${inputReportFile.trim() === '' ? "\n Baiklah, data report akan di generate by default" : "\n Baiklah, data report akan di sesuaikan dari anda dengan report file " + clc.green("'" + inputReportFile.trim() + "'")}`)
        
        let inputReportCommand = getCustomOptionReportFile(inputReportFile);

        printFileTree(testFolder);
        console.log(clc.bold(`Or you can type 'app' if you want to test all files of type tests e.g: app or api, and if you want to test nested file just type like this ${clc.yellow("'test/nametest.js'")}`));

        function getInputFileName() {
            rl.question(`Masukkan input nama file ${clc.bold("(ketik x untuk close)")} : `, (input) => {
            
                if(input.trim() === "") {
                    console.log(clc.red('⚠ Tolong masukkan file test yang sesuai!'))
                    printFileTree(testFolder);
                    getInputFileName();
                } else if(input.trim() === "x") {
                    console.log(clc.green('Terimakasih sudah mencoba tester 😊'))
                    rl.close();
                } else if(input.trim() === "app" || input.trim() === "examples") {
            
                    console.log(clc.yellowBright('=== Silahkan masukkan akun terlebih dahulu untuk mengetes file yang membutuhkan authentication ==='));
        
                    function getInfoAccount() {
                        const testFolderPath = path.join(testFolder, input);
                        let absolutePath = path.join(testFolderPath);
                        
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
                                            const response = await signIn(dataRequest);  
                                            
                                            if(response.ok) {
                                                if(response?.body?.status === false) {
                                                    console.log(clc.red(response?.body?.message));
                                                    getInfoAccount();
                                                } else {
                                                    const { name, email, kind } = response?.body?.data;
                                                    data.accounts.push(`akun=${email};${inputPassword};${name};${kind}`);
                                                    const dataJson = JSON.stringify(data);
                                                    
                                                      function askAccount() {
                                                        rl.question(clc.bold(`Apakah ingin menambahkan akun lagi? (Ketik 't' untuk tidak) `), inputAddAccount => {
                                                          if (inputAddAccount.trim().toLowerCase() === '' || inputAddAccount.trim().toLowerCase() === 't') {
                                                            console.log(`\n${clc.bgYellow(clc.whiteBright(`Program is running in test all ${input} test`))}`);
                                                            exec(`npm test ${absolutePath} -- --data='${dataJson}' --recursive ${inputReportCommand}`, (error, stdout, stderr) => {
                                                              if (error) {
                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                              }
                                                          
                                                              console.log(stdout);
                                                              console.log(clc.yellow('Eksekusi telah selesai!'));
                                                              console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                          
                                                              process.exit();
                                                            });
                                                          } else if (inputAddAccount.trim().toLowerCase() === 'y') {
                                                              if (data.accounts.length < ROLES.length) {
                                                                getInfoAccount();
                                                                askAccount() 
                                                            } else {
                                                                console.log(clc.yellow('\nMaaf, batas memasukkan akun data hanya ' + ROLES.length));
                                                                console.log(`\n${clc.bgYellow(clc.whiteBright(`Program is running in test all ${input} test`))}`);
                                                                exec(`npm test ${absolutePath} -- --data='${dataJson}' --recursive ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                  if (error) {
                                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                    console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                                  }
                                                              
                                                                  console.log(stdout);
                                                                  console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                  console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                              
                                                                  process.exit();
                                                                });
                                                            }
                                                      
                                                          } else {
                                                            console.log(clc.red('Maaf, kami tidak bisa mengerti inputan anda. Tolong ikuti sesuai instruksi'));
                                                            if (data.accounts.length < ROLES.length) {
                                                                askAccount() 
                                                            } else {
                                                                console.log(clc.yellow('\nMaaf, batas memasukkan akun data hanya ' + ROLES.length));
                                                                console.log(`{clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                exec(`npm test ${absolutePath} -- --data='${dataJson}' --recursive ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                  if (error) {
                                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                    console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
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
                                                    askAccount();
                                                    
                                                }
                                            } else {
                                                console.log(clc.red(response?.error));
                                                console.log(clc.yellow(clc.bold('Maaf sepertinya terjadi kesalahan pada server, mohon untuk di tunggu sebentar...')));
                                                process.exit();
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
        
                        async function getTheListOfFileInputRecursively(folderPath) {
                            const testFolderPath = path.join(testFolder, input);
                            let absolutePath = path.join(testFolderPath);

                            if(fs.existsSync(absolutePath)) {

                                if(fs.statSync(absolutePath).isDirectory()) {

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
                                                                const response = await signIn(dataRequest);  
                                                                
                                                                if(response.ok) {
                                                                    if(response?.body?.status === false) {
                                                                        console.log(clc.red(response?.body?.message));
                                                                        getInfoAccount();
                                                                    } else {
                                                                        const { name, email, kind } = response?.body?.data;
                                                                        data.accounts.push(`akun=${email};${inputPassword};${name};${kind}`);
                                                                        const dataJson = JSON.stringify(data);
                                                                        
                                                                        function askAccount() {
                                                                            rl.question(clc.bold(`Apakah ingin menambahkan akun lagi? (Ketik 't' untuk tidak) `), inputAddAccount => {
                                                                                if (inputAddAccount.trim().toLowerCase() === '' || inputAddAccount.trim().toLowerCase() === 't') {
                                                                
                                                                                    // Start //
                                                                                    let isHaveFolder = fs.readdirSync(absolutePath);
                                                                                    isHaveFolder = isHaveFolder.some(item => fs.statSync(path.join(absolutePath, item)).isDirectory());  
                                                                    
                                                                                    if(isHaveFolder) {
                                                                                        rl.question(`${clc.bold('\nDi dalam folder ini memiliki folder test lagi, apakah anda ingin menjalankan test recursive ? ( Ketik Y/N ) ')}`, inputConfirm => {
                                                                    
                                                                                            if(inputConfirm.trim() === '') {
                                                                                                console.log(`${clc.red(clc.bold('Tolong ketik sesuai yg dari instruksi'))}`);
                                                                                                printFileTree(testFolder);
                                                                                            } else if(inputConfirm.trim() != '') {
                                                                                                
                                                                                                if(inputConfirm.trim().toLowerCase() === 'y') {
                                                                                                    console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                                    exec(`npm test ${absolutePath} -- --data=${dataJson} --recursive ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                        if (error) {
                                                                                                            console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                                                        }
                                                                    
                                                                                                        console.log(stdout);
                                                                                                        console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                        console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                        process.exit();
                                                                                                    });
                                                                                                } else {
                                                                                                    console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                                    exec(`npm test ${absolutePath} -- --data=${dataJson} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                        if (error) {
                                                                                                            console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                                                        }
                                                                    
                                                                                                        console.log(stdout);
                                                                                                        console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                        console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                        process.exit();
                                                                                                    });
                                                                                                }
                                                                    
                                                                                            } else {
                                                                                                console.log(`${clc.red(clc.bold('Input yang anda masukkan tidak valid!'))}`);
                                                                                                printFileTree(testFolder);
                                                                                                getInputFileName();
                                                                                            }
                                                                    
                                                                                        })
                                                                                    } else {
                                                                                        
                                                                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                        exec(`npm test ${absolutePath} -- --data=${dataJson} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                            if (error) {
                                                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                                                console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                                                            }
                                                                    
                                                                                            console.log(stdout);
                                                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                            process.exit();
                                                                                        });
                                                                                        
                                                                                    }
                                                                                    // End //
                                                                
                                                                                } else if (inputAddAccount.trim().toLowerCase() === 'y') {
                                                                                    if (data.accounts.length < ROLES.length) {
                                                                                        getInfoAccount();
                                                                                        askAccount() 
                                                                                    } else {
                                                                                        
                                                                                        // Start //
                                                                                        let isHaveFolder = fs.readdirSync(absolutePath);
                                                                                        isHaveFolder = isHaveFolder.some(item => fs.statSync(path.join(absolutePath, item)).isDirectory());  
                                                                    
                                                                                        if(isHaveFolder) {
                                                                                            rl.question(`${clc.bold('\nDi dalam folder ini memiliki folder test lagi, apakah anda ingin menjalankan test recursive ? ( Ketik Y/N ) ')}`, inputConfirm => {
                                                                    
                                                                                                if(inputConfirm.trim() === '') {
                                                                                                    console.log(`${clc.red(clc.bold('Tolong ketik sesuai yg dari instruksi'))}`);
                                                                                                    printFileTree(testFolder);
                                                                                                } else if(inputConfirm.trim() != '') {
                                                                                                    
                                                                                                    if(inputConfirm.trim().toLowerCase() === 'y') {
                                                                                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                                        exec(`npm test ${absolutePath} -- --data=${dataJson} --recursive ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                            if (error) {
                                                                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                                                            }
                                                                    
                                                                                                            console.log(stdout);
                                                                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                            process.exit();
                                                                                                        });
                                                                                                    } else {
                                                                                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                                        exec(`npm test ${absolutePath} -- --data=${dataJson} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                            if (error) {
                                                                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                                                            }
                                                                    
                                                                                                            console.log(stdout);
                                                                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                            process.exit();
                                                                                                        });
                                                                                                    }
                                                                    
                                                                                                } else {
                                                                                                    console.log(`${clc.red(clc.bold('Input yang anda masukkan tidak valid!'))}`);
                                                                                                    printFileTree(testFolder);
                                                                                                    getInputFileName();
                                                                                                }
                                                                    
                                                                                            })
                                                                                        } else {
                                                                                            
                                                                                            console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                            exec(`npm test ${absolutePath} -- --data=${dataJson} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                if (error) {
                                                                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                                                    console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                                                                }
                                                                    
                                                                                                console.log(stdout);
                                                                                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                process.exit();
                                                                                            });
                                                                                            
                                                                                        }
                                                                                        // End //
                                                                    
                                                                                    }
                                                                            
                                                                                } else {
                                                                                    console.log(clc.red('Maaf, kami tidak bisa mengerti inputan anda. Tolong ikuti sesuai instruksi'));
                                                                                    if (data.accounts.length < ROLES.length) {
                                                                                        askAccount() 
                                                                                    } else {
                                                                                        console.log(clc.yellow('\nMaaf, batas memasukkan akun data hanya ' + ROLES.length));
                                                                                        
                                                                                        // Start //
                                                                                        let isHaveFolder = fs.readdirSync(absolutePath);
                                                                                        isHaveFolder = isHaveFolder.some(item => fs.statSync(path.join(absolutePath, item)).isDirectory());  
                                                                    
                                                                                        if(isHaveFolder) {
                                                                                            rl.question(`${clc.bold('\nDi dalam folder ini memiliki folder test lagi, apakah anda ingin menjalankan test recursive ? ( Ketik Y/N ) ')}`, inputConfirm => {
                                                                    
                                                                                                if(inputConfirm.trim() === '') {
                                                                                                    console.log(`${clc.red(clc.bold('Tolong ketik sesuai yg dari instruksi'))}`);
                                                                                                    printFileTree(testFolder);
                                                                                                } else if(inputConfirm.trim() != '') {
                                                                                                    
                                                                                                    if(inputConfirm.trim().toLowerCase() === 'y') {
                                                                                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                                        exec(`npm test ${absolutePath} -- --data=${dataJson} --recursive ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                            if (error) {
                                                                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                                                            }
                                                                    
                                                                                                            console.log(stdout);
                                                                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                            process.exit();
                                                                                                        });
                                                                                                    } else {
                                                                                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                                        exec(`npm test ${absolutePath} -- --data=${dataJson} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                            if (error) {
                                                                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                                                                            }
                                                                    
                                                                                                            console.log(stdout);
                                                                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                            process.exit();
                                                                                                        });
                                                                                                    }
                                                                    
                                                                                                } else {
                                                                                                    console.log(`${clc.red(clc.bold('Input yang anda masukkan tidak valid!'))}`);
                                                                                                    printFileTree(testFolder);
                                                                                                    getInputFileName();
                                                                                                }
                                                                    
                                                                                            })
                                                                                        } else {
                                                                                            
                                                                                            console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                            exec(`npm test ${absolutePath} -- --data=${dataJson} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                                if (error) {
                                                                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                                                    console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                                                                }
                                                                    
                                                                                                console.log(stdout);
                                                                                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                    
                                                                                                process.exit();
                                                                                            });
                                                                                            
                                                                                        }
                                                                                        // End //
                                                                    
                                                                                    }
                                                                                }
                                                                            });
                                                                        }
                                                                        askAccount();
                                                                        
                                                                    }
                                                                } else {
                                                                    console.log(clc.red(response?.error));
                                                                    console.log(clc.yellow(clc.bold('Maaf sepertinya terjadi kesalahan pada server, mohon untuk di tunggu sebentar...')));
                                                                    process.exit();
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

                                        
                                        let isHaveFolder = fs.readdirSync(absolutePath);
                                        isHaveFolder = isHaveFolder.some(item => fs.statSync(path.join(absolutePath, item)).isDirectory());  
                                        
                                        if(isHaveFolder) {
                                            rl.question(`${clc.bold('\nDi dalam folder ini memiliki folder test lagi, apakah anda ingin menjalankan test recursive ? ( Ketik Y/N ) ')}`, inputConfirm => {

                                                if(inputConfirm.trim() === '') {
                                                    console.log(`${clc.red(clc.bold('Tolong ketik sesuai yg dari instruksi'))}`);
                                                    printFileTree(testFolder);
                                                } else if(inputConfirm.trim() != '') {
                                                    
                                                    if(inputConfirm.trim().toLowerCase() === 'y') {
                                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                        exec(`npm test ${absolutePath} -- --data=${data} --recursive ${inputReportCommand}`, (error, stdout, stderr) => {
                                                            if (error) {
                                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error);
                                                            }
                                
                                                            console.log(stdout);
                                                            console.log(clc.yellow('Eksekusi telah selesai!'));
                                                            console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                
                                                            process.exit();
                                                        });
                                                    } else {
                                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
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

                                                } else {
                                                    console.log(`${clc.red(clc.bold('Input yang anda masukkan tidak valid!'))}`);
                                                    printFileTree(testFolder);
                                                    getInputFileName();
                                                }

                                            })
                                        } else {
                                            console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                            exec(`npm test ${absolutePath} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                                if (error) {
                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                    console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                }
                    
                                                console.log(stdout);
                                                console.log(clc.yellow('Eksekusi telah selesai!'));
                                                console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                    
                                                process.exit();
                                            });
                                        }
                                        
                                        found = true;
    
                                    }


                                } else {
                                    
                                    // Mencari file test yang membutuhkan account untuk authentication
                                    let authenticationFound = TEST_NEED_AUTHENTICATION.some((item) =>
                                        input.toLowerCase().includes(item)
                                    );

                                    if(authenticationFound) {
                                        console.log(clc.yellowBright('=== Silahkan masukkan akun terlebih dahulu untuk mengetes file ini ==='));
            
                                        function getInfoAccount() {
                                            
                                            rl.question(clc.bold('Masukkan akun email: (ketik x untuk close) '), async (inputEmail) => {
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
                                                                const response = await signIn(dataRequest);  
                                                                
                                                                if(response.ok) {
                                                                    if(response?.body?.status === false) {
                                                                        console.log(clc.red(response?.body?.message));
                                                                        getInfoAccount();
                                                                    } else {
                                                                        const { name, email, kind } = response?.body?.data;
                                                                        data.accounts.push(`akun=${email};${inputPassword};${name};${kind}`);
                                                                        const dataJson = JSON.stringify(data);
                                                                        
                                                                          function askAccount() {
                                                                            rl.question(clc.bold(`Apakah ingin menambahkan akun lagi? (Ketik 't' untuk tidak) `), inputAddAccount => {
                                                                              if (inputAddAccount.trim().toLowerCase() === '' || inputAddAccount.trim().toLowerCase() === 't') {
                                                                                console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                exec(`npm test ${absolutePath} -- --data='${dataJson}' ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                  if (error) {
                                                                                    console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                                    console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                                                  }
                                                                              
                                                                                  console.log(stdout);
                                                                                  console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                  console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                              
                                                                                  process.exit();
                                                                                });
                                                                              } else if (inputAddAccount.trim().toLowerCase() === 'y') {
                                                                                  if (data.accounts.length < ROLES.length) {
                                                                                    getInfoAccount();
                                                                                    askAccount() 
                                                                                } else {
                                                                                    console.log(clc.yellow('\nMaaf, batas memasukkan akun data hanya ' + ROLES.length));
                                                                                    console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                    exec(`npm test ${absolutePath} -- --data='${dataJson}' ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                      if (error) {
                                                                                        console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                                        console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
                                                                                      }
                                                                                  
                                                                                      console.log(stdout);
                                                                                      console.log(clc.yellow('Eksekusi telah selesai!'));
                                                                                      console.log(clc.green('Terimakasih sudah mencoba tester!, Kamu bisa cek hasil tester nya di reports 😊'));
                                                                                  
                                                                                      process.exit();
                                                                                    });
                                                                                }
                                                                          
                                                                              } else {
                                                                                console.log(clc.red('Maaf, kami tidak bisa mengerti inputan anda. Tolong ikuti sesuai instruksi'));
                                                                                if (data.accounts.length < ROLES.length) {
                                                                                    askAccount() 
                                                                                } else {
                                                                                    console.log(clc.yellow('\nMaaf, batas memasukkan akun data hanya ' + ROLES.length));
                                                                                    console.log(`{clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                                                                    exec(`npm test ${absolutePath} -- --data='${dataJson}' ${inputReportCommand}`, (error, stdout, stderr) => {
                                                                                      if (error) {
                                                                                        console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                                                        console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
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
                                                                        askAccount();
                                                                        
                                                                    }
                                                                } else {
                                                                    console.log(clc.red(response?.error));
                                                                    console.log(clc.yellow(clc.bold('Maaf sepertinya terjadi kesalahan pada server, mohon untuk di tunggu sebentar...')));
                                                                    process.exit();
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
                                        
                                    } else {
                                        console.log(`\n${clc.bgYellow(clc.whiteBright("Program is running in test " + absolutePath))}`);
                                        exec(`npm test ${absolutePath} -- --data=${data} ${inputReportCommand}`, (error, stdout, stderr) => {
                                            if (error) {
                                                console.error(clc.red('\n ❌ Terjadi kesalahan: '), error.stack);
                                                console.error(clc.red('Pesan kesalahan tambahan:'), stderr);
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

