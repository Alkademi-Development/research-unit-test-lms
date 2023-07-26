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
import { removeModal } from '#root/helpers/global';
import { faker } from '@faker-js/faker';
import { thrownAnError } from '#root/commons/utils/generalUtils';

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
            value: "..\\" + path.relative(fileURLToPath(import.meta.url), fileNamePath),
            // value: path.relative(fileURLToPath(import.meta.url).replace(/\.js$/, '').replace(/test/g, 'testResult\\reports'), fileNamePath).replace(/research-unit-test-lms/g, '')
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
        
        it(`Check button 'Lebih Lanjut' on modal content - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi klik button 'Lebih Lanjut'
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.executeScript(`return document.querySelector('.modal-content a.btn-primary').click();`);
                } else await thrownAnError('Modal is not displayed', !modalContent.isDisplayed());
    
                // Aksi sleep
                await driver.sleep(5000);
                
                // Expect results and add custom message for addtional description
                let sectionGameCompetition = await driver.findElement(By.css("section#game-competition"))
                customMessages = [
                    await sectionGameCompetition.isDisplayed() ? 'Successfully scroll into section game competition ✅' : 'Failed to scroll into section game ❌'
                ];
                expect(await sectionGameCompetition.isDisplayed()).to.eq(true);

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
        
        it(`Check button 'Masuk' for go into login page - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi sleep
                await driver.sleep(5000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);

                // Aksi mengklik button masuk
                let hrefLogin = await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[5].href;`);
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[5].click();`);
                
                // Aksi sleep
                await driver.sleep(5000);
                
                // Check the result
                const currentUrl = await driver.executeScript(`
                    let url = new URL(window.location.href)
                    return url.origin + url.pathname
                `)
                customMessages = [
                    hrefLogin.includes(currentUrl) ? `Successfully directed to the ${hrefLogin} page ✅` : `Failed direct to the ${hrefLogin} page ❌`
                ];
                expect(hrefLogin).to.contain(currentUrl);

            } catch (error) {
                expect.fail(error);
            }


        });    

        it(`Check the button 'mulai belajar' and scroll into program section - from browser ${browser}`, async () => {

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
                await driver.sleep(5000);
    
                // Check the result
                customMessages = [
                    await sectionProgram.isDisplayed() ? 'Scroll into program section ✅' : 'Scroll into program section ❌'
                ];
                expect(await sectionProgram.isDisplayed()).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the button 'Gabung Sekarang' for join program - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(5000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript('window.scrollTo(0, document.querySelectorAll("section.wrapper")[1].scrollHeight - 200)');
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi klik button 'Gabung Sekarang'
                await driver.executeScript(`return document.querySelectorAll("section.wrapper")[1].querySelector("a.btn-primary").click()`)
                
                // Aksi sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl === appHost + '/event' ? 'Successfuly directed to the event page ✅' : 'Failed to direct to the event page ❌'
                ];
                expect(await currentUrl === appHost + '/event').to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the button 'Gabung Sekarang' for join 'Ujian Masuk Perusahaan Teknologi Nasional' - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript('arguments[0].scrollIntoView()', await driver.findElement(By.css('section#call-to-action')));
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button 'Gabung Sekarang'
                let hrefRegistration = await driver.executeScript(`return document.querySelector('section#call-to-action a.btn-white').href`)
                await driver.executeScript(`return document.querySelector("#call-to-action a.btn-white").click()`)

                // Aksi Sleep
                await driver.sleep(3000);

                // Aksi pindah halaman ke umptn
                let originalWindow = await driver.getWindowHandle();
                let windows = await driver.getAllWindowHandles();
                windows.forEach(async handle => {
                    if (handle !== originalWindow) {
                        await driver.switchTo().window(handle);
                    }
                });
                await driver.wait(async () => (await driver.getAllWindowHandles()).length === 2);
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct to ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the button 'Lihat Selengkapnya' on program section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript('arguments[0].scrollIntoView()', await driver.findElement(By.css('section#event')));
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button 'Gabung Sekarang'
                await driver.executeScript(`return document.querySelector("section#event a.btn-primary").click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl === appHost + '/event' ? 'Successfuly directed to the event page ✅' : 'Failed to direct to the event page ❌'
                ];
                expect(await currentUrl === appHost + '/event').to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the button 'Lihat Selengkapnya' on blog section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript('arguments[0].scrollIntoView()', await driver.findElement(By.css('section#blog')));
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button 'Gabung Sekarang'
                await driver.executeScript(`return document.querySelector("section#blog a.btn-primary").click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl === appHost + '/news' ? 'Successfuly directed to the news page ✅' : 'Failed to direct to the news page ❌'
                ];
                expect(await currentUrl === appHost + '/news').to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the button 'Daftar Sekarang' on game section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript('arguments[0].scrollIntoView()', await driver.findElement(By.css('section#game-competition')));
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button 'Gabung Sekarang'
                let hrefRegistration = await driver.executeScript(`return document.querySelector("section#game-competition a.btn-white").href`)
                await driver.executeScript(`return document.querySelector("section#game-competition a.btn-white").click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the one button of partners in section partner - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelectorAll('section.wrapper')[6].scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi memilih salah satu card partner untuk di click
                let cardPartner = await driver.executeScript(`return document.querySelectorAll("section.wrapper")[6].querySelectorAll(".card")`)
                await thrownAnError('Card partner is empty', await cardPartner.length === 0);
                let randomIndexPartner = faker.number.int({ min: 0, max: await cardPartner.length - 1 });
                await driver.sleep(2000);
                let hrefPartner = await driver.executeScript(`return document.querySelectorAll("section.wrapper")[6].querySelectorAll(".card figure img")[${randomIndexPartner}].src.split('/').pop().split('.')[0];`)
                await driver.sleep(2000);
                await cardPartner[randomIndexPartner].click();
                
                // Aksi Sleep
                await driver.sleep(3000);

                // Aksi pindah halaman ke umptn
                let originalWindow = await driver.getWindowHandle();
                let windows = await driver.getAllWindowHandles();
                windows.forEach(async handle => {
                    if (handle !== originalWindow) {
                        await driver.switchTo().window(handle);
                    }
                });
                await driver.wait(async () => (await driver.getAllWindowHandles()).length === 2);
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl != appHost ? `Successfuly directed to ${hrefPartner} ✅` : `Failed to direct ${hrefPartner} ❌`
                ];
                expect(await currentUrl != appHost).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the one accordion in faq section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelectorAll('section.wrapper')[7].scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi memilih salah satu accordion di faq section untuk di click
                let accordions = await driver.executeScript(`return document.querySelectorAll('section.wrapper')[7].querySelectorAll('.accordion-item')`)
                await thrownAnError('Faq is empty', await accordions.length === 0);
                let randomIndexAccordion = faker.number.int({ min: 0, max: accordions.length - 1 });
                await driver.executeScript(`arguments[0].querySelector('button').click()`, await accordions[randomIndexAccordion])
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let isAccordionOpen = await driver.executeScript(`return document.querySelectorAll('section.wrapper')[7].querySelectorAll('.accordion-item .card-header')[${randomIndexAccordion}].nextElementSibling.classList.contains('show')`)
                customMessages = [
                    await isAccordionOpen === true ? 'Successfully opened accordion ✅' : 'Failed to open accordion ❌'
                ]
                expect(await isAccordionOpen).to.equal(true)

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button media social instagram in footer section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('footer').scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button media sosial instagram
                let hrefRegistration = await driver.executeScript(`return document.querySelectorAll("footer nav.social a")[0].href`)
                await driver.executeScript(`return document.querySelectorAll("footer nav.social a")[0].click()`)
                
                // Aksi Sleep
                await driver.sleep(3000);

                // Aksi pindah halaman ke umptn
                let originalWindow = await driver.getWindowHandle();
                let windows = await driver.getAllWindowHandles();
                windows.forEach(async handle => {
                    if (handle !== originalWindow) {
                        await driver.switchTo().window(handle);
                    }
                });
                await driver.wait(async () => (await driver.getAllWindowHandles()).length === 2);
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button media social youtube in footer section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('footer').scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button media sosial instagram
                let hrefRegistration = await driver.executeScript(`return document.querySelectorAll("footer nav.social a")[1].href`)
                await driver.executeScript(`return document.querySelectorAll("footer nav.social a")[1].click()`)
                
                // Aksi Sleep
                await driver.sleep(3000);

                // Aksi pindah halaman ke umptn
                let originalWindow = await driver.getWindowHandle();
                let windows = await driver.getAllWindowHandles();
                windows.forEach(async handle => {
                    if (handle !== originalWindow) {
                        await driver.switchTo().window(handle);
                    }
                });
                await driver.wait(async () => (await driver.getAllWindowHandles()).length === 2);
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button menu 'Tentang Kami' in footer section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('footer').scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button media sosial instagram
                let hrefRegistration = await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[0].href`)
                await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[0].click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button menu 'Program' in footer section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('footer').scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button media sosial instagram
                let hrefRegistration = await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[1].href`)
                await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[1].click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button menu 'Berita' in footer section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('footer').scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button media sosial instagram
                let hrefRegistration = await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[2].href`)
                await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[2].click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button menu 'Galeri' in footer section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('footer').scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button media sosial instagram
                let hrefRegistration = await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[3].href`)
                await driver.executeScript(`return document.querySelectorAll('footer .widget ul.list-unstyled li a')[3].click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button menu 'Gabung Sekarang' in footer section - from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi menghapus modal
                await removeModal(driver);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('footer').scrollIntoView()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button media sosial instagram
                let hrefRegistration = await driver.executeScript(`return document.querySelector("footer .newsletter-wrapper a.btn-primary").href`)
                await driver.executeScript(`return document.querySelector("footer .newsletter-wrapper a.btn-primary").click()`)
                
                // Aksi Sleep
                await driver.sleep(5000);
    
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefRegistration) ? `Successfuly directed to ${hrefRegistration} ✅` : `Failed to direct ${hrefRegistration} ❌`
                ];
                expect(await currentUrl.includes(hrefRegistration)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check button 'Gabung Sekarang' in about page - from browser ${browser}`, async () => {

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
                await driver.sleep(3000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[1].click();`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button 'Gabung Sekarang'
                let hrefUrl = await driver.executeScript(`return document.querySelectorAll("section.wrapper")[0].querySelector("a.btn-primary").href`);
                await driver.executeScript(`return document.querySelectorAll("section.wrapper")[0].querySelector("a.btn-primary").click()`)
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefUrl) ? `Successfuly directed to ${hrefUrl} ✅` : `Failed to direct ${hrefUrl} ❌`
                ];
                expect(await currentUrl.includes(hrefUrl)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });  
        
        it(`Check media social from one of team in about page - from browser ${browser}`, async () => {

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
                await driver.sleep(3000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[1].click();`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelectorAll('section.wrapper')[document.querySelectorAll('section.wrapper').length - 1].scrollIntoView()`);

                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button salah satu media sosial dari salah satu team
                let teams = await driver.executeScript(`return document.querySelectorAll('section.wrapper')[document.querySelectorAll('section.wrapper').length - 1].querySelectorAll(".swiper-wrapper > div")`)
                await thrownAnError("Team is empty", await teams.length === 0);
                let randomIndexTeam = faker.number.int({ min: 0, max: await teams.length - 1 });
                await driver.sleep(2000);
                let teamMediaLength = await driver.executeScript(`arguments[0].querySelectorAll("nav.social a").length - 1`, await teams[randomIndexTeam]);
                let hrefMedia = await driver.executeScript(`return document.querySelectorAll('section.wrapper')[document.querySelectorAll('section.wrapper').length - 1].querySelectorAll(".swiper-wrapper > div")[${randomIndexTeam}].querySelectorAll("nav.social a")[${faker.number.int({ min: 0, max: await teamMediaLength })}].href`)
                let mediaUrl = await driver.executeScript(`
                    let url = new URL("${hrefMedia}")
                    return url.origin + url.pathname
                `)
                await driver.sleep(2000);
                await driver.executeScript(`arguments[0].querySelectorAll("nav.social a")[${faker.number.int({ min: 0, max: await teamMediaLength })}].click()`, await teams[randomIndexTeam]);
                
                // Aksi sleep
                await driver.sleep(12000);

                // Aksi fill form input email
                let form = await driver.executeScript(`return document.querySelector("form") ? document.querySelector("form") : null`);
                if(await form) {
                    await driver.executeScript(`return document.querySelector(".join-form button.form-toggle").click()`);
                    await driver.sleep(2000);
                    await driver.findElement(By.css("input#session_key")).sendKeys('adnanerlansyah403@gmail.com');
                    await driver.sleep(1000);
                    await driver.findElement(By.css("input#session_password")).sendKeys('45adnan45');
                    await driver.sleep(2000);
                    await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click();`);
                    // let alertContent = await driver.executeScript(`return document.querySelector(".alert-content") ? document.querySelector(".alert-content") : null`);
                    // await thrownAnError("An occured while fill form login",  await alertContent != null)
                    
                    // Aksi sleep
                    await driver.sleep(10000);
                }
                
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await mediaUrl != null || await mediaUrl != '' ? `Successfuly directed to ${hrefMedia} ✅` : `Failed to direct ${hrefMedia} ❌`
                ];
                expect(await mediaUrl != null || await mediaUrl != '').to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });  
        
        it(`Check details program in program page - from browser ${browser}`, async () => {

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
                await driver.sleep(3000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[2].click();`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('section#event').scrollIntoView()`);

                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button salah satu media sosial dari salah satu team
                let programs = await driver.executeScript(`return document.querySelectorAll("section#event article")`)
                await thrownAnError("Program is empty", await programs.length === 0);
                let randomIndexProgram = faker.number.int({ min: 0, max: await programs.length - 1 });
                let hrefProgram = await driver.executeScript(`return document.querySelectorAll("section#event article")[${randomIndexProgram}].querySelector("figure a").href`)
                await driver.executeScript(`arguments[0].querySelector("figure a").click()`, await programs[randomIndexProgram])
                
                // Aksi sleep
                await driver.sleep(3000);
                
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefProgram) ? `Successfuly directed to ${hrefProgram} ✅` : `Failed to direct ${hrefProgram} ❌`
                ];
                expect(await currentUrl.includes(hrefProgram)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });  
        
        it(`Check the load more of program in program page - from browser ${browser}`, async () => {

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
                await driver.sleep(3000);

                // Aksi mengklik button tab beranda
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[2].click();`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi scroll ke section Program
                await driver.executeScript(`return document.querySelector('section#event').scrollIntoView()`);

                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button salah satu media sosial dari salah satu team
                let programs = await driver.executeScript(`return document.querySelectorAll("section#event article")`)
                await thrownAnError("Program is empty", await programs.length === 0);
                let previousProgramLength = await programs.length;
                await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi klik button load more
                await driver.executeScript(`return document.querySelector("section#event button.btn-primary").click()`);
                
                // Aksi sleep
                await driver.sleep(3000);

                // Aksi menangkap jumlah data terbaru setelah mengklik button load more
                programs = await driver.executeScript(`return document.querySelectorAll("section#event article")`)
                await thrownAnError("Program is empty", await programs.length === 0);
                let newProgramLength = await programs.length;

                // Aksi sleep
                await driver.sleep(3000);
                
                // Check the result
                customMessages = [
                    await newProgramLength > await previousProgramLength ? `Load more is active ✅` : `Load more is inactive ❌`
                ];
                expect(await newProgramLength > await previousProgramLength).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });  
        
        it(`Check details of article in news page - from browser ${browser}`, async () => {

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
                await driver.sleep(3000);

                // Aksi mengklik button tab news / berita
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[3].click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi klik button salah satu media sosial dari salah satu team
                let articles = await driver.executeScript(`return document.querySelectorAll("article a.link-dark")`)
                await thrownAnError("Article is empty", await articles.length === 0);
                let randomIndexArticle = faker.number.int({ min: 0, max: await articles.length - 1 });
                let hrefArticle = await driver.executeScript(`return document.querySelectorAll("article a.link-dark")[${randomIndexArticle}].href`)
                await driver.executeScript(`return document.querySelectorAll("article a.link-dark")[${randomIndexArticle}].click()`)

                // Aksi sleep
                await driver.sleep(3000);
                
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefArticle) ? `Successfuly directed to ${hrefArticle} ✅` : `Failed to direct ${hrefArticle} ❌`
                ];
                expect(await currentUrl.includes(hrefArticle)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });  
        
        it(`Check the galleries in gallery page - from browser ${browser}`, async () => {

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
                await driver.sleep(3000);

                // Aksi mengklik button tab news / berita
                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item > a')[4].click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi klik button salah satu media sosial dari salah satu team
                let galleries = await driver.executeScript(`return document.querySelectorAll(".project.item")`)
                await thrownAnError("Gallery is empty", await galleries.length === 0);
                let randomIndexGallery = faker.number.int({ min: 0, max: await galleries.length - 1 });
                let hrefGallery = await driver.executeScript(`return document.querySelectorAll(".project.item")[${randomIndexGallery}].querySelector("figure a").href`);
                await driver.executeScript(`return document.querySelectorAll(".project.item")[${randomIndexGallery}].querySelector("figure a").click()`);

                // Aksi Sleep
                await driver.sleep(3000);

                // Aksi pindah halaman ke umptn
                let originalWindow = await driver.getWindowHandle();
                let windows = await driver.getAllWindowHandles();
                windows.forEach(async handle => {
                    if (handle !== originalWindow) {
                        await driver.switchTo().window(handle);
                    }
                });
                await driver.wait(async () => (await driver.getAllWindowHandles()).length === 2);

                // Aksi sleep
                await driver.sleep(3000);
                
                // Check the result
                let currentUrl = await driver.getCurrentUrl();
                customMessages = [
                    await currentUrl.includes(hrefGallery) ? `Successfuly directed to ${hrefGallery} ✅` : `Failed to direct ${hrefGallery} ❌`
                ];
                expect(await currentUrl.includes(hrefGallery)).to.eq(true);

            } catch (error) {
                expect.fail(error);
            }


        });  


    })



});