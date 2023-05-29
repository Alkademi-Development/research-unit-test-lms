import { describe, afterEach, before } from 'mocha';
import pkg from 'selenium-webdriver';
const { By, until } = pkg;
import yargs from 'yargs'
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { expect } from 'chai';
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
        
        it(`List user in dashboard from browser ${browser}`, async () => {
                
            
            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();

            // login to the application
            await enterDashboard(driver, user);


            // Selections & Actions
            await driver.findElement(By.css('a > i.ri-icon.ri-user-3-line')).click();
            const dataTables = await driver.findElement(By.css('#datatables'));
            const loading = await driver.findElement(By.css('.vs__spinner'));
            await driver.wait(until.elementIsNotVisible(loading));
            const tableRowDataLength = await driver.executeScript(`return document.querySelectorAll('#datatables tbody tr').length`);
            
            
            // Get the results
            
            // Result Output
            expect(tableRowDataLength).to.greaterThan(0);
            
            
        })

    })
    


});