import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import { expect } from 'chai';
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { parseToDomain } from '#root/commons/utils/generalUtils';

/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;

describe("Logout", () => {

    afterEach(async function() {
        let html = await driver.findElement(By.css("html"));
        let encodedString = await html.takeScreenshot(true);
        fs.writeFileSync(path.resolve(`./assets/screenshoot/test/logout/${(this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1}.png`), encodedString, 'base64');
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Logout from browser ${browser}`, async () => {
                
            try {
                // Go to application
                driver = await goToApp(browser, appHost);
    
                await driver.manage().window().maximize();
    
                // login to the application
                await enterDashboard(driver, user);
                
                await driver.findElement(By.css('.dropdown.navbar-profile')).click();
                await driver.findElement(By.css('.dropdown-menu.dropdown-menu-left > button')).click();
                await driver.findElement(By.css('.box-action > button.btn-danger')).click();
    
                await driver.wait(until.elementsLocated(By.id('home')), 5000);
                
                const pageUrl = await driver.getCurrentUrl();
    
                expect(pageUrl).to.eq(parseToDomain(appHost));
            } catch (error) {
                expect.fail(error);
            }
            
        });

    })
    


});