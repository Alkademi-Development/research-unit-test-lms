import { describe, afterEach, before } from 'mocha';
import pkg from 'selenium-webdriver';
const { Builder, By, Key, until, elementsLocated } = pkg;
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs'
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;

describe("User", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Create user in dashboard from browser ${browser}`, async () => {
                
            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();

            // login to the application
            await enterDashboard(driver, user);


            // Selections & Actions
            
            await driver.findElement(By.css('a > i.ri-icon.ri-user-3-line')).click();
            await driver.findElement(By.css('button.btn.btn-primary')).click();
            
            await driver.wait(until.elementsLocated(By.css(`div.card-wrapper`)));
            let cardForm = await driver.findElement(By.css('.card-wrapper')).isDisplayed();
            let cardFormTitle = await driver.findElement(By.css(".card-wrapper .card .card-header h3")).getText();

            // Fill the Form
            await driver.wait(until.elementsLocated(By.css(`div.program-card`)));
            let selectUserRole = await driver.findElement(By.css(".program-card"));
            await selectUserRole.click();
            
            // Get the results
            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
            userData = JSON.parse(userData);
            
            // Result Output
            assert.strictEqual(textStatus > 1, textStatus > 1); 
            expect(userData.id).to.greaterThan(0);
            expect(cardForm).to.eq(true);
            expect(cardFormTitle).to.eq("Create Users");

            expect(await selectUserRole.getAttribute('class')).contain('bg-primary');
            
        })

    })
    


});