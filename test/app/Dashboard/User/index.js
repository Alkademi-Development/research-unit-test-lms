import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities, Select } from 'selenium-webdriver';
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
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';
import moment from 'moment-timezone';
import { faker } from '@faker-js/faker';

/**
 * Get the user data for authentication
 */

const users = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}/`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}/`);
}

describe("Schedule", () => {
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
            value: path.relative(fileURLToPath(import.meta.url), fileNamePath),
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
                    it.skip(`SUPER ADMIN - Create account Admin from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ User'
                            await driver.executeScript(`return document.querySelector(".main-content button i.ri-add-fill").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let fullName = 'Admin ' + faker.person.fullName()
                            let email = `${fullName.replace(/ /g, '').toLowerCase()}@mail.co.id`
                            let phone = faker.phone.number('+62###############')
                            let gender = faker.helpers.arrayElement(['L', 'P'])
                            let pass = 'semuasama'
                            /** Input User Role */
                            await driver.executeScript(`return Array.from(document.querySelectorAll("form .program-card")).find(value => value.querySelector("span.program").innerText.replace(/ /g, '').toLowerCase() == 'admin').click()`)
                            await driver.sleep(1000)
                            /** Input User Name */
                            await driver.findElement(By.id("Nama Lengkap *")).sendKeys(fullName)
                            await driver.sleep(1000)
                            /** Input User Email */
                            await driver.findElement(By.id("Alamat Email *")).sendKeys(email)
                            await driver.sleep(1000)
                            /** Input User Phone */
                            await driver.findElement(By.id("Nomor Telepon *")).sendKeys(phone)
                            await driver.sleep(1000)
                            /** Input User Gender */
                            let selectElement = await driver.findElement(By.css('select.custom-select'))
                            let select = new Select(selectElement)
                            await select.selectByValue(gender)
                            await driver.sleep(1000)
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Create account Mentor from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ User'
                            await driver.executeScript(`return document.querySelector(".main-content button i.ri-add-fill").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let fullName = 'Mentor ' + faker.person.fullName()
                            let email = `${fullName.replace(/ /g, '').toLowerCase()}@mail.co.id`
                            let phone = faker.phone.number('+62###############')
                            let gender = faker.helpers.arrayElement(['L', 'P'])
                            let pass = 'semuasama'
                            /** Input User Role */
                            await driver.executeScript(`return Array.from(document.querySelectorAll("form .program-card")).find(value => value.querySelector("span.program").innerText.replace(/ /g, '').toLowerCase() == 'mentor').click()`)
                            await driver.sleep(1000)
                            /** Input User Name */
                            await driver.findElement(By.id("Nama Lengkap *")).sendKeys(fullName)
                            await driver.sleep(1000)
                            /** Input User Email */
                            await driver.findElement(By.id("Alamat Email *")).sendKeys(email)
                            await driver.sleep(1000)
                            /** Input User Phone */
                            await driver.findElement(By.id("Nomor Telepon *")).sendKeys(phone)
                            await driver.sleep(1000)
                            /** Input User Gender */
                            let selectElement = await driver.findElement(By.css('select.custom-select'))
                            let select = new Select(selectElement)
                            await select.selectByValue(gender)
                            await driver.sleep(1000)
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Create account Student from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ User'
                            await driver.executeScript(`return document.querySelector(".main-content button i.ri-add-fill").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let fullName = 'Student ' + faker.person.fullName()
                            let email = `${fullName.replace(/ /g, '').toLowerCase()}@mail.co.id`
                            let phone = faker.phone.number('+62###############')
                            let gender = faker.helpers.arrayElement(['L', 'P'])
                            let pass = 'semuasama'
                            /** Input User Role */
                            await driver.executeScript(`return Array.from(document.querySelectorAll("form .program-card")).find(value => value.querySelector("span.program").innerText.replace(/ /g, '').toLowerCase() == 'siswa').click()`)
                            await driver.sleep(1000)
                            /** Input User Name */
                            await driver.findElement(By.id("Nama Lengkap *")).sendKeys(fullName)
                            await driver.sleep(1000)
                            /** Input User Email */
                            await driver.findElement(By.id("Alamat Email *")).sendKeys(email)
                            await driver.sleep(1000)
                            /** Input User Phone */
                            await driver.findElement(By.id("Nomor Telepon *")).sendKeys(phone)
                            await driver.sleep(1000)
                            /** Input User Gender */
                            let selectElement = await driver.findElement(By.css('select.custom-select'))
                            let select = new Select(selectElement)
                            await select.selectByValue(gender)
                            await driver.sleep(1000)
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Create account Content Writer from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ User'
                            await driver.executeScript(`return document.querySelector(".main-content button i.ri-add-fill").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let fullName = 'Content Writer ' + faker.person.fullName()
                            let email = `${fullName.replace(/ /g, '').toLowerCase()}@mail.co.id`
                            let phone = faker.phone.number('+62###############')
                            let gender = faker.helpers.arrayElement(['L', 'P'])
                            let pass = 'semuasama'
                            /** Input User Role */
                            await driver.executeScript(`return Array.from(document.querySelectorAll("form .program-card")).find(value => value.querySelector("span.program").innerText.replace(/ /g, '').toLowerCase() == 'contentwriter').click()`)
                            await driver.sleep(1000)
                            /** Input User Name */
                            await driver.findElement(By.id("Nama Lengkap *")).sendKeys(fullName)
                            await driver.sleep(1000)
                            /** Input User Email */
                            await driver.findElement(By.id("Alamat Email *")).sendKeys(email)
                            await driver.sleep(1000)
                            /** Input User Phone */
                            await driver.findElement(By.id("Nomor Telepon *")).sendKeys(phone)
                            await driver.sleep(1000)
                            /** Input User Gender */
                            let selectElement = await driver.findElement(By.css('select.custom-select'))
                            let select = new Select(selectElement)
                            await select.selectByValue(gender)
                            await driver.sleep(1000)
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Create account Lead Program from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ User'
                            await driver.executeScript(`return document.querySelector(".main-content button i.ri-add-fill").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let fullName = 'Content Writer ' + faker.person.fullName()
                            let email = `${fullName.replace(/ /g, '').toLowerCase()}@mail.co.id`
                            let phone = faker.phone.number('+62###############')
                            let gender = faker.helpers.arrayElement(['L', 'P'])
                            let pass = 'semuasama'
                            /** Input User Role */
                            await driver.executeScript(`return Array.from(document.querySelectorAll("form .program-card")).find(value => value.querySelector("span.program").innerText.replace(/ /g, '').toLowerCase() == 'contentwriter').click()`);
                            await driver.sleep(1000)
                            /** Input User Name */
                            await driver.findElement(By.id("Nama Lengkap *")).sendKeys(fullName)
                            await driver.sleep(1000)
                            /** Input User Email */
                            await driver.findElement(By.id("Alamat Email *")).sendKeys(email)
                            await driver.sleep(1000)
                            /** Input User Phone */
                            await driver.findElement(By.id("Nomor Telepon *")).sendKeys(phone)
                            await driver.sleep(1000)
                            /** Input User Gender */
                            let selectElement = await driver.findElement(By.css('select.custom-select'))
                            let select = new Select(selectElement)
                            await select.selectByValue(gender)
                            await driver.sleep(1000)
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it.skip(`SUPER ADMIN - Create account Lead Region from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ User'
                            await driver.executeScript(`return document.querySelector(".main-content button i.ri-add-fill").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let fullName = 'Lead Region ' + faker.person.fullName()
                            let email = `${fullName.replace(/ /g, '').toLowerCase()}@mail.co.id`
                            let phone = faker.phone.number('+62###############')
                            let gender = faker.helpers.arrayElement(['L', 'P'])
                            let pass = 'semuasama'
                            /** Input User Role */
                            await driver.executeScript(`return Array.from(document.querySelectorAll("form .program-card")).find(value => value.querySelector("span.program").innerText.replace(/ /g, '').toLowerCase() == 'leadregion').click();`);
                            await driver.sleep(1000)
                            /** Input User Name */
                            await driver.findElement(By.id("Nama Lengkap *")).sendKeys(fullName)
                            await driver.sleep(1000)
                            /** Input User Email */
                            await driver.findElement(By.id("Alamat Email *")).sendKeys(email)
                            await driver.sleep(1000)
                            /** Input User Phone */
                            await driver.findElement(By.id("Nomor Telepon *")).sendKeys(phone)
                            await driver.sleep(1000)
                            /** Input User Gender */
                            let selectElement = await driver.findElement(By.css('select.custom-select'))
                            let select = new Select(selectElement)
                            await select.selectByValue(gender)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)
                            /** Input User Region */
                            let regions = ["ACEH", "SUMATERA UTARA", "SUMATERA BARAT", "RIAU", "JAMBI", "SUMATERA SELATAN", "BENGKULU", "LAMPUNG", "KEPULAUAN BANGKA BELITUNG", "KEPULAUAN RIAU", "DKI JAKARTA", "JAWA BARAT", "JAWA TENGAH", "DI YOGYAKARTA", "JAWA TIMUR", "BANTEN", "BALI", "NUSA TENGGARA BARAT", "NUSA TENGGARA TIMUR", "KALIMANTAN BARAT", "KALIMANTAN TENGAH", "KALIMANTAN SELATAN", "KALIMANTAN TIMUR", "KALIMANTAN UTARA", "SULAWESI UTARA", "SULAWESI TENGAH", "SULAWESI SELATAN", "SULAWESI TENGGARA", "GORONTALO", "SULAWESI BARAT", "MALUKU", "MALUKU UTARA", "PAPUA BARAT", "PAPUA"]
                            let randomRegional = faker.helpers.arrayElement(['Sumatra', 'Kalimantan', 'Jawa', 'Maluku', 'Papua'])
                            let isNewRegion = true
                            if(isNewRegion) {
                                await driver.executeScript(`return document.querySelector("button[type=button].btn i.ri-add-line").click()`);
                                await driver.sleep(2000);
                                if(randomRegional.toLowerCase() == 'sumatra') regions = faker.helpers.arrayElements(["ACEH", "SUMATERA UTARA", "SUMATERA BARAT", "KEPULAUAN BANGKA BELITUNG", "KEPULAUAN RIAU", "BENGKULU", "LAMPUNG"])
                                else if(randomRegional.toLowerCase() == 'kalimantan') regions = faker.helpers.arrayElements(["KALIMANTAN BARAT", "KALIMANTAN TENGAH", "KALIMANTAN SELATAN", "KALIMANTAN TIMUR", "KALIMANTAN UTARA"])
                                else if(randomRegional.toLowerCase() == 'jawa') regions = faker.helpers.arrayElements(["SULAWESI UTARA", "SULAWESI TENGAH", "SULAWESI SELATAN", "SULAWESI TENGGARA", "GORONTALO", "SULAWESI BARAT"])
                                else if(randomRegional.toLowerCase() == 'maluku') regions = faker.helpers.arrayElements(["MALUKU", "MALUKU UTARA"])
                                else regions = faker.helpers.arrayElements(["PAPUA BARAT", "PAPUA"])
                                /** Fill the input name of region */
                                await driver.findElement(By.id("input-region-name")).sendKeys("Region " + randomRegional);
                                await driver.sleep(1000);
                                /** Fill the input of option region */
                                for(let index in regions) {
                                    await driver.findElement(By.css("#input-province input")).sendKeys(regions[index]);
                                    await driver.sleep(2000);
                                    await driver.executeScript(`return document.querySelector("button[type=button].btn-primary").click()`)
                                    await driver.sleep(2000);
                                }
                                /** Aksi submit create region */
                                await driver.executeScript(`return document.querySelector(".modal-content button[type=submit].btn-primary").click()`);
                                await driver.sleep(3000);
                                let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                                if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)
                            }
                            let inputSearch = await driver.findElement(By.css(".v-select input[type=search]"));
                            let action = await driver.actions({async: true});
                            await action.move({origin: await inputSearch}).press().perform();
                            await driver.sleep(2000);
                            let inputRegions = await driver.executeScript(`return document.querySelectorAll('.v-select ul li')`)
                            let randomIndexRegion = faker.number.int({ min: 0, max: await inputRegions?.length - 1  });
                            await driver.sleep(1000);
                            await driver.executeScript('arguments[0].scrollIntoView()', await inputRegions[randomIndexRegion]);
                            await driver.sleep(2000);
                            let actions = driver.actions({async: true});
                            await actions.doubleClick(await inputRegions[randomIndexRegion]).perform();
                            await driver.sleep(2000);
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`SUPER ADMIN - Edit one account of User from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Aksi memilih salah satu user yang ada di table row untuk di edit
                            let userRow = await driver.executeScript(`return document.querySelector("table tbody tr")`);
                            await driver.executeScript("arguments[0].querySelector('i.fa-pen').click()", await userRow);
                            
                            // Aksi sleep 
                            await driver.sleep(5000);
                            let form = await driver.executeScript(`return document.querySelector("form")`)
                            while(await form == null) {
                                await driver.navigate().refresh();
                                await driver.sleep(5000);
                                form = await driver.executeScript(`return document.querySelector("form")`)
                            }

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let pass = 'semuasama'
                            /** Aksi scroll down to bottom of form */
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Search account of User from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi search account
                            let rows = await driver.executeScript(`return document.querySelectorAll("section#student-table table tbody tr")`);
                            let randomIndexClass = faker.number.int({ min: 0, max: await rows.length - 1 })
                            let searchUserName = await driver.executeScript(`return arguments[0].querySelector("td[aria-colindex='2']").innerText`, await rows[randomIndexClass]);
                            for(let index in await searchUserName) {
                                await driver.findElement(By.css("form.filter-container input#filter-input")).sendKeys(await searchUserName[index], Key.RETURN);
                                await driver.sleep(700)
                                if(await rows?.length && searchUserName.length - 1 == index) break;
                            }

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await rows.length > 0 ? "Successfully display the users by search input field ✅" : "Failed to display the users by search input field ❌",
                            ];
                            expect(await rows.length > 0).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Filter account by Role of User from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi filter users by their role
                            await driver.executeScript(`return document.querySelector("button.dropdown-toggle").click()`);
                            await driver.sleep(2000)
                            let dropdownMenuFilter = await driver.executeScript(`return document.querySelector("ul.dropdown-menu")`)
                            await thrownAnError("Dropdown menu filter isn't showed up", await dropdownMenuFilter == null)
                            let inputSearchRole = await driver.executeScript(`return document.querySelector("input[type=search].vs__search")`)
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchRole }).click().perform();
                            await driver.sleep(2000)
                            let roles = await driver.executeScript(`return document.querySelectorAll("#select-role ul li")`)
                            await thrownAnError("User is empty", await roles.length == 0)
                            let randomeIndexRole = faker.number.int({ min: 0, max: await roles.length - 1 })
                            let roleName = await driver.executeScript("return arguments[0].innerText", await roles[randomeIndexRole]);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await roles[randomeIndexRole]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            let badgeRoles = await driver.executeScript(`return Array.from(document.querySelectorAll("table tbody tr td .badge")).filter(value => value.innerText.includes("${await roleName}".replace(/./g, "")))`);
                            // let isEmptyClass = await driver.executeScript(`return document.querySelector(".card-body span") ? document.querySelector(".card-body span").innerText.toLowerCase().includes("belum ada kelas") : null`)
                            customMessages = [
                                await badgeRoles.length > 0 ? `Successfully sorted by user role ${await roleName} ✅` : `Failed to sort by user role ❌`,
                            ];
                            expect(await badgeRoles.length > 0).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Remove Filter account by Role of User from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi filter users by their role
                            await driver.executeScript(`return document.querySelector("button.dropdown-toggle").click()`);
                            await driver.sleep(2000)
                            let dropdownMenuFilter = await driver.executeScript(`return document.querySelector("ul.dropdown-menu")`)
                            await thrownAnError("Dropdown menu filter isn't showed up", await dropdownMenuFilter == null)
                            let inputSearchRole = await driver.executeScript(`return document.querySelector("input[type=search].vs__search")`)
                            let action = await driver.actions({async: true});
                            await action.move({ origin: await inputSearchRole }).click().perform();
                            await driver.sleep(2000)
                            let roles = await driver.executeScript(`return document.querySelectorAll("#select-role ul li")`)
                            await thrownAnError("User is empty", await roles.length == 0)
                            let randomeIndexRole = faker.number.int({ min: 0, max: await roles.length - 1 })
                            let roleName = await driver.executeScript("return arguments[0].innerText", await roles[randomeIndexRole]);
                            let actions = driver.actions({async: true});
                            await actions.move({origin: await roles[randomeIndexRole]}).click().perform();
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".dropdown-menu .btn-muted-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)
                            
                            // Aksi mendapatkan original list class
                            let originalTable = await driver.executeScript(`return document.querySelector(".main-content table tbody");`);
                            
                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Aksi remove filter applied
                            let buttonRemoveFilter = await driver.executeScript(`return document.querySelector(".main-content button.btn-text-primary") ? document.querySelector(".main-content button.btn-text-primary") : null`)
                            // await thrownAnError("Button remove filter isn't displayed", await buttonRemoveFilter == null)
                            await buttonRemoveFilter.click();

                            // Expect results and add custom message for addtional description
                            let newTable = await driver.executeScript(`return document.querySelector(".main-content table tbody")`);
                            buttonRemoveFilter = await driver.executeScript(`return document.querySelector(".main-content button.btn-text-primary") ? document.querySelector(".main-content button.btn-text-primary") : null`)
                            customMessages = [
                                await originalTable.getAttribute("innerHTML") == await newTable.getAttribute("innerHTML") && buttonRemoveFilter == null ? "Succesfully removed filter user role ✅" : "Failed to remove filter user role ❌",
                            ];
                            expect(await originalTable.getAttribute("innerHTML") == await newTable.getAttribute("innerHTML") && buttonRemoveFilter == null).to.be.true;

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 1:
                    it(`ADMIN - Create account Admin from admin dashboard from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-user-3-line").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi menekan tombol '+ User'
                            await driver.executeScript(`return document.querySelector(".main-content button i.ri-add-fill").click()`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            // Aksi mengisi form create user
                            /** Dummy Data **/
                            let fullName = 'Admin ' + faker.person.fullName()
                            let email = `${fullName.replace(/ /g, '').toLowerCase()}@mail.co.id`
                            let phone = faker.phone.number('+62###############')
                            let gender = faker.helpers.arrayElement(['L', 'P'])
                            let pass = 'semuasama'
                            /** Input User Role */
                            await driver.executeScript(`return Array.from(document.querySelectorAll("form .program-card")).find(value => value.querySelector("span.program").innerText.replace(/ /g, '').toLowerCase() == 'admin').click()`)
                            await driver.sleep(1000)
                            /** Input User Name */
                            await driver.findElement(By.id("Nama Lengkap *")).sendKeys(fullName)
                            await driver.sleep(1000)
                            /** Input User Email */
                            await driver.findElement(By.id("Alamat Email *")).sendKeys(email)
                            await driver.sleep(1000)
                            /** Input User Phone */
                            await driver.findElement(By.id("Nomor Telepon *")).sendKeys(phone)
                            await driver.sleep(1000)
                            /** Input User Gender */
                            let selectElement = await driver.findElement(By.css('select.custom-select'))
                            let select = new Select(selectElement)
                            await select.selectByValue(gender)
                            await driver.sleep(1000)
                            /** Input User Password */
                            await driver.findElement(By.id('Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            /** Input User Re-type Password */
                            await driver.findElement(By.id('Ketik Ulang Password *')).sendKeys(pass)
                            await driver.sleep(1000)
                            await driver.executeScript(`return window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)

                            // Cek semua input telah terisi
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.id("Nama Lengkap *")).getAttribute('value'),
                                await driver.findElement(By.id("Alamat Email *")).getAttribute('value'),
                                await driver.findElement(By.id("Nomor Telepon *")).getAttribute('value'),
                                await driver.findElement(By.css("select.custom-select")).getAttribute('value'),
                                await driver.findElement(By.id("Password *")).getAttribute('value'),
                                await driver.findElement(By.id("Ketik Ulang Password *")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            // Thrown an Error when there are validation errors
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert-warning") ? document.querySelector(".alert-warning") : null`)
                            if(await alertWarning) await thrownAnError(await alertWarning.getAttribute('innerText'), await alertWarning != null)

                            if(isAllFilled) await driver.executeScript(`return document.querySelector("form button[type=submit].btn-primary").click()`)

                            // Aksi Sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning == null && isAllFilled ? 'Successfully create new account Admin ✅' : 'Failed to create a new account of Admin ❌'
                            ]
                            expect(await alertWarning).to.be.null
                            expect(isAllFilled).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 2:

                break;
                
                case 4:

                break;

                case 5:
                    it(`INDUSTRY - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 6:

                break;

                case 7:

                break;
                
                case 9:

                break;

                default:
                    it(`Other - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
            }
        });

    })



});