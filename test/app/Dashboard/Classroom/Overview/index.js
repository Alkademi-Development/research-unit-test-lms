import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities, locateWith, Select } from 'selenium-webdriver';
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
            value: "..\\" + path.relative(fileURLToPath(import.meta.url), fileNamePath),
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
                    it(`SUPER ADMIN - Check menu tab 'Overview' in detail classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu class
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 1, max: 3 });
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('h1.title').click()", await cardClass[randomIndexClass]);

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let overviewTab = await driver.executeScript(`return document.querySelector(".item-tab").style.borderBottom`);
                            customMessages = [
                                await overviewTab != null ? "Successfully displayed menu tab 'overview' ✅" : "Failed go into menu tab 'overview' ❌",
                            ];
                            expect(await overviewTab).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Create Pretest in detail classroom from browser ${browser}`, async () => {

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
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1]`));
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                // await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                // await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                // await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                // await driver.findElement(By.id('select-type')).getAttribute('value'),
                                // await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=button].btn-default").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi masuk ke dalam draft class yang telah di buat sebelumnya
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class h1.title")).find(value => value.innerText.includes("${name}")).click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Tambah Pretest' dan Konfirmasi
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi fill form create pretest
                            // Dummy Data
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs()
                            dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 08:00`;
                            dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            // textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            // iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            // await driver.switchTo().frame(iframeTextEditorMce);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await iframeBody.clear();
                            // await driver.sleep(1000);
                            // await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await driver.sleep(1000);
                            // await driver.switchTo().defaultContent();
                            // await driver.sleep(2000)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Successfully created a pretest and redirect to the list pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Create a new pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Cek jika pretest itu sudah membuat pretest atau belum
                            let typeButton = await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].innerText`)
                            if(await typeButton === 'Tambah Pretest') {
                                // Aksi klik button '+ Pretest'
                                await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-content .btn-primary").click()`)
                            } else {
                                // Aksi mengklik button 'Lihat Pretest'
                                await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelectorAll(".card-body .btn-primary")[1].click()`)
                            }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengisi form create pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n')
                            let today = new Date()
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 10:00`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            await driver.executeScript(`
                                var iframe = document.querySelector('.tox-edit-area iframe'); 
                                var node = iframe.contentDocument.querySelector('body'); 
                                node.innerHTML = "${desc}" 
                            `)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully created a new pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Edit the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-pencil-line").click()`, await cardPretest[randomIndexPretest]);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi change the data of pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n') 
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).clear()
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = "${desc}"`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully edited the pretest ✅" : "Failed to edit the pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Delete the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            let title = await driver.executeScript(`arguments[0].querySelector(".title-container .title").innerText`, await cardPretest[randomIndexPretest]);
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-delete-bin-7-line").click()`, await cardPretest[randomIndexPretest]);
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let pretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await pretest == null ? "Succesfully deleted the pretest ✅" : "Failed to delete the pretest ❌",
                            ];
                            expect(await pretest == null).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Recap Pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menekan tombol 'Rekap Pretest'
                            await driver.executeScript(`return document.querySelector(".card-body .btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let recapPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Rekap Peserta Pretest"))`)
                            customMessages = [
                                await recapPretest != null ? 'Succesfully displayed Participant Recap ✅' : 'Failed to display Participant Recap ❌'
                            ]
                            expect(await recapPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Check Pretest Participants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk melihat peserta pretestnya
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let listParticipantPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Daftar Peserta Pretest"))`)
                            customMessages = [
                                await listParticipantPretest != null ? 'Succesfully View all participants ✅' : 'Failed to view all partcipants ❌'
                            ]
                            expect(await listParticipantPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Check the button "Download" of pretest partcipants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            let btnDetailPretest = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview .btn-action-add")).find(value => value.innerText.includes("Lihat Pretest"))`)
                            await thrownAnError("Button 'Lihat Pretest' was not found", await btnDetailPretest == null)
                            await btnDetailPretest.click()
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1})
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Download' di table list peserta
                            let logDownloaded = await driver.executeScript(`
                                console.defaultLog = console.log.bind(console);
                                let logs = [];
                                console.log = function(){
                                    // default &  console.log()
                                    console.defaultLog.apply(console, arguments);
                                    // new & array data
                                    logs.push(Array.from(arguments));
                                }
                                document.querySelector(".card-body button.btn-primary").addEventListener("click", () => console.log("downloaded")) 
                                document.querySelector(".card-body button.btn-primary").click() 
                                return logs
                            `)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await logDownloaded.length > 0 ? 'Succesfully download data of all participants in csv form ✅' : 'Failed to download data of participants ❌'
                            ]
                            expect(await logDownloaded.length > 0).to.be.true


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    // it(`SUPER ADMIN - Check the button "Terbitkan Kelas" for the "draft" classes from browser ${browser}`, async () => {

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
                    //         await driver.sleep(3000);

                    //         // Aksi klik button menu tab 'Draft'
                    //         await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi memilih kelas untuk membuat tugas pretest baru
                    //         let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                    //         await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi mengklik button 'Terbitkan Kelas'
                    //         let btnStart = await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class")`)
                    //         let actions = driver.actions({async: true});
                    //         await actions.doubleClick(await btnStart).perform();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Expect results and add custom message for addtional description
                    //         let foundClass = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class .item-header h1.title")).find(value => value.innerText.includes('${classTitle}'))`)
                    //         customMessages = [
                    //             await foundClass != null ? 'Successfully moved the class to public ✅' : 'Failed to move the class to public ❌'
                    //         ]
                    //         expect(await foundClass).to.be.not.null

                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });
                    
                    it(`SUPER ADMIN - Publish the class & Check the button "Terbitkan Pengumuman" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Aksi memilih kelas
                            let classroom = await driver.executeScript(`return document.querySelector("#section-class .card-class")`)
                            let className = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`);
                            await driver.sleep(1000)
                            await driver.executeScript(`arguments[0].querySelector("h1.title").click()`, await classroom);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Aksi mengklik button 'Terbitkan Kelas'
                            await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class").click()`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi klik kelas yang telah di terbitkan
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click();`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi mengklik kelas yang telah di terbitkan
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".item-class h1.title")).find(value => value.innerText.includes("${await className}")).click();`)
                            
                            // Aksi sleep
                            await driver.sleep(3000)
                            
                            // Aksi mengkil button 'Terbitkan Pengumuman'
                            let btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            await thrownAnError("There was no button publish announcement", await btnPublishAnnoucement == null)
                            await btnPublishAnnoucement.click()
                            await driver.sleep(3000)
                            let score = faker.number.int({ min: 50, max: 100 })
                            await driver.findElement(By.css(".modal-content input[type=number]")).sendKeys(score)
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelector(".modal-content button[type=submit].btn-primary").click();`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Expect results and add custom message for addtional description
                            btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            customMessages = [
                                await btnPublishAnnoucement == null ? 'Successfully publish the announcement of passed value ✅' : 'Failed to publish the announcement of passed value ❌'
                            ]
                            expect(await btnPublishAnnoucement).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Fill the link "Group Kelas" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Aksi klik tambahkan link group
                            let linkGroup = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body")).find(cardBody => {
                                const h4Elements = cardBody.querySelectorAll("h4");
                                return Array.from(h4Elements).some(h4 => h4.innerText.includes("Grup Kelas"));
                            });`)
                            let linkText = await driver.executeScript(`arguments[0].querySelector("a.text-limit").innerText`, await linkGroup)
                            if(await linkText == 'Tambahkan Link Grup') {
                                await driver.executeScript(`arguments[0].querySelector("a.text-limit").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            } else {
                                await driver.executeScript(`arguments[0].querySelector(".btn-pencil").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            }
                            await driver.sleep(2000)
                            await driver.findElement(By.css(".card-body input[type=url]")).sendKeys("https://t.me/dotnetcore_id", Key.ENTER)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            linkGroup = await driver.executeScript(`return document.querySelector(".card-body .text-limit").href;`);
                            customMessages = [
                                await linkGroup != null && await linkGroup != '' ? 'Successfully added link group for Telegram or Whatsaap ✅' : 'Failed to add link group ❌'
                            ]
                            expect(await linkGroup != null && await linkGroup != '').to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Add mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik tambahkan mentor pada kelas
                            let mentorAmount = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users").length`)
                            await driver.executeScript(`return document.querySelector(".card-body .btn-outline-primary .fa-plus").click()`)
                            await thrownAnError("Modal 'Tambah Mentor' isn't showed up", await driver.findElement(By.css(".modal-content")) === null)

                            await driver.sleep(4000)

                            // Aksi memilih mentor untuk kelas
                            await driver.executeScript(`return document.querySelector("input#checkbox-add-mentor").click()`)
                            await driver.sleep(2000)
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`)
                            await thrownAnError("Mentor is empty", await mentors.length == 0)
                            let maxMentor = faker.number.int({ min: 0, max: 4 })
                            for (let index = 0; index < maxMentor; index++) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                await driver.sleep(1000)
                                await mentors[index].click()
                                await driver.sleep(1000)
                            }
                            await driver.sleep(2000)
                            // Aksi konfirmasi pemilihan mentor
                            await driver.executeScript(`return document.querySelector(".card-input .box-button .btn-submit-checkbox").click()`)
                            await driver.sleep(2000)
                            let selectedMentors = await driver.executeScript(`return document.querySelectorAll(".modal-content .city-card")`)
                            await thrownAnError("There was no mentor selected, please select one of mentor first", await selectedMentors.length == 0)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            customMessages = [
                                await mentors.length != await mentorAmount ? 'Successfully added mentor ✅' : 'Failed to add mentor ❌'
                            ]
                            expect(await mentors.length).to.not.be.equal(await mentorAmount)

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Delete mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih mentor untuk di hapus dari kelas
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            await thrownAnError("Mentor is empty", await mentors?.length == 0 || await mentors == null)
                            let randomIndexMentor = faker.number.int({ min: 0, max: await mentors.length - 1 })
                            let selectedMentor = await mentors[randomIndexMentor]
                            let mentorName = await driver.executeScript(`arguments[0].querySelector(".box-profile h5").innerText`, await selectedMentor)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await selectedMentor);
                            await driver.sleep(1500)
                            // let actions = await driver.actions({async: true});
                            // await actions.move({origin: await selectedMentor}).perform();
                            // await driver.sleep(1500)
                            // await thrownAnError("Icon delete isn't showed up", await driver.executeScript(`arguments[0].querySelector(".btn-remove")`, await selectedMentor) == null)
                            await driver.executeScript(`arguments[0].querySelector(".btn-remove").click()`, await selectedMentor)
                            await driver.sleep(2000)
                            // Konfirmasi hapus mentor
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            selectedMentor = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .box-users .box-profile h5")).find(value => value.innerText.includes("${mentorName}"))`)
                            customMessages = [
                                await selectedMentor == null ? 'Successfully deleted mentor ✅' : 'Failed to delete mentor ❌'
                            ]
                            expect(await selectedMentor).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 1:
                    it(`ADMIN - Check menu tab 'Overview' in detail classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu class
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 1, max: 3 });
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('h1.title').click()", await cardClass[randomIndexClass]);

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let overviewTab = await driver.executeScript(`return document.querySelector(".item-tab").style.borderBottom`);
                            customMessages = [
                                await overviewTab != null ? "Successfully displayed menu tab 'overview' ✅" : "Failed go into menu tab 'overview' ❌",
                            ];
                            expect(await overviewTab).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Create Pretest in detail classroom from browser ${browser}`, async () => {

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
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1]`));
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                // await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                // await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                // await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                // await driver.findElement(By.id('select-type')).getAttribute('value'),
                                // await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=button].btn-default").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi masuk ke dalam draft class yang telah di buat sebelumnya
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class h1.title")).find(value => value.innerText.includes("${name}")).click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Tambah Pretest' dan Konfirmasi
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi fill form create pretest
                            // Dummy Data
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs()
                            dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 08:00`;
                            dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            // textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            // iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            // await driver.switchTo().frame(iframeTextEditorMce);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await iframeBody.clear();
                            // await driver.sleep(1000);
                            // await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await driver.sleep(1000);
                            // await driver.switchTo().defaultContent();
                            // await driver.sleep(2000)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Successfully created a pretest and redirect to the list pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Create a new pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Cek jika pretest itu sudah membuat pretest atau belum
                            let typeButton = await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].innerText`)
                            if(await typeButton === 'Tambah Pretest') {
                                // Aksi klik button '+ Pretest'
                                await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-content .btn-primary").click()`)
                            } else {
                                // Aksi mengklik button 'Lihat Pretest'
                                await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelectorAll(".card-body .btn-primary")[1].click()`)
                            }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengisi form create pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n')
                            let today = new Date()
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 10:00`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            await driver.executeScript(`
                                var iframe = document.querySelector('.tox-edit-area iframe'); 
                                var node = iframe.contentDocument.querySelector('body'); 
                                node.innerHTML = "${desc}" 
                            `)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully created a new pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Edit the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-pencil-line").click()`, await cardPretest[randomIndexPretest]);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi change the data of pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n') 
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).clear()
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = "${desc}"`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully edited the pretest ✅" : "Failed to edit the pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Delete the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            let title = await driver.executeScript(`arguments[0].querySelector(".title-container .title").innerText`, await cardPretest[randomIndexPretest]);
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-delete-bin-7-line").click()`, await cardPretest[randomIndexPretest]);
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let pretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await pretest == null ? "Succesfully deleted the pretest ✅" : "Failed to delete the pretest ❌",
                            ];
                            expect(await pretest == null).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Recap Pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menekan tombol 'Rekap Pretest'
                            await driver.executeScript(`return document.querySelector(".card-body .btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let recapPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Rekap Peserta Pretest"))`)
                            customMessages = [
                                await recapPretest != null ? 'Succesfully displayed Participant Recap ✅' : 'Failed to display Participant Recap ❌'
                            ]
                            expect(await recapPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Check Pretest Participants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk melihat peserta pretestnya
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let listParticipantPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Daftar Peserta Pretest"))`)
                            customMessages = [
                                await listParticipantPretest != null ? 'Succesfully View all participants ✅' : 'Failed to view all partcipants ❌'
                            ]
                            expect(await listParticipantPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Check the button "Download" of pretest partcipants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            let btnDetailPretest = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview .btn-action-add")).find(value => value.innerText.includes("Lihat Pretest"))`)
                            await thrownAnError("Button 'Lihat Pretest' was not found", await btnDetailPretest == null)
                            await btnDetailPretest.click()
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1})
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Download' di table list peserta
                            let logDownloaded = await driver.executeScript(`
                                console.defaultLog = console.log.bind(console);
                                let logs = [];
                                console.log = function(){
                                    // default &  console.log()
                                    console.defaultLog.apply(console, arguments);
                                    // new & array data
                                    logs.push(Array.from(arguments));
                                }
                                document.querySelector(".card-body button.btn-primary").addEventListener("click", () => console.log("downloaded")) 
                                document.querySelector(".card-body button.btn-primary").click() 
                                return logs
                            `)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await logDownloaded.length > 0 ? 'Succesfully download data of all participants in csv form ✅' : 'Failed to download data of participants ❌'
                            ]
                            expect(await logDownloaded.length > 0).to.be.true


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    // it(`ADMIN - Check the button "Terbitkan Kelas" for the "draft" classes from browser ${browser}`, async () => {

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
                    //         await driver.sleep(3000);

                    //         // Aksi klik button menu tab 'Draft'
                    //         await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi memilih kelas untuk membuat tugas pretest baru
                    //         let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                    //         await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi mengklik button 'Terbitkan Kelas'
                    //         let btnStart = await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class")`)
                    //         let actions = driver.actions({async: true});
                    //         await actions.doubleClick(await btnStart).perform();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Expect results and add custom message for addtional description
                    //         let foundClass = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class .item-header h1.title")).find(value => value.innerText.includes('${classTitle}'))`)
                    //         customMessages = [
                    //             await foundClass != null ? 'Successfully moved the class to public ✅' : 'Failed to move the class to public ❌'
                    //         ]
                    //         expect(await foundClass).to.be.not.null

                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });
                    
                    it(`ADMIN - Publish the class & Check the button "Terbitkan Pengumuman" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Aksi memilih kelas
                            let classroom = await driver.executeScript(`return document.querySelector("#section-class .card-class")`)
                            let className = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`);
                            await driver.sleep(1000)
                            await driver.executeScript(`arguments[0].querySelector("h1.title").click()`, await classroom);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Aksi mengklik button 'Terbitkan Kelas'
                            await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class").click()`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi klik kelas yang telah di terbitkan
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click();`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi mengklik kelas yang telah di terbitkan
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".item-class h1.title")).find(value => value.innerText.includes("${await className}")).click();`)
                            
                            // Aksi sleep
                            await driver.sleep(3000)
                            
                            // Aksi mengkil button 'Terbitkan Pengumuman'
                            let btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            await thrownAnError("There was no button publish announcement", await btnPublishAnnoucement == null)
                            await btnPublishAnnoucement.click()
                            await driver.sleep(3000)
                            let score = faker.number.int({ min: 50, max: 100 })
                            await driver.findElement(By.css(".modal-content input[type=number]")).sendKeys(score)
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelector(".modal-content button[type=submit].btn-primary").click();`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Expect results and add custom message for addtional description
                            btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            customMessages = [
                                await btnPublishAnnoucement == null ? 'Successfully publish the announcement of passed value ✅' : 'Failed to publish the announcement of passed value ❌'
                            ]
                            expect(await btnPublishAnnoucement).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Fill the link "Group Kelas" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Aksi klik tambahkan link group
                            let linkGroup = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body")).find(cardBody => {
                                const h4Elements = cardBody.querySelectorAll("h4");
                                return Array.from(h4Elements).some(h4 => h4.innerText.includes("Grup Kelas"));
                            });`)
                            let linkText = await driver.executeScript(`arguments[0].querySelector("a.text-limit").innerText`, await linkGroup)
                            if(await linkText == 'Tambahkan Link Grup') {
                                await driver.executeScript(`arguments[0].querySelector("a.text-limit").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            } else {
                                await driver.executeScript(`arguments[0].querySelector(".btn-pencil").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            }
                            await driver.sleep(2000)
                            await driver.findElement(By.css(".card-body input[type=url]")).sendKeys("https://t.me/dotnetcore_id", Key.ENTER)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            linkGroup = await driver.executeScript(`return document.querySelector(".card-body .text-limit").href;`);
                            customMessages = [
                                await linkGroup != null && await linkGroup != '' ? 'Successfully added link group for Telegram or Whatsaap ✅' : 'Failed to add link group ❌'
                            ]
                            expect(await linkGroup != null && await linkGroup != '').to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Add mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik tambahkan mentor pada kelas
                            let mentorAmount = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users").length`)
                            await driver.executeScript(`return document.querySelector(".card-body .btn-outline-primary .fa-plus").click()`)
                            await thrownAnError("Modal 'Tambah Mentor' isn't showed up", await driver.findElement(By.css(".modal-content")) === null)

                            await driver.sleep(4000)

                            // Aksi memilih mentor untuk kelas
                            await driver.executeScript(`return document.querySelector("input#checkbox-add-mentor").click()`)
                            await driver.sleep(2000)
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`)
                            await thrownAnError("Mentor is empty", await mentors.length == 0)
                            let maxMentor = faker.number.int({ min: 0, max: 4 })
                            for (let index = 0; index < maxMentor; index++) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                await driver.sleep(1000)
                                await mentors[index].click()
                                await driver.sleep(1000)
                            }
                            await driver.sleep(2000)
                            // Aksi konfirmasi pemilihan mentor
                            await driver.executeScript(`return document.querySelector(".card-input .box-button .btn-submit-checkbox").click()`)
                            await driver.sleep(2000)
                            let selectedMentors = await driver.executeScript(`return document.querySelectorAll(".modal-content .city-card")`)
                            await thrownAnError("There was no mentor selected, please select one of mentor first", await selectedMentors.length == 0)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            customMessages = [
                                await mentors.length != await mentorAmount ? 'Successfully added mentor ✅' : 'Failed to add mentor ❌'
                            ]
                            expect(await mentors.length).to.not.be.equal(await mentorAmount)

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Delete mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih mentor untuk di hapus dari kelas
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            await thrownAnError("Mentor is empty", await mentors?.length == 0 || await mentors == null)
                            let randomIndexMentor = faker.number.int({ min: 0, max: await mentors.length - 1 })
                            let selectedMentor = await mentors[randomIndexMentor]
                            let mentorName = await driver.executeScript(`arguments[0].querySelector(".box-profile h5").innerText`, await selectedMentor)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await selectedMentor);
                            await driver.sleep(1500)
                            // let actions = await driver.actions({async: true});
                            // await actions.move({origin: await selectedMentor}).perform();
                            // await driver.sleep(1500)
                            // await thrownAnError("Icon delete isn't showed up", await driver.executeScript(`arguments[0].querySelector(".btn-remove")`, await selectedMentor) == null)
                            await driver.executeScript(`arguments[0].querySelector(".btn-remove").click()`, await selectedMentor)
                            await driver.sleep(2000)
                            // Konfirmasi hapus mentor
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            selectedMentor = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .box-users .box-profile h5")).find(value => value.innerText.includes("${mentorName}"))`)
                            customMessages = [
                                await selectedMentor == null ? 'Successfully deleted mentor ✅' : 'Failed to delete mentor ❌'
                            ]
                            expect(await selectedMentor).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 2:
                    it(`ADMIN - Check menu tab 'Overview' in detail classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu class
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 1, max: 3 });
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('h1.title').click()", await cardClass[randomIndexClass]);

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let overviewTab = await driver.executeScript(`return document.querySelector(".item-tab").style.borderBottom`);
                            customMessages = [
                                await overviewTab != null ? "Successfully displayed menu tab 'overview' ✅" : "Failed go into menu tab 'overview' ❌",
                            ];
                            expect(await overviewTab).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Create Pretest in detail classroom from browser ${browser}`, async () => {

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
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1]`));
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                // await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                // await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                // await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                // await driver.findElement(By.id('select-type')).getAttribute('value'),
                                // await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=button].btn-default").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi masuk ke dalam draft class yang telah di buat sebelumnya
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class h1.title")).find(value => value.innerText.includes("${name}")).click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Tambah Pretest' dan Konfirmasi
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi fill form create pretest
                            // Dummy Data
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs()
                            dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 08:00`;
                            dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            // textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            // iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            // await driver.switchTo().frame(iframeTextEditorMce);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await iframeBody.clear();
                            // await driver.sleep(1000);
                            // await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await driver.sleep(1000);
                            // await driver.switchTo().defaultContent();
                            // await driver.sleep(2000)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Successfully created a pretest and redirect to the list pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Create a new pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Cek jika pretest itu sudah membuat pretest atau belum
                            let typeButton = await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].innerText`)
                            if(await typeButton === 'Tambah Pretest') {
                                // Aksi klik button '+ Pretest'
                                await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-content .btn-primary").click()`)
                            } else {
                                // Aksi mengklik button 'Lihat Pretest'
                                await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelectorAll(".card-body .btn-primary")[1].click()`)
                            }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengisi form create pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n')
                            let today = new Date()
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 10:00`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            await driver.executeScript(`
                                var iframe = document.querySelector('.tox-edit-area iframe'); 
                                var node = iframe.contentDocument.querySelector('body'); 
                                node.innerHTML = "${desc}" 
                            `)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully created a new pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Edit the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-pencil-line").click()`, await cardPretest[randomIndexPretest]);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi change the data of pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n') 
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).clear()
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = "${desc}"`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully edited the pretest ✅" : "Failed to edit the pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Delete the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            let title = await driver.executeScript(`arguments[0].querySelector(".title-container .title").innerText`, await cardPretest[randomIndexPretest]);
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-delete-bin-7-line").click()`, await cardPretest[randomIndexPretest]);
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let pretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await pretest == null ? "Succesfully deleted the pretest ✅" : "Failed to delete the pretest ❌",
                            ];
                            expect(await pretest == null).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Recap Pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menekan tombol 'Rekap Pretest'
                            await driver.executeScript(`return document.querySelector(".card-body .btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let recapPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Rekap Peserta Pretest"))`)
                            customMessages = [
                                await recapPretest != null ? 'Succesfully displayed Participant Recap ✅' : 'Failed to display Participant Recap ❌'
                            ]
                            expect(await recapPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Check Pretest Participants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk melihat peserta pretestnya
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let listParticipantPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Daftar Peserta Pretest"))`)
                            customMessages = [
                                await listParticipantPretest != null ? 'Succesfully View all participants ✅' : 'Failed to view all partcipants ❌'
                            ]
                            expect(await listParticipantPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Check the button "Download" of pretest partcipants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            let btnDetailPretest = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview .btn-action-add")).find(value => value.innerText.includes("Lihat Pretest"))`)
                            await thrownAnError("Button 'Lihat Pretest' was not found", await btnDetailPretest == null)
                            await btnDetailPretest.click()
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1})
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Download' di table list peserta
                            let logDownloaded = await driver.executeScript(`
                                console.defaultLog = console.log.bind(console);
                                let logs = [];
                                console.log = function(){
                                    // default &  console.log()
                                    console.defaultLog.apply(console, arguments);
                                    // new & array data
                                    logs.push(Array.from(arguments));
                                }
                                document.querySelector(".card-body button.btn-primary").addEventListener("click", () => console.log("downloaded")) 
                                document.querySelector(".card-body button.btn-primary").click() 
                                return logs
                            `)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await logDownloaded.length > 0 ? 'Succesfully download data of all participants in csv form ✅' : 'Failed to download data of participants ❌'
                            ]
                            expect(await logDownloaded.length > 0).to.be.true


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    // it(`ADMIN - Check the button "Terbitkan Kelas" for the "draft" classes from browser ${browser}`, async () => {

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
                    //         await driver.sleep(3000);

                    //         // Aksi klik button menu tab 'Draft'
                    //         await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi memilih kelas untuk membuat tugas pretest baru
                    //         let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                    //         await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi mengklik button 'Terbitkan Kelas'
                    //         let btnStart = await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class")`)
                    //         let actions = driver.actions({async: true});
                    //         await actions.doubleClick(await btnStart).perform();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Expect results and add custom message for addtional description
                    //         let foundClass = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class .item-header h1.title")).find(value => value.innerText.includes('${classTitle}'))`)
                    //         customMessages = [
                    //             await foundClass != null ? 'Successfully moved the class to public ✅' : 'Failed to move the class to public ❌'
                    //         ]
                    //         expect(await foundClass).to.be.not.null

                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });
                    
                    it(`ADMIN - Publish the class & Check the button "Terbitkan Pengumuman" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Aksi memilih kelas
                            let classroom = await driver.executeScript(`return document.querySelector("#section-class .card-class")`)
                            let className = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`);
                            await driver.sleep(1000)
                            await driver.executeScript(`arguments[0].querySelector("h1.title").click()`, await classroom);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Aksi mengklik button 'Terbitkan Kelas'
                            await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class").click()`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi klik kelas yang telah di terbitkan
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click();`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi mengklik kelas yang telah di terbitkan
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".item-class h1.title")).find(value => value.innerText.includes("${await className}")).click();`)
                            
                            // Aksi sleep
                            await driver.sleep(3000)
                            
                            // Aksi mengkil button 'Terbitkan Pengumuman'
                            let btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            await thrownAnError("There was no button publish announcement", await btnPublishAnnoucement == null)
                            await btnPublishAnnoucement.click()
                            await driver.sleep(3000)
                            let score = faker.number.int({ min: 50, max: 100 })
                            await driver.findElement(By.css(".modal-content input[type=number]")).sendKeys(score)
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelector(".modal-content button[type=submit].btn-primary").click();`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Expect results and add custom message for addtional description
                            btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            customMessages = [
                                await btnPublishAnnoucement == null ? 'Successfully publish the announcement of passed value ✅' : 'Failed to publish the announcement of passed value ❌'
                            ]
                            expect(await btnPublishAnnoucement).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Fill the link "Group Kelas" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Aksi klik tambahkan link group
                            let linkGroup = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body")).find(cardBody => {
                                const h4Elements = cardBody.querySelectorAll("h4");
                                return Array.from(h4Elements).some(h4 => h4.innerText.includes("Grup Kelas"));
                            });`)
                            let linkText = await driver.executeScript(`arguments[0].querySelector("a.text-limit").innerText`, await linkGroup)
                            if(await linkText == 'Tambahkan Link Grup') {
                                await driver.executeScript(`arguments[0].querySelector("a.text-limit").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            } else {
                                await driver.executeScript(`arguments[0].querySelector(".btn-pencil").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            }
                            await driver.sleep(2000)
                            await driver.findElement(By.css(".card-body input[type=url]")).sendKeys("https://t.me/dotnetcore_id", Key.ENTER)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            linkGroup = await driver.executeScript(`return document.querySelector(".card-body .text-limit").href;`);
                            customMessages = [
                                await linkGroup != null && await linkGroup != '' ? 'Successfully added link group for Telegram or Whatsaap ✅' : 'Failed to add link group ❌'
                            ]
                            expect(await linkGroup != null && await linkGroup != '').to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Add mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik tambahkan mentor pada kelas
                            let mentorAmount = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users").length`)
                            await driver.executeScript(`return document.querySelector(".card-body .btn-outline-primary .fa-plus").click()`)
                            await thrownAnError("Modal 'Tambah Mentor' isn't showed up", await driver.findElement(By.css(".modal-content")) === null)

                            await driver.sleep(4000)

                            // Aksi memilih mentor untuk kelas
                            await driver.executeScript(`return document.querySelector("input#checkbox-add-mentor").click()`)
                            await driver.sleep(2000)
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`)
                            await thrownAnError("Mentor is empty", await mentors.length == 0)
                            let maxMentor = faker.number.int({ min: 0, max: 4 })
                            for (let index = 0; index < maxMentor; index++) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                await driver.sleep(1000)
                                await mentors[index].click()
                                await driver.sleep(1000)
                            }
                            await driver.sleep(2000)
                            // Aksi konfirmasi pemilihan mentor
                            await driver.executeScript(`return document.querySelector(".card-input .box-button .btn-submit-checkbox").click()`)
                            await driver.sleep(2000)
                            let selectedMentors = await driver.executeScript(`return document.querySelectorAll(".modal-content .city-card")`)
                            await thrownAnError("There was no mentor selected, please select one of mentor first", await selectedMentors.length == 0)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            customMessages = [
                                await mentors.length != await mentorAmount ? 'Successfully added mentor ✅' : 'Failed to add mentor ❌'
                            ]
                            expect(await mentors.length).to.not.be.equal(await mentorAmount)

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`ADMIN - Delete mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih mentor untuk di hapus dari kelas
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            await thrownAnError("Mentor is empty", await mentors?.length == 0 || await mentors == null)
                            let randomIndexMentor = faker.number.int({ min: 0, max: await mentors.length - 1 })
                            let selectedMentor = await mentors[randomIndexMentor]
                            let mentorName = await driver.executeScript(`arguments[0].querySelector(".box-profile h5").innerText`, await selectedMentor)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await selectedMentor);
                            await driver.sleep(1500)
                            // let actions = await driver.actions({async: true});
                            // await actions.move({origin: await selectedMentor}).perform();
                            // await driver.sleep(1500)
                            // await thrownAnError("Icon delete isn't showed up", await driver.executeScript(`arguments[0].querySelector(".btn-remove")`, await selectedMentor) == null)
                            await driver.executeScript(`arguments[0].querySelector(".btn-remove").click()`, await selectedMentor)
                            await driver.sleep(2000)
                            // Konfirmasi hapus mentor
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            selectedMentor = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .box-users .box-profile h5")).find(value => value.innerText.includes("${mentorName}"))`)
                            customMessages = [
                                await selectedMentor == null ? 'Successfully deleted mentor ✅' : 'Failed to delete mentor ❌'
                            ]
                            expect(await selectedMentor).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;
                
                case 4:
                    it.skip(`STUDENT - Check menu tab 'Overview' in detail classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu class
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 1, max: 3 });
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('h1.title').click()", await cardClass[randomIndexClass]);

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let overviewTab = await driver.executeScript(`return document.querySelector(".item-tab").style.borderBottom`);
                            customMessages = [
                                await overviewTab != null ? "Successfully displayed menu tab 'overview' ✅" : "Failed go into menu tab 'overview' ❌",
                            ];
                            expect(await overviewTab).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`STUDENT - Register the classroom pretest from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih salah satu class pretest untuk mendaftar
                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih salah satu class pretest untuk mendaftar
                            let sectionClassPretest = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class")).find(value => value.querySelector(".row h5").innerText.includes("Tes Yang Dibuka"))`);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await sectionClassPretest)
                            await driver.sleep(2000)
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class")).find(value => value.querySelector(".row h5").innerText.includes("Kelas Yang Tersedia")).querySelector("#section-header-dropdown button").click()`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class")).find(value => value.querySelector(".row h5").innerText.includes("Kelas Yang Tersedia")).querySelectorAll(".dropdown-menu li a")[1].click()`)
                            await driver.sleep(2000)
                            let classesPretest = await driver.executeScript(`return Array.from(arguments[0].querySelectorAll(".row .card-class"))`, await sectionClassPretest);
                            await thrownAnError("Classroom of pretest is empty", await classesPretest.length == 0)
                            let randomIndexClassPretest = faker.number.int({ min: 0, max: await classesPretest.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector("h1.title").click()`, await classesPretest[randomIndexClassPretest])

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mendaftar kelas pretest
                            let typeButton = await driver.executeScript(`return document.querySelector("#class-overview .btn-action-add").innerText`)
                            if(await typeButton == 'Daftar Sekarang') {
                                await driver.executeScript(`return document.querySelector("#class-overview .btn-action-add").click()`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError(await typeButton, await typeButton == 'Pendaftaran Ditutup' || await typeButton == 'Kuota Penuh')
                            await thrownAnError("You've already registered in the classroom", await typeButton == 'Lihat Pretest')

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Aksi mengisi formulir persyaratan kelas
                            // DUMMY DATA
                            let bio = faker.person.bio()
                            let phoneNumber = faker.phone.number("08##############")
                            let portfolioLink = faker.internet.url()
                            let onlineCvLink = faker.internet.url() 
                            let address = faker.location.streetAddress(true)
                            let githubLink = faker.internet.url()
                            let linkedIn = faker.internet.url()
                            /** Aksi mengisi input bio */
                            let inputBio = await driver.executeScript(`return document.getElementById("Bio ") ? document.getElementById("Bio ") : null`)
                            if(await inputBio != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputBio);
                                await driver.sleep(2000)
                                console.log(await inputBio.getAttribute("value"))
                                if(await inputBio.getAttribute('value') == '' || await inputBio.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Bio ")).sendKeys(bio)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input phone number */
                            let inputPhoneNumber = await driver.executeScript(`return document.getElementById("Nomor Telepon (Whatsapp / Telegram) ") ? document.getElementById("Nomor Telepon (Whatsapp / Telegram) ") : null`)
                            if(await inputPhoneNumber != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputPhoneNumber);
                                await driver.sleep(2000)
                                console.log(await inputPhoneNumber.getAttribute("value"))
                                if(await inputPhoneNumber.getAttribute('value') == '' || await inputPhoneNumber.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Nomor Telepon (Whatsapp / Telegram) ")).sendKeys(phoneNumber)
                                }
                                await driver.sleep(2000)
                            }
                            /** Aksi mengisi input portfolio */
                            let inputPortfolio = await driver.executeScript(`return document.getElementById("Portofolio ") ? document.getElementById("Portofolio ") : null`)
                            if(await inputPortfolio != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputPortfolio);
                                await driver.sleep(2000)
                                console.log(await inputPortfolio.getAttribute("value"))
                                if(await inputPortfolio.getAttribute('value') == '' || await inputPortfolio.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Portofolio ")).sendKeys(portfolioLink)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input portfolio */
                            let inputOnlineCv = await driver.executeScript(`return document.getElementById("Online CV ") ? document.getElementById("Online CV ") : null`)
                            if(await inputOnlineCv != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputOnlineCv);
                                await driver.sleep(2000)
                                console.log(await inputOnlineCv.getAttribute("value"))
                                if(await inputOnlineCv.getAttribute('value') == '' || await inputOnlineCv.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Online CV ")).sendKeys(onlineCvLink)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input portfolio */
                            let inputAddress = await driver.executeScript(`return document.getElementById("Alamat ") ? document.getElementById("Alamat ") : null`)
                            if(await inputAddress != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputAddress);
                                await driver.sleep(2000)
                                console.log(await inputAddress.getAttribute("value"))
                                if(await inputAddress.getAttribute('value') == '' || await inputAddress.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Alamat ")).sendKeys(address)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input select asal kota */
                            let selectCity = await driver.executeScript(`
                                const selectCityElem = Array.from(document.querySelectorAll(".v-select")).find(value => value.previousElementSibling.innerText.includes("Asal Kota"));
                                return selectCityElem ? selectCityElem : null;
                            `)
                            if(await selectCity != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await selectCity);
                                await driver.sleep(2000)
                                let valueInput = await driver.executeScript("return arguments[0].querySelector('span')", selectCity);
                                if(await valueInput == null || await valueInput == '') {
                                    let action = await driver.actions({async: true});
                                    await action.move({origin: await driver.executeScript(`return arguments[0].querySelector("input")`, await selectCity )}).press().perform();
                                    await driver.sleep(2000)
                                    let cities = await driver.executeScript(`return arguments[0].querySelectorAll("ul li")`, await selectCity)
                                    let randomIndexCity = faker.number.int({ min: 0, max: 4 })
                                    await driver.executeScript("return arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await cities[randomIndexCity]);
                                    await driver.sleep(2000);
                                    const actions = driver.actions({async: true});
                                    await actions.doubleClick(await cities[randomIndexCity]).perform();
                                    await driver.sleep(2000);
                                }
                            }
                            /** Aksi mengisi input github */
                            let inputGithub = await driver.executeScript(`return document.getElementById("Github ") ? document.getElementById("Github ") : null`)
                            if(await inputGithub != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputGithub);
                                await driver.sleep(2000)
                                console.log(await inputGithub.getAttribute("value"))
                                if(await inputGithub.getAttribute('value') == '' || await inputGithub.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Github ")).sendKeys(githubLink)
                                    await driver.sleep(2000)
                                }
                            }
                            let inputLinkedIn = await driver.executeScript(`return document.getElementById("LinkedIn ") ? document.getElementById("LinkedIn ") : null`)
                            if(await inputLinkedIn != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputLinkedIn);
                                await driver.sleep(2000)
                                console.log(await inputLinkedIn.getAttribute("value"))
                                if(await inputLinkedIn.getAttribute('value') == '' || await inputLinkedIn.getAttribute('value') == null) {
                                    await driver.findElement(By.id("LinkedIn ")).sendKeys(linkedIn)
                                    // await driver.sleep(2000)
                                }
                            }

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi submit requirement pretest
                            await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi konfirmasi requirement
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(5000)
                            
                            // Expect results and add custom message for addtional description
                            let btnRegistered = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Sudah Terdaftar") || value.innerText.includes("Lihat Pretest"))`)
                            customMessages = [
                                await btnRegistered != null ? 'Successfully register the pretest clasroom ✅' : 'Failed to register the pretest classroom ❌'
                            ]
                            expect(await btnRegistered).to.be.not.null


                        } catch (error) {
                            expect.fail(error);
                        }


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Register the classroom regular from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih salah satu class pretest untuk mendaftar
                            let sectionClassPretest = await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class")).find(value => value.querySelector(".row h5").innerText.includes("Kelas Yang Tersedia"))`);
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await sectionClassPretest);
                            await driver.sleep(2000);
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class")).find(value => value.querySelector(".row h5").innerText.includes("Kelas Yang Tersedia")).querySelector("#section-header-dropdown button").click()`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class")).find(value => value.querySelector(".row h5").innerText.includes("Kelas Yang Tersedia")).querySelectorAll(".dropdown-menu li a")[1].click()`)
                            await driver.sleep(2000)
                            let classesRegular = await driver.executeScript(`return Array.from(arguments[0].querySelectorAll(".row .card-class"))`, await sectionClassPretest);
                            await thrownAnError("Classroom of pretest is empty", await classesRegular.length == 0)
                            let randomIndexClassRegular = faker.number.int({ min: 0, max: await classesRegular.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector("h1.title").click()`, await classesRegular[randomIndexClassRegular])

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mendaftar kelas pretest
                            let typeButton = await driver.executeScript(`return document.querySelector("#class-overview .btn-action-add").innerText`)
                            if(await typeButton == 'Daftar Sekarang') {
                                await driver.executeScript(`return document.querySelector("#class-overview .btn-action-add").click()`)
                                await driver.sleep(2000)
                            }
                            await thrownAnError(await typeButton, await typeButton == 'Pendaftaran Ditutup' || await typeButton == 'Kuota Penuh')
                            await thrownAnError("You've already registered in the classroom", await typeButton == 'Lihat Pretest')

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Aksi mengisi formulir persyaratan kelas
                            // DUMMY DATA
                            let bio = faker.person.bio()
                            let phoneNumber = faker.phone.number("08##############")
                            let portfolioLink = faker.internet.url()
                            let onlineCvLink = faker.internet.url() 
                            let address = faker.location.streetAddress(true)
                            let githubLink = faker.internet.url()
                            let linkedIn = faker.internet.url()
                            /** Aksi mengisi input bio */
                            let inputBio = await driver.executeScript(`return document.getElementById("Bio ") ? document.getElementById("Bio ") : null`)
                            if(await inputBio != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputBio);
                                await driver.sleep(2000)
                                console.log(await inputBio.getAttribute("value"))
                                if(await inputBio.getAttribute('value') == '' || await inputBio.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Bio ")).sendKeys(bio)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input phone number */
                            let inputPhoneNumber = await driver.executeScript(`return document.getElementById("Nomor Telepon (Whatsapp / Telegram) ") ? document.getElementById("Nomor Telepon (Whatsapp / Telegram) ") : null`)
                            if(await inputPhoneNumber != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputPhoneNumber);
                                await driver.sleep(2000)
                                console.log(await inputPhoneNumber.getAttribute("value"))
                                if(await inputPhoneNumber.getAttribute('value') == '' || await inputPhoneNumber.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Nomor Telepon (Whatsapp / Telegram) ")).sendKeys(phoneNumber)
                                }
                                await driver.sleep(2000)
                            }
                            /** Aksi mengisi input portfolio */
                            let inputPortfolio = await driver.executeScript(`return document.getElementById("Portofolio ") ? document.getElementById("Portofolio ") : null`)
                            if(await inputPortfolio != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputPortfolio);
                                await driver.sleep(2000)
                                console.log(await inputPortfolio.getAttribute("value"))
                                if(await inputPortfolio.getAttribute('value') == '' || await inputPortfolio.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Portofolio ")).sendKeys(portfolioLink)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input portfolio */
                            let inputOnlineCv = await driver.executeScript(`return document.getElementById("Online CV ") ? document.getElementById("Online CV ") : null`)
                            if(await inputOnlineCv != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputOnlineCv);
                                await driver.sleep(2000)
                                console.log(await inputOnlineCv.getAttribute("value"))
                                if(await inputOnlineCv.getAttribute('value') == '' || await inputOnlineCv.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Online CV ")).sendKeys(onlineCvLink)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input portfolio */
                            let inputAddress = await driver.executeScript(`return document.getElementById("Alamat ") ? document.getElementById("Alamat ") : null`)
                            if(await inputAddress != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputAddress);
                                await driver.sleep(2000)
                                console.log(await inputAddress.getAttribute("value"))
                                if(await inputAddress.getAttribute('value') == '' || await inputAddress.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Alamat ")).sendKeys(address)
                                    await driver.sleep(2000)
                                }
                            }
                            /** Aksi mengisi input select asal kota */
                            let selectCity = await driver.executeScript(`
                                const selectCityElem = Array.from(document.querySelectorAll(".v-select")).find(value => value.previousElementSibling.innerText.includes("Asal Kota"));
                                return selectCityElem ? selectCityElem : null;
                            `)
                            if(await selectCity != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await selectCity);
                                await driver.sleep(2000)
                                let valueInput = await driver.executeScript("return arguments[0].querySelector('span')", selectCity);
                                if(await valueInput == null || await valueInput == '') {
                                    let action = await driver.actions({async: true});
                                    await action.move({origin: await driver.executeScript(`return arguments[0].querySelector("input")`, await selectCity )}).press().perform();
                                    await driver.sleep(2000)
                                    let cities = await driver.executeScript(`return arguments[0].querySelectorAll("ul li")`, await selectCity)
                                    let randomIndexCity = faker.number.int({ min: 0, max: 4 })
                                    await driver.executeScript("return arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await cities[randomIndexCity]);
                                    await driver.sleep(2000);
                                    const actions = driver.actions({async: true});
                                    await actions.doubleClick(await cities[randomIndexCity]).perform();
                                    await driver.sleep(2000);
                                }
                            }
                            /** Aksi mengisi input github */
                            let inputGithub = await driver.executeScript(`return document.getElementById("Github ") ? document.getElementById("Github ") : null`)
                            if(await inputGithub != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputGithub);
                                await driver.sleep(2000)
                                console.log(await inputGithub.getAttribute("value"))
                                if(await inputGithub.getAttribute('value') == '' || await inputGithub.getAttribute('value') == null) {
                                    await driver.findElement(By.id("Github ")).sendKeys(githubLink)
                                    await driver.sleep(2000)
                                }
                            }
                            let inputLinkedIn = await driver.executeScript(`return document.getElementById("LinkedIn ") ? document.getElementById("LinkedIn ") : null`)
                            if(await inputLinkedIn != null) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await inputLinkedIn);
                                await driver.sleep(2000)
                                console.log(await inputLinkedIn.getAttribute("value"))
                                if(await inputLinkedIn.getAttribute('value') == '' || await inputLinkedIn.getAttribute('value') == null) {
                                    await driver.findElement(By.id("LinkedIn ")).sendKeys(linkedIn)
                                    // await driver.sleep(2000)
                                }
                            }

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi submit requirement pretest
                            await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi konfirmasi requirement
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(5000)
                            
                            // Expect results and add custom message for addtional description
                            let btnRegistered = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Sudah Terdaftar") || value.innerText.includes("Lihat Pretest"))`)
                            customMessages = [
                                await btnRegistered != null ? 'Successfully register the regular clasroom ✅' : 'Failed to register the regular classroom ❌'
                            ]
                            expect(await btnRegistered).to.be.not.null


                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 5:
                    it.skip(`INDUSTRY - from browser ${browser}`, async () => {

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

                break;
                
                case 6:
                    it.skip(`CONTENT WRITER - from browser ${browser}`, async () => {

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

                break;

                case 7:
                    it(`LEAD PROGRAM - Check menu tab 'Overview' in detail classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu class
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 1, max: 3 });
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('h1.title').click()", await cardClass[randomIndexClass]);

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let overviewTab = await driver.executeScript(`return document.querySelector(".item-tab").style.borderBottom`);
                            customMessages = [
                                await overviewTab != null ? "Successfully displayed menu tab 'overview' ✅" : "Failed go into menu tab 'overview' ❌",
                            ];
                            expect(await overviewTab).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Create Pretest in detail classroom from browser ${browser}`, async () => {

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
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1]`));
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                // await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                // await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                // await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                // await driver.findElement(By.id('select-type')).getAttribute('value'),
                                // await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=button].btn-default").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi masuk ke dalam draft class yang telah di buat sebelumnya
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class h1.title")).find(value => value.innerText.includes("${name}")).click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Tambah Pretest' dan Konfirmasi
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi fill form create pretest
                            // Dummy Data
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs()
                            dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 08:00`;
                            dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            // textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            // iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            // await driver.switchTo().frame(iframeTextEditorMce);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await iframeBody.clear();
                            // await driver.sleep(1000);
                            // await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await driver.sleep(1000);
                            // await driver.switchTo().defaultContent();
                            // await driver.sleep(2000)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Successfully created a pretest and redirect to the list pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Create a new pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Cek jika pretest itu sudah membuat pretest atau belum
                            let typeButton = await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].innerText`)
                            if(await typeButton === 'Tambah Pretest') {
                                // Aksi klik button '+ Pretest'
                                await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-content .btn-primary").click()`)
                            } else {
                                // Aksi mengklik button 'Lihat Pretest'
                                await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelectorAll(".card-body .btn-primary")[1].click()`)
                            }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengisi form create pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n')
                            let today = new Date()
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 10:00`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            await driver.executeScript(`
                                var iframe = document.querySelector('.tox-edit-area iframe'); 
                                var node = iframe.contentDocument.querySelector('body'); 
                                node.innerHTML = "${desc}" 
                            `)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully created a new pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Edit the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-pencil-line").click()`, await cardPretest[randomIndexPretest]);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi change the data of pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n') 
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).clear()
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = "${desc}"`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully edited the pretest ✅" : "Failed to edit the pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Delete the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            let title = await driver.executeScript(`arguments[0].querySelector(".title-container .title").innerText`, await cardPretest[randomIndexPretest]);
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-delete-bin-7-line").click()`, await cardPretest[randomIndexPretest]);
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let pretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await pretest == null ? "Succesfully deleted the pretest ✅" : "Failed to delete the pretest ❌",
                            ];
                            expect(await pretest == null).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Recap Pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menekan tombol 'Rekap Pretest'
                            await driver.executeScript(`return document.querySelector(".card-body .btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let recapPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Rekap Peserta Pretest"))`)
                            customMessages = [
                                await recapPretest != null ? 'Succesfully displayed Participant Recap ✅' : 'Failed to display Participant Recap ❌'
                            ]
                            expect(await recapPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Check Pretest Participants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk melihat peserta pretestnya
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let listParticipantPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Daftar Peserta Pretest"))`)
                            customMessages = [
                                await listParticipantPretest != null ? 'Succesfully View all participants ✅' : 'Failed to view all partcipants ❌'
                            ]
                            expect(await listParticipantPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Check the button "Download" of pretest partcipants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            let btnDetailPretest = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview .btn-action-add")).find(value => value.innerText.includes("Lihat Pretest"))`)
                            await thrownAnError("Button 'Lihat Pretest' was not found", await btnDetailPretest == null)
                            await btnDetailPretest.click()
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1})
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Download' di table list peserta
                            let logDownloaded = await driver.executeScript(`
                                console.defaultLog = console.log.bind(console);
                                let logs = [];
                                console.log = function(){
                                    // default &  console.log()
                                    console.defaultLog.apply(console, arguments);
                                    // new & array data
                                    logs.push(Array.from(arguments));
                                }
                                document.querySelector(".card-body button.btn-primary").addEventListener("click", () => console.log("downloaded")) 
                                document.querySelector(".card-body button.btn-primary").click() 
                                return logs
                            `)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await logDownloaded.length > 0 ? 'Succesfully download data of all participants in csv form ✅' : 'Failed to download data of participants ❌'
                            ]
                            expect(await logDownloaded.length > 0).to.be.true


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    // it(`LEAD PROGRAM - Check the button "Terbitkan Kelas" for the "draft" classes from browser ${browser}`, async () => {

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
                    //         await driver.sleep(3000);

                    //         // Aksi klik button menu tab 'Draft'
                    //         await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi memilih kelas untuk membuat tugas pretest baru
                    //         let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                    //         await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi mengklik button 'Terbitkan Kelas'
                    //         let btnStart = await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class")`)
                    //         let actions = driver.actions({async: true});
                    //         await actions.doubleClick(await btnStart).perform();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Expect results and add custom message for addtional description
                    //         let foundClass = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class .item-header h1.title")).find(value => value.innerText.includes('${classTitle}'))`)
                    //         customMessages = [
                    //             await foundClass != null ? 'Successfully moved the class to public ✅' : 'Failed to move the class to public ❌'
                    //         ]
                    //         expect(await foundClass).to.be.not.null

                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });
                    
                    it(`LEAD PROGRAM - Publish the class & Check the button "Terbitkan Pengumuman" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Aksi memilih kelas
                            let classroom = await driver.executeScript(`return document.querySelector("#section-class .card-class")`)
                            let className = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`);
                            await driver.sleep(1000)
                            await driver.executeScript(`arguments[0].querySelector("h1.title").click()`, await classroom);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Aksi mengklik button 'Terbitkan Kelas'
                            await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class").click()`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi klik kelas yang telah di terbitkan
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click();`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi mengklik kelas yang telah di terbitkan
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".item-class h1.title")).find(value => value.innerText.includes("${await className}")).click();`)
                            
                            // Aksi sleep
                            await driver.sleep(3000)
                            
                            // Aksi mengkil button 'Terbitkan Pengumuman'
                            let btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            await thrownAnError("There was no button publish announcement", await btnPublishAnnoucement == null)
                            await btnPublishAnnoucement.click()
                            await driver.sleep(3000)
                            let score = faker.number.int({ min: 50, max: 100 })
                            await driver.findElement(By.css(".modal-content input[type=number]")).sendKeys(score)
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelector(".modal-content button[type=submit].btn-primary").click();`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Expect results and add custom message for addtional description
                            btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            customMessages = [
                                await btnPublishAnnoucement == null ? 'Successfully publish the announcement of passed value ✅' : 'Failed to publish the announcement of passed value ❌'
                            ]
                            expect(await btnPublishAnnoucement).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Fill the link "Group Kelas" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Aksi klik tambahkan link group
                            let linkGroup = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body")).find(cardBody => {
                                const h4Elements = cardBody.querySelectorAll("h4");
                                return Array.from(h4Elements).some(h4 => h4.innerText.includes("Grup Kelas"));
                            });`)
                            let linkText = await driver.executeScript(`arguments[0].querySelector("a.text-limit").innerText`, await linkGroup)
                            if(await linkText == 'Tambahkan Link Grup') {
                                await driver.executeScript(`arguments[0].querySelector("a.text-limit").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            } else {
                                await driver.executeScript(`arguments[0].querySelector(".btn-pencil").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            }
                            await driver.sleep(2000)
                            await driver.findElement(By.css(".card-body input[type=url]")).sendKeys("https://t.me/dotnetcore_id", Key.ENTER)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            linkGroup = await driver.executeScript(`return document.querySelector(".card-body .text-limit").href;`);
                            customMessages = [
                                await linkGroup != null && await linkGroup != '' ? 'Successfully added link group for Telegram or Whatsaap ✅' : 'Failed to add link group ❌'
                            ]
                            expect(await linkGroup != null && await linkGroup != '').to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Add mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik tambahkan mentor pada kelas
                            let mentorAmount = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users").length`)
                            await driver.executeScript(`return document.querySelector(".card-body .btn-outline-primary .fa-plus").click()`)
                            await thrownAnError("Modal 'Tambah Mentor' isn't showed up", await driver.findElement(By.css(".modal-content")) === null)

                            await driver.sleep(4000)

                            // Aksi memilih mentor untuk kelas
                            await driver.executeScript(`return document.querySelector("input#checkbox-add-mentor").click()`)
                            await driver.sleep(2000)
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`)
                            await thrownAnError("Mentor is empty", await mentors.length == 0)
                            let maxMentor = faker.number.int({ min: 0, max: 4 })
                            for (let index = 0; index < maxMentor; index++) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                await driver.sleep(1000)
                                await mentors[index].click()
                                await driver.sleep(1000)
                            }
                            await driver.sleep(2000)
                            // Aksi konfirmasi pemilihan mentor
                            await driver.executeScript(`return document.querySelector(".card-input .box-button .btn-submit-checkbox").click()`)
                            await driver.sleep(2000)
                            let selectedMentors = await driver.executeScript(`return document.querySelectorAll(".modal-content .city-card")`)
                            await thrownAnError("There was no mentor selected, please select one of mentor first", await selectedMentors.length == 0)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            customMessages = [
                                await mentors.length != await mentorAmount ? 'Successfully added mentor ✅' : 'Failed to add mentor ❌'
                            ]
                            expect(await mentors.length).to.not.be.equal(await mentorAmount)

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD PROGRAM - Delete mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih mentor untuk di hapus dari kelas
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            await thrownAnError("Mentor is empty", await mentors?.length == 0 || await mentors == null)
                            let randomIndexMentor = faker.number.int({ min: 0, max: await mentors.length - 1 })
                            let selectedMentor = await mentors[randomIndexMentor]
                            let mentorName = await driver.executeScript(`arguments[0].querySelector(".box-profile h5").innerText`, await selectedMentor)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await selectedMentor);
                            await driver.sleep(1500)
                            // let actions = await driver.actions({async: true});
                            // await actions.move({origin: await selectedMentor}).perform();
                            // await driver.sleep(1500)
                            // await thrownAnError("Icon delete isn't showed up", await driver.executeScript(`arguments[0].querySelector(".btn-remove")`, await selectedMentor) == null)
                            await driver.executeScript(`arguments[0].querySelector(".btn-remove").click()`, await selectedMentor)
                            await driver.sleep(2000)
                            // Konfirmasi hapus mentor
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            selectedMentor = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .box-users .box-profile h5")).find(value => value.innerText.includes("${mentorName}"))`)
                            customMessages = [
                                await selectedMentor == null ? 'Successfully deleted mentor ✅' : 'Failed to delete mentor ❌'
                            ]
                            expect(await selectedMentor).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;
                
                case 9:
                    it(`LEAD REGION - Check menu tab 'Overview' in detail classroom from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi menu tab 'Kelas'
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu class
                            let cardClass = await driver.executeScript(`return document.querySelectorAll("#section-class .card-class")`);
                            let randomIndexClass = faker.number.int({ min: 1, max: 3 });
                            await driver.sleep(2000)
                            await driver.executeScript("arguments[0].querySelector('h1.title').click()", await cardClass[randomIndexClass]);

                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Expect results and add custom message for addtional description
                            let overviewTab = await driver.executeScript(`return document.querySelector(".item-tab").style.borderBottom`);
                            customMessages = [
                                await overviewTab != null ? "Successfully displayed menu tab 'overview' ✅" : "Failed go into menu tab 'overview' ❌",
                            ];
                            expect(await overviewTab).to.be.not.null;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Create Pretest in detail classroom from browser ${browser}`, async () => {

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
                            /** Aksi memasukkan link group telegram */
                            await driver.findElement(By.id("Link Grup")).sendKeys(linkGroupTelegram)
                            await driver.sleep(2000)
                            /** Aksi mengisi mulai dan akhir dari pendaftaran dan pelaksanaan */
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1]`));
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelectorAll(".card-body .mt-1.custom-control.custom-checkbox input[type=checkbox]")[1].click();`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id('Nama *')).getAttribute('value'),
                                await driver.findElement(By.id('Tags')).getAttribute('value'),
                                await driver.findElement(By.id('Kuota *')).getAttribute('value'),
                                await driver.findElement(By.id('Standar Kelulusan *')).getAttribute('value'),
                                // await driver.findElement(By.css('.city-card p.city')).getAttribute('value'),
                                // await driver.findElement(By.id('select-programId')).getAttribute('value'),
                                // await driver.findElement(By.id('select-mode')).getAttribute('value'),
                                // await driver.findElement(By.id('select-type')).getAttribute('value'),
                                // await driver.findElement(By.id('select-visibility')).getAttribute('value'),
                                await driver.findElement(By.id('Link Grup')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Dibuka *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pendaftaran Ditutup *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Dimulai *')).getAttribute('value'),
                                // await driver.findElement(By.id('Pelaksanaan Berakhir *')).getAttribute('value'),
                            ]).then(value => value.every(value => value != ''));
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);"), await driver.executeScript(`return document.querySelector("form button[type=button].btn-default").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi masuk ke dalam draft class yang telah di buat sebelumnya
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#section-class .card-class h1.title")).find(value => value.innerText.includes("${name}")).click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Tambah Pretest' dan Konfirmasi
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi fill form create pretest
                            // Dummy Data
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs()
                            dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 08:00`;
                            dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            // textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            // iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            // await driver.switchTo().frame(iframeTextEditorMce);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await iframeBody.clear();
                            // await driver.sleep(1000);
                            // await driver.executeScript(`arguments[0].innerHTML = '${description}'`, iframeBody);
                            // await driver.sleep(1000);
                            // iframeBody = await driver.findElement(By.css('body'));
                            // await driver.sleep(1000);
                            // await driver.switchTo().defaultContent();
                            // await driver.sleep(2000)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Successfully created a pretest and redirect to the list pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Create a new pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Cek jika pretest itu sudah membuat pretest atau belum
                            let typeButton = await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].innerText`)
                            if(await typeButton === 'Tambah Pretest') {
                                // Aksi klik button '+ Pretest'
                                await driver.executeScript(`return document.querySelectorAll("#class-overview .btn-action-add")[1].click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelector(".modal-content .btn-primary").click()`)
                            } else {
                                // Aksi mengklik button 'Lihat Pretest'
                                await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                                await driver.sleep(2000)
                                await driver.executeScript(`return document.querySelectorAll(".card-body .btn-primary")[1].click()`)
                            }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengisi form create pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n')
                            let today = new Date()
                            let dateOpenRegister = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 10:00`;
                            let dateEndRegister = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() - 1).padStart(2, '0')} 16:00`;
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            await driver.executeScript(`
                                var iframe = document.querySelector('.tox-edit-area iframe'); 
                                var node = iframe.contentDocument.querySelector('body'); 
                                node.innerHTML = "${desc}" 
                            `)
                            /** Aksi memilih tipe tugas pretest */
                            await driver.executeScript("window.scrollTo(0, document.body.scrollHeight - 300);")
                            await driver.sleep(2000);
                            let selectElement = await driver.findElement(By.id('Tipe *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'studio' || await valueSelect == 'form') {
                                let actionType = driver.actions({async: true});
                                await actionType.move({ origin: await driver.findElement(By.css("#selectedType input")) }).click().perform();
                                await driver.sleep(1500)
                                let types = await driver.executeScript(`return document.querySelectorAll("#selectedType ul li")`)
                                let randomIndexTypePretest = faker.number.int({ min: 0, max: 5 })
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' })", await types[randomIndexTypePretest]);
                                await driver.sleep(2000);
                                actionType = driver.actions({async: true});
                                await actionType.doubleClick(await types[randomIndexTypePretest]).perform();
                                await driver.sleep(2000);
                            }
                            /** Aksi memasukkan deadline pretest & jadwal publish pretest */
                            await driver.executeScript(`return document.getElementById("Deadline").value = "${dateOpenRegister}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value = "${dateEndRegister}"`)
                            
                            // Aksi Sleep
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully created a new pretest ✅" : "Failed to create a pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Edit the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-pencil-line").click()`, await cardPretest[randomIndexPretest]);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi change the data of pretest
                            // DUMMY DATA
                            let title = faker.helpers.arrayElement(['Polindrome', 'Pseudocode', 'Ayam Geprek', 'HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'LARAVEL', 'NUXTJS', 'REACTJS'])
                            let desc = faker.lorem.paragraphs().replace(/\n/g, '\\n') 
                            /** Aksi fill input name */
                            await driver.findElement(By.id("Judul *")).clear()
                            await driver.sleep(1000)
                            await driver.findElement(By.id("Judul *")).sendKeys("Tugas " + title)
                            await driver.sleep(2000)
                            /** Aksi fill input description */
                            let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
                            let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
                            await driver.switchTo().frame(iframeTextEditorMce);
                            await driver.sleep(1000);
                            let iframeBody = await driver.findElement(By.css('body'));
                            await iframeBody.clear();
                            await driver.sleep(1000);
                            await driver.executeScript(`arguments[0].innerHTML = "${desc}"`, iframeBody);
                            await driver.sleep(1000);
                            iframeBody = await driver.findElement(By.css('body'));
                            await driver.sleep(1000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(2000)

                            // Check semua value telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul *")).getAttribute("value"),
                                await driver.findElement(By.id("Tipe *")).getAttribute("value"),
                                // await driver.executeScript(`return document.getElementById("Deadline").value`),
                                // await driver.executeScript(`return document.getElementById("Jadwalkan Publish").value`),
                            ]).then(value => value.every(value => value != ''));
                            await thrownAnError("All value must be filled in", !isAllFilled);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click()`);
                                // await driver.executeScript(`return document.querySelector(".modal-body button[type=button].btn-primary").click()`);
                            }
                            await driver.sleep(4000);
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null;`);
                            await thrownAnError("An error occurred while submitted the form", await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            let foundPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await foundPretest != null ? "Succesfully edited the pretest ✅" : "Failed to edit the pretest ❌",
                            ];
                            expect(await foundPretest != null).to.be.true;


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Delete the pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk di edit
                            let cardPretest = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await cardPretest.length - 1 })
                            let title = await driver.executeScript(`arguments[0].querySelector(".title-container .title").innerText`, await cardPretest[randomIndexPretest]);
                            await driver.executeScript(`arguments[0].querySelector(".action-container .ri-delete-bin-7-line").click()`, await cardPretest[randomIndexPretest]);
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let pretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card .title-container .title")).find(value => value.innerText.includes('${title}'))`)
                            customMessages = [
                                await pretest == null ? "Succesfully deleted the pretest ✅" : "Failed to delete the pretest ❌",
                            ];
                            expect(await pretest == null).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Recap Pretest from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi menekan tombol 'Rekap Pretest'
                            await driver.executeScript(`return document.querySelector(".card-body .btn-primary").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let recapPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Rekap Peserta Pretest"))`)
                            customMessages = [
                                await recapPretest != null ? 'Succesfully displayed Participant Recap ✅' : 'Failed to display Participant Recap ❌'
                            ]
                            expect(await recapPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Check Pretest Participants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            await driver.executeScript(`return document.querySelector("#class-overview button:not(#btn-start-class).btn-action-add").click()`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest untuk melihat peserta pretestnya
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1 })
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let listParticipantPretest = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body h5")).filter(value => value.innerText.includes("Daftar Peserta Pretest"))`)
                            customMessages = [
                                await listParticipantPretest != null ? 'Succesfully View all participants ✅' : 'Failed to view all partcipants ❌'
                            ]
                            expect(await listParticipantPretest).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Check the button "Download" of pretest partcipants from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik button 'Lihat Pretest'
                            let btnDetailPretest = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview .btn-action-add")).find(value => value.innerText.includes("Lihat Pretest"))`)
                            await thrownAnError("Button 'Lihat Pretest' was not found", await btnDetailPretest == null)
                            await btnDetailPretest.click()
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih salah satu pretest
                            let pretests = await driver.executeScript(`return document.querySelectorAll(".item-assignment")`)
                            let randomIndexPretest = faker.number.int({ min: 0, max: await pretests.length - 1})
                            await driver.executeScript(`arguments[0].querySelector("button.btn-primary").click()`, await pretests[randomIndexPretest])
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik button 'Download' di table list peserta
                            let logDownloaded = await driver.executeScript(`
                                console.defaultLog = console.log.bind(console);
                                let logs = [];
                                console.log = function(){
                                    // default &  console.log()
                                    console.defaultLog.apply(console, arguments);
                                    // new & array data
                                    logs.push(Array.from(arguments));
                                }
                                document.querySelector(".card-body button.btn-primary").addEventListener("click", () => console.log("downloaded")) 
                                document.querySelector(".card-body button.btn-primary").click() 
                                return logs
                            `)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await logDownloaded.length > 0 ? 'Succesfully download data of all participants in csv form ✅' : 'Failed to download data of participants ❌'
                            ]
                            expect(await logDownloaded.length > 0).to.be.true


                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    // it(`LEAD REGION - Check the button "Terbitkan Kelas" for the "draft" classes from browser ${browser}`, async () => {

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
                    //         await driver.sleep(3000);

                    //         // Aksi klik button menu tab 'Draft'
                    //         await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi memilih kelas untuk membuat tugas pretest baru
                    //         let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                    //         await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Aksi mengklik button 'Terbitkan Kelas'
                    //         let btnStart = await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class")`)
                    //         let actions = driver.actions({async: true});
                    //         await actions.doubleClick(await btnStart).perform();
                            
                    //         // Aksi sleep 
                    //         await driver.sleep(3000);

                    //         // Expect results and add custom message for addtional description
                    //         let foundClass = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-class .item-header h1.title")).find(value => value.innerText.includes('${classTitle}'))`)
                    //         customMessages = [
                    //             await foundClass != null ? 'Successfully moved the class to public ✅' : 'Failed to move the class to public ❌'
                    //         ]
                    //         expect(await foundClass).to.be.not.null

                    //     } catch (error) {
                    //         expect.fail(error);
                    //     }

                    // });
                    
                    it(`LEAD REGION - Publish the class & Check the button "Terbitkan Pengumuman" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(4000);

                            // Aksi memilih kelas
                            let classroom = await driver.executeScript(`return document.querySelector("#section-class .card-class")`)
                            let className = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`);
                            await driver.sleep(1000)
                            await driver.executeScript(`arguments[0].querySelector("h1.title").click()`, await classroom);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Aksi mengklik button 'Terbitkan Kelas'
                            await driver.executeScript(`return document.querySelector("#class-overview #btn-start-class").click()`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi klik kelas yang telah di terbitkan
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click();`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)
                            
                            // Aksi mengklik kelas yang telah di terbitkan
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".item-class h1.title")).find(value => value.innerText.includes("${await className}")).click();`)
                            
                            // Aksi sleep
                            await driver.sleep(3000)
                            
                            // Aksi mengkil button 'Terbitkan Pengumuman'
                            let btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            await thrownAnError("There was no button publish announcement", await btnPublishAnnoucement == null)
                            await btnPublishAnnoucement.click()
                            await driver.sleep(3000)
                            let score = faker.number.int({ min: 50, max: 100 })
                            await driver.findElement(By.css(".modal-content input[type=number]")).sendKeys(score)
                            await driver.sleep(1500)
                            await driver.executeScript(`return document.querySelector(".modal-content button[type=submit].btn-primary").click();`)
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            // Expect results and add custom message for addtional description
                            btnPublishAnnoucement = await driver.executeScript(`return Array.from(document.querySelectorAll("#class-overview button.btn-action-add")).find(value => value.innerText.includes("Terbitkan Pengumuman"))`)
                            customMessages = [
                                await btnPublishAnnoucement == null ? 'Successfully publish the announcement of passed value ✅' : 'Failed to publish the announcement of passed value ❌'
                            ]
                            expect(await btnPublishAnnoucement).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Fill the link "Group Kelas" classes from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Aksi klik tambahkan link group
                            let linkGroup = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body")).find(cardBody => {
                                const h4Elements = cardBody.querySelectorAll("h4");
                                return Array.from(h4Elements).some(h4 => h4.innerText.includes("Grup Kelas"));
                            });`)
                            let linkText = await driver.executeScript(`arguments[0].querySelector("a.text-limit").innerText`, await linkGroup)
                            if(await linkText == 'Tambahkan Link Grup') {
                                await driver.executeScript(`arguments[0].querySelector("a.text-limit").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            } else {
                                await driver.executeScript(`arguments[0].querySelector(".btn-pencil").click()`, await linkGroup)
                                await driver.sleep(2000)
                                await driver.executeScript(`arguments[0].querySelector("input[type=url]").value = ""`, await linkGroup)
                            }
                            await driver.sleep(2000)
                            await driver.findElement(By.css(".card-body input[type=url]")).sendKeys("https://t.me/dotnetcore_id", Key.ENTER)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            linkGroup = await driver.executeScript(`return document.querySelector(".card-body .text-limit").href;`);
                            customMessages = [
                                await linkGroup != null && await linkGroup != '' ? 'Successfully added link group for Telegram or Whatsaap ✅' : 'Failed to add link group ❌'
                            ]
                            expect(await linkGroup != null && await linkGroup != '').to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Add mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi klik tambahkan mentor pada kelas
                            let mentorAmount = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users").length`)
                            await driver.executeScript(`return document.querySelector(".card-body .btn-outline-primary .fa-plus").click()`)
                            await thrownAnError("Modal 'Tambah Mentor' isn't showed up", await driver.findElement(By.css(".modal-content")) === null)

                            await driver.sleep(4000)

                            // Aksi memilih mentor untuk kelas
                            await driver.executeScript(`return document.querySelector("input#checkbox-add-mentor").click()`)
                            await driver.sleep(2000)
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".checkbox-container input[type=checkbox]")`)
                            await thrownAnError("Mentor is empty", await mentors.length == 0)
                            let maxMentor = faker.number.int({ min: 0, max: 4 })
                            for (let index = 0; index < maxMentor; index++) {
                                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await mentors[index]);
                                await driver.sleep(1000)
                                await mentors[index].click()
                                await driver.sleep(1000)
                            }
                            await driver.sleep(2000)
                            // Aksi konfirmasi pemilihan mentor
                            await driver.executeScript(`return document.querySelector(".card-input .box-button .btn-submit-checkbox").click()`)
                            await driver.sleep(2000)
                            let selectedMentors = await driver.executeScript(`return document.querySelectorAll(".modal-content .city-card")`)
                            await thrownAnError("There was no mentor selected, please select one of mentor first", await selectedMentors.length == 0)
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-primary").click()`)

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            customMessages = [
                                await mentors.length != await mentorAmount ? 'Successfully added mentor ✅' : 'Failed to add mentor ❌'
                            ]
                            expect(await mentors.length).to.not.be.equal(await mentorAmount)

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`LEAD REGION - Delete mentor on detail classroom from browser ${browser}`, async () => {

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

                            // Aksi klik button menu tab 'Draft'
                            await driver.executeScript(`return document.querySelector(".item-tab").click()`);
                            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi memilih kelas untuk membuat tugas pretest baru
                            let classTitle = await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").innerText`)
                            await driver.executeScript(`return document.querySelector("#section-class .card-class h1.title").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Aksi memilih mentor untuk di hapus dari kelas
                            let mentors = await driver.executeScript(`return document.querySelectorAll(".card-body .box-users")`)
                            await thrownAnError("Mentor is empty", await mentors?.length == 0 || await mentors == null)
                            let randomIndexMentor = faker.number.int({ min: 0, max: await mentors.length - 1 })
                            let selectedMentor = await mentors[randomIndexMentor]
                            let mentorName = await driver.executeScript(`arguments[0].querySelector(".box-profile h5").innerText`, await selectedMentor)
                            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", await selectedMentor);
                            await driver.sleep(1500)
                            // let actions = await driver.actions({async: true});
                            // await actions.move({origin: await selectedMentor}).perform();
                            // await driver.sleep(1500)
                            // await thrownAnError("Icon delete isn't showed up", await driver.executeScript(`arguments[0].querySelector(".btn-remove")`, await selectedMentor) == null)
                            await driver.executeScript(`arguments[0].querySelector(".btn-remove").click()`, await selectedMentor)
                            await driver.sleep(2000)
                            // Konfirmasi hapus mentor
                            await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`)

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            selectedMentor = await driver.executeScript(`return Array.from(document.querySelectorAll(".card-body .box-users .box-profile h5")).find(value => value.innerText.includes("${mentorName}"))`)
                            customMessages = [
                                await selectedMentor == null ? 'Successfully deleted mentor ✅' : 'Failed to delete mentor ❌'
                            ]
                            expect(await selectedMentor).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                default:
                    it.skip(`Other - from browser ${browser}`, async () => {

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

                break;
            }
        });

    })



});