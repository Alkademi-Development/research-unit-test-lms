import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import addContext from 'mochawesome/addContext.js';
import { BROWSERS } from '#root/commons/constants/browser';
import { expect } from "chai";
import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { editDataCourse, createDataCourse } from '#root/helpers/Dashboard/Classroom/Course/index'
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
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}`);
}

describe("Dashboard/Classroom/Course", () => {
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

            switch (user?.kind) {
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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");

                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);

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
                            } = await createDataCourse(driver);

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
                            const courses = await driver.findElements(By.css(".card .card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(await courses[index]);
                                }
                            }
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            customMessages = [
                                await alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
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

                    it(`Super Admin - Edit Course from Detail Class from browser ${browser}`, async function () {

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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);
                                
                                // Aksi sleep
                                await driver.sleep(3000);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    
                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    let indexCourse = await listCourse.length - 1;
                                    let editCourse = await listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);

                                    const actions = driver.actions({ async: true });
                                    await actions.move({ origin: editCourse }).perform();

                                    // Aksi mengecek setting icons pada course muncul atau displaynya flex
                                    let editBtn = await editCourse.findElements(By.css(".action-container .action"));
                                    const statusDisplayCourse = await driver.executeScript(
                                        "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                        editBtn[1]
                                    );

                                    // Mengecek jika element berhasil di hover, maka akan di klik
                                    if (await statusDisplayCourse == 'flex') await editBtn[1].click();
                                    else throw new Error('Sorry failed to hover the icon edit of course');

                                    // Menunggu Element Form Muncul 
                                    await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                                    const { titleCourse, descriptionCourse } = await editDataCourse(driver);

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
                                    
                                    // Aksi sleep
                                    await driver.sleep(10000);

                                    // Aksi menunggu list materi untuk muncul
                                    await driver.wait(until.elementLocated(By.css(".card .card-body .header h4.title")));
                                    
                                    // Aksi scroll to edited data
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);
                                    editCourse = listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);
                                    
                                    // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                                    const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                                    let findCourse = [];

                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    for (let index = 0; index < courses.length; index++) {
                                        if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                            findCourse.push(courses[index]);
                                        }
                                    }
                                    customMessages = [
                                        alertSuccess?.length > 0 ? "Show alert 'Berhasil memperbarui data' ✅" : "Show alert 'Berhasil memperbarui data' ❌",
                                        findCourse.length > 0 ? "'Materi' successfully updated to list of materi in detail classroom ✅" : "'Materi' successfully updated to list of materi in detail classroom ❌"
                                    ];
                                    expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                                    expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                                    expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                                    const pageUrl = await driver.getCurrentUrl();
                                    expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                                }

                            }
                            await searchAvailableCourse();

                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });

                    it(`Super Admin - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

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
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);
                                
                                // Aksi sleep
                                await driver.sleep(3000);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    // Aksi meng-hover icon edit dan mengkliknya
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);

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
                                }

                            }
                            await searchAvailableCourse();
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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");

                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);

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
                            } = await createDataCourse(driver);

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
                            const courses = await driver.findElements(By.css(".card .card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(await courses[index]);
                                }
                            }
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            customMessages = [
                                await alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
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

                    it(`Admin - Edit Course from Detail Class from browser ${browser}`, async function () {

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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    
                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    let indexCourse = await listCourse.length - 1;
                                    let editCourse = await listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);

                                    const actions = driver.actions({ async: true });
                                    await actions.move({ origin: editCourse }).perform();

                                    // Aksi mengecek setting icons pada course muncul atau displaynya flex
                                    let editBtn = await editCourse.findElements(By.css(".action-container .action"));
                                    const statusDisplayCourse = await driver.executeScript(
                                        "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                        editBtn[1]
                                    );

                                    // Mengecek jika element berhasil di hover, maka akan di klik
                                    if (await statusDisplayCourse == 'flex') await editBtn[1].click();
                                    else throw new Error('Sorry failed to hover the icon edit of course');

                                    // Menunggu Element Form Muncul 
                                    await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                                    const { titleCourse, descriptionCourse } = await editDataCourse(driver);

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
                                    
                                    // Aksi sleep
                                    await driver.sleep(10000);

                                    // Aksi menunggu list materi untuk muncul
                                    await driver.wait(until.elementLocated(By.css(".card .card-body .header h4.title")));
                                    
                                    // Aksi scroll to edited data
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);
                                    editCourse = listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);
                                    
                                    // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                                    const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                                    let findCourse = [];

                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    for (let index = 0; index < courses.length; index++) {
                                        if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                            findCourse.push(courses[index]);
                                        }
                                    }
                                    customMessages = [
                                        alertSuccess?.length > 0 ? "Show alert 'Berhasil memperbarui data' ✅" : "Show alert 'Berhasil memperbarui data' ❌",
                                        findCourse.length > 0 ? "'Materi' successfully updated to list of materi in detail classroom ✅" : "'Materi' successfully updated to list of materi in detail classroom ❌"
                                    ];
                                    expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                                    expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                                    expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                                    const pageUrl = await driver.getCurrentUrl();
                                    expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                                }

                            }
                            await searchAvailableCourse();

                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }

                    });

                    it(`Admin - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

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
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);
                                
                                // Aksi sleep
                                await driver.sleep(3000);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    // Aksi meng-hover icon edit dan mengkliknya
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);

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
                                }

                            }
                            await searchAvailableCourse();
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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi mengklik button tambah materi
                            await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                            await driver.findElement(By.css("i.ri-add-fill")).click();
                            await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                            let buttonsDropdownItem = await driver.executeScript(`return document.querySelectorAll(".dropdown-menu.dropdown-menu-right button.dropdown-item")[2].click()`);

                            // Menunggu Element Form Muncul 
                            await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                            // Aksi mengisi form untuk membuat materi baru
                            const {
                                titleCourse,
                                descriptionCourse,
                                standardPassedCourse,
                                typeCourse
                            } = await createDataCourse(driver);

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
                            const courses = await driver.findElements(By.css(".card .card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(await courses[index]);
                                }
                            }
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            customMessages = [
                                await alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
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

                    it(`Mentor - Edit Course from Detail Class from browser ${browser}`, async function () {

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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    
                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    let indexCourse = await listCourse.length - 1;
                                    let editCourse = await listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);

                                    const actions = driver.actions({ async: true });
                                    await actions.move({ origin: editCourse }).perform();

                                    // Aksi mengecek setting icons pada course muncul atau displaynya flex
                                    let editBtn = await editCourse.findElements(By.css(".action-container .action"));
                                    const statusDisplayCourse = await driver.executeScript(
                                        "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                        editBtn[1]
                                    );

                                    // Mengecek jika element berhasil di hover, maka akan di klik
                                    if (await statusDisplayCourse == 'flex') await editBtn[1].click();
                                    else throw new Error('Sorry failed to hover the icon edit of course');

                                    // Menunggu Element Form Muncul 
                                    await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                                    const { titleCourse, descriptionCourse } = await editDataCourse(driver);

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
                                    
                                    // Aksi sleep
                                    await driver.sleep(10000);

                                    // Aksi menunggu list materi untuk muncul
                                    await driver.wait(until.elementLocated(By.css(".card .card-body .header h4.title")));
                                    
                                    // Aksi scroll to edited data
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);
                                    editCourse = listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);
                                    
                                    // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                                    const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                                    let findCourse = [];

                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    for (let index = 0; index < courses.length; index++) {
                                        if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                            findCourse.push(courses[index]);
                                        }
                                    }
                                    customMessages = [
                                        alertSuccess?.length > 0 ? "Show alert 'Berhasil memperbarui data' ✅" : "Show alert 'Berhasil memperbarui data' ❌",
                                        findCourse.length > 0 ? "'Materi' successfully updated to list of materi in detail classroom ✅" : "'Materi' successfully updated to list of materi in detail classroom ❌"
                                    ];
                                    expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                                    expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                                    expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                                    const pageUrl = await driver.getCurrentUrl();
                                    expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                                }

                            }
                            await searchAvailableCourse();

                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }


                    });

                    it(`Mentor - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

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
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    // Aksi meng-hover icon edit dan mengkliknya
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);

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
                                }

                            }
                            await searchAvailableCourse();
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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");

                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);

                            // Aksi memilih salah satu card class
                            await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi mengklik tab materi pada detail class
                            let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                            await itemTabs[1].click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);

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
                            } = await createDataCourse(driver);

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
                            const courses = await driver.findElements(By.css(".card .card-body .header h4.title"));
                            let findCourse = [];

                            for (let index = 0; index < courses.length; index++) {
                                if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                    findCourse.push(await courses[index]);
                                }
                            }
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            customMessages = [
                                await alertSuccess?.length > 0 ? "Show alert 'Berhasil menambahkan data' ✅" : "Show alert 'Berhasil menambahkan data' ❌",
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

                    it(`Other - Edit Course from Detail Class from browser ${browser}`, async function () {

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
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', await itemClass?.length == 0);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);
                                
                                // Aksi sleep
                                await driver.sleep(3000);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    
                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    let indexCourse = await listCourse.length - 1;
                                    let editCourse = await listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);

                                    const actions = driver.actions({ async: true });
                                    await actions.move({ origin: editCourse }).perform();

                                    // Aksi mengecek setting icons pada course muncul atau displaynya flex
                                    let editBtn = await editCourse.findElements(By.css(".action-container .action"));
                                    const statusDisplayCourse = await driver.executeScript(
                                        "return getComputedStyle(arguments[0]).getPropertyValue('display')",
                                        editBtn[1]
                                    );

                                    // Mengecek jika element berhasil di hover, maka akan di klik
                                    if (await statusDisplayCourse == 'flex') await editBtn[1].click();
                                    else throw new Error('Sorry failed to hover the icon edit of course');

                                    // Menunggu Element Form Muncul 
                                    await driver.wait(until.elementLocated(By.id('Judul Materi *')));

                                    const { titleCourse, descriptionCourse } = await editDataCourse(driver);

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
                                    
                                    // Aksi sleep
                                    await driver.sleep(10000);

                                    // Aksi menunggu list materi untuk muncul
                                    await driver.wait(until.elementLocated(By.css(".card .card-body .header h4.title")));
                                    
                                    // Aksi scroll to edited data
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                    await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);
                                    editCourse = listCourse[indexCourse];
                                    await driver.executeScript('arguments[0].scrollIntoView()', editCourse);
                                    
                                    // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                                    const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                                    let findCourse = [];

                                    // Aksi sleep
                                    await driver.sleep(3000);

                                    for (let index = 0; index < courses.length; index++) {
                                        if (await courses[index].getAttribute('innerText') === await dataTitleCourse) {
                                            findCourse.push(courses[index]);
                                        }
                                    }
                                    customMessages = [
                                        alertSuccess?.length > 0 ? "Show alert 'Berhasil memperbarui data' ✅" : "Show alert 'Berhasil memperbarui data' ❌",
                                        findCourse.length > 0 ? "'Materi' successfully updated to list of materi in detail classroom ✅" : "'Materi' successfully updated to list of materi in detail classroom ❌"
                                    ];
                                    expect(isAllFilled, 'Expect all input value is filled').to.equal(true);
                                    expect(alertSuccess?.length, 'Expect show alert success after created a new data').to.equal(1);
                                    expect(findCourse?.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);

                                    const pageUrl = await driver.getCurrentUrl();
                                    expect(pageUrl, 'Expect return or back to detail classroom').to.include('dashboard/classroom');
                                }

                            }
                            await searchAvailableCourse();

                        } catch (error) {
                            // console.error(error?.stack?.split('\n')[1]);
                            expect.fail(error?.stack);
                        }


                    });

                    it(`Other - Check the icon edit and delete from Detail Class from browser ${browser}`, async function () {

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
                            
                            // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                            await driver.wait(until.elementLocated(By.css("div.item-class")));
                            let itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                            // Error ketika card classnya kosong
                            await thrownAnError('Item class is empty', itemClass?.length == 0);

                            // Aksi sleep
                            await driver.sleep(3000);

                            async function searchAvailableCourse() {

                                await driver.wait(until.elementLocated(By.css("div.item-class")));
                                itemClass = await driver.executeScript("return document.querySelectorAll('div.item-class')");
                                // Error ketika card classnya kosong
                                await thrownAnError('Item class is empty', itemClass?.length == 0);
                                
                                // Aksi sleep
                                await driver.sleep(3000);

                                // Aksi memilih salah satu card class
                                await itemClass[faker.number.int({ min: 0, max: await itemClass.length - 1 })].findElement(By.css('h1.title')).click();

                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi mengklik tab materi pada detail class
                                let itemTabs = await driver.executeScript("return document.querySelectorAll('.item-tab');");
                                await itemTabs[1].click();
                                
                                // Aksi sleep
                                await driver.sleep(10000);
                                
                                // Aksi meng-hover icon edit dan mengkliknya
                                let listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);
                                // await thrownAnError('Courses on detail classroom is empty', listCourse?.length == 0 || listCourse == null);

                                if(await listCourse.length === 0) {
                                    await driver.executeScript(`return document.querySelector('.back-arrow').click();`);
                                    await searchAvailableCourse();
                                } else {
                                    // Aksi meng-hover icon edit dan mengkliknya
                                    listCourse = await driver.executeScript(`return document.querySelectorAll(".card .card-body .header")`);

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
                                }

                            }
                            await searchAvailableCourse();
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