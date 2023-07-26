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
import { faker } from '@faker-js/faker';
import Tesseract from "tesseract.js"

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
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
                    
                    it(`SUPER ADMIN - Relogin from browser ${browser}`, async () => {

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
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
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData.id > 0 ? "Successfully re-login ✅" : "Failed to relogin ❌"
                            ];
                            
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
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
                    
                    it(`ADMIN - Relogin from browser ${browser}`, async () => {

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
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
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData.id > 0 ? "Successfully re-login ✅" : "Failed to relogin ❌"
                            ];
                            
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
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
                    
                    it(`MENTOR - Relogin from browser ${browser}`, async () => {

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
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
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData.id > 0 ? "Successfully re-login ✅" : "Failed to relogin ❌"
                            ];
                            
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
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
                    
                    it(`STUDENT - Relogin from browser ${browser}`, async () => {

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
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
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData.id > 0 ? "Successfully re-login ✅" : "Failed to relogin ❌"
                            ];
                            
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`STUDENT - Reset Password from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi menunggu modal content
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.findElement(By.css(".modal-content header button.close")).click();
                            }

                            // Aksi Sleep
                            await driver.sleep(5000);
                            
                            await driver.executeScript(`return document.querySelector('ul li a.btn.btn-primary').click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi klik button 'Lupa Kata Sandi?'
                            await driver.executeScript(`return document.querySelector("form .form-group a.color-primary").click()`)
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengisi input field email
                            let fullName = faker.name.fullName();
                            let emailData = `${fullName.toLowerCase().replace(/ /g, '')}@gmail.com`;
                            await driver.findElement(By.css("form .form-group input[type=email]")).sendKeys(user.email)
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click();`);
                            await driver.sleep(2000);
                            let alertError = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null;`);
                            await thrownAnError(await alertError?.getAttribute("innerText"), await alertError != null && await alertError?.getAttribute("innerText") != 'mohon tunggu hingga jangka waktu yang telah ditentukan')

                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(await alertError?.getAttribute("innerText") == 'mohon tunggu hingga jangka waktu yang telah ditentukan') {
                                // Expect results and add custom message for addtional description
                                customMessages = [
                                    await alertError?.getAttribute("innerText") == 'mohon tunggu hingga jangka waktu yang telah ditentukan' ? 'The reset link password was already sent ✅' : 'Failed to send link reset password ❌'
                                ]
                                expect(await alertError?.getAttribute("innerText") == 'mohon tunggu hingga jangka waktu yang telah ditentukan').to.equal(true)
                            } else {
                                // Expect results and add custom message for addtional description
                                const messageResetPassword = await driver.findElement(By.css('#auth .card.card-profile'));
                                customMessages = [
                                    await messageResetPassword.isDisplayed() ? 'Displayed page the reset link password ✅' : 'Failed to send link reset password ❌'
                                ]
                                expect(await messageResetPassword.isDisplayed()).to.equal(true)
                            }

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
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
                    
                    it(`CONTENT WRITER - Relogin from browser ${browser}`, async () => {

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
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
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData.id > 0 ? "Successfully re-login ✅" : "Failed to relogin ❌"
                            ];
                            
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content'))); 
                                await driver.sleep(2000);             
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
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
                    
                    it(`LEAD PROGRAM - Relogin from browser ${browser}`, async () => {

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
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
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData.id > 0 ? "Successfully re-login ✅" : "Failed to relogin ❌"
                            ];
                            
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
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
                    
                    it(`LEAD REGION - Relogin from browser ${browser}`, async () => {

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

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi mengkonfirmasi signout di modal
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000) 
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));
                                await driver.sleep(3000)              
                                await driver.executeScript(`return document.querySelector(".modal-content button.btn-danger").click()`);
                            }

                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
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
                            let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                            userData = await JSON.parse(userData);

                            customMessages = [
                                userData.id > 0 ? "Successfully re-login ✅" : "Failed to relogin ❌"
                            ];
                            
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);

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
        it(`Checking button show password in login page from ${browser}`, async () => {

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
        
        it(`Checking button hide password in login page from ${browser}`, async () => {

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
        
        it(`Register as student from ${browser}`, async () => {

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

                // Aksi klik button 'Daftar Sekarang'
                await driver.executeScript(`return document.querySelector(".card-body div.text-center a.color-primary").click();`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi fill form register
                // Dummy data registration
                let fullName = faker.name.fullName();
                let emailData = `${fullName.toLowerCase().replace(/ /g, '')}@gmail.com`;
                let passwordData = 'semuasama';
                let phoneNumber = faker.phone.number('08##########');

                // Fill data registration
                await driver.wait(until.elementLocated(By.css(`input[type="email"]`)));
                await driver.findElement(By.css(`input[type="email"]`)).sendKeys(emailData);
                await driver.findElement(By.css(`input#inputName`)).sendKeys(fullName);
                await driver.findElement(By.css(`input#inputPhone`)).sendKeys(phoneNumber);
                await driver.sleep(2000);
                await driver.wait(until.elementLocated(By.css("#inputGender.v-select")))
                // Select gender
                let inputSearch = await driver.findElement(By.css("#inputGender .vs__selected-options input[type=search]"));
                let action = await driver.actions({async: true});
                await action.move({origin: await inputSearch}).press().perform();
                await driver.sleep(2000);
                // Aksi mengecek pilihan gender
                let genders = await driver.executeScript(`return document.querySelectorAll('#inputGender.v-select ul li')`)
                let randomIndexGender = faker.number.int({ min: 0, max: await genders.length - 1 });
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].scrollIntoView()', await genders[randomIndexGender]);
                await driver.sleep(2000);
                let actions = driver.actions({async: true});
                await actions.doubleClick(await genders[randomIndexGender]).perform();
                await driver.sleep(3000);
                await driver.wait(until.elementLocated(By.css("#inputProvince.v-select")))
                // Select province
                inputSearch = await driver.findElement(By.css("#inputProvince .vs__selected-options input[type=search]"));
                action = await driver.actions({async: true});
                await action.move({origin: await inputSearch}).press().perform();
                await driver.sleep(2000);
                // Aksi mengecek pilihan province
                let provinces = await driver.executeScript(`return document.querySelectorAll('#inputProvince.v-select ul li')`)
                let randomIndexProvince = faker.number.int({ min: 0, max: await provinces.length - 1 });
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].scrollIntoView()', await provinces[randomIndexProvince]);
                await driver.sleep(2000);
                actions = driver.actions({async: true});
                await actions.doubleClick(await provinces[randomIndexProvince]).perform();
                await driver.sleep(3000);
                await driver.wait(until.elementLocated(By.css("#inputCity.v-select")))
                // Select city
                inputSearch = await driver.findElement(By.css("#inputCity .vs__selected-options input[type=search]"));
                action = await driver.actions({async: true});
                await action.move({origin: await inputSearch}).press().perform();
                await driver.sleep(2000);
                // Aksi mengecek pilihan province
                let cities = await driver.executeScript(`return document.querySelectorAll('#inputCity.v-select ul li')`)
                let randomIndexCity = faker.number.int({ min: 0, max: await cities.length - 1 });
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].scrollIntoView()', await cities[randomIndexCity]);
                await driver.sleep(2000);
                actions = driver.actions({async: true});
                await actions.doubleClick(await cities[randomIndexCity]).perform();
                await driver.sleep(2000);
                await driver.findElement(By.css(`input#inputPassword`)).sendKeys(passwordData);
                await driver.findElement(By.css(`input#inputRepeat`)).sendKeys(passwordData);
                const isAllFilled = await Promise.all([
                    await driver.findElement(By.css("input[type='email']")).getAttribute('value'),
                    await driver.findElement(By.css("input#inputName")).getAttribute('value'),
                    await driver.findElement(By.css(`input#inputPhone`)).getAttribute('value'),
                    // await driver.findElement(By.css("#inputGender.v-select input")).getAttribute('value'),
                    // await driver.findElement(By.css("#inputProvince.v-select input")).getAttribute('value'),
                    // await driver.findElement(By.css("#inputCity.v-select input")).getAttribute('value'),
                    await driver.findElement(By.css("input#inputPassword")).getAttribute('value'),
                    await driver.findElement(By.css("input#inputRepeat")).getAttribute('value'),
                ]).then(results => results.every(value => value != ''));
                
                await driver.sleep(2000)
                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                await driver.sleep(2000)

                if(isAllFilled) {
                    await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`);
                } else await thrownAnError('There are still empty input fields on form register', !isAllFilled)

                // Aksi Sleep
                await driver.sleep(3000);
                
                // Expect results and add custom message for addtional description
                const messageConfirmEmail = await driver.findElement(By.css('#auth .card.card-profile'));
                customMessages = [
                    await messageConfirmEmail.isDisplayed() ? 'Displayed page to resend password confirmation ✅' : 'Failed to resend password confirmation ❌'
                ]
                expect(await messageConfirmEmail.isDisplayed()).to.equal(true)

            } catch (error) {
                expect.fail(error);
            }

        });
        
        // it(`Register using google account from ${browser}`, async () => {

        //     try {

        //         // Go to application
        //         driver = await goToApp(browser, appHost);
        //         await driver.manage().window().maximize();

        //         // Aksi Sleep
        //         await driver.sleep(5000);

        //         // Aksi remove modal
        //         await removeModal(driver)

        //         // Aksi sleep
        //         await driver.sleep(3000);

        //         // Aksi klik button Masuk/Login
        //         await driver.executeScript(`return document.querySelector('ul li a.btn.btn-primary').click();`);

        //         // Aksi sleep
        //         await driver.sleep(5000);

        //         // Aksi klik button Icon Google
        //         await driver.executeScript(`return document.querySelector(".card-body .btn-inner--icon").click()`);

        //         // Aksi Sleep
        //         await driver.sleep(5000);

        //         // Aksi fill form input email
        //         await driver.findElement(By.css("input[type=email]")).sendKeys('adnanerlansyah505@gmail.com');
        //         await driver.sleep(2000);
        //         const captchaImage = await driver.executeScript(`return document.querySelector("img#captchaimg")`)
        //         await driver.sleep(2000);
        //         await driver.executeScript(`return document.querySelector("#identifierNext button").click();`);
        //         await driver.sleep(2000);
        //         let messageError = await driver.executeScript(`return document.querySelector('.LXRPh') ? document.querySelector('.LXRPh') : null`);
        //         await thrownAnError('An error occurred while fill the input field', await messageError != null && await messageError?.isDisplayed());
                
        //         // Aksi sleep
        //         await driver.sleep(3000);
                
        //         // Aksi fill form input password
        //         await driver.findElement(By.css("input[type=password]")).sendKeys('45Adnan45');
        //         await driver.sleep(2000);
        //         await driver.executeScript(`return document.querySelector("#passwordNext button").click();`);
        //         messageError = await driver.executeScript(`return document.querySelector('.LXRPh') ? document.querySelector('.LXRPh') : null`);
        //         await thrownAnError('An error occurred while fill the input field', await messageError != null && await messageError?.isDisplayed());
                
        //         // Aksi sleep
        //         await driver.sleep(12000);

        //         let modalContent = await driver.executeScript(`return document.querySelector(".modal-content") ? document.querySelector(".modal-content") : null`);
        //         if(await modalContent != null && await modalContent.isDisplayed()) {
                    
        //             await driver.wait(until.elementLocated(By.css("#selectGender.v-select")))
        //             // Select gender
        //             let inputSearch = await driver.findElement(By.css("#selectGender .vs__selected-options input[type=search]"));
        //             let action = await driver.actions({async: true});
        //             await action.move({origin: await inputSearch}).press().perform();
        //             await driver.sleep(2000);
        //             // Aksi mengecek pilihan gender
        //             let genders = await driver.executeScript(`return document.querySelectorAll('#selectGender.v-select ul li')`)
        //             let randomIndexGender = faker.number.int({ min: 0, max: await genders.length - 1 });
        //             await driver.sleep(1000);
        //             await driver.executeScript('arguments[0].scrollIntoView()', await genders[randomIndexGender]);
        //             await driver.sleep(2000);
        //             let actions = driver.actions({async: true});
        //             await actions.doubleClick(await genders[randomIndexGender]).perform();
        //             await driver.sleep(3000);
        //             await driver.wait(until.elementLocated(By.css("#selectCity.v-select")))
        //             // Select province
        //             inputSearch = await driver.findElement(By.css("#selectCity .vs__selected-options input[type=search]"));
        //             action = await driver.actions({async: true});
        //             await action.move({origin: await inputSearch}).press().perform();
        //             await driver.sleep(2000);
        //             // Aksi mengecek pilihan province
        //             let cities = await driver.executeScript(`return document.querySelectorAll('#selectCity.v-select ul li')`)
        //             let randomIndexCity = faker.number.int({ min: 0, max: await cities.length - 1 });
        //             await driver.sleep(1000);
        //             await driver.executeScript('arguments[0].scrollIntoView()', await cities[randomIndexCity]);
        //             await driver.sleep(2000);
        //             actions = driver.actions({async: true});
        //             await actions.doubleClick(await cities[randomIndexCity]).perform();

        //             // Aksi Sleep
        //             await driver.sleep(3000);

        //             // Aksi klik button 'Simpan'
        //             await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`);
                    
        //             // Aksi Sleep
        //             await driver.sleep(3000);

        //             // Aksi klik button konfirmasi
        //             await driver.executeScript(`return document.querySelector(".modal-content .modal-body button[type=button].btn-primary").click();`);

        //         }
                
        //         // Aksi Sleep
        //         await driver.sleep(3000);

        //         // Expect results and add custom message for addtional description
        //         let userData = await driver.executeScript("return window.localStorage.getItem('user')")
        //         userData = await JSON.parse(userData);

        //         customMessages = [
        //             userData ? "Successfully register with account google ✅" : "Failed to register with account google ❌"
        //         ]
        //         expect(userData).to.be.not.null;


        //     } catch (error) {
        //         expect.fail(error);
        //     }

        // });
        
        it(`Register using github account from ${browser}`, async () => {

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

                // Aksi klik button Icon Google
                await driver.executeScript(`return document.querySelectorAll(".card-body .btn-inner--icon")[1].click()`);

                // Aksi Sleep
                await driver.sleep(5000);

                // Aksi fill form input email
                await driver.findElement(By.css("input[name=login]")).sendKeys('adnanerlansyah403@gmail.com');
                await driver.sleep(1000);
                await driver.findElement(By.css("input[type=password]")).sendKeys('ufojelek12345');
                await driver.sleep(2000);
                await driver.executeScript(`return document.querySelector("input[type=submit]").click();`);
                await driver.sleep(2000);
                let flashError = await driver.executeScript(`return document.querySelector(".flash.flash-error") ? document.querySelector(".flash.flash-error") : null`);
                await thrownAnError(await flashError?.getAttribute('innerText'),  await flashError != null && await flashError?.isDisplayed())
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button konfirmasi authroization
                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                // await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)
                
                // Aksi sleep
                await driver.sleep(12000);
                
                let modalContent = await driver.executeScript(`return document.querySelector(".modal-content") ? document.querySelector(".modal-content") : null`);
                if(await modalContent != null && await modalContent?.isDisplayed()) {
                    
                    await driver.wait(until.elementLocated(By.css("#selectGender.v-select")))
                    // Select gender
                    let inputSearch = await driver.findElement(By.css("#selectGender .vs__selected-options input[type=search]"));
                    let action = await driver.actions({async: true});
                    await action.move({origin: await inputSearch}).press().perform();
                    await driver.sleep(2000);
                    // Aksi mengecek pilihan gender
                    let genders = await driver.executeScript(`return document.querySelectorAll('#selectGender.v-select ul li')`)
                    let randomIndexGender = faker.number.int({ min: 0, max: await genders.length - 1 });
                    await driver.sleep(1000);
                    await driver.executeScript('arguments[0].scrollIntoView()', await genders[randomIndexGender]);
                    await driver.sleep(2000);
                    let actions = driver.actions({async: true});
                    await actions.doubleClick(await genders[randomIndexGender]).perform();
                    await driver.sleep(3000);
                    await driver.wait(until.elementLocated(By.css("#selectCity.v-select")))
                    // Select province
                    inputSearch = await driver.findElement(By.css("#selectCity .vs__selected-options input[type=search]"));
                    action = await driver.actions({async: true});
                    await action.move({origin: await inputSearch}).press().perform();
                    await driver.sleep(2000);
                    // Aksi mengecek pilihan province
                    let cities = await driver.executeScript(`return document.querySelectorAll('#selectCity.v-select ul li')`)
                    let randomIndexCity = faker.number.int({ min: 0, max: await cities.length - 1 });
                    await driver.sleep(1000);
                    await driver.executeScript('arguments[0].scrollIntoView()', await cities[randomIndexCity]);
                    await driver.sleep(2000);
                    actions = driver.actions({async: true});
                    await actions.doubleClick(await cities[randomIndexCity]).perform();

                    // Aksi Sleep
                    await driver.sleep(3000);

                    // Aksi klik button 'Simpan'
                    await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`);
                    
                    // Aksi Sleep
                    await driver.sleep(3000);

                    // Aksi klik button konfirmasi
                    await driver.executeScript(`return document.querySelector(".modal-content .modal-body button[type=button].btn-primary").click();`);
                    
                }

                // Aksi sleep
                await driver.sleep(3000);

                // Expect results and add custom message for addtional description
                let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                userData = await JSON.parse(userData);

                customMessages = [
                    userData ? "Successfully register with account github ✅" : "Failed to register with account github ❌"
                ]
                expect(userData).to.be.not.null;


            } catch (error) {
                expect.fail(error);
            }

        });
        
        it(`Register using linkedin account from ${browser}`, async () => {

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

                // Aksi klik button Icon Linkedin
                await driver.executeScript(`return document.querySelectorAll(".card-body .btn-inner--icon")[2].click()`);

                // Aksi Sleep
                await driver.sleep(5000);

                // Aksi fill form input email
                await driver.findElement(By.css("input#username")).sendKeys('adnanerlansyah403@gmail.com');
                await driver.sleep(1000);
                await driver.findElement(By.css("input[type=password]")).sendKeys('45adnan45');
                await driver.sleep(2000);
                await driver.executeScript(`return document.querySelector(".login__form_action_container button[type=submit]").click();`);
                await driver.sleep(2000);
                // let errorForm = await driver.executeScript(`return document.querySelector(".form__label--error") ? document.querySelector(".form__label--error") : null`);
                // await thrownAnError("An occured while fill form login",  await errorForm != null)

                // Aksi klik button konfirmasi authroization
                // await driver.executeScript(`return document.querySelector("form#oauth__auth-form button[type=submit]").click();`);
                
                // Aksi sleep
                await driver.sleep(15000);
                
                let modalContent = await driver.executeScript(`return document.querySelector(".modal-content") ? document.querySelector(".modal-content") : null`);
                if(await modalContent != null && await modalContent?.isDisplayed()) {
                    
                    await driver.wait(until.elementLocated(By.css("#selectGender.v-select")))
                    // Select gender
                    let inputSearch = await driver.findElement(By.css("#selectGender .vs__selected-options input[type=search]"));
                    let action = await driver.actions({async: true});
                    await action.move({origin: await inputSearch}).press().perform();
                    await driver.sleep(2000);
                    // Aksi mengecek pilihan gender
                    let genders = await driver.executeScript(`return document.querySelectorAll('#selectGender.v-select ul li')`)
                    let randomIndexGender = faker.number.int({ min: 0, max: await genders.length - 1 });
                    await driver.sleep(1000);
                    await driver.executeScript('arguments[0].scrollIntoView()', await genders[randomIndexGender]);
                    await driver.sleep(2000);
                    let actions = driver.actions({async: true});
                    await actions.doubleClick(await genders[randomIndexGender]).perform();
                    await driver.sleep(3000);
                    await driver.wait(until.elementLocated(By.css("#selectCity.v-select")))
                    // Select province
                    inputSearch = await driver.findElement(By.css("#selectCity .vs__selected-options input[type=search]"));
                    action = await driver.actions({async: true});
                    await action.move({origin: await inputSearch}).press().perform();
                    await driver.sleep(2000);
                    // Aksi mengecek pilihan province
                    let cities = await driver.executeScript(`return document.querySelectorAll('#selectCity.v-select ul li')`)
                    let randomIndexCity = faker.number.int({ min: 0, max: await cities.length - 1 });
                    await driver.sleep(1000);
                    await driver.executeScript('arguments[0].scrollIntoView()', await cities[randomIndexCity]);
                    await driver.sleep(2000);
                    actions = driver.actions({async: true});
                    await actions.doubleClick(await cities[randomIndexCity]).perform();

                    // Aksi Sleep
                    await driver.sleep(3000);

                    // Aksi klik button 'Simpan'
                    await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`);
                    
                    // Aksi Sleep
                    await driver.sleep(3000);

                    // Aksi klik button konfirmasi
                    await driver.executeScript(`return document.querySelector(".modal-content .modal-body button[type=button].btn-primary").click();`);
                    
                }

                // Aksi sleep
                await driver.sleep(5000);

                // Expect results and add custom message for addtional description
                let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                userData = await JSON.parse(userData);

                customMessages = [
                    userData ? "Successfully register with account github ✅" : "Failed to register with account github ❌"
                ]
                expect(userData).to.be.not.null;


            } catch (error) {
                expect.fail(error);
            }

        });

    })



});