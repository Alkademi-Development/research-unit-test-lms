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

/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;

describe("Login", () => {

    afterEach(async function() {
        await takeScreenshot(driver, path.resolve(`./screenshoot/test/login/${(this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1}.png`));
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Login to dashboard from browser ${browser}`, async () => {
                
            try {
                
                // Go to application
                driver = await goToApp(browser, appHost);

                // login to the application
                errorMessages = await enterDashboard(driver, user);

                let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

                // Jalankan skrip JavaScript untuk mengumpulkan data jaringan
                const networkData = await driver.executeScript(`
                    const performanceEntries = performance.getEntriesByType('resource');
                    const requests = performanceEntries.map(entry => {
                        return {
                            entry,
                            url: entry.name,
                            method: entry.initiatorType,
                            type: entry.entryType,
                        };
                    });
                    
                    return requests;
                `);

                // Tampilkan data jaringan
                let correctUrl = await networkData.find(data => data.url.includes("v1/user/me"));
                let userData = await driver.executeScript("return window.localStorage.getItem('user')")
                userData = await JSON.parse(userData);
                
                if(errorMessages.length > 0) {
                    throw new Error(errorMessages);
                }

                assert.strictEqual(textStatus > 1, textStatus > 1); 
                expect(correctUrl.url).to.includes("v1/user/me");
                expect(userData.id).to.greaterThan(0);
            } catch (error) {
                expect.fail(error);
            }
              
            
        });
        
        // it(`Failed login (wrong email) from browser ${browser}`, async () => {
            
        //     driver = new Builder()
        //         .forBrowser(browser)
        //         .build();

        //     // navigate to the application
        //     await driver.get(appHost);

        //     // login to the application
        //     await driver.findElement(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]/form/div[1]/div/input`)).sendKeys(user.email + 'a', Key.RETURN);
        //     await driver.findElement(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]/form/div[2]/div/input`)).sendKeys(user.password, Key.RETURN);
        //     await driver.wait(until.elementsLocated(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]`)));

        //     let typeStatus = await driver.executeScript(`return document.querySelector('.alert.alert-warning').innerText`),
        //     textStatus = await driver.executeScript(`return document.querySelectorAll('.alert.alert-warning').length`);

        //     assert.strictEqual(typeStatus.includes("email"), true); 
        //     assert.strictEqual(textStatus > 1, typeStatus > 1); 
            
        // });

        // it(`failed login (wrong password) from browser ${browser}`, async function () {
            
        //     driver = new Builder()
        //         .forBrowser(browser)
        //         .build();

        //     // navigate to the application
        //     await driver.get(appHost);

        //     // login to the application
        //     await driver.findElement(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]/form/div[1]/div/input`)).sendKeys(user.email, Key.RETURN);
        //     await driver.findElement(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]/form/div[2]/div/input`)).sendKeys(user.password[0], Key.RETURN);
        //     await driver.wait(until.elementsLocated(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]/div[1]`)));

        //     let typeStatus = await driver.executeScript(`return document.querySelector('.alert.alert-warning').innerText`),
        //     textStatus = await driver.executeScript(`return document.querySelectorAll('.alert.alert-warning').length`);

        //     assert.strictEqual(typeStatus.includes("password"), true); 
        //     assert.strictEqual(textStatus > 1, typeStatus > 1); 
    
        // })

    })
    


});