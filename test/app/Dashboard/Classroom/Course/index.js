import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import addContext from 'mochawesome/addContext.js';
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { captureConsoleErrors, thrownAnError } from '#root/commons/utils/generalUtils';
import { faker } from '@faker-js/faker';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

/**
 * Get the user data for authentication
 */

const users = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}`);
}

describe("Course", () => {
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
            value: "..\\" + path.relative(fileURLToPath(import.meta.url), fileNamePath)
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
                    it(`Super Admin - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            let cardClass = await driver.findElement(By.css(`div.card-class`));
                            await driver.wait(until.stalenessOf(cardClass));
                            errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            let statusDisplayEditCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );
                            let statusDisplayDeleteCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[2]
                            );

                            // Mengecek jika element berhasil di hover, maka akan di klik
                            await thrownAnError('Sorry failed to hover the icon edit & delete of course, because its not displayed', statusDisplayEditCourse != 'flex' && statusDisplayDeleteCourse != 'flex');

                            customMessages = [
                                statusDisplayEditCourse === 'flex' && statusDisplayDeleteCourse === 'flex' ? 'Show icon edit and delete when hover the list materi ✅' : 'Show icon edit and delete when hover the list materi ❌'
                            ];
                            expect(statusDisplayEditCourse).to.equal('flex');
                            expect(statusDisplayDeleteCourse).to.equal('flex');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
                case 1:
                    it(`Admin - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            let cardClass = await driver.findElement(By.css(`div.card-class`));
                            await driver.wait(until.stalenessOf(cardClass));
                            errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            let statusDisplayEditCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );
                            let statusDisplayDeleteCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[2]
                            );

                            // Mengecek jika element berhasil di hover, maka akan di klik
                            await thrownAnError('Sorry failed to hover the icon edit & delete of course, because its not displayed', statusDisplayEditCourse != 'flex' && statusDisplayDeleteCourse != 'flex');

                            customMessages = [
                                statusDisplayEditCourse === 'flex' && statusDisplayDeleteCourse === 'flex' ? 'Show icon edit and delete when hover the list materi ✅' : 'Show icon edit and delete when hover the list materi ❌'
                            ];
                            expect(statusDisplayEditCourse).to.equal('flex');
                            expect(statusDisplayDeleteCourse).to.equal('flex');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
                case 2:
                    it(`Mentor - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            let cardClass = await driver.findElement(By.css(`div.card-class`));
                            await driver.wait(until.stalenessOf(cardClass));
                            errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            let statusDisplayEditCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );
                            let statusDisplayDeleteCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[2]
                            );

                            // Mengecek jika element berhasil di hover, maka akan di klik
                            await thrownAnError('Sorry failed to hover the icon edit & delete of course, because its not displayed', statusDisplayEditCourse != 'flex' && statusDisplayDeleteCourse != 'flex');

                            customMessages = [
                                statusDisplayEditCourse === 'flex' && statusDisplayDeleteCourse === 'flex' ? 'Show icon edit and delete when hover the list materi ✅' : 'Show icon edit and delete when hover the list materi ❌'
                            ];
                            expect(statusDisplayEditCourse).to.equal('flex');
                            expect(statusDisplayDeleteCourse).to.equal('flex');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
                default:
                    it(`Other - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            let cardClass = await driver.findElement(By.css(`div.card-class`));
                            await driver.wait(until.stalenessOf(cardClass));
                            errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            let statusDisplayEditCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );
                            let statusDisplayDeleteCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[2]
                            );

                            // Mengecek jika element berhasil di hover, maka akan di klik
                            await thrownAnError('Sorry failed to hover the icon edit & delete of course, because its not displayed', statusDisplayEditCourse != 'flex' && statusDisplayDeleteCourse != 'flex');

                            customMessages = [
                                statusDisplayEditCourse === 'flex' && statusDisplayDeleteCourse === 'flex' ? 'Show icon edit and delete when hover the list materi ✅' : 'Show icon edit and delete when hover the list materi ❌'
                            ];
                            expect(statusDisplayEditCourse).to.equal('flex');
                            expect(statusDisplayDeleteCourse).to.equal('flex');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
            }
        })
    })



});