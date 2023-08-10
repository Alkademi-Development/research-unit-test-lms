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
                    it.skip(`SUPER ADMIN - Create a new activity schedule from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-calendar-event-fill").click()`)

                            // Aksi sleep
                            await driver.sleep(3000)

                            // Aksi mengklik button '+' kegiatan
                            await driver.executeScript(`return document.querySelector(".content-header button i.ri-add-line").click()`)
                            
                            // Aksi sleep
                            await driver.sleep(4000)

                            // Aksi mengisi form create kegiatan
                            let isAllFilled;
                            // DUMMY DATA
                            let title = "Seminar " + faker.helpers.arrayElement(['GDG Bandung', 'Nasional', 'Internasional', 'Block-17', 'Frock', 'Local'])
                            let description = faker.lorem.paragraphs()
                            let address = faker.location.streetAddress(true)
                            let linkMap = 'https://goo.gl/maps/8mrd5ha6yZ47jQvn7'
                            let today = new Date();
                            let dateOpenActivity = `${today.getFullYear()}-${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')} 08:00:00`
                            let dateEndActivity = `${today.getFullYear()}-${String(today.getDate() + 1).padStart(2, '0')}-${String(today.getMonth()).padStart(2, '0')} 12:00:00`
                            let platformName = 'Youtube'
                            let linkConference = 'https://www.youtube.com/channel/UClrtoaPaIHDY2liEh_RJcOg'

                            /** Aksi mengisi input value title */
                            await driver.findElement(By.id("Judul Kegiatan *")).sendKeys(title)
                            await driver.sleep(2000)
                            /** Aksi mengisi input value description */
                            await driver.findElement(By.id("Deskripsi Kegiatan *")).sendKeys(description)
                            await driver.sleep(2000)
                            /** Aksi mengisi input value tipe kegiatan */
                            let selectElement = await driver.findElement(By.id('Tipe Kegiatan *'))
                            let selectType = new Select(selectElement)
                            let optionsType = await driver.executeScript(`return document.querySelectorAll("form select.custom-select option")`)
                            let randomIndexType = faker.number.int({ min: 1, max: await optionsType.length - 1})
                            await selectType.selectByIndex(randomIndexType)
                            let valueSelect = await driver.executeScript(`return document.querySelector("select.custom-select").value.toLowerCase();`)
                            await driver.sleep(1500)
                            if(await valueSelect == 'online') {
                                let videoConferences = await driver.executeScript(`return document.querySelectorAll("#select-video-conference .card-body")`)
                                let randomIndexConference = faker.helpers.arrayElement([1, 2])
                                if(randomIndexConference == 2) {
                                    await videoConferences[randomIndexConference].click()
                                    await driver.sleep(2000)
                                    /** Aksi mengisi input platform name */
                                    await driver.findElement(By.css(".modal-content #input-platform")).sendKeys(platformName)
                                    await driver.sleep(2000)
                                    /** Aksi mengisi input value link conference */
                                    await driver.findElement(By.css(".modal-content #input-link")).sendKeys(linkConference)
                                    await driver.sleep(2000)
                                    /** Aksi submit */
                                    await driver.executeScript(`return document.querySelector(".modal-content button[type=submit]").click()`)
                                    await driver.sleep(2000)
                                    isAllFilled = await Promise.all([
                                        await driver.findElement(By.id("Judul Kegiatan *")).getAttribute("value"),
                                        await driver.findElement(By.id("Deskripsi Kegiatan *")).getAttribute("value"),
                                        await driver.findElement(By.id("Tipe Kegiatan *")).getAttribute("value"),
                                    ]).then(results => results.every(value => value != ''))
                                }
                            } else {
                                /** Aksi mengisi input value lokasi kegiatan */
                                await driver.findElement(By.id("Lokasi Kegiatan *")).sendKeys(address)
                                await driver.sleep(2000)
                                /** Aksi mengisi input value link map */
                                await driver.findElement(By.css(".form-group input[placeholder='Link Maps']")).sendKeys(linkMap)
                                await driver.sleep(2000)
                                isAllFilled = await Promise.all([
                                    await driver.findElement(By.id("Judul Kegiatan *")).getAttribute("value"),
                                    await driver.findElement(By.id("Deskripsi Kegiatan *")).getAttribute("value"),
                                    await driver.findElement(By.id("Tipe Kegiatan *")).getAttribute("value"),
                                    await driver.findElement(By.id("Lokasi Kegiatan *")).getAttribute("value"),
                                    await driver.findElement(By.css(".form-group input[placeholder='Link Maps']")).getAttribute("value"),
                                ]).then(results => results.every(value => value != ''))
                            }
                            /** Scroll down */
                            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`)
                            await driver.sleep(2000)
                            /** Aksi memasukkan input date pelaksanaan kegiatan & kegiatan berakhir */
                            await driver.executeScript(`return document.getElementById("Pelaksanaan Kegiatan *").value = "${dateOpenActivity}"`)
                            await driver.sleep(2000)
                            await driver.executeScript(`return document.getElementById("Kegiatan Berakhir *").value = "${dateEndActivity}"`)

                            // Aksi Sleep
                            await driver.sleep(3000)

                            /** Aksi mengecek semua fill terlah terisi & submit form */
                            if(isAllFilled) {
                                await driver.executeScript(`return document.querySelector("form button[type=submit]").click();`)
                                await driver.sleep(5000)
                            }
                            await thrownAnError("There are input that still not filled", !isAllFilled)
                            let alertWarning = await driver.executeScript(`return document.querySelector(".alert.alert-warning") ? document.querySelector(".alert.alert-warning") : null`)
                            if(await alertWarning != null) await thrownAnError(await driver.executeScript(`return arguments[0].innerText`, await alertWarning), await alertWarning != null)

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await alertWarning != null ? 'Successfully create new Activity Schedule ✅' : 'Failed to create Activity Schedule ❌'
                            ]
                            expect(await alertWarning).to.be.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - View activity schedule from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-calendar-event-fill").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            let calendar = await driver.executeScript(`return document.querySelector(".calendar") ? document.querySelector(".calendar") : null`)
                            customMessages = [
                                await calendar != null ? 'Successfully display activity schedule on this month ✅' : 'Failed to display activity schedule ❌'
                            ]
                            expect(await calendar).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`SUPER ADMIN - Open activity detail registration from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-calendar-event-fill").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Aksi memilih salah satu activity schedule untuk melihat detail nya
                            await driver.executeScript(`return Array.from(document.querySelectorAll(".card-event-item i")).find(value => value.classList.contains('circle-class')).click()`)
                            await driver.sleep(2000);
                            let titleActivity = await driver.executeScript(`return document.querySelector(".modal-content .title")`)
                            let textActivity = await driver.executeScript(`return arguments[0].innerText;`, await titleActivity);
                            await thrownAnError("There was no title activity in the modal", await textActivity == null || await textActivity == '')
                            await titleActivity?.click();
                            
                            // Aksi sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            let currentUrl = await driver.getCurrentUrl();
                            customMessages = [
                                await currentUrl.includes(await textActivity.toLowerCase().replace(/ /g, '-')) ? '- Successfully directed to the class page ✅' : 'Failed to direct to the class page ❌'
                            ]
                            expect(await currentUrl.includes(await textActivity.toLowerCase().replace(/ /g, '-'))).to.be.true

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`SUPER ADMIN - Open activity detail public from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.wait(until.elementLocated(By.css("h1.text-welcome")), 10000);
                            await driver.sleep(5000)

                            // Aksi klik menu 'Jadwal Kegiatan'
                            await driver.executeScript(`return document.querySelector("ul.navbar-nav li a i.ri-calendar-event-fill").click()`)

                            // Aksi sleep
                            await driver.sleep(5000)

                            // Aksi memilih salah satu activity schedule untuk melihat detail nya
                            let activityAnnouncement = await driver.executeScript(`return document.querySelector(".card-event-item i.circle-announcement")`)
                            if(await activityAnnouncement == null) {
                                async function searchActivityAnnouncement() {
                                    await driver.executeScript(`return document.querySelectorAll("button.btn-paginate")[1].click()`)

                                    // Aksi Sleep
                                    await driver.sleep(3000)

                                    // Aksi mencari kembali activity schedule announce
                                    activityAnnouncement = await driver.executeScript(`return document.querySelector(".card-event-item i.circle-announcement")`)
                                    if(await activityAnnouncement) return
                                    else await searchActivityAnnouncement()
                                }
                                await searchActivityAnnouncement()
                                await thrownAnError("Activity announcement was not found", await activityAnnouncement == null)

                                // Aksi mengklik card activity announcement
                                await activityAnnouncement?.click()
                                await driver.sleep(3000)
                                let titleActivity = await driver.executeScript(`return document.querySelector(".modal-content .title")`)
                                let textActivity = await driver.executeScript(`return arguments[0].innerText;`, await titleActivity);
                                await thrownAnError("There was no title activity in the modal", await textActivity == null || await textActivity == '')
                                await titleActivity?.click();
                                
                            } else {
                                // Aksi mengklik card activity announcement
                                await activityAnnouncement?.click()
                                await driver.sleep(3000)
                                let titleActivity = await driver.executeScript(`return document.querySelector(".modal-content .title")`)
                                let textActivity = await driver.executeScript(`return arguments[0].innerText;`, await titleActivity);
                                await thrownAnError("There was no title activity in the modal", await textActivity == null || await textActivity == '')
                                await titleActivity?.click();
                            }


                            
                            // Aksi sleep
                            await driver.sleep(5000)

                            // Expect results and add custom message for addtional description
                            let sectionDetailEvent = await driver.executeScript(`return document.getElementById("detail-event")`)
                            customMessages = [
                                await sectionDetailEvent != null ? "Successfully directed to activity schedule announcement detail page ✅" : "Failed to direct to activity schedule announcement detail page ❌"
                            ]
                            expect(await sectionDetailEvent).to.be.not.null

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                break;

                case 1:
                    it(`ADMIN - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;

                case 2:
                    it(`MENTOR - from browser ${browser}`, async () => {

                        try {
                            
                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 4:
                    it(`STUDENT - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;

                case 5:
                    it(`INDUSTRY - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 6:
                    it(`CONTENT WRITER - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;

                case 7:
                    it(`LEAD PROGRAM - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;
                
                case 9:
                    it(`LEAD REGION - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // Aksi sleep 
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                break;

                default:
                    it(`Other - from browser ${browser}`, async () => {

                        try {

                            // Go to application
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            errorMessages = await captureConsoleErrors(driver, browser);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

                            // login to the application
                            errorMessages = await enterDashboard(driver, user, browser, appHost);
                            await thrownAnError(errorMessages, errorMessages?.length > 0);

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