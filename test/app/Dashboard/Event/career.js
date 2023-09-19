import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities, Select } from 'selenium-webdriver';
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
                    it.skip(`SUPER ADMIN - Create a new Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ Career'
                            await driver.executeScript(`return document.querySelector(".main-content .btn-primary i.ri-add-line").click()`)                            

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi Event 
                            /** Dummy Data **/
                            let title = faker.person.jobTitle();
                            let description = faker.lorem.paragraph();
                            let companyName = faker.company.name();
                            let link = 'https://google.com';
                            /** Aksi mengisi input name */
                            await driver.findElement(By.id("Judul Pekerjaan *")).sendKeys(title)
                            await driver.sleep(2000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(3000);
                            /** Aksi mengisi input tipe pekerjaan */
                            let selectElement = await driver.findElement(By.css("label[for='Tipe Pekerjaan *'] ~ div select"))
                            let selectJobType = new Select(selectElement)
                            let jobTypes = await driver.executeScript(`return document.querySelectorAll("label[for='Tipe Pekerjaan *'] ~ div select option")`)
                            let randomIndexJobType = faker.number.int({ min: 0, max: await jobTypes.length - 1 })
                            await selectJobType.selectByIndex(randomIndexJobType)
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
                            await driver.sleep(2000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(3000);
                            /** Aksi mengisi input date di mulai & berakhir program */
                            await driver.executeScript(`return document.getElementById("Pendaftaran Dimulai *").click()`)
                            await driver.sleep(2000)
                            let days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            let randomIndexDay = faker.number.int({ min: 0, max: 24 })
                            await days[randomIndexDay].click();
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Pendaftaran Berakhir *").click()`)
                            await driver.sleep(2000)
                            days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            await days[randomIndexDay + 1].click();
                            await driver.sleep(2000)
                            /** Aksi mengisi input link pendaftaran */
                            await driver.findElement(By.id("Link Pendaftaran *")).sendKeys(link)
                            await driver.sleep(2000)
                            /** Aksi mengisi input nama perusahaan */
                            await driver.findElement(By.id("Nama Perusahaan *")).sendKeys(companyName)
                            await driver.sleep(2000)
                            /** Aksi mengisi input kontak perusahaan */
                            let inputSearch = await driver.findElement(By.css(".vs__selected-options input[type=search]"));
                            let action = await driver.actions({async: true});
                            await action.move({origin: await inputSearch}).press().perform();
                            await driver.sleep(2000);
                            let cities = await driver.executeScript(`return document.querySelectorAll('.v-select ul li')`)
                            let randomIndexCity = faker.number.int({ min: 0, max: await cities.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript('arguments[0].scrollIntoView()', await cities[randomIndexCity]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.doubleClick(await cities[randomIndexCity]).perform();

                            // Aksi Sleep
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul Pekerjaan *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

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

                    it.skip(`SUPER ADMIN - Edit the Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi memilih salah satu program untuk di edit
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-warning").click()`)
                            await driver.sleep(2000);                         

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi Event 
                            /** Dummy Data **/
                            let title = faker.company.name();
                            let description = faker.lorem.paragraph();
                            /** Aksi mengisi input name */
                            await driver.findElement(By.id("Judul Pekerjaan *")).clear();
                            await driver.findElement(By.id("Judul Pekerjaan *")).sendKeys(title)
                            await driver.sleep(2000);
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
                            await driver.sleep(3000);
                            /** Aksi mengisi input date di mulai & berakhir program */
                            await driver.executeScript(`return document.getElementById("Pendaftaran Dimulai *").click()`)
                            await driver.sleep(2000)
                            let days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            let randomIndexDay = faker.number.int({ min: 0, max: 24 })
                            await days[randomIndexDay].click();
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Pendaftaran Berakhir *").click()`)
                            await driver.sleep(2000)
                            days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            await days[randomIndexDay + 1].click();
                            await driver.sleep(2000)

                            // Aksi Sleep
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul Pekerjaan *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully updated the event career ✅' : 'Failed to update the event career ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check the pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await pages.length > 0 || (await rows.length < 10 && await pages.length == 1) ? `- Successfully pagination displayed ✅` : `Pagination wasn't displayed ❌`
                            ]
                            expect(await pages.length > 0 || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Check the next page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                    
                    it.skip(`SUPER ADMIN - Check the last page number of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000);

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
                    
                    it.skip(`SUPER ADMIN - Choose a page number of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000)

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
                    
                    it.skip(`SUPER ADMIN - Check the previous page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                    
                    it.skip(`SUPER ADMIN - Check the first page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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

                    it(`SUPER ADMIN - Delete the Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                                await tableBody != await newTableBody ? '- Successfully deleted the event Career ✅' : '- Failed to delete the event Career ❌'
                            ];
                            expect(await tableBody != await newTableBody).to.be.true;
                            

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 1:
                    it.skip(`ADMIN - Create a new Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ Career'
                            await driver.executeScript(`return document.querySelector(".main-content .btn-primary i.ri-add-line").click()`)                            

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi Event 
                            /** Dummy Data **/
                            let title = faker.person.jobTitle();
                            let description = faker.lorem.paragraph();
                            let companyName = faker.company.name();
                            let link = 'https://google.com';
                            /** Aksi mengisi input name */
                            await driver.findElement(By.id("Judul Pekerjaan *")).sendKeys(title)
                            await driver.sleep(2000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(3000);
                            /** Aksi mengisi input tipe pekerjaan */
                            let selectElement = await driver.findElement(By.css("label[for='Tipe Pekerjaan *'] ~ div select"))
                            let selectJobType = new Select(selectElement)
                            let jobTypes = await driver.executeScript(`return document.querySelectorAll("label[for='Tipe Pekerjaan *'] ~ div select option")`)
                            let randomIndexJobType = faker.number.int({ min: 0, max: await jobTypes.length - 1 })
                            await selectJobType.selectByIndex(randomIndexJobType)
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
                            await driver.sleep(2000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(3000);
                            /** Aksi mengisi input date di mulai & berakhir program */
                            await driver.executeScript(`return document.getElementById("Pendaftaran Dimulai *").click()`)
                            await driver.sleep(2000)
                            let days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            let randomIndexDay = faker.number.int({ min: 0, max: 24 })
                            await days[randomIndexDay].click();
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Pendaftaran Berakhir *").click()`)
                            await driver.sleep(2000)
                            days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            await days[randomIndexDay + 1].click();
                            await driver.sleep(2000)
                            /** Aksi mengisi input link pendaftaran */
                            await driver.findElement(By.id("Link Pendaftaran *")).sendKeys(link)
                            await driver.sleep(2000)
                            /** Aksi mengisi input nama perusahaan */
                            await driver.findElement(By.id("Nama Perusahaan *")).sendKeys(companyName)
                            await driver.sleep(2000)
                            /** Aksi mengisi input kontak perusahaan */
                            let inputSearch = await driver.findElement(By.css(".vs__selected-options input[type=search]"));
                            let action = await driver.actions({async: true});
                            await action.move({origin: await inputSearch}).press().perform();
                            await driver.sleep(2000);
                            let cities = await driver.executeScript(`return document.querySelectorAll('.v-select ul li')`)
                            let randomIndexCity = faker.number.int({ min: 0, max: await cities.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript('arguments[0].scrollIntoView()', await cities[randomIndexCity]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.doubleClick(await cities[randomIndexCity]).perform();

                            // Aksi Sleep
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul Pekerjaan *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

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

                    it.skip(`ADMIN - Edit the Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi memilih salah satu program untuk di edit
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-warning").click()`)
                            await driver.sleep(2000);                         

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi Event 
                            /** Dummy Data **/
                            let title = faker.company.name();
                            let description = faker.lorem.paragraph();
                            /** Aksi mengisi input name */
                            await driver.findElement(By.id("Judul Pekerjaan *")).clear();
                            await driver.findElement(By.id("Judul Pekerjaan *")).sendKeys(title)
                            await driver.sleep(2000);
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
                            await driver.sleep(3000);
                            /** Aksi mengisi input date di mulai & berakhir program */
                            await driver.executeScript(`return document.getElementById("Pendaftaran Dimulai *").click()`)
                            await driver.sleep(2000)
                            let days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            let randomIndexDay = faker.number.int({ min: 0, max: 24 })
                            await days[randomIndexDay].click();
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Pendaftaran Berakhir *").click()`)
                            await driver.sleep(2000)
                            days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            await days[randomIndexDay + 1].click();
                            await driver.sleep(2000)

                            // Aksi Sleep
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul Pekerjaan *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully updated the event career ✅' : 'Failed to update the event career ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Check the pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await pages.length > 0 || (await rows.length < 10 && await pages.length == 1) ? `- Successfully pagination displayed ✅` : `Pagination wasn't displayed ❌`
                            ]
                            expect(await pages.length > 0 || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`ADMIN - Check the next page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                    
                    it.skip(`ADMIN - Check the last page number of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000);

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
                    
                    it.skip(`ADMIN - Choose a page number of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000)

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
                    
                    it.skip(`ADMIN - Check the previous page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                    
                    it.skip(`ADMIN - Check the first page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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

                    it(`ADMIN - Delete the Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                                await tableBody != await newTableBody ? '- Successfully deleted the event Career ✅' : '- Failed to delete the event Career ❌'
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
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 6:
                    it.skip(`CONTENT WRITER - Create a new Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ Career'
                            await driver.executeScript(`return document.querySelector(".main-content .btn-primary i.ri-add-line").click()`)                            

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi Event 
                            /** Dummy Data **/
                            let title = faker.person.jobTitle();
                            let description = faker.lorem.paragraph();
                            let companyName = faker.company.name();
                            let link = 'https://google.com';
                            /** Aksi mengisi input name */
                            await driver.findElement(By.id("Judul Pekerjaan *")).sendKeys(title)
                            await driver.sleep(2000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(3000);
                            /** Aksi mengisi input tipe pekerjaan */
                            let selectElement = await driver.findElement(By.css("label[for='Tipe Pekerjaan *'] ~ div select"))
                            let selectJobType = new Select(selectElement)
                            let jobTypes = await driver.executeScript(`return document.querySelectorAll("label[for='Tipe Pekerjaan *'] ~ div select option")`)
                            let randomIndexJobType = faker.number.int({ min: 0, max: await jobTypes.length - 1 })
                            await selectJobType.selectByIndex(randomIndexJobType)
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
                            await driver.sleep(2000);
                            await driver.switchTo().defaultContent();
                            await driver.sleep(3000);
                            /** Aksi mengisi input date di mulai & berakhir program */
                            await driver.executeScript(`return document.getElementById("Pendaftaran Dimulai *").click()`)
                            await driver.sleep(2000)
                            let days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            let randomIndexDay = faker.number.int({ min: 0, max: 24 })
                            await days[randomIndexDay].click();
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Pendaftaran Berakhir *").click()`)
                            await driver.sleep(2000)
                            days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            await days[randomIndexDay + 1].click();
                            await driver.sleep(2000)
                            /** Aksi mengisi input link pendaftaran */
                            await driver.findElement(By.id("Link Pendaftaran *")).sendKeys(link)
                            await driver.sleep(2000)
                            /** Aksi mengisi input nama perusahaan */
                            await driver.findElement(By.id("Nama Perusahaan *")).sendKeys(companyName)
                            await driver.sleep(2000)
                            /** Aksi mengisi input kontak perusahaan */
                            let inputSearch = await driver.findElement(By.css(".vs__selected-options input[type=search]"));
                            let action = await driver.actions({async: true});
                            await action.move({origin: await inputSearch}).press().perform();
                            await driver.sleep(2000);
                            let cities = await driver.executeScript(`return document.querySelectorAll('.v-select ul li')`)
                            let randomIndexCity = faker.number.int({ min: 0, max: await cities.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript('arguments[0].scrollIntoView()', await cities[randomIndexCity]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.doubleClick(await cities[randomIndexCity]).perform();

                            // Aksi Sleep
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul Pekerjaan *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

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

                    it.skip(`CONTENT WRITER - Edit the Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi memilih salah satu program untuk di edit
                            await driver.executeScript(`return document.querySelector("table tbody tr .btn-warning").click()`)
                            await driver.sleep(2000);                         

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi Event 
                            /** Dummy Data **/
                            let title = faker.company.name();
                            let description = faker.lorem.paragraph();
                            /** Aksi mengisi input name */
                            await driver.findElement(By.id("Judul Pekerjaan *")).clear();
                            await driver.findElement(By.id("Judul Pekerjaan *")).sendKeys(title)
                            await driver.sleep(2000);
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
                            await driver.sleep(3000);
                            /** Aksi mengisi input date di mulai & berakhir program */
                            await driver.executeScript(`return document.getElementById("Pendaftaran Dimulai *").click()`)
                            await driver.sleep(2000)
                            let days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            let randomIndexDay = faker.number.int({ min: 0, max: 24 })
                            await days[randomIndexDay].click();
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Pendaftaran Berakhir *").click()`)
                            await driver.sleep(2000)
                            days = await driver.executeScript(`return document.querySelectorAll(".b-calendar-grid-body div:is([data-date]) span.text-dark")`);
                            await days[randomIndexDay + 1].click();
                            await driver.sleep(2000)

                            // Aksi Sleep
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`);
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Judul Pekerjaan *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully updated the event career ✅' : 'Failed to update the event career ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Check the pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000)

                            // Aksi mengecek pagination
                            let pages = await driver.executeScript(`return Array.from(document.querySelectorAll("ul.pagination li.page-item button:not(.disabled)")).filter(page => !isNaN(page.innerText))`);
                            let rows = await driver.executeScript(`return document.querySelectorAll("table tbody tr")`);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await pages.length > 0 || (await rows.length < 10 && await pages.length == 1) ? `- Successfully pagination displayed ✅` : `Pagination wasn't displayed ❌`
                            ]
                            expect(await pages.length > 0 || (await rows.length < 10 && await pages.length == 1)).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`CONTENT WRITER - Check the next page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                    
                    it.skip(`CONTENT WRITER - Check the last page number of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000);

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
                    
                    it.skip(`CONTENT WRITER - Choose a page number of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(2000)

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
                    
                    it.skip(`CONTENT WRITER - Check the previous page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                    
                    it.skip(`CONTENT WRITER - Check the first page of pagination of Table List Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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

                    it(`CONTENT WRITER - Delete the Event Career from browser ${browser}`, async () => {

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
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi klik menu 'Form'
                            await driver.executeScript(`return Array.from(document.querySelectorAll("ul.navbar-nav li")).find(value => {
                                const innerSpan = value.querySelector("i.ri-rocket-line ~ span");
                                return innerSpan && innerSpan.innerText.toLowerCase().includes("event");
                            }).querySelector("#Event ul:last-child li.nav-item a").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

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
                                await tableBody != await newTableBody ? '- Successfully deleted the event Career ✅' : '- Failed to delete the event Career ❌'
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