import addContext from 'mochawesome/addContext.js';
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { expect } from "chai";
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import { describe, afterEach, before } from 'mocha';
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { fileURLToPath } from 'url';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';
import { removeModal } from '#root/helpers/global';

/**
 * Get the user data for authentication
 */

const users = getUserAccount(yargs(process?.argv?.slice(2))?.parse()) ?? null;

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}/`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}/`);
}

describe("Authentication", () => {
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
            value: path.relative(fileURLToPath(import.meta.url).replace(/\.js$/, '').replace(/test/g, 'testResult\\reports'), fileNamePath).replace(/research-unit-test-lms/g, '')
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

        // Need Login or authenticated
        users?.forEach(userData => {

            const data = userData?.split('=');
            const userAccount = data[1].split(';');
            const email = userAccount[0];
            const password = userAccount[1];
            const name = userAccount[2];
            const kind = parseInt(userAccount[3]);

            let user = { name, email, password, kind };

            switch (user.kind) {
                case 0:
                    it(`SUPER ADMIN - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`SUPER ADMIN - Signout from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button navbar profile
                            await driver.executeScript(`return document.querySelector(".sidenav .navbar-profile").click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek dropdownmenu apakah muncul atau tidak
                            let dropdownMenuProfile = await driver.executeScript(`return document.querySelector(".dropdown-menu")`);
                            await thrownAnError("Dropdown Menu Profile isn't showed up", await dropdownMenuProfile.isDisplayed());

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector(".dropdown-menu button").click();`)

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.executeScript(`return document.querySelector(".modal-content .box-action .btn.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData === null ? "Successfully signout from dashboard ✅" : "Failed to sign out from dashboard ❌"
                            ]

                            expect(userData).to.be.null;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;
                case 1:
                    it(`ADMIN - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`ADMIN - Signout from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button navbar profile
                            await driver.executeScript(`return document.querySelector(".sidenav .navbar-profile").click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek dropdownmenu apakah muncul atau tidak
                            let dropdownMenuProfile = await driver.executeScript(`return document.querySelector(".dropdown-menu")`);
                            await thrownAnError("Dropdown Menu Profile isn't showed up", await dropdownMenuProfile.isDisplayed());

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector(".dropdown-menu button").click();`)

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.executeScript(`return document.querySelector(".modal-content .box-action .btn.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData === null ? "Successfully signout from dashboard ✅" : "Failed to sign out from dashboard ❌"
                            ]

                            expect(userData).to.be.null;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;

                case 2:
                    it(`MENTOR - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`MENTOR - Signout from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button navbar profile
                            await driver.executeScript(`return document.querySelector(".sidenav .navbar-profile").click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek dropdownmenu apakah muncul atau tidak
                            let dropdownMenuProfile = await driver.executeScript(`return document.querySelector(".dropdown-menu")`);
                            await thrownAnError("Dropdown Menu Profile isn't showed up", await dropdownMenuProfile.isDisplayed());

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector(".dropdown-menu button").click();`)

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.executeScript(`return document.querySelector(".modal-content .box-action .btn.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData === null ? "Successfully signout from dashboard ✅" : "Failed to sign out from dashboard ❌"
                            ]

                            expect(userData).to.be.null;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;

                case 4:
                    it(`STUDENT - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`STUDENT - Signout from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button navbar profile
                            await driver.executeScript(`return document.querySelector(".sidenav .navbar-profile").click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek dropdownmenu apakah muncul atau tidak
                            let dropdownMenuProfile = await driver.executeScript(`return document.querySelector(".dropdown-menu")`);
                            await thrownAnError("Dropdown Menu Profile isn't showed up", await dropdownMenuProfile.isDisplayed());

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector(".dropdown-menu button").click();`)

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.executeScript(`return document.querySelector(".modal-content .box-action .btn.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData === null ? "Successfully signout from dashboard ✅" : "Failed to sign out from dashboard ❌"
                            ]

                            expect(userData).to.be.null;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;

                case 5:
                    it(`INDUSTRY - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;

                case 6:
                    it(`CONTENT WRITER - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`CONTENT WRITER - Signout from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button navbar profile
                            await driver.executeScript(`return document.querySelector(".sidenav .navbar-profile").click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek dropdownmenu apakah muncul atau tidak
                            let dropdownMenuProfile = await driver.executeScript(`return document.querySelector(".dropdown-menu")`);
                            await thrownAnError("Dropdown Menu Profile isn't showed up", await dropdownMenuProfile.isDisplayed());

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector(".dropdown-menu button").click();`)

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.executeScript(`return document.querySelector(".modal-content .box-action .btn.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData === null ? "Successfully signout from dashboard ✅" : "Failed to sign out from dashboard ❌"
                            ]

                            expect(userData).to.be.null;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;

                case 7:
                    it(`LEAD PROGRAM - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`LEAD PROGRAM - Signout from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button navbar profile
                            await driver.executeScript(`return document.querySelector(".sidenav .navbar-profile").click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek dropdownmenu apakah muncul atau tidak
                            let dropdownMenuProfile = await driver.executeScript(`return document.querySelector(".dropdown-menu")`);
                            await thrownAnError("Dropdown Menu Profile isn't showed up", await dropdownMenuProfile.isDisplayed());

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector(".dropdown-menu button").click();`)

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.executeScript(`return document.querySelector(".modal-content .box-action .btn.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData === null ? "Successfully signout from dashboard ✅" : "Failed to sign out from dashboard ❌"
                            ]

                            expect(userData).to.be.null;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;
                
                case 9:
                    it(`LEAD REGION - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`LEAD REGION - Signout from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button navbar profile
                            await driver.executeScript(`return document.querySelector(".sidenav .navbar-profile").click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek dropdownmenu apakah muncul atau tidak
                            let dropdownMenuProfile = await driver.executeScript(`return document.querySelector(".dropdown-menu")`);
                            await thrownAnError("Dropdown Menu Profile isn't showed up", await dropdownMenuProfile.isDisplayed());

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector(".dropdown-menu button").click();`)

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.executeScript(`return document.querySelector(".modal-content .box-action .btn.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData === null ? "Successfully signout from dashboard ✅" : "Failed to sign out from dashboard ❌"
                            ]

                            expect(userData).to.be.null;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;

                default:
                    it(`OTHER - Login to dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                            // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                            const networkData = await driver.executeScript(`
                                const performanceEntries = performance.getEntriesByType('resource');
                                const requests = performanceEntries.map(entry => {
                                    return {
                                        entry,
                                        url: entry.name,
                                        method: entry.initiatorType,
                                        type: entry.entryType,
                                    };
                                });
                                
                                return requests;
                            `);

                            // Tampilkan data jaringan
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            if (errorMessages?.length > 0) {
                                throw new Error(errorMessages);
                            }

                            customMessages = [
                                textStatus > 0 ? "Enter to dashboard ✅" : "Enter to dashboard ❌",
                                userData.id > 0 ? "Get the data user that logged in ✅" : "Get the data user that logged in ❌"
                            ];
                            
                            expect(textStatus).to.greaterThan(0);
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;
            }
        });

        // No need some authentication user
        it.skip(`Checking button show password in login page from ${browser}`, async () => {

            try {

                // Go to application
                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi Sleep
                await driver.sleep(5000);

                // Aksi remove modal
                await removeModal(driver)

                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button Masuk/Login
                await driver.executeScript(`return document.querySelector('ul li a.btn.btn-primary').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi klik button eye untuk mengaktifkan show password
                await driver.executeScript(`return document.querySelector("form .input-group-prepend .fa-eye-slash").click()`);
                await driver.sleep(2000);
                await driver.executeScript(`return document.querySelectorAll("form .form-group")[1].querySelector("input").value = 'test123';`);

                // Aksi sleep
                await driver.sleep(3000);

                // Check the result
                let typeInputPassword = await driver.executeScript(`return document.querySelectorAll("form .form-group")[1].querySelector("input").type`)
                customMessages = [
                    typeInputPassword === "text" ? "Successfully show the password field ✅" : "Failed to show the password field ❌"
                ]
                expect(typeInputPassword).to.equal("text")

            } catch (error) {
                expect.fail(error);
            }

        });
        
        it.skip(`Checking button hide password in login page from ${browser}`, async () => {

            try {

                // Go to application
                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi Sleep
                await driver.sleep(5000);

                // Aksi remove modal
                await removeModal(driver)

                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button Masuk/Login
                await driver.executeScript(`return document.querySelector('ul li a.btn.btn-primary').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi klik button eye untuk mengaktifkan show password
                await driver.executeScript(`return document.querySelector("form .input-group-prepend .fa-eye-slash").click()`);
                await driver.sleep(2000);
                await driver.executeScript(`return document.querySelector("form .input-group-prepend .fa-eye").click()`);
                await driver.sleep(2000);
                await driver.executeScript(`return document.querySelectorAll("form .form-group")[1].querySelector("input").value = 'test123';`);

                // Aksi sleep
                await driver.sleep(3000);

                // Check the result
                let typeInputPassword = await driver.executeScript(`return document.querySelectorAll("form .form-group")[1].querySelector("input").type`)
                customMessages = [
                    typeInputPassword === "password" ? "Successfully hide the password field ✅" : "Failed to hide the password field ❌"
                ]
                expect(typeInputPassword).to.equal("password")

            } catch (error) {
                expect.fail(error);
            }

        });

    })



});