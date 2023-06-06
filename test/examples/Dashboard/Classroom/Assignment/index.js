import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs'
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { appHost } from '#root/api/app-token';

/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;

describe("Assignment", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Check for class card ${browser}`, async () => {
                
            // Go to application
            driver = await goToApp(browser, appHost)
            
            // login to the application
            await enterDashboard(driver, user);

            await driver.manage().window().maximize();

            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);
            let doughnutChart = await driver.findElement(By.id('doughnut-chart')).isDisplayed();

            await driver.findElement(By.css('a i.ri-icon.ri-stack-fill')).click()

            await driver.wait(until.elementLocated(By.css(`div.card-class`)));

            let classCard = await driver.findElement(By.css('div.card-class')).isDisplayed();

            // Tampilkan data jaringan
            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
            userData = JSON.parse(userData);
            
            assert.strictEqual(textStatus > 1, textStatus > 1); 
            expect(userData.id).to.greaterThan(0);
            expect(doughnutChart).to.equal(true);
            expect(classCard).to.equal(true);
            
        });

    })
    


});