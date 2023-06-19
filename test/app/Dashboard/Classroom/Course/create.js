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
import { createData } from '#root/helpers/Dashboard/Classroom/course/index';
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
        let fileNamePath = path.resolve(`${screenshootFilePath}/${this.currentTest?.state != 'failed' ? (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[passed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") : (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[failed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") }.png`);
        await takeScreenshot(driver, fileNamePath);
        if(this.currentTest.isPassed) {
            addContext(this, {
                title: 'Expected Results',
                value: customMessages?.length > 0 ? "- " + customMessages.map(msg => msg.trim()).join("\n- ") : 'No Results'
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
                    it(`Super Admin - Create Materi from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            // let cardClass = await driver.findElement(By.css(`div.card-class`));
                            // await driver.wait(until.stalenessOf(cardClass));
                            // errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementsLocated(By.css("div.item-class")));
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
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length === 0);

                            // Aksi mengklik button tambah materi
                            await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                            await driver.findElement(By.css("i.ri-add-fill")).click();
                            await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                            let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                            await buttonsDropdownItem[1].click();

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            // Aksi mengisi form untuk membuat materi baru
                            const {
                                titleCourse,
                                descriptionCourse,
                                standardPassedCourse,
                                typeCourse
                            } = await createData(driver);

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                                standardPassedCourse.getAttribute('value'),
                                typeCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");
                            
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementsLocated(By.css("#courses .card .card-body .header h4.title")));
                            
                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header h4.title")`);
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            customMessages = [
                                alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
                                findCourse.length > 0 ? "'Materi' successfully added to list of materi in detail classroom ✅" : "'Materi' successfully added to list of materi in detail classroom ❌"
                            ];
                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
                case 1:
                    it(`Admin - Create Materi from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            // let cardClass = await driver.findElement(By.css(`div.card-class`));
                            // await driver.wait(until.stalenessOf(cardClass));
                            // errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementsLocated(By.css("div.item-class")));
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
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length === 0);

                            // Aksi mengklik button tambah materi
                            await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                            await driver.findElement(By.css("i.ri-add-fill")).click();
                            await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                            let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                            await buttonsDropdownItem[1].click();

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            // Aksi mengisi form untuk membuat materi baru
                            const {
                                titleCourse,
                                descriptionCourse,
                                standardPassedCourse,
                                typeCourse
                            } = await createData(driver);

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                                standardPassedCourse.getAttribute('value'),
                                typeCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");
                            
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementsLocated(By.css("#courses .card .card-body .header h4.title")));

                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header h4.title")`);
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            customMessages = [
                                alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
                                findCourse.length > 0 ? "'Materi' successfully added to list of materi in detail classroom ✅" : "'Materi' successfully added to list of materi in detail classroom ❌"
                            ];
                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
                case 2:
                    it(`Mentor - Create Materi from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            // let cardClass = await driver.findElement(By.css(`div.card-class`));
                            // await driver.wait(until.stalenessOf(cardClass));
                            // errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementsLocated(By.css("div.item-class")));
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
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length === 0);

                            // Aksi mengklik button tambah materi
                            await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                            await driver.findElement(By.css("i.ri-add-fill")).click();
                            await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                            let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                            await buttonsDropdownItem[2].click();

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            // Aksi mengisi form untuk membuat materi baru
                            const {
                                titleCourse,
                                descriptionCourse,
                                standardPassedCourse,
                                typeCourse
                            } = await createData(driver);

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                                standardPassedCourse.getAttribute('value'),
                                typeCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");
                            
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementsLocated(By.css("#courses .card .card-body .header h4.title")));

                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header h4.title")`);
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            customMessages = [
                                alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
                                findCourse.length > 0 ? "'Materi' successfully added to list of materi in detail classroom ✅" : "'Materi' successfully added to list of materi in detail classroom ❌"
                            ];
                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });
                    break;
                default:
                    it(`Other Create Materi from Detail Class from browser ${browser}`, async function () {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi Masuk ke dalam halaman class
                            await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                            // let cardClass = await driver.findElement(By.css(`div.card-class`));
                            // await driver.wait(until.stalenessOf(cardClass));
                            // errorMessages = await captureConsoleErrors(driver, browser);
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementsLocated(By.css("div.item-class")));
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
                            await thrownAnError('Courses on detail classroom is empty', listCourse?.length === 0);

                            // Aksi mengklik button tambah materi
                            await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                            await driver.findElement(By.css("i.ri-add-fill")).click();
                            await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                            let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                            await buttonsDropdownItem[2].click();

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            // Aksi mengisi form untuk membuat materi baru
                            const {
                                titleCourse,
                                descriptionCourse,
                                standardPassedCourse,
                                typeCourse
                            } = await createData(driver);

                            let dataTitleCourse = await titleCourse.getAttribute("value");

                            // Periksa apakah semua elemen telah terisi
                            const isAllFilled = await Promise.all([
                                titleCourse.getAttribute('value'),
                                descriptionCourse.getAttribute('value'),
                                standardPassedCourse.getAttribute('value'),
                                typeCourse.getAttribute('value'),
                            ]).then(values => values.every(value => value !== ''));

                            if (isAllFilled) {
                                await driver.findElement(By.css("button[type='submit']")).click();
                                await driver.wait(until.elementLocated(By.css(".alert.alert-success")));
                            }

                            const alertSuccess = await driver.executeScript("return document.querySelectorAll('.alert.alert-success')");
                            
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi menunggu list materi untuk muncul
                            await driver.wait(until.elementsLocated(By.css("#courses .card .card-body .header h4.title")));
                            
                            // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                            const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(courses[index]);
                                }
                            }

                            customMessages = [
                                alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
                                findCourse.length > 0 ? "'Materi' successfully added to list of materi in detail classroom ✅" : "'Materi' successfully added to list of materi in detail classroom ❌"
                            ];
                            expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                            expect(alertSuccess.length, 'Expect show alert success after created a new data').to.equal(1);
                            expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                            const pageUrl = await driver.getCurrentUrl();
                            expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
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