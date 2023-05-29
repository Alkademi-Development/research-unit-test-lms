import { describe, afterEach, before } from 'mocha';
import pkg from 'selenium-webdriver';
const { Builder, By, Key, until, elementsLocated, locateWith } = pkg;
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs'
import { faker } from '@faker-js/faker';
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
        
        it(`(SUCCESS) Create user role admin in dashboard from browser ${browser}`, async () => {
                
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

            // Select & Fill the Form
            await driver.wait(until.elementsLocated(By.css(`div.program-card`)));
            let selectUserRole = await driver.findElement(By.css(".program-card"));
            await selectUserRole.click();
            const inputNameLocator = locateWith(By.tagName('input')).above(By.id('name'));
            const inputEmailLocator = locateWith(By.tagName('input')).above(By.id('email'));
            const inputTelpLocator = locateWith(By.tagName('input')).above(By.id('phone'));
            const inputPasswordLocator = locateWith(By.tagName('input')).above(By.id('password'));
            const inputConfirmPasswordLocator = locateWith(By.tagName('input')).above(By.id('retypepassword'));
            let inputNameElement = await driver.findElement(inputNameLocator);
            let inputEmailElement = await driver.findElement(inputEmailLocator);
            let inputTelpElement = await driver.findElement(inputTelpLocator);
            let selectGenderInput = await driver.findElement(By.css('.custom-select'));
            let inputPasswordElement = await driver.findElement(inputPasswordLocator);
            let inputConfirmPasswordElement = await driver.findElement(inputConfirmPasswordLocator);

            await inputNameElement.sendKeys(faker.person.fullName());
            let fullName = await inputNameElement.getAttribute('value');
            await inputEmailElement.sendKeys(fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '@gmail.com');
            await inputTelpElement.sendKeys(faker.phone.number('+62 ### #### ####'));
            let optionElement = await selectGenderInput.findElement(By.css(`option[value="${Math.random() < 0.5 ? 'L' : 'P'}"]`));
            await optionElement.click();
            await inputPasswordElement.sendKeys('semuasama');
            await inputConfirmPasswordElement.sendKeys('semuasama');

            // Periksa apakah semua elemen telah terisi
            const isAllFilled = await Promise.all([
                inputNameElement.getAttribute('value'),
                inputEmailElement.getAttribute('value'),
                inputTelpElement.getAttribute('value'),
                selectGenderInput.getAttribute('value'),
                inputPasswordElement.getAttribute('value'),
                inputConfirmPasswordElement.getAttribute('value')
            ])
                .then(values => values.every(value => value !== ''));

            await driver.findElement(By.css("button[type='submit']")).click();
            
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
            expect(isAllFilled).to.equal(true);
            
            const alertDanger = await driver.findElements(By.css('.alert .alert-danger'));
            expect(alertDanger.length).to.equal(0);

            const pageUrl = await driver.getCurrentUrl();
            expect(pageUrl).to.eq(appHost + 'dashboard/users');
            
        })

    })
    


});