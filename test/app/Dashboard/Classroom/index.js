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

describe("Attendance", () => {
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
        let fileNamePath = path.resolve(`${screenshootFilePath}/${this.currentTest?.state != 'failed' ? (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[passed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") : (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[failed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") }.png`);
        await takeScreenshot(driver, fileNamePath);
        if(this.currentTest.isPassed) {
            addContext(this, {
                title: 'Expected Results',
                value: customMessages?.length > 0 ? "- " + customMessages.map(msg => msg.trim()).join("\n- ") : 'No Results'
            })
        } 
        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: path.relative(fileURLToPath(import.meta.url), fileNamePath)
        });
        await driver.sleep(3000);
        await driver.quit();
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
                    it(`SUPER ADMIN - Create a new classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}`;
                            let dateStartImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            let dateEndImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            
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
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 1 });
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
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
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
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-success") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null ? "Successfully created a new Classroom ✅" : "Failed to create a new classroom ❌",
                            ];
                            expect(await alertWarning).to.be.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Check button 'Reset' in form create classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}`;
                            let dateStartImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            let dateEndImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            
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
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 1 });
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
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
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
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=reset]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=reset]").click()`);
                            }
                            await driver.sleep(2000);

                            // Cek semua value menjadi blank lagi atau kosong
                            isAllFilled = await Promise.all([
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

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isAllFilled == false ? "Successfully reset the form create classroom ✅" : "Failed to the form create classroom ❌",
                            ];
                            expect(isAllFilled).to.be.false;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 1:
                    it(`ADMIN - Create a new classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}`;
                            let dateStartImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            let dateEndImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            
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
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 1 });
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
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
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
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-success") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button '+ Kelas'
                            await driver.executeScript(`return document.querySelector(".main-content .box-button a.btn-primary").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')}`;
                            let dateStartImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            let dateEndImplment = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
                            
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
                            let randomIndexAccebillity = faker.number.int({ min: 0, max: await accessbillities.length - 1 });
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
                                await driver.findElement(By.id('checkbox-requirementFields')).click()
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
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=reset]")`);
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector("form button[type=reset]").click()`);
                            }
                            await driver.sleep(2000);

                            // Cek semua value menjadi blank lagi atau kosong
                            isAllFilled = await Promise.all([
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

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                isAllFilled == false ? "Successfully reset the form create classroom ✅" : "Failed to the form create classroom ❌",
                            ];
                            expect(isAllFilled).to.be.false;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 2:
                    it(`MENTOR - from browser ${browser}`, async () => {

                        try {
                            
                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 4:
                    it(`STUDENT - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;

                case 7:
                    it(`LEAD PROGRAM - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 9:
                    it(`LEAD REGION - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

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
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

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