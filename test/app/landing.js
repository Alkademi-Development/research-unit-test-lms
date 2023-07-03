import { describe, afterEach, before } from 'mocha';
import { By, until } from 'selenium-webdriver';
import addContext from 'mochawesome/addContext.js';
import { expect } from "chai";
import fs from 'fs';
import path from 'path';
import { BROWSERS } from '#root/commons/constants/browser';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { fileURLToPath } from 'url';
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
            value: path.relative(fileURLToPath(import.meta.url), fileNamePath)
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

        it(`Click the button 'mulai belajar' and scroll into program section - from browser ${browser}`, async () => {

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
                await driver.wait(until.elementLocated(By.css('.modal-content')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi mengklik button 'mulai belajar'
                await driver.executeScript(`return Array.from(document.querySelectorAll("a.btn-primary")).find(btn => btn.innerText === "Mulai Belajar");`);
                
                // Aksi sleep
                await driver.sleep(3000);

                const sectionProgram = await driver.findElement(By.id('event'));
                
                // Aksi sleep
                await driver.sleep(3000);
    
                // Check the result
                customMessages = [
                    await sectionProgram.isDisplayed() ? 'Scroll into program section ✅' : 'Scroll into program section ❌'
                ];
                expect(await sectionProgram.isDisplayed()).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });


    })



});