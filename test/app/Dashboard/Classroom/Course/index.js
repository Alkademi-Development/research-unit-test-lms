import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
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
import { captureConsoleErrors, thrownAnError } from '#root/commons/utils/generalUtils';
import { faker } from '@faker-js/faker';
import { createData } from '#root/helpers/Dashboard/Classroom/course';

/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;

describe("Course", () => {

    afterEach(async function() {
        await takeScreenshot(driver, path.resolve(`./screenshoot/test/app/Dashboard/Classroom/Course/index/${(this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1}.png`));
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        switch (user.kind) {
            case 0:
                it(`Super Admin - Create Materi from Detail Class from browser ${browser}`, async function() {
                        
                    try {
                        
                        // Go to application
                        driver = await goToApp(browser, appHost);
                        await driver.manage().window().maximize();
        
                        // login to the application
                        errorMessages = await enterDashboard(driver, user);
        
                        // Aksi Masuk ke dalam halaman class
                        await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                        let cardClass = await driver.findElement(By.css(`div.card-class`));
                        await driver.wait(until.stalenessOf(cardClass));
                        errorMessages = await captureConsoleErrors(driver);
        
                        // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                        let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                        await driver.wait(until.stalenessOf(loadingSkeleton))
                        let itemClass = await driver.findElements(By.css(`div.item-class`));
                        // Error ketika card classnya kosong
                        await thrownAnError('Item class is empty', itemClass.length == 0);
        
                        // Aksi memilih salah satu card class
                        await itemClass[faker.helpers.arrayElement([0,1,2])].findElement(By.css('h1.title')).click();
        
                        // Aksi mengklik tab materi pada detail class
                        let itemTabs = await driver.findElements(By.css(".item-tab"));
                        itemTabs[1].findElement(By.css('span')).click();
        
                        // Aksi mengklik button tambah materi
                        await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                        await driver.findElement(By.css("i.ri-add-fill")).click();
                        await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                        let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                        await buttonsDropdownItem[2].click();
        
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
        
                        if(isAllFilled) {
                            await driver.findElement(By.css("button[type='submit']")).click();
                        }
        
                        // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                        await driver.wait(until.elementsLocated(By.css('.card-body')));
                        const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                        let findCourse = [];
                        
                        for (let index = 0; index < courses.length; index++) {
                            if(await courses[index].getAttribute('innerText') === dataTitleCourse) {
                                findCourse.push(courses[index]);
                            }
                        }
        
                        expect(isAllFilled).to.equal(true);
                        expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);
        
                        const pageUrl = await driver.getCurrentUrl();
                        expect(pageUrl).to.include('dashboard/classroom');
                    } catch (error) {
                        // console.error(error?.stack?.split('\n')[1]);
                        expect.fail(error?.stack);
                    }
                      
                    
                });
                break;
            case 1:
                it(`Admin - Create Materi from Detail Class from browser ${browser}`, async function() {
                        
                    try {
                        
                        // Go to application
                        driver = await goToApp(browser, appHost);
                        await driver.manage().window().maximize();
        
                        // login to the application
                        errorMessages = await enterDashboard(driver, user);
        
                        // Aksi Masuk ke dalam halaman class
                        await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                        let cardClass = await driver.findElement(By.css(`div.card-class`));
                        await driver.wait(until.stalenessOf(cardClass));
                        errorMessages = await captureConsoleErrors(driver);
        
                        // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                        let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                        await driver.wait(until.stalenessOf(loadingSkeleton))
                        let itemClass = await driver.findElements(By.css(`div.item-class`));
                        // Error ketika card classnya kosong
                        await thrownAnError('Item class is empty', itemClass.length == 0);
        
                        // Aksi memilih salah satu card class
                        await itemClass[faker.helpers.arrayElement([0,1,2])].findElement(By.css('h1.title')).click();
        
                        // Aksi mengklik tab materi pada detail class
                        let itemTabs = await driver.findElements(By.css(".item-tab"));
                        itemTabs[1].findElement(By.css('span')).click();
        
                        // Aksi mengklik button tambah materi
                        await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                        await driver.findElement(By.css("i.ri-add-fill")).click();
                        await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                        let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                        await buttonsDropdownItem[2].click();
        
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
        
                        if(isAllFilled) {
                            await driver.findElement(By.css("button[type='submit']")).click();
                        }
        
                        // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                        await driver.wait(until.elementsLocated(By.css('.card-body')));
                        const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                        let findCourse = [];
                        
                        for (let index = 0; index < courses.length; index++) {
                            if(await courses[index].getAttribute('innerText') === dataTitleCourse) {
                                findCourse.push(courses[index]);
                            }
                        }
        
                        expect(isAllFilled).to.equal(true);
                        expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);
        
                        const pageUrl = await driver.getCurrentUrl();
                        expect(pageUrl).to.include('dashboard/classroom');
                    } catch (error) {
                        // console.error(error?.stack?.split('\n')[1]);
                        expect.fail(error?.stack);
                    }
                        
                    
                });
                break;
            case 2:
                it(`Mentor - Create Materi from Detail Class from browser ${browser}`, async function() {
                        
                    try {
                        
                        // Go to application
                        driver = await goToApp(browser, appHost);
                        await driver.manage().window().maximize();
        
                        // login to the application
                        errorMessages = await enterDashboard(driver, user);
        
                        // Aksi Masuk ke dalam halaman class
                        await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                        let cardClass = await driver.findElement(By.css(`div.card-class`));
                        await driver.wait(until.stalenessOf(cardClass));
                        errorMessages = await captureConsoleErrors(driver);
        
                        // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                        let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                        await driver.wait(until.stalenessOf(loadingSkeleton))
                        let itemClass = await driver.findElements(By.css(`div.item-class`));
                        // Error ketika card classnya kosong
                        await thrownAnError('Item class is empty', itemClass.length == 0);
        
                        // Aksi memilih salah satu card class
                        await itemClass[faker.helpers.arrayElement([0,1,2])].findElement(By.css('h1.title')).click();
        
                        // Aksi mengklik tab materi pada detail class
                        let itemTabs = await driver.findElements(By.css(".item-tab"));
                        itemTabs[1].findElement(By.css('span')).click();
        
                        // Aksi mengklik button tambah materi
                        await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                        await driver.findElement(By.css("i.ri-add-fill")).click();
                        await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                        let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                        await buttonsDropdownItem[2].click();
        
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
        
                        if(isAllFilled) {
                            await driver.findElement(By.css("button[type='submit']")).click();
                        }
        
                        // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                        await driver.wait(until.elementsLocated(By.css('.card-body')));
                        const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                        let findCourse = [];
                        
                        for (let index = 0; index < courses.length; index++) {
                            if(await courses[index].getAttribute('innerText') === dataTitleCourse) {
                                findCourse.push(courses[index]);
                            }
                        }
        
                        expect(isAllFilled).to.equal(true);
                        expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);
        
                        const pageUrl = await driver.getCurrentUrl();
                        expect(pageUrl).to.include('dashboard/classroom');
                    } catch (error) {
                        // console.error(error?.stack?.split('\n')[1]);
                        expect.fail(error?.stack);
                    }
                        
                    
                });
                break;
            default:
                it(`Other Create Materi from Detail Class from browser ${browser}`, async function() {
                        
                    try {
                        
                        // Go to application
                        driver = await goToApp(browser, appHost);
                        await driver.manage().window().maximize();
        
                        // login to the application
                        errorMessages = await enterDashboard(driver, user);
        
                        // Aksi Masuk ke dalam halaman class
                        await driver.findElement(By.css('a > i.ri-icon.ri-stack-fill')).click();
                        let cardClass = await driver.findElement(By.css(`div.card-class`));
                        await driver.wait(until.stalenessOf(cardClass));
                        errorMessages = await captureConsoleErrors(driver);
        
                        // Aksi mengecek apakah ada card class atau card classnya lebih dari 1
                        let loadingSkeleton = await driver.findElement(By.css(`div.b-skeleton`));
                        await driver.wait(until.stalenessOf(loadingSkeleton))
                        let itemClass = await driver.findElements(By.css(`div.item-class`));
                        // Error ketika card classnya kosong
                        await thrownAnError('Item class is empty', itemClass.length == 0);
        
                        // Aksi memilih salah satu card class
                        await itemClass[faker.helpers.arrayElement([0,1,2])].findElement(By.css('h1.title')).click();
        
                        // Aksi mengklik tab materi pada detail class
                        let itemTabs = await driver.findElements(By.css(".item-tab"));
                        itemTabs[1].findElement(By.css('span')).click();
        
                        // Aksi mengklik button tambah materi
                        await driver.wait(until.elementLocated(By.css("i.ri-add-fill")));
                        await driver.findElement(By.css("i.ri-add-fill")).click();
                        await driver.wait(until.elementLocated(By.css(".dropdown-menu.dropdown-menu-right")));
                        let buttonsDropdownItem = await driver.findElements(By.css(".dropdown-menu.dropdown-menu-right button.dropdown-item"));
                        await buttonsDropdownItem[2].click();
        
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
        
                        if(isAllFilled) {
                            await driver.findElement(By.css("button[type='submit']")).click();
                        }
        
                        // Aksi mendapatkan semua course setelah memasukkan data atau membuat data baru & mendapatkan data yg sudah di buat sebelumnya
                        await driver.wait(until.elementsLocated(By.css('.card-body')));
                        const courses = await driver.findElements(By.css(".card-body .header h4.title"));
                        let findCourse = [];
                        
                        for (let index = 0; index < courses.length; index++) {
                            if(await courses[index].getAttribute('innerText') === dataTitleCourse) {
                                findCourse.push(courses[index]);
                            }
                        }
        
                        expect(isAllFilled).to.equal(true);
                        expect(findCourse.length, 'The data returned should expect one data because it has previously created a new data').to.equal(1);
        
                        const pageUrl = await driver.getCurrentUrl();
                        expect(pageUrl).to.include('dashboard/classroom');
                    } catch (error) {
                        // console.error(error?.stack?.split('\n')[1]);
                        expect.fail(error?.stack);
                    }
                      
                    
                });
                break;
        }

    })
    


});