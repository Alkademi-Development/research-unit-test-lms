import { describe, afterEach, before } from 'mocha';
import { By, until } from 'selenium-webdriver';
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
import { editData } from '#root/helpers/Dashboard/Classroom/course/index';
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
        let fileNamePath = path.resolve(`${screenshootFilePath}/${this.currentTest?.state != 'failed' ? (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[passed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") : (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[failed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") }.png`);
        await takeScreenshot(driver, fileNamePath);
        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: path.relative(fileURLToPath(import.meta.url), fileNamePath)
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
                    it(`Super Admin - Edit Materi from Detail Class from browser ${browser}`, async function () {

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
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.findElements(By.css(".item-tab"));
                            itemTabs[1].findElement(By.css('span')).click();

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css('#courses .card .card-body .row .col')));
                            await driver.sleep(2000);
                            await driver.wait(async function () {
                                let emptyCourse = await driver.executeScript("return document.querySelector('#courses .card .card-body .row .col')");
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll("#courses .card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            // Aksi mengecek setting icons pada course muncul atau displaynya flex
                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            const statusDisplayCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );
                            // Mengecek jika element berhasil di hover, maka akan di klik
                            if (statusDisplayCourse == 'flex') await actionBtns[1].click();
                            else throw new Error('Sorry failed to hover the icon edit of course');
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            let { titleCourse, descriptionCourse } = await editData(driver);

                            titleCourse = await driver.findElement(By.id('Judul Materi *'));
                            descriptionCourse = await driver.findElement(By.id('Deskripsi Materi *'));

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");
                            
                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css("#courses .card-body")));
                            await driver.sleep(2000);
                            await driver.wait(async function () {
                                let emptyCourse = await driver.findElement(By.css("#courses .card .card-body .row .col"));
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses?.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
                case 1:
                    it(`Admin - Edit Materi from Detail Class from browser ${browser}`, async function () {

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
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

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
                            await driver.sleep(2000);
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            // Aksi mengecek setting icons pada course muncul atau displaynya flex
                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            const statusDisplayCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );

                            // Mengecek jika element berhasil di hover, maka akan di klik
                            if (statusDisplayCourse == 'flex') await actionBtns[1].click();
                            else throw new Error('Sorry failed to hover the icon edit of course');
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            const { titleCourse, descriptionCourse } = await editData(driver);

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");
                            
                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css("#courses .card-body")));
                            await driver.sleep(2000);
                            await driver.wait(async function () {
                                let emptyCourse = await driver.findElement(By.css("#courses .card .card-body .row .col"));
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses?.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });


                    break;
                case 2:
                    it(`Mentor - Edit Materi from Detail Class from browser ${browser}`, async function () {

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
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.findElements(By.css(".item-tab"));
                            itemTabs[1].findElement(By.css('span')).click();

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css('#courses .card .card-body .row .col')));
                            await driver.wait(async function () {
                                let emptyCourse = await driver.findElement(By.css("#courses .card .card-body .row .col"));
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            // Aksi mengecek setting icons pada course muncul atau displaynya flex
                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            const statusDisplayCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );

                            // Mengecek jika element berhasil di hover, maka akan di klik
                            if (statusDisplayCourse == 'flex') await actionBtns[1].click();
                            else throw new Error('Sorry failed to hover the icon edit of course');

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            const { titleCourse, descriptionCourse } = await editData(driver);

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");


                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css("#courses .card-body")));
                            await driver.sleep(2000);
                            await driver.wait(async function () {
                                let emptyCourse = await driver.findElement(By.css("#courses .card .card-body .row .col"));
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                                                        
                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses?.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });

                    break;
                default:
                    it(`Other - Edit Materi from Detail Class from browser ${browser}`, async function () {

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
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.helpers.arrayElement([0, 1, 2])].findElement(By.css('h1.title')).click();

                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.findElements(By.css(".item-tab"));
                            itemTabs[1].findElement(By.css('span')).click();

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css('#courses .card .card-body .row .col')));
                            await driver.wait(async function () {
                                let emptyCourse = await driver.findElement(By.css("#courses .card .card-body .row .col"));
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                            
                            // Aksi meng-hover icon edit dan mengkliknya
                            let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                            let editCourse = await listCourse[0];
                            const actions = driver.actions({ async: true });
                            await actions.move({ origin: editCourse }).perform();

                            // Aksi mengecek setting icons pada course muncul atau displaynya flex
                            let actionBtns = await driver.findElements(By.css('.action-container .action'));
                            const statusDisplayCourse = await driver.executeScript(
                                "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                actionBtns[1]
                            );
                            // Mengecek jika element berhasil di hover, maka akan di klik
                            if (statusDisplayCourse == 'flex') await actionBtns[1].click();
                            else throw new Error('Sorry failed to hover the icon edit of course');

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            const { titleCourse, descriptionCourse } = await editData(driver);

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");


                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementLocated(By.css("#courses .card-body")));
                            await driver.sleep(2000);
                            await driver.wait(async function () {
                                let emptyCourse = await driver.findElement(By.css("#courses .card .card-body .row .col"));
                                const innerText = await emptyCourse?.getAttribute('innerText');
                                return innerText !== 'Memuat..';
                            });
                                                        
                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses?.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
            }
        });

    })



});