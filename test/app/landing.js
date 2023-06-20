import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import addContext from 'mochawesome/addContext.js';
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { BROWSERS } from '#root/commons/constants/browser';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { fileURLToPath } from 'url';
import { captureConsoleErrors, parseToDomain } from '#root/commons/utils/generalUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';
import moment from 'moment-timezone';

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}/`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}/`);
}

describe("Landing Page", () => {
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
        } else if (this.currentTest.isFailed) {
            addContext(this, {
                title: 'Status Test',
                value: 'Failed ❌'
            })
        }
        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: "..\\" + path.relative(fileURLToPath(import.meta.url), fileNamePath)
        });
        await driver.sleep(3000);
        await driver.quit();
    })

    BROWSERS.forEach(browser => {

        it(`Go to app or landing page - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Tunggu hingga semua permintaan dari server selesai
                await driver.wait(async function() {
                    const pageLoaded = await driver.executeScript(function() {
                        var body = document.getElementsByTagName('body')[0];
                        if(body && body.readyState == 'loading') {
                            console.log('Loading...');
                        } else {
                            if(window.addEventListener) {
                                return true
                            } else {
                                window.attachEvent('onload', () => console.log('Loaded'))
                            }
                        }
                    })
                    return pageLoaded === true;
                });

                // Aksi menghilangkan modal 
                await driver.wait(until.elementLocated(By.css('#modal-center')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);
                
                await driver.wait(until.elementsLocated(By.id('home')), 5000);
    
                const home = await driver.findElement(By.css('#home')).isDisplayed();
    
                customMessages = [
                    home ? 'Show the landing page ✅' : 'Show the landing page ❌'
                ];
                expect(home).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check modal is show up on landing page or home - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Tunggu hingga semua permintaan dari server selesai
                await driver.wait(async function() {
                    const pageLoaded = await driver.executeScript(function() {
                        var body = document.getElementsByTagName('body')[0];
                        if(body && body.readyState == 'loading') {
                            console.log('Loading...');
                        } else {
                            if(window.addEventListener) {
                                return true
                            } else {
                                window.attachEvent('onload', () => console.log('Loaded'))
                            }
                        }
                    })
                    return pageLoaded === true;
                });

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi menghilangkan modal 
                const modalDisplayed = await driver.wait(until.elementLocated(By.css('.modal-content'))).isDisplayed();
    
                customMessages = [
                    modalDisplayed ? 'Show modal on the landing page ✅' : 'Show modal on the landing page ❌'
                ];
                expect(modalDisplayed).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });

        it(`Check tab beranda - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Tunggu hingga semua permintaan dari server selesai
                await driver.wait(async function() {
                    const pageLoaded = await driver.executeScript(function() {
                        var body = document.getElementsByTagName('body')[0];
                        if(body && body.readyState == 'loading') {
                            console.log('Loading...');
                        } else {
                            if(window.addEventListener) {
                                return true
                            } else {
                                window.attachEvent('onload', () => console.log('Loaded'))
                            }
                        }
                    })
                    return pageLoaded === true;
                });

                // Aksi menghilangkan modal 
                await driver.wait(until.elementLocated(By.css('#modal-center')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[0].click();`);
                
                // Aksi sleep
                await driver.sleep(5000);
                
                // Check the result
                const currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    currentUrl === appHost + '/' ? `Tab beranda is redirected to ${appHost + '/'} ✅` : `Tab beranda is redirected to ${appHost + '/'} ❌`
                ];
                expect(currentUrl).to.eq(appHost + '/');

            } catch (error) {
                expect.fail(error);
            }


        });  
        
        it(`Check tab tentang kami - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Tunggu hingga semua permintaan dari server selesai
                await driver.wait(async function() {
                    const pageLoaded = await driver.executeScript(function() {
                        var body = document.getElementsByTagName('body')[0];
                        if(body && body.readyState == 'loading') {
                            console.log('Loading...');
                        } else {
                            if(window.addEventListener) {
                                return true
                            } else {
                                window.attachEvent('onload', () => console.log('Loaded'))
                            }
                        }
                    })
                    return pageLoaded === true;
                });

                // Aksi menghilangkan modal 
                await driver.wait(until.elementLocated(By.css('#modal-center')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[1].click();`);
                
                // Aksi sleep
                await driver.sleep(5000);
                
                // Check the result
                const currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    currentUrl === appHost + '/about' ? `Tab beranda is redirected to ${appHost + '/about'} ✅` : `Tab beranda is redirected to ${appHost + '/about'} ❌`
                ];
                expect(currentUrl).to.eq(appHost + '/about');

            } catch (error) {
                expect.fail(error);
            }


        });      
        
        it(`Check tab event - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Tunggu hingga semua permintaan dari server selesai
                await driver.wait(async function() {
                    const pageLoaded = await driver.executeScript(function() {
                        var body = document.getElementsByTagName('body')[0];
                        if(body && body.readyState == 'loading') {
                            console.log('Loading...');
                        } else {
                            if(window.addEventListener) {
                                return true
                            } else {
                                window.attachEvent('onload', () => console.log('Loaded'))
                            }
                        }
                    })
                    return pageLoaded === true;
                });

                // Aksi menghilangkan modal 
                await driver.wait(until.elementLocated(By.css('#modal-center')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[2].click();`);
                
                // Aksi sleep
                await driver.sleep(5000);
                
                // Check the result
                const currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    currentUrl === appHost + '/event' ? `Tab beranda is redirected to ${appHost + '/event'} ✅` : `Tab beranda is redirected to ${appHost + '/event'} ❌`
                ];
                expect(currentUrl).to.eq(appHost + '/event');

            } catch (error) {
                expect.fail(error);
            }


        });   
        
        it(`Check tab news - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Tunggu hingga semua permintaan dari server selesai
                await driver.wait(async function() {
                    const pageLoaded = await driver.executeScript(function() {
                        var body = document.getElementsByTagName('body')[0];
                        if(body && body.readyState == 'loading') {
                            console.log('Loading...');
                        } else {
                            if(window.addEventListener) {
                                return true
                            } else {
                                window.attachEvent('onload', () => console.log('Loaded'))
                            }
                        }
                    })
                    return pageLoaded === true;
                });

                // Aksi menghilangkan modal 
                await driver.wait(until.elementLocated(By.css('#modal-center')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[3].click();`);
                
                // Aksi sleep
                await driver.sleep(5000);
                
                // Check the result
                const currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    currentUrl === appHost + '/news' ? `Tab beranda is redirected to ${appHost + '/news'} ✅` : `Tab beranda is redirected to ${appHost + '/news'} ❌`
                ];
                expect(currentUrl).to.eq(appHost + '/news');

            } catch (error) {
                expect.fail(error);
            }


        });   
        
        it(`Check tab gallery - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Tunggu hingga semua permintaan dari server selesai
                await driver.wait(async function() {
                    const pageLoaded = await driver.executeScript(function() {
                        var body = document.getElementsByTagName('body')[0];
                        if(body && body.readyState == 'loading') {
                            console.log('Loading...');
                        } else {
                            if(window.addEventListener) {
                                return true
                            } else {
                                window.attachEvent('onload', () => console.log('Loaded'))
                            }
                        }
                    })
                    return pageLoaded === true;
                });

                // Aksi menghilangkan modal 
                await driver.wait(until.elementLocated(By.css('#modal-center')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[4].click();`);
                
                // Aksi sleep
                await driver.sleep(5000);
                
                // Check the result
                const currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    currentUrl === appHost + '/gallery' ? `Tab beranda is redirected to ${appHost + '/gallery'} ✅` : `Tab beranda is redirected to ${appHost + '/gallery'} ❌`
                ];
                expect(currentUrl).to.eq(appHost + '/gallery');

            } catch (error) {
                expect.fail(error);
            }


        });    

        


    })



});