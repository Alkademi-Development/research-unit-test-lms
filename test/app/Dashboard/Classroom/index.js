import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities, locateWith } from 'selenium-webdriver';
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

describe("Classroom", () => {
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
                    it.skip(`SUPER ADMIN - Check menu tab 'Kelas' in sidebar from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let menuClassActive = await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-stack-fill").classList.contains("text-primary")`);
                            let currentUrl = await driver.getCurrentUrl()
                            customMessages = [
                                await menuClassActive && await currentUrl.includes("classroom") ? "Successfully go into classroom page ✅" : "Failed go into classroom page ❌"
                            ];
                            expect(await menuClassActive && await currentUrl.includes("classroom")).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Create a new classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyCourse = faker.datatype.boolean()
                            if(isManyCourse) {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCourse = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxCourse; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                    await driver.sleep(1000)
                                    await courses[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await thrownAnError("There are still empty fields in the form", !isAllFilled);
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null ? "Successfully created a new Classroom ✅" : "Failed to create a new classroom ❌",
                            ];
                            expect(await alertWarning).to.be.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check button 'Reset' in form create classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih materi untuk join class */
                            // let isManyCourse = faker.datatype.boolean()
                            // if(isManyCourse) {
                            //     await driver.findElement(By.id('checkbox-modules')).click()
                            //     await driver.sleep(2000)
                            //     let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                            //     let maxCourse = faker.number.int({ min: 1, max: 20 });
                            //     await driver.sleep(2000)
                            //     // Meng-checklist banyak materi untuk bergabung di dalam kelas program
                            //     for (let index = 1; index <= maxCourse; index++) {
                            //         await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                            //         await driver.sleep(1000)
                            //         await courses[index].click();
                            //     }
                            //     await driver.sleep(2000)
                            //     await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            // } else {
                            //     await driver.findElement(By.id('checkbox-requirementFields')).click()
                            //     await driver.sleep(2000)
                            //     await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                            //     await driver.sleep(1000)
                            //     await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            // }
                            // await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)

                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);")
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=reset]").click()`);
                            }
                            await driver.sleep(2000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(10000);
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            await driver.sleep(2000);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isAllFilled == false ? "Successfully reset the form create classroom ✅" : "Failed to reset the form create classroom ❌",
                            ];
                            expect(isAllFilled).to.be.false;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Save classroom as a 'Draft' from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(3000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyCourse = faker.datatype.boolean()
                            if(isManyCourse) {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCourse = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxCourse; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                    await driver.sleep(1000)
                                    await courses[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .custom-control-label")).find(value => value.innerText.includes("Selalu Terbuka")).click()`)
                            // await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=reset]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button.btn-default").click()`);
                            }
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let classDraft = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class")).find(value => value.querySelector("h1.title").innerText.includes("${name}")) `)
                            customMessages = [
                                await classDraft ? "Successfully save classroom as a 'Draft' ✅" : "Failed to save classroom as a 'Draft' ❌",
                            ];
                            expect(await classDraft).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Edit the classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memilih salah satu card class untuk di edit
                            let cardClass = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                            let oldName = await driver.executeScript("arguments[0].querySelector('h1.title').innerText", await cardClass);
                            await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await cardClass);
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-edit-line').click()", await cardClass);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`

                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id("Nama *")).clear();
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id("Tags")).clear();
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id("Kuota *")).isEnabled() ?? await driver.findElement(By.id("Kuota *")).clear();
                            await driver.findElement(By.id("Kuota *")).isEnabled() ?? await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("Standar Kelulusan *")));
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Standar Kelulusan *")).clear();
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let registrantCity = await driver.findElement(By.id("checkbox-registrantCity"))
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("checkbox-registrantCity")));
                            await driver.sleep(3000)
                            if(await registrantCity.getAttribute('value') != null && await registrantCity.getAttribute('value') != '') {
                                let isAllCity = faker.datatype.boolean()
                                if(isAllCity) {
                                    await driver.findElement(By.id('checkbox-registrantCity')).click()
                                    await driver.sleep(2000)
                                    let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxCity = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxCity; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                        await driver.sleep(1000)
                                        await cities[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                    
                                    await driver.findElement(By.id('checkbox-cityHeld')).click()
                                    await driver.sleep(2000)
                                    cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                    maxCity = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxCity; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                        await driver.sleep(1000)
                                        await cities[index].click();
                                    }
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                } else {
                                    await driver.findElement(By.id('checkbox-registrantCity')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                    await driver.findElement(By.id('checkbox-cityHeld')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let requirementFields = await driver.findElement(By.id("checkbox-requirementFields"))
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("checkbox-requirementFields")));
                            await driver.sleep(1000)
                            let isAllRequire = faker.datatype.boolean()
                            if(await requirementFields.getAttribute("value") != null && await requirementFields.getAttribute("value") != "") {
                                if(isAllRequire) {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxRequire = faker.number.int({ min: 1, max: 4 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxRequire; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                        await driver.sleep(1000)
                                        await requires[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }  
                            } 
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let checkboxMentors = await driver.findElement(By.id('checkbox-mentors'))
                            let isManyMentor = faker.datatype.boolean()
                            if(await checkboxMentors.getAttribute("value") != null && await checkboxMentors.getAttribute("value") != "") {
                                if(isManyMentor) {
                                    await checkboxMentors.click()
                                    await driver.sleep(2000)
                                    let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxMentor = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                    for (let index = 1; index <= maxMentor; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                        await driver.sleep(1000)
                                        await mentors[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let checkboxModules = await driver.findElement(By.id('checkbox-modules'))
                            let isManyCourse = faker.datatype.boolean()
                            if(await checkboxMentors.getAttribute("value") != null && await checkboxMentors.getAttribute("value") != "") {
                                if(isManyCourse) {
                                    await checkboxModules.click()
                                    await driver.sleep(2000)
                                    let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxCourse = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                    for (let index = 1; index <= maxCourse; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                        await driver.sleep(1000)
                                        await courses[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await checkboxModules.click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).clear();
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            // if(await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].checked`) == false) {
                            //     await driver.findElement(By.id("Pendaftaran Dibuka *")).isEnabled() ?? await driver.findElement(By.id("Pendaftaran Dibuka *")).clear();
                            //     await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pendaftaran Ditutup *")).isEnabled() ?? await driver.findElement(By.id("Pendaftaran Ditutup *")).clear();
                            //     await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pelaksanaan Dimulai *")).clear();
                            //     await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pelaksanaan Berakhir *")).clear();
                            //     await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            // }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                // await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=submit]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                await driver.sleep(4000)
                            }
                            let modalConfirmation = await driver.executeScript(`return document.querySelector(".modal-content button") ? document.querySelector(".modal-content button") : null`)
                            console.log(await modalConfirmation)
                            if(await modalConfirmation != null) await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await oldName != name ? "Successfully edited the classroom ✅" : "Failed to edit the classroom ❌",
                            ];
                            expect(await oldName != name).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    // it(`SUPER ADMIN - Check the button "Terbitkan Kelas" for the "draft" classes in draft menu tab from browser ${browser}`, async () => {

                    //     try {

                    //         // Go to application
                    //         driver = await goToApp(browser, appHost);
                    //         await driver.manage().window().maximize();

                    //         // login to the application
                    //         errorMessages = await enterDashboard(driver, user, browser, appHost);
                    //         await thrownAnError(errorMessages, errorMessages?.length > 0);

                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi menu tab 'Kelas'
                    //         await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(4000);

                    //         // Aksi klik menu tab draf classes
                    //         await driver.executeScript(`return document.querySelector(".item-tab").click();`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(4000);

                    //         // Aksi memilih salah satu card class untuk di edit
                    //         let selectedCard = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                    //         let className = await driver.executeScript(`return arguments[0].querySelector("h1.title").innerText`, await selectedCard)
                    //         await driver.sleep(1000);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await selectedCard);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-volume-up-line').click()", await selectedCard);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(4000);

                    //         // Expect results and add custom message for addtional description
                    //         let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class")).find(value => value.querySelector("h1.title").innerText.includes("${await className}"))`);
                    //         customMessages = [
                    //             await cardClass ? "Successfully moved the class to public ✅" : "Failed move the class to public ❌",
                    //         ];
                    //         expect(await cardClass, "Expected classroom is deleted but it's still exist").to.be.null;


                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });
                    
                    it.skip(`SUPER ADMIN - Filter class by "Draft" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik menu tab draft classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelector(".item-tab").click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Draft' ✅" : "Failed to filter class by menu tab 'Draft' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Filter class by "Semua" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" || value.innerText === "Pendaftaran" || value.innerText === "Berlangsung" || value.innerText === "Selesai");`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Semua' ✅" : "Failed filter class by menu tab 'Semua' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Filter class by "Pendaftaran" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Pendaftaran' ✅" : "Failed filter class by menu tab 'Pendaftaran' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Filter class by "Berlangsung" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlansung' classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Berlangsung' ✅" : "Failed filter class by menu tab 'Berlangsung' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Filter class by "Selesai" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi klik menu tab 'Selesai' classes
                            await driver.executeScript(`return document.querySelectorAll(".item-tab")[4].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Selesai" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Draft"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Selesai' ✅" : "Failed to filter class by menu tab 'Selesai' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Filter sort classroom by alphabet from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by alphabet
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, titles;
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(5000)
                            // Aksi mendapatkan semua kelas
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                            if(isAsc) {
                                await driver.executeScript(`return document.querySelector(".filter-container .dropdown-menu .dropdown-item").click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                      if (arr[i][0]?.toLowerCase() != arr[i - 1][0]?.toLowerCase()) { // arr[i].localeCompare(arr[i - 1], 'en', { sensitivity: 'base' }) < 0
                                        return false;
                                      }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            } else {
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[1].click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                        if (arr[i][0].localeCompare(arr[i - 1][0], 'en', { sensitivity: 'base' }) > 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            }

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by alphabet ✅" : "Failed to sort by alphabet ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Filter sort classroom by date from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlangsung' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by date
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, newCardClass;
                            // Aksi mendapatkan kelas
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            if(isAsc) {
                                // Tanggal Terdekat
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[3].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass.getAttribute("innerHTML")
                            } else {
                                // Tanggal Terjauh
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[2].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass
                            }

                            // Aksi Sleep
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by date ✅" : "Failed to sort by date ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Filter classes by program from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi memfilter class by program
                            await driver.executeScript(`return document.querySelector("#dropdown-filter button").click()`)
                            await driver.sleep(2000)
                            let dropdownMenuFilter = await driver.executeScript(`return document.querySelector("ul.dropdown-menu")`)
                            await thrownAnError("Dropdown menu filter isn't showed up", await dropdownMenuFilter == null)
                            let inputSearchProgram = await driver.executeScript(`return document.querySelector("#select-program input[type=search]")`)
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchProgram }).click().perform();
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll("#select-program ul li")`)
                            await thrownAnError("Program is empty", await programs.length == 0)
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 })
                            let programName = await driver.executeScript("return arguments[0].innerText", await programs[randomIndexProgram]);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await programs[randomIndexProgram]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await programs[randomIndexProgram]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let badgeProgramClasses = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-program")).filter(value => value.innerText.includes("${await programName}".replace(/./g, "")))`);
                            let isEmptyClass = await driver.executeScript(`return document.querySelector(".card-body span") ? document.querySelector(".card-body span").innerText.toLowerCase().includes("belum ada kelas") : null`)
                            customMessages = [
                                await badgeProgramClasses.length > 0 || await isEmptyClass != null ? `Successfully sorted by class program ${await programName} ✅` : `Failed to sort by class program ❌`,
                            ];
                            expect(await badgeProgramClasses.length > 0 || await isEmptyClass != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Remove the applied filter from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mendapatkan original list class
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            // Aksi memfilter class by alphabet or date
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            let filters = await driver.executeScript(`return document.querySelectorAll(".dropdown-menu div.dropdown-item")`)
                            let randomFilter = faker.number.int({ min: 0, max: await filters.length - 1 })
                            await driver.executeScript(`return arguments[0].click()`, await filters[randomFilter])

                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi remove filter applied
                            let buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            // await thrownAnError("Button remove filter isn't displayed", await buttonRemoveFilter == null)
                            await buttonRemoveFilter.click();

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            customMessages = [
                                await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null ? "Succesfully removed filter class ✅" : "Failed to remove filter class ❌",
                            ];
                            expect(await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Search by name class from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mencari nama class yang sesuai
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 0, max: await cardClass.length - 1 })
                            let searchClassByName = await driver.executeScript(`return arguments[0].querySelector("h1.title").innerText`, await cardClass[randomIndexClass]);
                            await driver.wait(until.elementLocated(By.css("form.filter-container input#filter-input")))
                            await driver.sleep(1000);
                            for(let index in await searchClassByName) {
                                await driver.findElement(By.css("form.filter-container input#filter-input")).sendKeys(await searchClassByName[index], Key.RETURN);
                                await driver.sleep(700)
                                if(await cardClass?.length && searchClassByName.length - 1 == index) break;
                            }

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully display the classes by search input field ✅" : "Failed to display the classes by search input field ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Delete the classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memilih salah satu card class untuk di delete
                            let selectedCard = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                            let className = await driver.executeScript(`return arguments[0].querySelector("h1.title").innerText`, await selectedCard)
                            await driver.sleep(1000)
                            await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await selectedCard);
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-delete-bin-7-line').click()", await selectedCard);
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            await driver.sleep(2000)
                            let textDanger = await driver.executeScript(`return document.querySelector(".modal-content .text-danger") ? document.querySelector(".modal-content .text-danger") : null`)
                            if(textDanger != null) await thrownAnError(await textDanger?.getAttribute("innerText"), await textDanger != null)
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class")).find(value => value.querySelector("h1.title").innerText.includes("${await className}"))`);
                            customMessages = [
                                await cardClass == null ? "Successfully deleted the classroom ✅" : "Failed to delete the classroom ❌",
                            ];
                            expect(await cardClass, "Expected classroom is deleted but it's still exist").to.be.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 1:
                    it(`ADMIN - Check menu tab 'Kelas' in sidebar from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let menuClassActive = await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-stack-fill").classList.contains("text-primary")`);
                            let currentUrl = await driver.getCurrentUrl()
                            customMessages = [
                                await menuClassActive && await currentUrl.includes("classroom") ? "Successfully go into classroom page ✅" : "Failed go into classroom page ❌"
                            ];
                            expect(await menuClassActive && await currentUrl.includes("classroom")).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`ADMIN - Create a new classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyCourse = faker.datatype.boolean()
                            if(isManyCourse) {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCourse = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxCourse; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                    await driver.sleep(1000)
                                    await courses[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await thrownAnError("There are still empty fields in the form", !isAllFilled);
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null ? "Successfully created a new Classroom ✅" : "Failed to create a new classroom ❌",
                            ];
                            expect(await alertWarning).to.be.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Check button 'Reset' in form create classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih materi untuk join class */
                            // let isManyCourse = faker.datatype.boolean()
                            // if(isManyCourse) {
                            //     await driver.findElement(By.id('checkbox-modules')).click()
                            //     await driver.sleep(2000)
                            //     let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                            //     let maxCourse = faker.number.int({ min: 1, max: 20 });
                            //     await driver.sleep(2000)
                            //     // Meng-checklist banyak materi untuk bergabung di dalam kelas program
                            //     for (let index = 1; index <= maxCourse; index++) {
                            //         await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                            //         await driver.sleep(1000)
                            //         await courses[index].click();
                            //     }
                            //     await driver.sleep(2000)
                            //     await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            // } else {
                            //     await driver.findElement(By.id('checkbox-requirementFields')).click()
                            //     await driver.sleep(2000)
                            //     await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                            //     await driver.sleep(1000)
                            //     await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            // }
                            // await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)

                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);")
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=reset]").click()`);
                            }
                            await driver.sleep(2000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(10000);
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            await driver.sleep(2000);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isAllFilled == false ? "Successfully reset the form create classroom ✅" : "Failed to reset the form create classroom ❌",
                            ];
                            expect(isAllFilled).to.be.false;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Save classroom as a 'Draft' from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(3000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyCourse = faker.datatype.boolean()
                            if(isManyCourse) {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCourse = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxCourse; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                    await driver.sleep(1000)
                                    await courses[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .custom-control-label")).find(value => value.innerText.includes("Selalu Terbuka")).click()`)
                            // await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=reset]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button.btn-default").click()`);
                            }
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let classDraft = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class")).find(value => value.querySelector("h1.title").innerText.includes("${name}")) `)
                            customMessages = [
                                await classDraft ? "Successfully save classroom as a 'Draft' ✅" : "Failed to save classroom as a 'Draft' ❌",
                            ];
                            expect(await classDraft).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`ADMIN - Edit the classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memilih salah satu card class untuk di edit
                            let cardClass = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                            let oldName = await driver.executeScript("arguments[0].querySelector('h1.title').innerText", await cardClass);
                            await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await cardClass);
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-edit-line').click()", await cardClass);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`

                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id("Nama *")).clear();
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id("Tags")).clear();
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id("Kuota *")).isEnabled() ?? await driver.findElement(By.id("Kuota *")).clear();
                            await driver.findElement(By.id("Kuota *")).isEnabled() ?? await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("Standar Kelulusan *")));
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Standar Kelulusan *")).clear();
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let registrantCity = await driver.findElement(By.id("checkbox-registrantCity"))
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("checkbox-registrantCity")));
                            await driver.sleep(3000)
                            if(await registrantCity.getAttribute('value') != null && await registrantCity.getAttribute('value') != '') {
                                let isAllCity = faker.datatype.boolean()
                                if(isAllCity) {
                                    await driver.findElement(By.id('checkbox-registrantCity')).click()
                                    await driver.sleep(2000)
                                    let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxCity = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxCity; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                        await driver.sleep(1000)
                                        await cities[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                    
                                    await driver.findElement(By.id('checkbox-cityHeld')).click()
                                    await driver.sleep(2000)
                                    cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                    maxCity = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxCity; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                        await driver.sleep(1000)
                                        await cities[index].click();
                                    }
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                } else {
                                    await driver.findElement(By.id('checkbox-registrantCity')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                    await driver.findElement(By.id('checkbox-cityHeld')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let requirementFields = await driver.findElement(By.id("checkbox-requirementFields"))
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("checkbox-requirementFields")));
                            await driver.sleep(1000)
                            let isAllRequire = faker.datatype.boolean()
                            if(await requirementFields.getAttribute("value") != null && await requirementFields.getAttribute("value") != "") {
                                if(isAllRequire) {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxRequire = faker.number.int({ min: 1, max: 4 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxRequire; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                        await driver.sleep(1000)
                                        await requires[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }  
                            } 
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let checkboxMentors = await driver.findElement(By.id('checkbox-mentors'))
                            let isManyMentor = faker.datatype.boolean()
                            if(await checkboxMentors.getAttribute("value") != null && await checkboxMentors.getAttribute("value") != "") {
                                if(isManyMentor) {
                                    await checkboxMentors.click()
                                    await driver.sleep(2000)
                                    let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxMentor = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                    for (let index = 1; index <= maxMentor; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                        await driver.sleep(1000)
                                        await mentors[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let checkboxModules = await driver.findElement(By.id('checkbox-modules'))
                            let isManyCourse = faker.datatype.boolean()
                            if(await checkboxMentors.getAttribute("value") != null && await checkboxMentors.getAttribute("value") != "") {
                                if(isManyCourse) {
                                    await checkboxModules.click()
                                    await driver.sleep(2000)
                                    let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxCourse = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                    for (let index = 1; index <= maxCourse; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                        await driver.sleep(1000)
                                        await courses[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await checkboxModules.click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).clear();
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            // if(await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].checked`) == false) {
                            //     await driver.findElement(By.id("Pendaftaran Dibuka *")).isEnabled() ?? await driver.findElement(By.id("Pendaftaran Dibuka *")).clear();
                            //     await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pendaftaran Ditutup *")).isEnabled() ?? await driver.findElement(By.id("Pendaftaran Ditutup *")).clear();
                            //     await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pelaksanaan Dimulai *")).clear();
                            //     await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pelaksanaan Berakhir *")).clear();
                            //     await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            // }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                // await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=submit]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                await driver.sleep(4000)
                            }
                            let modalConfirmation = await driver.executeScript(`return document.querySelector(".modal-content button") ? document.querySelector(".modal-content button") : null`)
                            console.log(await modalConfirmation)
                            if(await modalConfirmation != null) await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await oldName != name ? "Successfully edited the classroom ✅" : "Failed to edit the classroom ❌",
                            ];
                            expect(await oldName != name).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    // it(`ADMIN - Check the button "Terbitkan Kelas" for the "draft" classes in draft menu tab from browser ${browser}`, async () => {

                    //     try {

                    //         // Go to application
                    //         driver = await goToApp(browser, appHost);
                    //         await driver.manage().window().maximize();

                    //         // login to the application
                    //         errorMessages = await enterDashboard(driver, user, browser, appHost);
                    //         await thrownAnError(errorMessages, errorMessages?.length > 0);

                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi menu tab 'Kelas'
                    //         await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(4000);

                    //         // Aksi klik menu tab draf classes
                    //         await driver.executeScript(`return document.querySelector(".item-tab").click();`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(4000);

                    //         // Aksi memilih salah satu card class untuk di edit
                    //         let selectedCard = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                    //         let className = await driver.executeScript(`return arguments[0].querySelector("h1.title").innerText`, await selectedCard)
                    //         await driver.sleep(1000);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await selectedCard);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-volume-up-line').click()", await selectedCard);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(4000);

                    //         // Expect results and add custom message for addtional description
                    //         let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class")).find(value => value.querySelector("h1.title").innerText.includes("${await className}"))`);
                    //         customMessages = [
                    //             await cardClass ? "Successfully moved the class to public ✅" : "Failed move the class to public ❌",
                    //         ];
                    //         expect(await cardClass, "Expected classroom is deleted but it's still exist").to.be.null;


                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });
                    
                    it(`ADMIN - Filter class by "Draft" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik menu tab draft classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelector(".item-tab").click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Draft' ✅" : "Failed to filter class by menu tab 'Draft' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Filter class by "Semua" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" || value.innerText === "Pendaftaran" || value.innerText === "Berlangsung" || value.innerText === "Selesai");`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Semua' ✅" : "Failed filter class by menu tab 'Semua' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Filter class by "Pendaftaran" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Pendaftaran' ✅" : "Failed filter class by menu tab 'Pendaftaran' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Filter class by "Berlangsung" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlansung' classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Berlangsung' ✅" : "Failed filter class by menu tab 'Berlangsung' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`ADMIN - Filter class by "Selesai" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi klik menu tab 'Selesai' classes
                            await driver.executeScript(`return document.querySelectorAll(".item-tab")[4].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Selesai" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Draft"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Selesai' ✅" : "Failed to filter class by menu tab 'Selesai' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Filter sort classroom by alphabet from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by alphabet
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, titles;
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(5000)
                            // Aksi mendapatkan semua kelas
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                            if(isAsc) {
                                await driver.executeScript(`return document.querySelector(".filter-container .dropdown-menu .dropdown-item").click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                      if (arr[i][0]?.toLowerCase() != arr[i - 1][0]?.toLowerCase()) { // arr[i].localeCompare(arr[i - 1], 'en', { sensitivity: 'base' }) < 0
                                        return false;
                                      }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            } else {
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[1].click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                        if (arr[i][0].localeCompare(arr[i - 1][0], 'en', { sensitivity: 'base' }) > 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            }

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by alphabet ✅" : "Failed to sort by alphabet ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Filter sort classroom by date from browser ${browser}`, async () => {
                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlangsung' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by date
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, newCardClass;
                            // Aksi mendapatkan kelas
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            if(isAsc) {
                                // Tanggal Terdekat
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[3].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass.getAttribute("innerHTML")
                            } else {
                                // Tanggal Terjauh
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[2].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass
                            }

                            // Aksi Sleep
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by date ✅" : "Failed to sort by date ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }
                    });
                    
                    it(`ADMIN - Filter classes by program from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi memfilter class by program
                            await driver.executeScript(`return document.querySelector("#dropdown-filter button").click()`)
                            await driver.sleep(2000)
                            let dropdownMenuFilter = await driver.executeScript(`return document.querySelector("ul.dropdown-menu")`)
                            await thrownAnError("Dropdown menu filter isn't showed up", await dropdownMenuFilter == null)
                            let inputSearchProgram = await driver.executeScript(`return document.querySelector("#select-program input[type=search]")`)
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchProgram }).click().perform();
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll("#select-program ul li")`)
                            await thrownAnError("Program is empty", await programs.length == 0)
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 })
                            let programName = await driver.executeScript("return arguments[0].innerText", await programs[randomIndexProgram]);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await programs[randomIndexProgram]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await programs[randomIndexProgram]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let badgeProgramClasses = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-program")).filter(value => value.innerText.includes("${await programName}".replace(/./g, "")))`);
                            let isEmptyClass = await driver.executeScript(`return document.querySelector(".card-body span") ? document.querySelector(".card-body span").innerText.toLowerCase().includes("belum ada kelas") : null`)
                            customMessages = [
                                await badgeProgramClasses.length > 0 || await isEmptyClass != null ? `Successfully sorted by class program ${await programName} ✅` : `Failed to sort by class program ❌`,
                            ];
                            expect(await badgeProgramClasses.length > 0 || await isEmptyClass != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Remove the applied filter from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mendapatkan original list class
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            // Aksi memfilter class by alphabet or date
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            let filters = await driver.executeScript(`return document.querySelectorAll(".dropdown-menu div.dropdown-item")`)
                            let randomFilter = faker.number.int({ min: 0, max: await filters.length - 1 })
                            await driver.executeScript(`return arguments[0].click()`, await filters[randomFilter])

                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi remove filter applied
                            let buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            // await thrownAnError("Button remove filter isn't displayed", await buttonRemoveFilter == null)
                            await buttonRemoveFilter.click();

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            customMessages = [
                                await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null ? "Succesfully removed filter class ✅" : "Failed to remove filter class ❌",
                            ];
                            expect(await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Search by name class from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mencari nama class yang sesuai
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 0, max: await cardClass.length - 1 })
                            let searchClassByName = await driver.executeScript("return arguments[0].innerText", await cardClass[randomIndexClass]);
                            await driver.wait(until.elementLocated(By.css("form.filter-container input#filter-input")))
                            await driver.sleep(1000);
                            for(let index in await searchClassByName) {
                                await driver.findElement(By.css("form.filter-container input#filter-input")).sendKeys(await searchClassByName[index], Key.RETURN);
                                await driver.sleep(700)
                                if(await cardClass?.length && searchClassByName.length - 1 == index) break;
                            }

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully display the classes by search input field ✅" : "Failed to display the classes by search input field ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`ADMIN - Delete the classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memilih salah satu card class untuk di delete
                            let selectedCard = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                            let className = await driver.executeScript(`return arguments[0].querySelector("h1.title").innerText`, await selectedCard)
                            await driver.sleep(1000)
                            await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await selectedCard);
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-delete-bin-7-line').click()", await selectedCard);
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            await driver.sleep(2000)
                            let textDanger = await driver.executeScript(`return document.querySelector(".modal-content .text-danger") ? document.querySelector(".modal-content .text-danger") : null`)
                            if(textDanger != null) await thrownAnError(await textDanger?.getAttribute("innerText"), await textDanger != null)
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class")).find(value => value.querySelector("h1.title").innerText.includes("${await className}"))`);
                            customMessages = [
                                await cardClass == null ? "Successfully deleted the classroom ✅" : "Failed to delete the classroom ❌",
                            ];
                            expect(await cardClass, "Expected classroom is deleted but it's still exist").to.be.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 2:
                    it(`MENTOR - Check menu tab 'Kelas' in sidebar from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let menuClassActive = await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-stack-fill").classList.contains("text-primary")`);
                            let currentUrl = await driver.getCurrentUrl()
                            customMessages = [
                                await menuClassActive && await currentUrl.includes("classroom") ? "Successfully go into classroom page ✅" : "Failed go into classroom page ❌"
                            ];
                            expect(await menuClassActive && await currentUrl.includes("classroom")).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`MENTOR - Filter class by "Draft" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik menu tab draft classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelector(".item-tab").click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Draft' ✅" : "Failed to filter class by menu tab 'Draft' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Filter class by "Semua" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" || value.innerText === "Pendaftaran" || value.innerText === "Berlangsung" || value.innerText === "Selesai");`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Semua' ✅" : "Failed filter class by menu tab 'Semua' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Filter class by "Pendaftaran" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Pendaftaran' ✅" : "Failed filter class by menu tab 'Pendaftaran' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Filter class by "Berlangsung" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlansung' classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Berlangsung' ✅" : "Failed filter class by menu tab 'Berlangsung' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`MENTOR - Filter class by "Selesai" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi klik menu tab 'Selesai' classes
                            await driver.executeScript(`return document.querySelectorAll(".item-tab")[4].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Selesai" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Draft"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Selesai' ✅" : "Failed to filter class by menu tab 'Selesai' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Filter sort classroom by alphabet from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by alphabet
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, titles;
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(5000)
                            // Aksi mendapatkan semua kelas
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                            if(isAsc) {
                                await driver.executeScript(`return document.querySelector(".filter-container .dropdown-menu .dropdown-item").click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                      if (arr[i][0]?.toLowerCase() != arr[i - 1][0]?.toLowerCase()) { // arr[i].localeCompare(arr[i - 1], 'en', { sensitivity: 'base' }) < 0
                                        return false;
                                      }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            } else {
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[1].click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                        if (arr[i][0].localeCompare(arr[i - 1][0], 'en', { sensitivity: 'base' }) > 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            }

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by alphabet ✅" : "Failed to sort by alphabet ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Filter sort classroom by date from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlangsung' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by date
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, newCardClass;
                            // Aksi mendapatkan kelas
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            if(isAsc) {
                                // Tanggal Terdekat
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[3].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass.getAttribute("innerHTML")
                            } else {
                                // Tanggal Terjauh
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[2].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass
                            }

                            // Aksi Sleep
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by date ✅" : "Failed to sort by date ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Filter classes by program from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi memfilter class by program
                            await driver.executeScript(`return document.querySelector("#dropdown-filter button").click()`)
                            await driver.sleep(2000)
                            let dropdownMenuFilter = await driver.executeScript(`return document.querySelector("ul.dropdown-menu")`)
                            await thrownAnError("Dropdown menu filter isn't showed up", await dropdownMenuFilter == null)
                            let inputSearchProgram = await driver.executeScript(`return document.querySelector("#select-program input[type=search]")`)
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchProgram }).click().perform();
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll("#select-program ul li")`)
                            await thrownAnError("Program is empty", await programs.length == 0)
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 })
                            let programName = await driver.executeScript("return arguments[0].innerText", await programs[randomIndexProgram]);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await programs[randomIndexProgram]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await programs[randomIndexProgram]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let badgeProgramClasses = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-program")).filter(value => value.innerText.includes("${await programName}".replace(/./g, "")))`);
                            let isEmptyClass = await driver.executeScript(`return document.querySelector(".card-body span") ? document.querySelector(".card-body span").innerText.toLowerCase().includes("belum ada kelas") : null`)
                            customMessages = [
                                await badgeProgramClasses.length > 0 || await isEmptyClass != null ? `Successfully sorted by class program ${await programName} ✅` : `Failed to sort by class program ❌`,
                            ];
                            expect(await badgeProgramClasses.length > 0 || await isEmptyClass != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Remove the applied filter from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mendapatkan original list class
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            // Aksi memfilter class by alphabet or date
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            let filters = await driver.executeScript(`return document.querySelectorAll(".dropdown-menu div.dropdown-item")`)
                            let randomFilter = faker.number.int({ min: 0, max: await filters.length - 1 })
                            await driver.executeScript(`return arguments[0].click()`, await filters[randomFilter])

                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi remove filter applied
                            let buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            // await thrownAnError("Button remove filter isn't displayed", await buttonRemoveFilter == null)
                            await buttonRemoveFilter.click();

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            customMessages = [
                                await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null ? "Succesfully removed filter class ✅" : "Failed to remove filter class ❌",
                            ];
                            expect(await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`MENTOR - Search by name class from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mencari nama class yang sesuai
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 0, max: await cardClass.length - 1 })
                            let searchClassByName = await driver.executeScript("return arguments[0].innerText", await cardClass[randomIndexClass]);
                            await driver.wait(until.elementLocated(By.css("form.filter-container input#filter-input")))
                            await driver.sleep(1000);
                            for(let index in await searchClassByName) {
                                await driver.findElement(By.css("form.filter-container input#filter-input")).sendKeys(await searchClassByName[index], Key.RETURN);
                                await driver.sleep(700)
                                if(await cardClass?.length && searchClassByName.length - 1 == index) break;
                            }

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully display the classes by search input field ✅" : "Failed to display the classes by search input field ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;
                
                case 4:
                    it(`STUDENT - Check menu tab 'Kelas' in sidebar from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let menuClassActive = await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-stack-fill").classList.contains("text-primary")`);
                            let currentUrl = await driver.getCurrentUrl()
                            customMessages = [
                                await menuClassActive && await currentUrl.includes("classroom") ? "Successfully go into classroom page ✅" : "Failed go into classroom page ❌"
                            ];
                            expect(await menuClassActive && await currentUrl.includes("classroom")).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Filter class by "Semua" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" || value.innerText === "Pendaftaran" || value.innerText === "Berlangsung" || value.innerText === "Selesai");`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Semua' ✅" : "Failed filter class by menu tab 'Semua' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Filter class by "Pendaftaran" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[1].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Pendaftaran' ✅" : "Failed filter class by menu tab 'Pendaftaran' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Filter class by "Berlangsung" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlansung' classes
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Berlangsung' ✅" : "Failed filter class by menu tab 'Berlangsung' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`STUDENT - Filter class by "Selesai" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi klik menu tab 'Selesai' classes
                            await driver.executeScript(`return document.querySelectorAll(".item-tab")[3].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Selesai" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Draft"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Selesai' ✅" : "Failed to filter class by menu tab 'Selesai' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Filter sort classroom by alphabet from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by alphabet
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, titles;
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(5000)
                            // Aksi mendapatkan semua kelas
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                            if(isAsc) {
                                await driver.executeScript(`return document.querySelector(".filter-container .dropdown-menu .dropdown-item").click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                      if (arr[i][0]?.toLowerCase() != arr[i - 1][0]?.toLowerCase()) { // arr[i].localeCompare(arr[i - 1], 'en', { sensitivity: 'base' }) < 0
                                        return false;
                                      }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            } else {
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[1].click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                        if (arr[i][0].localeCompare(arr[i - 1][0], 'en', { sensitivity: 'base' }) > 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            }

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by alphabet ✅" : "Failed to sort by alphabet ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Filter sort classroom by date from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlangsung' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by date
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, newCardClass;
                            // Aksi mendapatkan kelas
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            if(isAsc) {
                                // Tanggal Terdekat
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[3].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass.getAttribute("innerHTML")
                            } else {
                                // Tanggal Terjauh
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[2].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass
                            }

                            // Aksi Sleep
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by date ✅" : "Failed to sort by date ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Filter classes by program from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi memfilter class by program
                            await driver.executeScript(`return document.querySelector("#dropdown-filter button").click()`)
                            await driver.sleep(2000)
                            let inputSearchProgram = await driver.executeScript(`return document.querySelector("#select-program input[type=search]") ? document.querySelector("#select-program input[type=search]") : null`)
                            while(await inputSearchProgram == null) {
                                inputSearchProgram = await driver.executeScript(`return document.querySelector("#select-program input[type=search]") ? document.querySelector("#select-program input[type=search]") : null`)
                                await driver.sleep(5000)
                            }
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchProgram }).click().perform();
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll("#select-program ul li")`)
                            await thrownAnError("Program is empty", await programs.length == 0)
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 })
                            let programName = await driver.executeScript("return arguments[0].innerText", await programs[randomIndexProgram]);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await programs[randomIndexProgram]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await programs[randomIndexProgram]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let badgeProgramClasses = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-program")).filter(value => value.innerText.includes("${await programName}".replace(/./g, "")))`);
                            let isEmptyClass = await driver.executeScript(`return document.querySelector(".card-body span") ? document.querySelector(".card-body span").innerText.toLowerCase().includes("belum ada kelas") : null`)
                            customMessages = [
                                await badgeProgramClasses.length > 0 || await isEmptyClass != null ? `Successfully sorted by class program ${await programName} ✅` : `Failed to sort by class program ❌`,
                            ];
                            expect(await badgeProgramClasses.length > 0 || await isEmptyClass != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Remove the applied filter from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mendapatkan original list class
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            // Aksi memfilter class by alphabet or date
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            let filters = await driver.executeScript(`return document.querySelectorAll(".dropdown-menu div.dropdown-item")`)
                            let randomFilter = faker.number.int({ min: 0, max: await filters.length - 1 })
                            await driver.executeScript(`return arguments[0].click()`, await filters[randomFilter])

                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi remove filter applied
                            let buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            // await thrownAnError("Button remove filter isn't displayed", await buttonRemoveFilter == null)
                            await buttonRemoveFilter.click();

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            customMessages = [
                                await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null ? "Succesfully removed filter class ✅" : "Failed to remove filter class ❌",
                            ];
                            expect(await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Search by name class from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mencari nama class yang sesuai
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 0, max: await cardClass.length - 1 })
                            let searchClassByName = await driver.executeScript("return arguments[0].innerText", await cardClass[randomIndexClass]);
                            await driver.wait(until.elementLocated(By.css("form.filter-container input#filter-input")))
                            await driver.sleep(1000);
                            for(let index in await searchClassByName) {
                                await driver.findElement(By.css("form.filter-container input#filter-input")).sendKeys(await searchClassByName[index], Key.RETURN);
                                await driver.sleep(700)
                                if(await cardClass?.length && searchClassByName.length - 1 == index) break;
                            }

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully display the classes by search input field ✅" : "Failed to display the classes by search input field ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 5:
                    it(`INDUSTRY - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 6:
                    it(`CONTENT WRITER - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;

                case 7:
                    it(`LEAD PROGRAM - Check menu tab 'Kelas' in sidebar from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let menuClassActive = await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-stack-fill").classList.contains("text-primary")`);
                            let currentUrl = await driver.getCurrentUrl()
                            customMessages = [
                                await menuClassActive && await currentUrl.includes("classroom") ? "Successfully go into classroom page ✅" : "Failed go into classroom page ❌"
                            ];
                            expect(await menuClassActive && await currentUrl.includes("classroom")).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`LEAD PROGRAM - Filter class by "Draft" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik menu tab draft classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelector(".item-tab").click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Draft' ✅" : "Failed to filter class by menu tab 'Draft' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Filter class by "Semua" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" || value.innerText === "Pendaftaran" || value.innerText === "Berlangsung" || value.innerText === "Selesai");`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Semua' ✅" : "Failed filter class by menu tab 'Semua' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Filter class by "Pendaftaran" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Pendaftaran' ✅" : "Failed filter class by menu tab 'Pendaftaran' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Filter class by "Berlangsung" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlansung' classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Berlangsung' ✅" : "Failed filter class by menu tab 'Berlangsung' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`LEAD PROGRAM - Filter class by "Selesai" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi klik menu tab 'Selesai' classes
                            await driver.executeScript(`return document.querySelectorAll(".item-tab")[4].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Selesai" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Draft"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Selesai' ✅" : "Failed to filter class by menu tab 'Selesai' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Filter sort classroom by alphabet from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by alphabet
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, titles;
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(5000)
                            // Aksi mendapatkan semua kelas
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                            if(isAsc) {
                                await driver.executeScript(`return document.querySelector(".filter-container .dropdown-menu .dropdown-item").click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                      if (arr[i][0]?.toLowerCase() != arr[i - 1][0]?.toLowerCase()) { // arr[i].localeCompare(arr[i - 1], 'en', { sensitivity: 'base' }) < 0
                                        return false;
                                      }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            } else {
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[1].click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                        if (arr[i][0].localeCompare(arr[i - 1][0], 'en', { sensitivity: 'base' }) > 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            }

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by alphabet ✅" : "Failed to sort by alphabet ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Filter sort classroom by date from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlangsung' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by date
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, newCardClass;
                            // Aksi mendapatkan kelas
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            if(isAsc) {
                                // Tanggal Terdekat
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[3].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass.getAttribute("innerHTML")
                            } else {
                                // Tanggal Terjauh
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[2].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass
                            }

                            // Aksi Sleep
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by date ✅" : "Failed to sort by date ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Filter classes by program from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi memfilter class by program
                            await driver.executeScript(`return document.querySelector("#dropdown-filter button").click()`)
                            await driver.sleep(2000)
                            let dropdownMenuFilter = await driver.executeScript(`return document.querySelector("ul.dropdown-menu")`)
                            await thrownAnError("Dropdown menu filter isn't showed up", await dropdownMenuFilter == null)
                            let inputSearchProgram = await driver.executeScript(`return document.querySelector("#select-program input[type=search]")`)
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchProgram }).click().perform();
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll("#select-program ul li")`)
                            await thrownAnError("Program is empty", await programs.length == 0)
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 })
                            let programName = await driver.executeScript("return arguments[0].innerText", await programs[randomIndexProgram]);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await programs[randomIndexProgram]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await programs[randomIndexProgram]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let badgeProgramClasses = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-program")).filter(value => value.innerText.includes("${await programName}".replace(/./g, "")))`);
                            let isEmptyClass = await driver.executeScript(`return document.querySelector(".card-body span") ? document.querySelector(".card-body span").innerText.toLowerCase().includes("belum ada kelas") : null`)
                            customMessages = [
                                await badgeProgramClasses.length > 0 || await isEmptyClass != null ? `Successfully sorted by class program ${await programName} ✅` : `Failed to sort by class program ❌`,
                            ];
                            expect(await badgeProgramClasses.length > 0 || await isEmptyClass != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Remove the applied filter from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mendapatkan original list class
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            // Aksi memfilter class by alphabet or date
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            let filters = await driver.executeScript(`return document.querySelectorAll(".dropdown-menu div.dropdown-item")`)
                            let randomFilter = faker.number.int({ min: 0, max: await filters.length - 1 })
                            await driver.executeScript(`return arguments[0].click()`, await filters[randomFilter])

                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi remove filter applied
                            let buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            // await thrownAnError("Button remove filter isn't displayed", await buttonRemoveFilter == null)
                            await buttonRemoveFilter.click();

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            customMessages = [
                                await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null ? "Succesfully removed filter class ✅" : "Failed to remove filter class ❌",
                            ];
                            expect(await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Search by name class from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mencari nama class yang sesuai
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 0, max: await cardClass.length - 1 })
                            let searchClassByName = await driver.executeScript("return arguments[0].innerText", await cardClass[randomIndexClass]);
                            await driver.wait(until.elementLocated(By.css("form.filter-container input#filter-input")))
                            await driver.sleep(1000);
                            for(let index in await searchClassByName) {
                                await driver.findElement(By.css("form.filter-container input#filter-input")).sendKeys(await searchClassByName[index], Key.RETURN);
                                await driver.sleep(700)
                                if(await cardClass?.length && searchClassByName.length - 1 == index) break;
                            }

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully display the classes by search input field ✅" : "Failed to display the classes by search input field ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;
                
                case 9:
                    it(`LEAD REGION - Check menu tab 'Kelas' in sidebar from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let menuClassActive = await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-stack-fill").classList.contains("text-primary")`);
                            let currentUrl = await driver.getCurrentUrl()
                            customMessages = [
                                await menuClassActive && await currentUrl.includes("classroom") ? "Successfully go into classroom page ✅" : "Failed go into classroom page ❌"
                            ];
                            expect(await menuClassActive && await currentUrl.includes("classroom")).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`LEAD REGION - Create a new classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyCourse = faker.datatype.boolean()
                            if(isManyCourse) {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCourse = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxCourse; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                    await driver.sleep(1000)
                                    await courses[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await thrownAnError("There are still empty fields in the form", !isAllFilled);
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null ? "Successfully created a new Classroom ✅" : "Failed to create a new classroom ❌",
                            ];
                            expect(await alertWarning).to.be.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Check button 'Reset' in form create classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih materi untuk join class */
                            // let isManyCourse = faker.datatype.boolean()
                            // if(isManyCourse) {
                            //     await driver.findElement(By.id('checkbox-modules')).click()
                            //     await driver.sleep(2000)
                            //     let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                            //     let maxCourse = faker.number.int({ min: 1, max: 20 });
                            //     await driver.sleep(2000)
                            //     // Meng-checklist banyak materi untuk bergabung di dalam kelas program
                            //     for (let index = 1; index <= maxCourse; index++) {
                            //         await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                            //         await driver.sleep(1000)
                            //         await courses[index].click();
                            //     }
                            //     await driver.sleep(2000)
                            //     await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            // } else {
                            //     await driver.findElement(By.id('checkbox-requirementFields')).click()
                            //     await driver.sleep(2000)
                            //     await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                            //     await driver.sleep(1000)
                            //     await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            // }
                            // await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            await driver.sleep(1000)
                            await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)

                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);")
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=reset]").click()`);
                            }
                            await driver.sleep(2000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(10000);
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            await driver.sleep(2000);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isAllFilled == false ? "Successfully reset the form create classroom ✅" : "Failed to reset the form create classroom ❌",
                            ];
                            expect(isAllFilled).to.be.false;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Save classroom as a 'Draft' from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`
                            
                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(3000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let isAllCity = faker.datatype.boolean()
                            if(isAllCity) {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                maxCity = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxCity; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                    await driver.sleep(1000)
                                    await cities[index].click();
                                }
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                            } else {
                                await driver.findElement(By.id('checkbox-registrantCity')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                await driver.sleep(2000)
                                await driver.findElement(By.id('checkbox-cityHeld')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let isAllRequire = faker.datatype.boolean()
                            if(isAllRequire) {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxRequire = faker.number.int({ min: 1, max: 4 });
                                await driver.sleep(2000)
                                // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                for (let index = 1; index <= maxRequire; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                    await driver.sleep(1000)
                                    await requires[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }   
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyMentor = faker.datatype.boolean()
                            if(isManyMentor) {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxMentor = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxMentor; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                    await driver.sleep(1000)
                                    await mentors[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-mentors')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let isManyCourse = faker.datatype.boolean()
                            if(isManyCourse) {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                let maxCourse = faker.number.int({ min: 1, max: 20 });
                                await driver.sleep(2000)
                                // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                for (let index = 1; index <= maxCourse; index++) {
                                    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                    await driver.sleep(1000)
                                    await courses[index].click();
                                }
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            } else {
                                await driver.findElement(By.id('checkbox-modules')).click()
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                await driver.sleep(1000)
                                await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .custom-control-label")).find(value => value.innerText.includes("Selalu Terbuka")).click()`)
                            // await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            // await driver.sleep(2000)
                            // await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            // await driver.sleep(1000)
                            // await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=reset]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button.btn-default").click()`);
                            }
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let classDraft = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class")).find(value => value.querySelector("h1.title").innerText.includes("${name}")) `)
                            customMessages = [
                                await classDraft ? "Successfully save classroom as a 'Draft' ✅" : "Failed to save classroom as a 'Draft' ❌",
                            ];
                            expect(await classDraft).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`LEAD REGION - Edit the classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memilih salah satu card class untuk di edit
                            let cardClass = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                            let oldName = await driver.executeScript("arguments[0].querySelector('h1.title').innerText", await cardClass);
                            await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await cardClass);
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-edit-line').click()", await cardClass);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi fill form dari create classroom
                            // DUMMY DATA
                            let name = faker.company.name();
                            let description = faker.lorem.text().replace(/\n/g, "\\n")
                            let tags = faker.helpers.arrayElements(['html', 'css', 'javascript', 'php', 'laravel', 'nuxtjs', 'react-js'], 4).join(',')
                            let quota = faker.number.int({ min: 20, max: 100 })
                            let standardPass = faker.number.int({ min: 60, max: 100 })
                            let linkGroupTelegram = 'https://t.me/dotnetcore_id'
                            let today = new Date();
                            let lastDate = new Date(today);
                            lastDate.setMonth(lastDate.getMonth() - 1);
                            let nextDate = new Date(today);
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            let dateOpenRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` : `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateEndRegister = browser == 'firefox' ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}` : `${String(today.getDate() - 1).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                            let dateStartImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth()).padStart(2, '0')}-${nextDate.getFullYear()}`
                            let dateEndImplment = browser == 'firefox' ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}` : `${String(nextDate.getDate()).padStart(2, '0')}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${nextDate.getFullYear()}`

                            /** Aksi mengisi input logo image */ 
                            // let dzButton = driver.findElement(By.css("button.dz-button"));
                            // const actions = driver.actions({async: true});
                            // await actions.move({origin: dzButton}).click().perform();
                            await driver.sleep(2000);
                            /** Aksi mengisi input name */ 
                            await driver.findElement(By.id("Nama *")).clear();
                            await driver.findElement(By.id('Nama *')).sendKeys(name)
                            await driver.sleep(5000);
                            /** Aksi mengisi input description */ 
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000);
                            /** Aksi mengisi tags */
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.executeScript(`return document.getElementById('Tags')`));
                            await driver.sleep(1500);
                            await driver.findElement(By.id("Tags")).clear();
                            await driver.findElement(By.id('Tags')).sendKeys(tags)
                            await driver.sleep(2000)
                            /** Aksi mengisi kuota dan standard kelulusan */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 1000)`);
                            await driver.sleep(1500)
                            await driver.findElement(By.id("Kuota *")).isEnabled() ?? await driver.findElement(By.id("Kuota *")).clear();
                            await driver.findElement(By.id("Kuota *")).isEnabled() ?? await driver.findElement(By.id('Kuota *')).sendKeys(quota)
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("Standar Kelulusan *")));
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Standar Kelulusan *")).clear();
                            await driver.findElement(By.id('Standar Kelulusan *')).sendKeys(standardPass)
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight - 800)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu kota */
                            let registrantCity = await driver.findElement(By.id("checkbox-registrantCity"))
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("checkbox-registrantCity")));
                            await driver.sleep(3000)
                            if(await registrantCity.getAttribute('value') != null && await registrantCity.getAttribute('value') != '') {
                                let isAllCity = faker.datatype.boolean()
                                if(isAllCity) {
                                    await driver.findElement(By.id('checkbox-registrantCity')).click()
                                    await driver.sleep(2000)
                                    let cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxCity = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxCity; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                        await driver.sleep(1000)
                                        await cities[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                    
                                    await driver.findElement(By.id('checkbox-cityHeld')).click()
                                    await driver.sleep(2000)
                                    cities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type]")`);
                                    maxCity = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pelaksanaan) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxCity; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await cities[index]);
                                        await driver.sleep(1000)
                                        await cities[index].click();
                                    }
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                } else {
                                    await driver.findElement(By.id('checkbox-registrantCity')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                    await driver.sleep(2000)
                                    await driver.findElement(By.id('checkbox-cityHeld')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi requirement apa saja yg di perlukan untuk join class */
                            let requirementFields = await driver.findElement(By.id("checkbox-requirementFields"))
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.findElement(By.id("checkbox-requirementFields")));
                            await driver.sleep(1000)
                            let isAllRequire = faker.datatype.boolean()
                            if(await requirementFields.getAttribute("value") != null && await requirementFields.getAttribute("value") != "") {
                                if(isAllRequire) {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    let requires = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxRequire = faker.number.int({ min: 1, max: 4 });
                                    await driver.sleep(2000)
                                    // Meng-checklist semua kota (untuk kota pendaftaran) yg jumlahnya berdasarkan dari max city
                                    for (let index = 1; index <= maxRequire; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await requires[index]);
                                        await driver.sleep(1000)
                                        await requires[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }  
                            } 
                            await driver.sleep(2000)
                            await driver.executeScript(`window.scrollTo(0, 0)`);
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi memasukkan program ke dalam kelas select-programId */
                            await driver.findElement(By.id('select-programId')).click()
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await programs[randomIndexProgram]);
                            await driver.sleep(1500)
                            await programs[randomIndexProgram].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu mode class */
                            await driver.findElement(By.id('select-mode')).click()
                            await driver.sleep(2000)
                            let modes = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexMode = faker.number.int({ min: 0, max: await modes.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await modes[randomIndexMode]);
                            await driver.sleep(1500)
                            await modes[randomIndexMode].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu tipe class */
                            await driver.findElement(By.id('select-type')).click()
                            await driver.sleep(2000)
                            let types = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexType = faker.number.int({ min: 0, max: await types.length - 1 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await types[randomIndexType]);
                            await driver.sleep(1500)
                            await types[randomIndexType].click();
                            await driver.sleep(2000)
                            /** Aksi memilih / menseleksi salah satu aksesbilitas class */
                            await driver.findElement(By.id('select-visibility')).click()
                            await driver.sleep(2000)
                            let accessbillities = await driver.executeScript(`return document.querySelectorAll(".checkbox-container label")`);
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 2 });
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await accessbillities[randomIndexAccebillity]);
                            await driver.sleep(1500)
                            await accessbillities[randomIndexAccebillity].click();
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.getElementById("checkbox-mentors")`));
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let checkboxMentors = await driver.findElement(By.id('checkbox-mentors'))
                            let isManyMentor = faker.datatype.boolean()
                            if(await checkboxMentors.getAttribute("value") != null && await checkboxMentors.getAttribute("value") != "") {
                                if(isManyMentor) {
                                    await checkboxMentors.click()
                                    await driver.sleep(2000)
                                    let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxMentor = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                    for (let index = 1; index <= maxMentor; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                        await driver.sleep(1000)
                                        await mentors[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await driver.findElement(By.id('checkbox-requirementFields')).click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            /** Aksi memilih mentor untuk join class */
                            let checkboxModules = await driver.findElement(By.id('checkbox-modules'))
                            let isManyCourse = faker.datatype.boolean()
                            if(await checkboxMentors.getAttribute("value") != null && await checkboxMentors.getAttribute("value") != "") {
                                if(isManyCourse) {
                                    await checkboxModules.click()
                                    await driver.sleep(2000)
                                    let courses = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`);
                                    let maxCourse = faker.number.int({ min: 1, max: 20 });
                                    await driver.sleep(2000)
                                    // Meng-checklist banyak mentor untuk bergabung di dalam kelas program
                                    for (let index = 1; index <= maxCourse; index++) {
                                        await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await courses[index]);
                                        await driver.sleep(1000)
                                        await courses[index].click();
                                    }
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                } else {
                                    await checkboxModules.click()
                                    await driver.sleep(2000)
                                    await driver.executeScript(`return document.querySelector(".checkbox-container input[type=checkbox]").click()`)
                                    await driver.sleep(1000)
                                    await driver.executeScript(`return document.querySelector(".custom-search-input .box-button button.btn-primary").click()`)
                                }
                            }
                            await driver.sleep(2000)
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).clear();
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            // if(await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].checked`) == false) {
                            //     await driver.findElement(By.id("Pendaftaran Dibuka *")).isEnabled() ?? await driver.findElement(By.id("Pendaftaran Dibuka *")).clear();
                            //     await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pendaftaran Dibuka *')).sendKeys(dateOpenRegister)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pendaftaran Ditutup *")).isEnabled() ?? await driver.findElement(By.id("Pendaftaran Ditutup *")).clear();
                            //     await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pendaftaran Ditutup *')).sendKeys(dateEndRegister)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pelaksanaan Dimulai *")).clear();
                            //     await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pelaksanaan Dimulai *')).sendKeys(dateStartImplment)
                            //     await driver.sleep(2000)
                            //     await driver.findElement(By.id("Pelaksanaan Berakhir *")).clear();
                            //     await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(Key.ENTER)
                            //     await driver.sleep(1000)
                            //     await driver.findElement(By.id('Pelaksanaan Berakhir *')).sendKeys(dateEndImplment)
                            // }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                // await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                await driver.findElement(By.id('select-type')).getAttribute('value'),
                                await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=submit]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                await driver.sleep(4000)
                            }
                            let modalConfirmation = await driver.executeScript(`return document.querySelector(".modal-content button") ? document.querySelector(".modal-content button") : null`)
                            console.log(await modalConfirmation)
                            if(await modalConfirmation != null) await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            if(await alertWarning) {
                                await driver.executeScript(`window.scrollTo(0, 0)`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await oldName != name ? "Successfully edited the classroom ✅" : "Failed to edit the classroom ❌",
                            ];
                            expect(await oldName != name).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    // it(`LEAD REGION - Delete the classroom from browser ${browser}`, async () => {

                    //     try {

                    //         // Go to application
                    //         driver = await goToApp(browser, appHost);
                    //         await driver.manage().window().maximize();

                    //         // login to the application
                    //         errorMessages = await enterDashboard(driver, user, browser, appHost);

                    //         // Aksi sleep 
                    //         await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                    //         await driver.sleep(5000)

                    //         // Aksi menu tab 'Kelas'
                    //         await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(5000);
                    //         let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                    //         let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                    //         if(await emptyClass == null) {
                    //             while(await cardClassTitle == null) {
                    //                 cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                    //                 // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                    //                 await driver.sleep(5000)
                    //             }
                    //         }

                    //         // Aksi memilih salah satu card class untuk di delete
                    //         let selectedCard = await driver.executeScript(`return document.querySelector("#section-class .card-class")`);
                    //         let className = await driver.executeScript(`return arguments[0].querySelector("h1.title").innerText`, await selectedCard)
                    //         await driver.sleep(1000)
                    //         await driver.executeScript("arguments[0].querySelector('.ri-more-line').click()", await selectedCard);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript("arguments[0].querySelector('.dropdown-menu a i.ri-delete-bin-7-line').click()", await selectedCard);
                    //         await driver.sleep(2000)
                    //         await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                    //         await driver.sleep(2000)
                    //         let textDanger = await driver.executeScript(`return document.querySelector(".modal-content .text-danger") ? document.querySelector(".modal-content .text-danger") : null`)
                    //         if(textDanger != null) await thrownAnError(await textDanger?.getAttribute("innerText"), await textDanger != null)
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(5000);
                    //         cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                    //         emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                    //         if(await emptyClass == null) {
                    //             while(await cardClassTitle == null) {
                    //                 cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                    //                 // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                    //                 await driver.sleep(5000)
                    //             }
                    //         }

                    //         // Expect results and add custom message for addtional description
                    //         let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class")).find(value => value.querySelector("h1.title").innerText.includes("${await className}"))`);
                    //         customMessages = [
                    //             await cardClass == null ? "Successfully deleted the classroom ✅" : "Failed to delete the classroom ❌",
                    //         ];
                    //         expect(await cardClass, "Expected classroom is deleted but it's still exist").to.be.null;


                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });

                    it(`LEAD REGION - Filter class by "Draft" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik menu tab draft classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelector(".item-tab").click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Draft' ✅" : "Failed to filter class by menu tab 'Draft' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Filter class by "Semua" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Draft" || value.innerText === "Pendaftaran" || value.innerText === "Berlangsung" || value.innerText === "Selesai");`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Semua' ✅" : "Failed filter class by menu tab 'Semua' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Filter class by "Pendaftaran" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Pendaftaran' ✅" : "Failed filter class by menu tab 'Pendaftaran' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Filter class by "Berlangsung" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlansung' classes
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText.includes("Berlangsung") || value.innerText.includes("Pendaftaran") && (value.innerText != "Draft" && value.innerText != "Selesai"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Berlangsung' ✅" : "Failed filter class by menu tab 'Berlangsung' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`LEAD REGION - Filter class by "Selesai" type from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi klik menu tab 'Selesai' classes
                            await driver.executeScript(`return document.querySelectorAll(".item-tab")[4].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let cardClass = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-progress")).filter(value => value.innerText === "Selesai" && (value.innerText != "Pendaftaran" && value.innerText != "Berlangsung" && value.innerText != "Draft"));`);
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully filtered class by menu tab 'Selesai' ✅" : "Failed to filter class by menu tab 'Selesai' ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Filter sort classroom by alphabet from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by alphabet
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, titles;
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(5000)
                            // Aksi mendapatkan semua kelas
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                            if(isAsc) {
                                await driver.executeScript(`return document.querySelector(".filter-container .dropdown-menu .dropdown-item").click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                      if (arr[i][0]?.toLowerCase() != arr[i - 1][0]?.toLowerCase()) { // arr[i].localeCompare(arr[i - 1], 'en', { sensitivity: 'base' }) < 0
                                        return false;
                                      }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            } else {
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[1].click()`)
                                await driver.sleep(2000);
                                cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                if(await emptyClass == null) {
                                    while(await cardClassTitle == null) {
                                        cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                        // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                        await driver.sleep(5000)
                                    }
                                }
                                cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`)
                                titles = await Promise.all(cardClass.map(async (card) => {
                                    const h1Element = await card.findElement(By.css('h1'));
                                    return h1Element.getText();
                                }));
                                function isSorted(arr) {
                                    for (let i = 1; i < arr.length; i++) {
                                        if (arr[i][0].localeCompare(arr[i - 1][0], 'en', { sensitivity: 'base' }) > 0) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                isOrdered = isSorted(titles);
                            }

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by alphabet ✅" : "Failed to sort by alphabet ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Filter sort classroom by date from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000)

                            // Aksi klik menu tab 'Berlangsung' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[3].click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi memfilter class by date
                            let isAsc = faker.datatype.boolean()
                            let isOrdered, newCardClass;
                            // Aksi mendapatkan kelas
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            if(isAsc) {
                                // Tanggal Terdekat
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[3].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass.getAttribute("innerHTML")
                            } else {
                                // Tanggal Terjauh
                                await driver.executeScript(`return document.querySelectorAll(".filter-container .dropdown-menu .dropdown-item")[2].click()`)
                                await driver.sleep(5000)
                                newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`)
                                await driver.sleep(2000)
                                isOrdered = await originalCardClass != await newCardClass
                            }

                            // Aksi Sleep
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isOrdered ? "Successfully sorted by date ✅" : "Failed to sort by date ❌",
                            ];
                            expect(isOrdered).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Filter classes by program from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000)

                            // Aksi klik menu tab 'Pendaftaran' class
                            await driver.wait(until.elementLocated(By.css(".item-tab span")))
                            await driver.executeScript(`return document.querySelectorAll(".item-tab span")[2].click()`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi memfilter class by program
                            await driver.executeScript(`return document.querySelector("#dropdown-filter button").click()`)
                            await driver.sleep(2000)
                            let dropdownMenuFilter = await driver.executeScript(`return document.querySelector("ul.dropdown-menu")`)
                            await thrownAnError("Dropdown menu filter isn't showed up", await dropdownMenuFilter == null)
                            let inputSearchProgram = await driver.executeScript(`return document.querySelector("#select-program input[type=search]")`)
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchProgram }).click().perform();
                            await driver.sleep(2000)
                            let programs = await driver.executeScript(`return document.querySelectorAll("#select-program ul li")`)
                            await thrownAnError("Program is empty", await programs.length == 0)
                            let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 })
                            let programName = await driver.executeScript("return arguments[0].innerText", await programs[randomIndexProgram]);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await programs[randomIndexProgram]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await programs[randomIndexProgram]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let badgeProgramClasses = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class .badge-program")).filter(value => value.innerText.includes("${await programName}".replace(/./g, "")))`);
                            let isEmptyClass = await driver.executeScript(`return document.querySelector(".card-body span") ? document.querySelector(".card-body span").innerText.toLowerCase().includes("belum ada kelas") : null`)
                            customMessages = [
                                await badgeProgramClasses.length > 0 || await isEmptyClass != null ? `Successfully sorted by class program ${await programName} ✅` : `Failed to sort by class program ❌`,
                            ];
                            expect(await badgeProgramClasses.length > 0 || await isEmptyClass != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Remove the applied filter from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mendapatkan original list class
                            let originalCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            // Aksi memfilter class by alphabet or date
                            await driver.executeScript(`return document.querySelector(".filter-container button#dropdown-sort").click()`)
                            await driver.sleep(2000)
                            let filters = await driver.executeScript(`return document.querySelectorAll(".dropdown-menu div.dropdown-item")`)
                            let randomFilter = faker.number.int({ min: 0, max: await filters.length - 1 })
                            await driver.executeScript(`return arguments[0].click()`, await filters[randomFilter])

                            // Aksi sleep 
                            await driver.sleep(10000)

                            // Aksi remove filter applied
                            let buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            // await thrownAnError("Button remove filter isn't displayed", await buttonRemoveFilter == null)
                            await buttonRemoveFilter.click();

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            let newCardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .row")[1]`);
                            buttonRemoveFilter = await driver.executeScript(`return document.querySelector("#section-class button.btn-text-primary") ? document.querySelector("#section-class button.btn-text-primary") : null`)
                            customMessages = [
                                await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null ? "Succesfully removed filter class ✅" : "Failed to remove filter class ❌",
                            ];
                            expect(await originalCardClass.getAttribute("innerHTML") == await newCardClass.getAttribute("innerHTML") && buttonRemoveFilter == null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Search by name class from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));
                            await driver.sleep(5000)

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            let emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Aksi mencari nama class yang sesuai
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 0, max: await cardClass.length - 1 })
                            let searchClassByName = await driver.executeScript("return arguments[0].innerText", await cardClass[randomIndexClass]);
                            await driver.wait(until.elementLocated(By.css("form.filter-container input#filter-input")))
                            await driver.sleep(1000);
                            for(let index in await searchClassByName) {
                                await driver.findElement(By.css("form.filter-container input#filter-input")).sendKeys(await searchClassByName[index], Key.RETURN);
                                await driver.sleep(700)
                                if(await cardClass?.length && searchClassByName.length - 1 == index) break;
                            }

                            // Aksi sleep 
                            await driver.sleep(5000);
                            cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                            emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                            if(await emptyClass == null) {
                                while(await cardClassTitle == null || await cardClassTitle?.length == 0) {
                                    cardClassTitle = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class h1.title") ? document.querySelectorAll("#section-class .card-class h1.title") : null;`);
                                    // emptyClass = await driver.executeScript(`return document.querySelector("#section-class .card .card-body span") ? document.querySelector("#section-class .card .card-body span") : null`)
                                    await driver.sleep(5000)
                                }
                            }

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await cardClass.length > 0 ? "Successfully display the classes by search input field ✅" : "Failed to display the classes by search input field ❌",
                            ];
                            expect(await cardClass.length > 0).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                default:
                    it(`Other - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")));

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
            }
        });

    })



});