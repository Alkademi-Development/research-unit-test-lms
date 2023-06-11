import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
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

/**
 * Get the user data for authentication
 */

const users = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
screenshootFilePath = path.resolve(`./screenshoot/test/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}`);

describe("Login", () => {

    after(async function () {
        console.log(`${' '.repeat(4)}Screenshoots test berhasil di buat, berada di folder: ${screenshootFilePath} `);
    });

    afterEach(async function() {
        fs.mkdir(screenshootFilePath, { recursive: true }, (error) => {
            if (error) {
              console.error(`Terjadi kesalahan dalam membuat folder screenshoot:`, error);
            } 
        });
        await takeScreenshot(driver, path.resolve(`${screenshootFilePath}/${(this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1}.png`));
        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: path.relative(fileURLToPath(import.meta.url), path.resolve(`${screenshootFilePath}/${(this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1}.png`))
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
                    it(`SUPER ADMIN - Login to dashboard from browser ${browser}`, async () => {
                            
                        try {
                            
                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
            
                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser);
            
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
                            
                            if(errorMessages.length > 0) {
                                throw new Error(errorMessages);
                            }
            
                            assert.strictEqual(textStatus > 1, textStatus > 1); 
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
                            errorMessages = await enterDashboard(driver, user, browser);
            
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
                            
                            if(errorMessages.length > 0) {
                                throw new Error(errorMessages);
                            }
            
                            assert.strictEqual(textStatus > 1, textStatus > 1); 
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
                            errorMessages = await enterDashboard(driver, user, browser);
            
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
                            
                            if(errorMessages.length > 0) {
                                throw new Error(errorMessages);
                            }
            
                            assert.strictEqual(textStatus > 1, textStatus > 1); 
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
                            errorMessages = await enterDashboard(driver, user, browser);
            
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
                            
                            if(errorMessages.length > 0) {
                                throw new Error(errorMessages);
                            }
            
                            assert.strictEqual(textStatus > 1, textStatus > 1); 
                            expect(correctUrl.url).to.includes("v1/user/me");
                            expect(userData.id).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }
                            
                        
                    });

                    break;
            }
        });

    })
    


});