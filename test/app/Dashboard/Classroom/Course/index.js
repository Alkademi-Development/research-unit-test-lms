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

/**
 * Get the user data for authentication
 */

const users = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./screenshoot/test/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}`);
} else {
    screenshootFilePath = path.resolve(`./screenshoot/test/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}`);
}

describe("Course", () => {

    after(async function () {
        console.log(`${' '.repeat(4)}Screenshoots test berhasil di buat, berada di folder: ${screenshootFilePath} `);
    });

    afterEach(async function () {
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
                            await driver.wait(until.elementLocated(By.css(`div.b-skeleton`)));
                            let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                            await driver.wait(until.stalenessOf(loadingSkeleton))
                            let itemClass = await driver.findElements(By.css(`div.item-class`));
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.findElements(By.css(".item-tab"));
                            itemTabs[1].findElement(By.css('span')).click();

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css('#courses .card .card-body .row .col')));
                            await driver.wait(async function () {
                                let emptyCourse = await driver.executeScript("return document.querySelector('#courses .card .card-body .row .col')");
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse.length == 0 || listCourse == null);

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
                            await driver.wait(until.elementLocated(By.css(`div.b-skeleton`)));
                            let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                            await driver.wait(until.stalenessOf(loadingSkeleton))
                            let itemClass = await driver.findElements(By.css(`div.item-class`));
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.findElements(By.css(".item-tab"));
                            itemTabs[1].findElement(By.css('span')).click();

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css('#courses .card .card-body .row .col')));
                            await driver.wait(async function () {
                                let emptyCourse = await driver.executeScript("return document.querySelector('#courses .card .card-body .row .col')");
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse.length == 0 || listCourse == null);

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
                            await driver.wait(until.elementLocated(By.css(`div.b-skeleton`)));
                            let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                            await driver.wait(until.stalenessOf(loadingSkeleton))
                            let itemClass = await driver.findElements(By.css(`div.item-class`));
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.findElements(By.css(".item-tab"));
                            itemTabs[1].findElement(By.css('span')).click();

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css('#courses .card .card-body .row .col')));
                            await driver.wait(async function () {
                                let emptyCourse = await driver.executeScript("return document.querySelector('#courses .card .card-body .row .col')");
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse.length == 0 || listCourse == null);

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
                            await driver.wait(until.elementLocated(By.css(`div.b-skeleton`)));
                            let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                            await driver.wait(until.stalenessOf(loadingSkeleton))
                            let itemClass = await driver.findElements(By.css(`div.item-class`));
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.findElements(By.css(".item-tab"));
                            itemTabs[1].findElement(By.css('span')).click();

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css('#courses .card .card-body .row .col')));
                            await driver.wait(async function () {
                                let emptyCourse = await driver.executeScript("return document.querySelector('#courses .card .card-body .row .col')");
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse.length == 0 || listCourse == null);

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