import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import { expect } from 'chai';
import yargs from 'yargs';
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';

const LOGIN_URL = process.env.LOGIN_URL;
const BASE_URL = process.env.BASE_URL;
/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let appHost = LOGIN_URL;
let driver;

describe("Login", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Logout from browser ${browser}`, async () => {
                
            // Go to application
            driver = await goToApp(browser, appHost)

            await driver.manage().window().maximize();

            // login to the application
            await enterDashboard(driver, user);
            
            await driver.findElement(By.css('.dropdown.navbar-profile')).click();
            await driver.findElement(By.css('.dropdown-menu.dropdown-menu-left > button')).click();
            await driver.findElement(By.css('.box-action > button.btn-danger')).click();

            await driver.wait(until.elementsLocated(By.id('home')));
            
            const pageUrl = await driver.getCurrentUrl();

            expect(pageUrl).to.eq(BASE_URL);
            
        });

    })
    


});