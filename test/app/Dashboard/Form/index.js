import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities, Select, locateWith } from 'selenium-webdriver';
import addContext from 'mochawesome/addContext.js';
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { fileURLToPath } from 'url';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';
import moment from 'moment-timezone';
import { faker } from '@faker-js/faker';
import { QUESTIONS } from '#root/commons/constants/form';

/**
 * Get the user data for authentication
 */

const users = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}/`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}/`);
}

describe("Schedule", () => {
    let customMessages = [];

    after(async function () {
        console.log(`${' '.repeat(4)}Screenshoots test berhasil di buat, berada di folder: ${screenshootFilePath} `);
    });

    afterEach(async function () {
        fs.mkdir(screenshootFilePath, { recursive: true }, (error) => {
            if (error) {
                console.error(`Terjadi kesalahan dalam membuat folder screenshoot:`, error);
            }
        });
        let fileNamePath = path.resolve(`${screenshootFilePath}/${this.currentTest?.state != 'failed' ? (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[passed]' : (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[failed]' }.png`);
        await takeScreenshot(driver, fileNamePath);
        if(this.currentTest.isPassed) {
            addContext(this, {
                title: 'Expected Results',
                value: customMessages?.length > 0 ? "- " + customMessages?.map(msg => msg.trim()).join("\n- ") : 'No Results'
            })
        } else if (this.currentTest.isFailed) {
            addContext(this, {
                title: 'Status Test',
                value: 'Failed ❌'
            })
        }

        // Performances Information
        const performanceTiming = await driver.executeScript('return window.performance.timing');
        const navigationStart = performanceTiming.navigationStart;
        addContext(this, {
            title: 'Performance Results',
            value: `${moment().tz('Asia/Jakarta').format('dddd, MMMM D, YYYY h:mm:ss A')}
(Durasi waktu navigasi: ${navigationStart % 60} seconds)     
=====================================================================
Waktu Permintaan Pertama (fetchStart): (${performanceTiming.fetchStart - navigationStart}) milliseconds ( ${(performanceTiming.fetchStart - navigationStart) / 1000} seconds )
Waktu Pencarian Nama Domain Dimulai (domainLookupStart): (${performanceTiming.domainLookupStart - navigationStart}) milliseconds ( ${((performanceTiming.domainLookupStart - navigationStart) / 1000)} seconds )
Waktu Pencarian Nama Domain Selesai (domainLookupEnd): (${performanceTiming.domainLookupEnd - navigationStart}) milliseconds ( ${((performanceTiming.domainLookupEnd - navigationStart) / 1000)} seconds )
Waktu Permintaan Dimulai (requestStart): (${performanceTiming.requestStart - navigationStart}) milliseconds ( ${((performanceTiming.requestStart - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Respons Dimulai (responseStart): (${performanceTiming.responseStart - navigationStart}) milliseconds ( ${((performanceTiming.responseStart - navigationStart) / 1000)} seconds )
Waktu Respons Selesai (responseEnd): (${performanceTiming.responseEnd - navigationStart}) milliseconds ( ${((performanceTiming.responseEnd - navigationStart) / 1000)} seconds )
Waktu Memuat Dokumen (domLoading): (${performanceTiming.domLoading - navigationStart}) milliseconds ( ${((performanceTiming.domLoading - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Event Unload Dimulai (unloadEventStart): (${performanceTiming.unloadEventStart - navigationStart}) milliseconds ( ${((performanceTiming.unloadEventStart - navigationStart) / 1000)} seconds )
Waktu Event Unload Selesai (unloadEventEnd): (${performanceTiming.unloadEventEnd - navigationStart}) milliseconds ( ${((performanceTiming.unloadEventEnd - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Interaktif DOM (domInteractive): (${performanceTiming.domInteractive - navigationStart}) milliseconds ( ${((performanceTiming.domInteractive - navigationStart) / 1000)} seconds )
Waktu Event DOMContentLoaded Dimulai (domContentLoadedEventStart): (${performanceTiming.domContentLoadedEventStart - navigationStart}) milliseconds ( ${((performanceTiming.domContentLoadedEventStart - navigationStart) / 1000)} seconds )
Waktu Event DOMContentLoaded Selesai (domContentLoadedEventEnd): (${performanceTiming.domContentLoadedEventEnd - navigationStart}) milliseconds ( ${((performanceTiming.domContentLoadedEventEnd - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Dokumen Selesai Dimuat (domComplete): (${performanceTiming.domComplete - navigationStart}) milliseconds ( ${((performanceTiming.domComplete - navigationStart) / 1000)} seconds )
Waktu Event Load Dimulai (loadEventStart): (${performanceTiming.loadEventStart - navigationStart}) milliseconds ( ${((performanceTiming.loadEventStart - navigationStart) / 1000)} seconds )
=====================================================================
(timestamp loadEventEnd: ${performanceTiming.loadEventEnd})
Waktu Event Load Selesai (loadEventEnd): (${performanceTiming.loadEventEnd - navigationStart}) milliseconds ( ${((performanceTiming.loadEventEnd - navigationStart) / 1000)} seconds )
            `
        })

        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: path.relative(fileURLToPath(import.meta.url), fileNamePath),
        });
        await driver.sleep(3000);
        try {
            await driver.close();
            await driver.quit();
        } catch (error) {
            console.error('Error occurred while quitting the driver:', error);
        }
    })

    BROWSERS.forEach(browser => {

        users.forEach(userData => {

            const data = userData?.split('=');
            const userAccount = data[1].split(';');
            const email = userAccount[0];
            const password = userAccount[1];
            const name = userAccount[2];
            const kind = parseInt(userAccount[3]);

            let user = { name, email, password, kind };

            switch (user.kind) {
                case 0:
                    it(`SUPER ADMIN - Create a Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Aksi mengecek form yang sudah ada dan mengambil data dummy dari form yang sudah tersedia
                            let titlesForm = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td span.status")).map(v => v.innerText.toLowerCase())`)
                            let form = QUESTIONS.find(value => {
                                return titlesForm.every(v => !v.includes(value.title.toLowerCase()))
                            }) || null;

                            // Aksi menekan tombol '+ Formulir'
                            await driver.findElement(By.css(".main-content .btn-primary")).click();
                            
                            // Aksi Sleep
                            await driver.sleep(10000)
                            
                            // Aksi berpindah ke halaman new tab baru
                            let windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[windows.length - 1]);
                            await driver.sleep(3000);
                            
                            // Aksi mengisi form formulir
                            /** Dummy Data **/
                            let limitTime = form?.limitTime || faker.number.int({ min: 3, max: 10 });
                            let formStats = form?.formStats || faker.datatype.boolean()
                            let title = form?.title || faker.lorem.words()
                            let description = form?.description || faker.lorem.sentence()
                            let formType = form?.formType || faker.helpers.arrayElement(['basic', 'quiz'])
                            let isNotifEmail = form?.isNotifyEmail || faker.datatype.boolean()
                            let emailNotif = form?.emailNotif || 'adnanerlansyah505@gmail.com'
                            let questions = form?.questions || [];
                            let maxQuestion = form?.maxQuestion || faker.number.int({ min: 3, max: 5 });
                            /** Input mengisi waktu menit di form */
                            let labelMinute = await driver.findElement(By.css("label[for='input-minute']"));
                            let actions = driver.actions({async: true});
                            await actions.move({origin: labelMinute}).perform();
                            await driver.sleep(2000);
                            let inputMinute = await driver.findElement(By.css("input#input-minute"));
                            await inputMinute.sendKeys(limitTime);
                            await driver.sleep(2000);
                            /** Aksi mengisi status formulir apakah tertutup atau terbuka */
                            await driver.executeScript(`return document.querySelector("#create button.btn-secondary").click()`);
                            await driver.sleep(2000);
                            if(formStats) await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("terbuka")).click();`)
                            else await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("tertutup")).click()`)
                            await driver.sleep(2000);
                            /** Aksi mengisi title */
                            for (let index = 0; index < 40; index++) {
                                await driver.findElement(By.css("input.input-title")).sendKeys(Key.BACK_SPACE)
                                await driver.sleep(100);
                            }
                            await driver.findElement(By.css("input.input-title")).sendKeys(title)
                            await driver.sleep(2000);
                            /** Aksi mengisi description */
                            await driver.findElement(By.css("textarea.input-description")).sendKeys(description);
                            await driver.sleep(2000);
                            /** Aksi memilih salah satu tipe form apakah basic atau quiz */
                            if(formType == 'quiz') {
                                await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("basic")).click()`)
                                await driver.sleep(1000);
                                await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("quiz")).click();`)
                                await driver.sleep(1000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                                await driver.sleep(2000);
                            }
                            /** Aksi konfirmasi notifikasi email soal */
                            if(isNotifEmail) {
                                await driver.executeScript(`return document.querySelector(".send-email").click()`)
                                await driver.findElement(By.id("emailTo")).sendKeys(emailNotif)
                                await driver.sleep(2000);
                                await driver.findElement(By.id("emailTo")).sendKeys(Key.ENTER);
                                await driver.sleep(1000);
                            }
                            /** Aksi mengisi question */
                            if(formType == 'basic') {
                                for (let index = 0; index < maxQuestion - 1; index++) {
                                    if(questions.length == 0) {
                                        questions.push({
                                            question: faker.lorem.words(),
                                            required: faker.datatype.boolean()
                                        })
                                    }
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].sendKeys(questions[index].question);
                                    await driver.sleep(2000);
                                    /** Aksi mengonfirmasi apakah pertanyaan nya wajib di isi atau tidak */
                                    let btnRequires = await driver.executeScript(`return Array.from(document.querySelectorAll(".action .btn-light")).filter(v => v.innerText.toLowerCase().includes("wajib"))`);
                                    if(questions[index].required) await driver.executeScript(`return arguments[0].click()`, await btnRequires[index]);
                                    await driver.sleep(2000);
                                    /** Aksi tambah pertanyaaan */
                                    if(index != maxQuestion - 2) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`)
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                                }
                            } else {
                                for (let index = 0; index <= questions?.length - 1; index++) {
                                    if(questions?.length == 0) {
                                        questions?.push({
                                            question: faker.lorem.words(),
                                            required: faker.datatype.boolean(),
                                            options: [
                                              {
                                                value: 'TRUE',
                                                isCorrect: true,
                                              },
                                              {
                                                value: 'FALSE',
                                                isCorrect: false,
                                              },
                                            ]
                                        });
                                    }
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].sendKeys(questions[index]?.question);
                                    await driver.sleep(1000);
                                    /** Aksi mengisi options pilihan jawaban */
                                    let cards = await driver.executeScript(`return document.querySelectorAll(".card.add-wrapper")`);
                                    
                                    // Mengeksekusi perulangan terpisah untuk opsi
                                    for (let idx = 0; idx <= questions[index].options.length - 1; idx++) {
                                        let inputOptions = await cards[index].findElements(By.css(".option input[type=text]"))
                                        await inputOptions[idx].clear()
                                        await driver.sleep(1000);
                                        await inputOptions[idx].sendKeys(questions[index].options[idx].value)
                                        await driver.sleep(1000);
                                        if(questions[index].options[idx].isCorrect) {
                                            let btnChecks = await driver.executeScript(`return arguments[0].querySelectorAll(".option button.dropdown-toggle")`, await cards[index]);
                                            await driver.executeScript(`return arguments[0].scrollIntoView()`, await btnChecks[idx]);
                                            await driver.sleep(1000);
                                            await btnChecks[idx].click();
                                            await driver.sleep(1000);
                                        }
                                        if(idx != questions[index].options.length - 1) await driver.executeScript(`return document.querySelectorAll(".option .btn-new-option")[${index}].click()`);
                                        await driver.sleep(2000);
                                    }                                      
                                    /** Aksi tambah pertanyaan */
                                    if (index != questions.length - 1) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`);
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                                }
                            }
                            
                            // Aksi Sleep
                            await driver.sleep(3000);
                            
                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css("input.input-title")).getAttribute('value'),
                                await driver.findElement(By.css("textarea.input-description")).getAttribute('value'),
                                await driver.findElement(By.id("input-question")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));
                            
                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector(".next-button .btn-primary").click()`)
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                            }
                            
                            // Aksi Sleep
                            await driver.sleep(3000)
                            
                            // Aksi pindah ke halaman utama
                            windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[0]);
                            await driver.sleep(2000);

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await windows.length - 1 == 0 && isAllFilled ? 'Successfully created a new form ✅' : 'Failed to create a new form ❌'
                            ]
                            expect(await windows.length).to.be.equal(1);
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Edit the Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Aksi memilih salah satu form untuk di edit
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-warning").click()`)

                            // Aksi Sleep
                            await driver.sleep(10000)

                            // Aksi berpindah ke halaman new tab baru
                            let windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[windows.length - 1]);
                            await driver.sleep(3000);

                            // console.log(await driver.getCurrentUrl())

                            // Aksi mengisi form formulir
                            /** Dummy Data **/
                            let limitTime = faker.number.int({ min: 3, max: 10 });
                            let formStats = faker.datatype.boolean()
                            let title = faker.lorem.words()
                            let description = faker.lorem.sentence()
                            let formType = await driver.executeScript(`return document.querySelectorAll(".card.form button.btn-secondary")[document.querySelectorAll(".card.form button.btn-secondary").length - 1].innerText.toLowerCase()`)
                            let isNotifEmail = faker.datatype.boolean()
                            let emailNotif = 'adnanerlansyah505@gmail.com'
                            let questions = [];
                            // let maxQuestion = faker.number.int({ min: 3, max: 5 });
                            /** Input mengisi waktu menit di form */
                            // let labelMinute = await driver.findElement(By.css("label[for='input-minute']"));
                            // let actions = driver.actions({async: true});
                            // await actions.move({origin: labelMinute}).perform();
                            // await driver.sleep(2000);
                            // let inputMinute = await driver.findElement(By.css("input#input-minute"));
                            // await inputMinute.sendKeys(limitTime);
                            // await driver.sleep(2000);
                            /** Aksi mengisi status formulir apakah tertutup atau terbuka */
                            await driver.executeScript(`return document.querySelector("#create button.btn-secondary").click()`);
                            await driver.sleep(2000);
                            if(formStats) await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("terbuka")).click();`)
                            else await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("tertutup")).click()`)
                            await driver.sleep(2000);
                            /** Aksi mengisi title */
                            for (let index = 0; index < 30; index++) {
                                await driver.findElement(By.css("input.input-title")).sendKeys(Key.BACK_SPACE)
                                await driver.sleep(50);
                            }
                            await driver.findElement(By.css("input.input-title")).sendKeys(title)
                            await driver.sleep(2000);
                            /** Aksi mengisi description */
                            await driver.findElement(By.css("textarea.input-description")).clear()
                            await driver.sleep(1000);
                            await driver.findElement(By.css("textarea.input-description")).sendKeys(description);
                            await driver.sleep(2000);
                            /** Aksi memilih salah satu tipe form apakah basic atau quiz */
                            // if(formType == 'quiz') {
                            //     await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("basic")).click()`)
                            //     await driver.sleep(1000);
                            //     await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("quiz")).click();`)
                            //     await driver.sleep(1000);
                            //     await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                            //     await driver.sleep(1000);
                            // }
                            /** Aksi konfirmasi notifikasi email soal */
                            // if(isNotifEmail) {
                            //     await driver.executeScript(`return document.querySelector(".send-email").click()`)
                            //     await driver.findElement(By.id("emailTo")).sendKeys(emailNotif)
                            //     await driver.sleep(2000);
                            //     await driver.findElement(By.id("emailTo")).sendKeys(Key.ENTER);
                            //     await driver.sleep(1000);
                            // }
                            /** Aksi mengisi question */
                            let cards = await driver.executeScript(`return document.querySelectorAll(".card.add-wrapper")`);
                            if(formType == 'basic') {
                                for (let index = 0; index <= await cards.length - 1; index++) {
                                    questions.push({
                                        question: faker.lorem.words(),
                                        required: faker.datatype.boolean()
                                    })
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].clear();
                                    await driver.sleep(1000);
                                    await inputQuestions[index].sendKeys(questions[index].question);
                                    await driver.sleep(1000);
                                    /** Aksi mengonfirmasi apakah pertanyaan nya wajib di isi atau tidak */
                                    // let btnRequires = await driver.executeScript(`return Array.from(document.querySelectorAll(".action .btn-light")).filter(v => v.innerText.toLowerCase().includes("wajib"))`);
                                    // if(questions[index].required) await driver.executeScript(`return arguments[0].click()`, await btnRequires[index]);
                                    // await driver.sleep(2000);
                                    /** Aksi tambah pertanyaaan */
                                    // if(index != await cards.length - 1) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`)
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                                    await driver.sleep(2000);
                                }
                                 
                            } else {
                                for (let index = 0; index <= await cards.length - 1; index++) {
                                    questions.push({
                                      question: faker.lorem.words(),
                                      required: faker.datatype.boolean(),
                                    });
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].clear()
                                    await driver.sleep(1000);
                                    await inputQuestions[index].sendKeys(questions[index].question);
                                    await driver.sleep(1000);
                                    /** Aksi mengisi options pilihan jawaban */
                                    // Mengeksekusi perulangan terpisah untuk opsi
                                    // for (let idx = 0; idx <= questions[index].options.length - 1; idx++) {
                                    //     let inputOptions = await cards[index].findElements(By.css(".option input[type=text]"))
                                    //     await inputOptions[idx].clear()
                                    //     await driver.sleep(1000);
                                    //     await inputOptions[idx].sendKeys(questions[index].options[idx].value)
                                    //     await driver.sleep(1000);
                                    //     if(questions[index].options[idx].isCorrect) {
                                    //         let btnChecks = await driver.executeScript(`return arguments[0].querySelectorAll(".option button.dropdown-toggle")`, await cards[index]);
                                    //         await driver.executeScript(`return arguments[0].scrollIntoView()`, await btnChecks[idx]);
                                    //         await driver.sleep(1000);
                                    //         await btnChecks[idx].click();
                                    //         await driver.sleep(1000);
                                    //     }
                                    //     if(idx != questions[index].options.length - 1) await driver.executeScript(`return document.querySelectorAll(".option .btn-new-option")[${index}].click()`);
                                    //     await driver.sleep(2000);
                                    // }                                      
                                    /** Aksi tambah pertanyaan */
                                    // if (index != await cards.length - 1) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`);
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                                }
                                 
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css("input.input-title")).getAttribute('value'),
                                await driver.findElement(By.css("textarea.input-description")).getAttribute('value'),
                                // await driver.findElement(By.id("input-question")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector(".next-button .btn-primary").click()`)
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi pindah ke halaman utama
                            windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[0]);
                            await driver.sleep(2000);

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await windows.length - 1 == 0 && isAllFilled ? 'Successfully created a new form ✅' : 'Failed to create a new form ❌'
                            ]
                            expect(await windows.length).to.be.equal(1);
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check the pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await pages.length > 1 || (await rows.length < 10 && await pages.length == 1) ? `- Successfully pagination displayed ✅` : `Pagination wasn't displayed ❌`
                            ]
                            expect(await pages.length > 1 || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check the next page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let isNextPage = true;
                            if(await pages?.length > 0) {
                                let numbersOne = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)

                                let numbersTwo = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)

                                for (let i = 0; i < numbersOne.length; i++) {
                                    if (numbersTwo[i] != numbersOne[i] + 10 && numbersTwo[i] != undefined) {
                                        isNextPage = false;
                                        break;
                                    }
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isNextPage || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the next data of pagination ✅` : `Failed to displays the next data of pagination ❌`
                            ];
                            expect(isNextPage || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check the last page number of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let pagePrevious = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            await driver.executeScript
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("»")).click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentPagePrevious = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText)).map(num => parseInt(num.toString()[0]))`);
                            pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText)).map(page => Number(page.innerText)).map(num => parseInt(num.toString()[0]))`);
                            let pageSame = await rows.every(digit => digit === pages[0]);
                            customMessages = [
                                (await pagePrevious != await currentPagePrevious && pageSame) || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect((await pageSame && await pagePrevious != await currentPagePrevious) || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Choose a page number of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let randomIndexPage = faker.number.int({ min: 0, max: await pages.length - 1 });
                            let selectedPage = await pages[randomIndexPage];
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return arguments[0].click()`, await pages[randomIndexPage])
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description

                            customMessages = [
                                await selectedPage != null || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the next data of pagination ✅` : `Failed to displays the next data of pagination ❌`
                            ];
                            expect(await selectedPage != null || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check the previous page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            await driver.executeScript
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);

                                // Aksi klik button prev page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("‹")).click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentRows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            let rowSame = await rows.every((digit, index) => digit === currentRows[index]);
                            customMessages = [
                                await rowSame || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect(await rowSame || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check the first page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`);
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);

                                // Aksi klik button first page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("«")).click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentRows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            let rowSame = await rows.every((digit, index) => digit === currentRows[index]);
                            let activeRow = await driver.executeScript(`return Number(document.querySelector("ul.pagination li.page-item.active").innerText)`)
                            customMessages = [
                                (await rowSame && activeRow == 1) || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect((await rowSame && activeRow == 1) || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Delete the Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi memilih salah satu program untuk di hapus
                            let tableBody = await driver.executeScript(`return document.querySelector("table tbody").innerHTML`)
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-danger").click()`)
                            await driver.sleep(2000);
                            let modalFooter = await driver.executeScript(`return document.querySelector(".modal-footer") ? document.querySelector(".modal-footer") : null`);
                            if(await modalFooter?.isDisplayed()) {
                                await driver.executeScript(`return document.querySelector(".modal-footer .btn-danger").click();`);
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let newTableBody = await driver.executeScript(`return document.querySelector("table tbody").innerHTML`)
                            customMessages = [
                                await tableBody != await newTableBody ? '- Successfully deleted the blog ✅' : '- Failed to delete the blog ❌'
                            ];
                            expect(await tableBody != await newTableBody).to.be.true;
                            

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 1:
                    it(`ADMIN - Create a Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Aksi mengecek form yang sudah ada dan mengambil data dummy dari form yang sudah tersedia
                            let titlesForm = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td span.status")).map(v => v.innerText.toLowerCase())`)
                            let form = QUESTIONS.find(value => {
                                return titlesForm.every(v => !v.includes(value.title.toLowerCase()))
                            }) || null;

                            // Aksi menekan tombol '+ Formulir'
                            await driver.findElement(By.css(".main-content .btn-primary")).click();
                            
                            // Aksi Sleep
                            await driver.sleep(10000)
                            
                            // Aksi berpindah ke halaman new tab baru
                            let windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[windows.length - 1]);
                            await driver.sleep(3000);
                            
                            // Aksi mengisi form formulir
                            /** Dummy Data **/
                            let limitTime = form?.limitTime || faker.number.int({ min: 3, max: 10 });
                            let formStats = form?.formStats || faker.datatype.boolean()
                            let title = form?.title || faker.lorem.words()
                            let description = form?.description || faker.lorem.sentence()
                            let formType = form?.formType || faker.helpers.arrayElement(['basic', 'quiz'])
                            let isNotifEmail = form?.isNotifyEmail || faker.datatype.boolean()
                            let emailNotif = form?.emailNotif || 'adnanerlansyah505@gmail.com'
                            let questions = form?.questions || [];
                            let maxQuestion = form?.maxQuestion || faker.number.int({ min: 3, max: 5 });
                            /** Input mengisi waktu menit di form */
                            let labelMinute = await driver.findElement(By.css("label[for='input-minute']"));
                            let actions = driver.actions({async: true});
                            await actions.move({origin: labelMinute}).perform();
                            await driver.sleep(2000);
                            let inputMinute = await driver.findElement(By.css("input#input-minute"));
                            await inputMinute.sendKeys(limitTime);
                            await driver.sleep(2000);
                            /** Aksi mengisi status formulir apakah tertutup atau terbuka */
                            await driver.executeScript(`return document.querySelector("#create button.btn-secondary").click()`);
                            await driver.sleep(2000);
                            if(formStats) await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("terbuka")).click();`)
                            else await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("tertutup")).click()`)
                            await driver.sleep(2000);
                            /** Aksi mengisi title */
                            for (let index = 0; index < 40; index++) {
                                await driver.findElement(By.css("input.input-title")).sendKeys(Key.BACK_SPACE)
                                await driver.sleep(100);
                            }
                            await driver.findElement(By.css("input.input-title")).sendKeys(title)
                            await driver.sleep(2000);
                            /** Aksi mengisi description */
                            await driver.findElement(By.css("textarea.input-description")).sendKeys(description);
                            await driver.sleep(2000);
                            /** Aksi memilih salah satu tipe form apakah basic atau quiz */
                            if(formType == 'quiz') {
                                await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("basic")).click()`)
                                await driver.sleep(1000);
                                await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("quiz")).click();`)
                                await driver.sleep(1000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                                await driver.sleep(2000);
                            }
                            /** Aksi konfirmasi notifikasi email soal */
                            if(isNotifEmail) {
                                await driver.executeScript(`return document.querySelector(".send-email").click()`)
                                await driver.findElement(By.id("emailTo")).sendKeys(emailNotif)
                                await driver.sleep(2000);
                                await driver.findElement(By.id("emailTo")).sendKeys(Key.ENTER);
                                await driver.sleep(1000);
                            }
                            /** Aksi mengisi question */
                            if(formType == 'basic') {
                                for (let index = 0; index < maxQuestion - 1; index++) {
                                    if(questions.length == 0) {
                                        questions.push({
                                            question: faker.lorem.words(),
                                            required: faker.datatype.boolean()
                                        })
                                    }
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].sendKeys(questions[index].question);
                                    await driver.sleep(2000);
                                    /** Aksi mengonfirmasi apakah pertanyaan nya wajib di isi atau tidak */
                                    let btnRequires = await driver.executeScript(`return Array.from(document.querySelectorAll(".action .btn-light")).filter(v => v.innerText.toLowerCase().includes("wajib"))`);
                                    if(questions[index].required) await driver.executeScript(`return arguments[0].click()`, await btnRequires[index]);
                                    await driver.sleep(2000);
                                    /** Aksi tambah pertanyaaan */
                                    if(index != maxQuestion - 2) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`)
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                                }
                            } else {
                                for (let index = 0; index <= questions?.length - 1; index++) {
                                    if(questions?.length == 0) {
                                        questions?.push({
                                            question: faker.lorem.words(),
                                            required: faker.datatype.boolean(),
                                            options: [
                                              {
                                                value: 'TRUE',
                                                isCorrect: true,
                                              },
                                              {
                                                value: 'FALSE',
                                                isCorrect: false,
                                              },
                                            ]
                                        });
                                    }
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].sendKeys(questions[index]?.question);
                                    await driver.sleep(1000);
                                    /** Aksi mengisi options pilihan jawaban */
                                    let cards = await driver.executeScript(`return document.querySelectorAll(".card.add-wrapper")`);
                                    
                                    // Mengeksekusi perulangan terpisah untuk opsi
                                    for (let idx = 0; idx <= questions[index].options.length - 1; idx++) {
                                        let inputOptions = await cards[index].findElements(By.css(".option input[type=text]"))
                                        await inputOptions[idx].clear()
                                        await driver.sleep(1000);
                                        await inputOptions[idx].sendKeys(questions[index].options[idx].value)
                                        await driver.sleep(1000);
                                        if(questions[index].options[idx].isCorrect) {
                                            let btnChecks = await driver.executeScript(`return arguments[0].querySelectorAll(".option button.dropdown-toggle")`, await cards[index]);
                                            await driver.executeScript(`return arguments[0].scrollIntoView()`, await btnChecks[idx]);
                                            await driver.sleep(1000);
                                            await btnChecks[idx].click();
                                            await driver.sleep(1000);
                                        }
                                        if(idx != questions[index].options.length - 1) await driver.executeScript(`return document.querySelectorAll(".option .btn-new-option")[${index}].click()`);
                                        await driver.sleep(2000);
                                    }                                      
                                    /** Aksi tambah pertanyaan */
                                    if (index != questions.length - 1) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`);
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                                }
                            }
                            
                            // Aksi Sleep
                            await driver.sleep(3000);
                            
                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css("input.input-title")).getAttribute('value'),
                                await driver.findElement(By.css("textarea.input-description")).getAttribute('value'),
                                await driver.findElement(By.id("input-question")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));
                            
                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector(".next-button .btn-primary").click()`)
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                            }
                            
                            // Aksi Sleep
                            await driver.sleep(3000)
                            
                            // Aksi pindah ke halaman utama
                            windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[0]);
                            await driver.sleep(2000);

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await windows.length - 1 == 0 && isAllFilled ? 'Successfully created a new form ✅' : 'Failed to create a new form ❌'
                            ]
                            expect(await windows.length).to.be.equal(1);
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Edit the Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Aksi memilih salah satu form untuk di edit
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-warning").click()`)

                            // Aksi Sleep
                            await driver.sleep(10000)

                            // Aksi berpindah ke halaman new tab baru
                            let windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[windows.length - 1]);
                            await driver.sleep(3000);

                            // console.log(await driver.getCurrentUrl())

                            // Aksi mengisi form formulir
                            /** Dummy Data **/
                            let limitTime = faker.number.int({ min: 3, max: 10 });
                            let formStats = faker.datatype.boolean()
                            let title = faker.lorem.words()
                            let description = faker.lorem.sentence()
                            let formType = await driver.executeScript(`return document.querySelectorAll(".card.form button.btn-secondary")[document.querySelectorAll(".card.form button.btn-secondary").length - 1].innerText.toLowerCase()`)
                            let isNotifEmail = faker.datatype.boolean()
                            let emailNotif = 'adnanerlansyah505@gmail.com'
                            let questions = [];
                            // let maxQuestion = faker.number.int({ min: 3, max: 5 });
                            /** Input mengisi waktu menit di form */
                            // let labelMinute = await driver.findElement(By.css("label[for='input-minute']"));
                            // let actions = driver.actions({async: true});
                            // await actions.move({origin: labelMinute}).perform();
                            // await driver.sleep(2000);
                            // let inputMinute = await driver.findElement(By.css("input#input-minute"));
                            // await inputMinute.sendKeys(limitTime);
                            // await driver.sleep(2000);
                            /** Aksi mengisi status formulir apakah tertutup atau terbuka */
                            await driver.executeScript(`return document.querySelector("#create button.btn-secondary").click()`);
                            await driver.sleep(2000);
                            if(formStats) await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("terbuka")).click();`)
                            else await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("tertutup")).click()`)
                            await driver.sleep(2000);
                            /** Aksi mengisi title */
                            for (let index = 0; index < 30; index++) {
                                await driver.findElement(By.css("input.input-title")).sendKeys(Key.BACK_SPACE)
                                await driver.sleep(50);
                            }
                            await driver.findElement(By.css("input.input-title")).sendKeys(title)
                            await driver.sleep(2000);
                            /** Aksi mengisi description */
                            await driver.findElement(By.css("textarea.input-description")).clear()
                            await driver.sleep(1000);
                            await driver.findElement(By.css("textarea.input-description")).sendKeys(description);
                            await driver.sleep(2000);
                            /** Aksi memilih salah satu tipe form apakah basic atau quiz */
                            // if(formType == 'quiz') {
                            //     await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("basic")).click()`)
                            //     await driver.sleep(1000);
                            //     await driver.executeScript(`return Array.from(document.querySelectorAll(".dropdown-menu.show .dropdown-item")).find(v => v.innerText.toLowerCase().includes("quiz")).click();`)
                            //     await driver.sleep(1000);
                            //     await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                            //     await driver.sleep(1000);
                            // }
                            /** Aksi konfirmasi notifikasi email soal */
                            // if(isNotifEmail) {
                            //     await driver.executeScript(`return document.querySelector(".send-email").click()`)
                            //     await driver.findElement(By.id("emailTo")).sendKeys(emailNotif)
                            //     await driver.sleep(2000);
                            //     await driver.findElement(By.id("emailTo")).sendKeys(Key.ENTER);
                            //     await driver.sleep(1000);
                            // }
                            /** Aksi mengisi question */
                            let cards = await driver.executeScript(`return document.querySelectorAll(".card.add-wrapper")`);
                            if(formType == 'basic') {
                                for (let index = 0; index <= await cards.length - 1; index++) {
                                    questions.push({
                                        question: faker.lorem.words(),
                                        required: faker.datatype.boolean()
                                    })
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].clear();
                                    await driver.sleep(1000);
                                    await inputQuestions[index].sendKeys(questions[index].question);
                                    await driver.sleep(1000);
                                    /** Aksi mengonfirmasi apakah pertanyaan nya wajib di isi atau tidak */
                                    // let btnRequires = await driver.executeScript(`return Array.from(document.querySelectorAll(".action .btn-light")).filter(v => v.innerText.toLowerCase().includes("wajib"))`);
                                    // if(questions[index].required) await driver.executeScript(`return arguments[0].click()`, await btnRequires[index]);
                                    // await driver.sleep(2000);
                                    /** Aksi tambah pertanyaaan */
                                    // if(index != await cards.length - 1) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`)
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                                    await driver.sleep(2000);
                                }
                                 
                            } else {
                                for (let index = 0; index <= await cards.length - 1; index++) {
                                    questions.push({
                                      question: faker.lorem.words(),
                                      required: faker.datatype.boolean(),
                                    });
                                    /** Aksi mengisi input question */
                                    let inputQuestions = await driver.findElements(By.id("input-question"));
                                    await inputQuestions[index].clear()
                                    await driver.sleep(1000);
                                    await inputQuestions[index].sendKeys(questions[index].question);
                                    await driver.sleep(1000);
                                    /** Aksi mengisi options pilihan jawaban */
                                    // Mengeksekusi perulangan terpisah untuk opsi
                                    // for (let idx = 0; idx <= questions[index].options.length - 1; idx++) {
                                    //     let inputOptions = await cards[index].findElements(By.css(".option input[type=text]"))
                                    //     await inputOptions[idx].clear()
                                    //     await driver.sleep(1000);
                                    //     await inputOptions[idx].sendKeys(questions[index].options[idx].value)
                                    //     await driver.sleep(1000);
                                    //     if(questions[index].options[idx].isCorrect) {
                                    //         let btnChecks = await driver.executeScript(`return arguments[0].querySelectorAll(".option button.dropdown-toggle")`, await cards[index]);
                                    //         await driver.executeScript(`return arguments[0].scrollIntoView()`, await btnChecks[idx]);
                                    //         await driver.sleep(1000);
                                    //         await btnChecks[idx].click();
                                    //         await driver.sleep(1000);
                                    //     }
                                    //     if(idx != questions[index].options.length - 1) await driver.executeScript(`return document.querySelectorAll(".option .btn-new-option")[${index}].click()`);
                                    //     await driver.sleep(2000);
                                    // }                                      
                                    /** Aksi tambah pertanyaan */
                                    // if (index != await cards.length - 1) await driver.executeScript(`return Array.from(document.querySelectorAll("#create button.btn-secondary")).find(v => v.innerText.toLowerCase().includes("tambah")).click()`);
                                    await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                                }
                                 
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css("input.input-title")).getAttribute('value'),
                                await driver.findElement(By.css("textarea.input-description")).getAttribute('value'),
                                // await driver.findElement(By.id("input-question")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector(".next-button .btn-primary").click()`)
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelector(".swal2-confirm").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi pindah ke halaman utama
                            windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(windows[0]);
                            await driver.sleep(2000);

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await windows.length - 1 == 0 && isAllFilled ? 'Successfully created a new form ✅' : 'Failed to create a new form ❌'
                            ]
                            expect(await windows.length).to.be.equal(1);
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Check the pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await pages.length > 1 || (await rows.length < 10 && await pages.length == 1) ? `- Successfully pagination displayed ✅` : `Pagination wasn't displayed ❌`
                            ]
                            expect(await pages.length > 1 || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Check the next page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let isNextPage = true;
                            if(await pages?.length > 0) {
                                let numbersOne = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)

                                let numbersTwo = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)

                                for (let i = 0; i < numbersOne.length; i++) {
                                    if (numbersTwo[i] != numbersOne[i] + 10 && numbersTwo[i] != undefined) {
                                        isNextPage = false;
                                        break;
                                    }
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isNextPage || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the next data of pagination ✅` : `Failed to displays the next data of pagination ❌`
                            ];
                            expect(isNextPage || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Check the last page number of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let pagePrevious = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            await driver.executeScript
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("»")).click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentPagePrevious = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText)).map(num => parseInt(num.toString()[0]))`);
                            pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText)).map(page => Number(page.innerText)).map(num => parseInt(num.toString()[0]))`);
                            let pageSame = await rows.every(digit => digit === pages[0]);
                            customMessages = [
                                (await pagePrevious != await currentPagePrevious && pageSame) || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect((await pageSame && await pagePrevious != await currentPagePrevious) || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Choose a page number of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let randomIndexPage = faker.number.int({ min: 0, max: await pages.length - 1 });
                            let selectedPage = await pages[randomIndexPage];
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return arguments[0].click()`, await pages[randomIndexPage])
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description

                            customMessages = [
                                await selectedPage != null || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the next data of pagination ✅` : `Failed to displays the next data of pagination ❌`
                            ];
                            expect(await selectedPage != null || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Check the previous page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            await driver.executeScript
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);

                                // Aksi klik button prev page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("‹")).click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentRows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            let rowSame = await rows.every((digit, index) => digit === currentRows[index]);
                            customMessages = [
                                await rowSame || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect(await rowSame || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Check the first page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`);
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);

                                // Aksi klik button first page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("«")).click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentRows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            let rowSame = await rows.every((digit, index) => digit === currentRows[index]);
                            let activeRow = await driver.executeScript(`return Number(document.querySelector("ul.pagination li.page-item.active").innerText)`)
                            customMessages = [
                                (await rowSame && activeRow == 1) || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect((await rowSame && activeRow == 1) || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`ADMIN - Delete the Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi memilih salah satu program untuk di hapus
                            let tableBody = await driver.executeScript(`return document.querySelector("table tbody").innerHTML`)
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-danger").click()`)
                            await driver.sleep(2000);
                            let modalFooter = await driver.executeScript(`return document.querySelector(".modal-footer") ? document.querySelector(".modal-footer") : null`);
                            if(await modalFooter?.isDisplayed()) {
                                await driver.executeScript(`return document.querySelector(".modal-footer .btn-danger").click();`);
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let newTableBody = await driver.executeScript(`return document.querySelector("table tbody").innerHTML`)
                            customMessages = [
                                await tableBody != await newTableBody ? '- Successfully deleted the blog ✅' : '- Failed to delete the blog ❌'
                            ];
                            expect(await tableBody != await newTableBody).to.be.true;
                            

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    

                break;

                case 2:
                    

                break;
                
                case 4:


                break;

                case 5:
                    it(`INDUSTRY - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, Blog, browser, appHost);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 6:
                    it.skip(`CONTENT WRITER - Create a Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Event'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Event'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ Formulir'
                            await driver.executeScript(`return document.querySelector(".main-content a.btn-primary .ri-add-line").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form formulir
                            /** Dummy Data **/
                            let title = faker.lorem.sentence(5);
                            let description = faker.lorem.paragraph();
                            let summary = description.slice(0, 100);
                            /** Input title */
                            await driver.findElement(By.id("Judul *")).sendKeys(title);
                            await driver.sleep(2000);
                            /** Input summary */
                            await driver.findElement(By.id("Rangkuman *")).sendKeys(summary);
                            await driver.sleep(2000);
                            /** Aksi upload file thumbnail */
                            let inputFileElements = await driver.wait(until.elementsLocated(By.css("input[type=file].dz-hidden-input")));
                            await inputFileElements[0].sendKeys(path.resolve('./resources/images/jongkreatif.png'));
                            await driver.sleep(2000);
                            /** Input article */
                            await driver.executeScript(`return document.querySelector(".tox-edit-area iframe").contentWindow.document.querySelector("body p").innerHTML += '<p>${description}</p>';`);
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Rangkuman *")).getAttribute("value"),
                            ]).then(results => results.every(value => value != ''));

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully created a new form ✅' : 'Failed to create a new form ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Edit the Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi memilih salah satu blog untuk di edit
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-warning").click()`)  

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Aksi mengisi form formulir
                            /** Dummy Data **/
                            let title = faker.lorem.sentence(5);
                            let description = faker.lorem.paragraph();
                            let summary = description.slice(0, 100);
                            /** Input title */
                            await driver.findElement(By.id("Judul *")).clear()
                            await driver.findElement(By.id("Judul *")).sendKeys(title);
                            await driver.sleep(2000);
                            /** Input summary */
                            await driver.findElement(By.id("Rangkuman *")).clear();
                            await driver.findElement(By.id("Rangkuman *")).sendKeys(summary);
                            await driver.sleep(2000);
                            /** Aksi upload file thumbnail */
                            let inputFileElements = await driver.wait(until.elementsLocated(By.css("input[type=file].dz-hidden-input")));
                            await inputFileElements[0].sendKeys(path.resolve('./resources/images/jongkreatif.png'));
                            await driver.sleep(2000);
                            /** Input article */
                            await driver.executeScript(`return document.querySelector(".tox-edit-area iframe").contentWindow.document.querySelector("body p").innerHTML += '';`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".tox-edit-area iframe").contentWindow.document.querySelector("body p").innerHTML += '<p>${description}</p>';`);
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Rangkuman *")).getAttribute("value"),
                                // await driver.executeScript(`return document.querySelector(".tox-edit-area iframe").contentWindow.document.querySelector("body p").innerHTML`),
                            ]).then(results => results.every(value => value != ''));

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully created a new form Admin ✅' : 'Failed to create a new form ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Check the pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await pages.length > 1 || (await rows.length < 10 && await pages.length == 1) ? `- Successfully pagination displayed ✅` : `Pagination wasn't displayed ❌`
                            ]
                            expect(await pages.length > 1 || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Check the next page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let isNextPage = true;
                            if(await pages?.length > 0) {
                                let numbersOne = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)

                                let numbersTwo = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)

                                for (let i = 0; i < numbersOne.length; i++) {
                                    if (numbersTwo[i] != numbersOne[i] + 10 && numbersTwo[i] != undefined) {
                                        isNextPage = false;
                                        break;
                                    }
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isNextPage || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the next data of pagination ✅` : `Failed to displays the next data of pagination ❌`
                            ];
                            expect(isNextPage || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Check the last page number of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let pagePrevious = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            await driver.executeScript
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("»")).click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentPagePrevious = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText)).map(num => parseInt(num.toString()[0]))`);
                            pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText)).map(page => Number(page.innerText)).map(num => parseInt(num.toString()[0]))`);
                            let pageSame = await rows.every(digit => digit === pages[0]);
                            customMessages = [
                                (await pagePrevious != await currentPagePrevious && pageSame) || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect((await pageSame && await pagePrevious != await currentPagePrevious) || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Choose a page number of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);
                            let randomIndexPage = faker.number.int({ min: 0, max: await pages.length - 1 });
                            let selectedPage = await pages[randomIndexPage];
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return arguments[0].click()`, await pages[randomIndexPage])
                                
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description

                            customMessages = [
                                await selectedPage != null || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the next data of pagination ✅` : `Failed to displays the next data of pagination ❌`
                            ];
                            expect(await selectedPage != null || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Check the previous page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            await driver.executeScript
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)
                                
                                // Aksi Sleep
                                await driver.sleep(3000);

                                // Aksi klik button prev page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("‹")).click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentRows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            let rowSame = await rows.every((digit, index) => digit === currentRows[index]);
                            customMessages = [
                                await rowSame || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect(await rowSame || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Check the first page of pagination of Table List Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`);
                            if(await pages?.length > 0) {
                                // Aksi klik button next page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => isNaN(page.innerText))[0].click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);

                                // Aksi klik button first page
                                await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).find(page => page.innerText.includes("«")).click()`)

                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                                await driver.sleep(2000)
                            }

                            // Expect results and add custom message for addtional description
                            let currentRows = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td[aria-colindex='1']")).map(value => Number(value.innerText))`)
                            let rowSame = await rows.every((digit, index) => digit === currentRows[index]);
                            let activeRow = await driver.executeScript(`return Number(document.querySelector("ul.pagination li.page-item.active").innerText)`)
                            customMessages = [
                                (await rowSame && activeRow == 1) || (await rows.length < 10 && await pages.length == 1) ? `- Successfully displays the prev data of pagination ✅` : `Failed to displays the prev data of pagination ❌`
                            ];
                            expect((await rowSame && activeRow == 1) || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`CONTENT WRITER - Delete the Form from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi scroll down sidenav-body
                            await driver.executeScript(`return document.querySelector(".sidenav-body").scrollTo(0, document.querySelector(".sidenav-body").scrollHeight)`);
                            await driver.sleep(3000) 
                            
                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li a")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-file-list-3-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("form");
                            }).querySelector("#Form ul:first-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi memilih salah satu program untuk di hapus
                            let tableBody = await driver.executeScript(`return document.querySelector("table tbody").innerHTML`)
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-danger").click()`)
                            await driver.sleep(2000);
                            let modalFooter = await driver.executeScript(`return document.querySelector(".modal-footer") ? document.querySelector(".modal-footer") : null`);
                            if(await modalFooter?.isDisplayed()) {
                                await driver.executeScript(`return document.querySelector(".modal-footer .btn-danger").click();`);
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let newTableBody = await driver.executeScript(`return document.querySelector("table tbody").innerHTML`)
                            customMessages = [
                                await tableBody != await newTableBody ? '- Successfully deleted the blog ✅' : '- Failed to delete the blog ❌'
                            ];
                            expect(await tableBody != await newTableBody).to.be.true;
                            

                        } catch (error) {
                            expect.fail(error);
                        }

                    });



                break;

                case 7:


                break;
                
                case 9:
                    

                break;

                default:
                    it(`Other - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
            }
        });

    })



});